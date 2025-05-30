const User = require("../models/User");
const UserData = require("../models/UserData");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const mongoose = require("mongoose");
const multer = require("multer");

require('dotenv').config();

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

exports.getUserData = async (req, res, next) => {
  const logPrefix = "[getUserData]";
  try {
    const { user_id } = req.params;
    const userData = await UserData.findOne({ user_id }).lean();
    if (!userData) {
      return res.status(404).json({ error: "User data not found" });
    }

    // Tạo pre-signed URL cho avatar
    let avatarUrl = userData.avatar;
    if (avatarUrl) {
      const key = avatarUrl.split('.com/')[1];
      avatarUrl = await getSignedUrl(s3, new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
      }), { expiresIn: 3600 });
    }

    console.log(`${logPrefix} User data retrieved for user ${user_id}`);
    res.status(200).json({ ...userData, avatar: avatarUrl });
  } catch (error) {
    console.error(`${logPrefix} Error: ${error.message}`);
    next(error);
  }
};

exports.updateUserData = async (req, res, next) => {
  const logPrefix = "[updateUserData]";
  try {
    const { user_id } = req.params;
    const updateData = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (updateData.email && !emailRegex.test(updateData.email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const userData = await UserData.findOneAndUpdate(
      { user_id },
      { $set: { ...updateData, updatedAt: Date.now() } },
      { new: true, runValidators: true }
    );

    if (!userData) {
      return res.status(404).json({ error: "User data not found" });
    }

    if (updateData.email) {
      const user = await User.findOneAndUpdate(
        { _id: user_id },
        { email: updateData.email },
        { new: true, runValidators: true }
      );
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
    }

    let avatarUrl = userData.avatar;
    if (avatarUrl) {
      const key = avatarUrl.split('.com/')[1];
      avatarUrl = await getSignedUrl(s3, new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
      }), { expiresIn: 3600 });
    }

    console.log(`${logPrefix} User data updated for user ${user_id}`);
    res.status(200).json({ ...userData.toObject(), avatar: avatarUrl });
  } catch (error) {
    console.error(`${logPrefix} Error: ${error.message}`);
    next(error);
  }
};

exports.deleteUserData = async (req, res, next) => {
  const logPrefix = "[deleteUserData]";
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { user_id } = req.params;
      const userData = await UserData.findOneAndDelete({ user_id }, { session });
      if (!userData) {
        throw new Error("User data not found");
      }
      const user = await User.findOneAndDelete({ _id: user_id }, { session });
      if (!user) {
        throw new Error("User not found");
      }
    });
    console.log(`${logPrefix} User and data deleted for user ${user_id}`);
    res.status(200).json({ message: "User and data deleted successfully" });
  } catch (error) {
    console.error(`${logPrefix} Error: ${error.message}`);
    res.status(error.message.includes("not found") ? 404 : 500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

exports.uploadAvatar = [
  upload.single("avatar"),
  async (req, res, next) => {
    const logPrefix = "[uploadAvatar]";
    try {
      const { user_id } = req.query;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `${user_id}/${Date.now()}-${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: "max-age=31536000",
      };

      await s3.send(new PutObjectCommand(params));

      const avatarUrl = await getSignedUrl(s3, new GetObjectCommand({
        Bucket: params.Bucket,
        Key: params.Key,
      }), { expiresIn: 3600 });

      const originalUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
      const userData = await UserData.findOneAndUpdate(
        { user_id },
        { avatar: originalUrl, updatedAt: Date.now() },
        { new: true, runValidators: true }
      );

      if (!userData) {
        return res.status(404).json({ error: "User data not found" });
      }

      console.log(`${logPrefix} Avatar uploaded for user ${user_id}`);
      res.status(200).json({ url: avatarUrl });
    } catch (error) {
      console.error(`${logPrefix} Error: ${error.message}`);
      next(error);
    }
  },
];