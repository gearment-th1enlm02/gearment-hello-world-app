const jwt = require("jsonwebtoken");
const { jwtConfig } = require("../config");

const authenticateToken = (req, res, next) => {
  const logPrefix = "[authenticateToken]";
  const token = req.headers["authorization"]?.split(" ")[1]; // Bearer <token>
  if (!token) {
    console.log(`${logPrefix} No token provided`);
    return res.status(401).json({ message: "Authentication required" }); // Unauthorized
  }

  jwt.verify(token, jwtConfig.secret, (err, user) => {
    if (err) {
      console.log(`${logPrefix} Invalid token: ${err.message}`);
      return res.status(403).json({ message: "Invalid token" }); // Forbidden
    }
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken };