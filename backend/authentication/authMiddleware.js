const jwt = require("jsonwebtoken");
const User = require("../database/User");

// Protects routes - only requests with a valid JWT token get through.
// Also blocks any account currently in its soft-delete grace period,
// forcing the user through the login flow (which handles restoration)
// rather than letting an old token keep working on a "deleted" account.
async function protect(req, res, next) {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }

      if (user.deletedAt) {
        return res.status(403).json({
          message: "This account is scheduled for deletion. Log in again to restore it."
        });
      }

      req.user = user;
      return next();
    } catch (err) {
      return res.status(401).json({ message: "Not authorized, token invalid" });
    }
  }

  return res.status(401).json({ message: "Not authorized, no token" });
}

module.exports = protect;
