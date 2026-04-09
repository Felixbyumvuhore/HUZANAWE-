const jwt = require("jsonwebtoken");
require("dotenv").config({ path: require('path').join(__dirname, '..', '.env') });

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}

function providerMiddleware(req, res, next) {
  if (req.user.role !== "provider" && req.user.role !== "admin") {
    return res.status(403).json({ error: "Provider access required." });
  }
  next();
}

module.exports = { authMiddleware, adminMiddleware, providerMiddleware };
