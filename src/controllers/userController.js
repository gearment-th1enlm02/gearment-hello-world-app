const User = require("../models/User");

exports.getUser = async (req, res, next) => {
  const logPrefix = "[getUser]";
  try {
    const { user_id } = req.params;
    const user = await User.findById(user_id).lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log(`${logPrefix} User retrieved successfully for user ${user_id}`);
    res.status(200).json(user);
  } catch (error) {
    console.error(`${logPrefix} Error: ${error.message}`);
    next(error);
  }
}
