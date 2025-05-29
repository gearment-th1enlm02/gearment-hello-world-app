const User = require("../models/User");
const UserData = require("../models/UserData");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const multer = require("multer");

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
    console.log(`${logPrefix} User data retrieved for user ${user_id}`);
    res.status(200).json(userData);
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

    console.log(`${logPrefix} User data updated successfully for user ${user_id}`);
    res.status(200).json(userData);
  } catch (error) {
    console.error(`${logPrefix} Error: ${error.message}`);
    next(error);
  }
};

exports.deleteUserData = async (req, res, next) => {
  const logPrefix = "[deleteUserData]";
  try {
    const { user_id } = req.params;

    const userData = await UserData.findOneAndDelete({ user_id });
    if (!userData) {
      return res.status(404).json({ error: "User data not found" });
    }

    const user = await User.findOneAndDelete({ _id: user_id });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log(`${logPrefix} User and user data deleted successfully for user ${user_id}`);
    res.status(200).json({ message: "User and user data deleted successfully" });
  } catch (error) {
    console.error(`${logPrefix} Error: ${error.message}`);
    next(error);
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
        CacheControl: 'max-age=31536000',
      };

      const command = new PutObjectCommand(params);
      await s3.send(command);

      const avatarUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;

      const userData = await UserData.findOneAndUpdate(
        { user_id },
        { avatar: avatarUrl, updatedAt: Date.now() },
        { new: true, runValidators: true }
      );

      if (!userData) {
        return res.status(404).json({ error: "User data not found" });
      }

      console.log(`${logPrefix} Avatar uploaded successfully for user ${user_id}`);
      res.status(200).json({ url: avatarUrl });
    } catch (error) {
      console.error(`${logPrefix} Error: ${error.message}`);
      next(error);
    }
  },
];