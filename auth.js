const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const db = require("../db/database");
const { authMiddleware } = require("../middleware/auth");
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const router = express.Router();

// Register
router.post("/register", (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required." });
    }

    const validRoles = ["client", "provider"];
    const userRole = validRoles.includes(role) ? role : "client";

    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered." });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const result = db
      .prepare(
        "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)",
      )
      .run(name, email, phone || null, hashedPassword, userRole);

    // If registering as provider, create provider profile
    if (userRole === "provider") {
      db.prepare(
        "INSERT INTO providers (userId, category, location, price, description) VALUES (?, ?, ?, ?, ?)",
      ).run(result.lastInsertRowid, "General", "Not set", 0, "");
    }

    const token = jwt.sign(
      { id: result.lastInsertRowid, email, role: userRole },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    const user = db
      .prepare(
        "SELECT id, name, email, phone, role, isPremium FROM users WHERE id = ?",
      )
      .get(result.lastInsertRowid);

    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: "Registration failed." });
  }
});

// Login
router.post("/login", (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ error: "Login failed." });
  }
});

// Get current user
router.get("/me", authMiddleware, (req, res) => {
  try {
    const user = db
      .prepare(
        "SELECT id, name, email, phone, role, isPremium, avatar, cvUrl, createdAt FROM users WHERE id = ?",
      )
      .get(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user." });
  }
});

// Upgrade to premium
router.post("/upgrade", authMiddleware, (req, res) => {
  try {
    db.prepare("UPDATE users SET isPremium = 1 WHERE id = ?").run(req.user.id);
    const user = db
      .prepare(
        "SELECT id, name, email, phone, role, isPremium, avatar, cvUrl FROM users WHERE id = ?",
      )
      .get(req.user.id);
    res.json({ message: "Upgraded to premium!", user });
  } catch (err) {
    res.status(500).json({ error: "Upgrade failed." });
  }
});

// --- Client profile routes ---

const storage = multer.diskStorage({
  destination: (_req, _file, cb) =>
    cb(null, path.join(__dirname, "..", "uploads")),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const avatarUpload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    cb(null, allowed.includes(file.mimetype));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

const cvUpload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    cb(null, allowed.includes(file.mimetype));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Update profile (name, phone)
router.put("/profile", authMiddleware, (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Name is required." });
    }
    db.prepare("UPDATE users SET name = ?, phone = ? WHERE id = ?").run(
      name,
      phone || null,
      req.user.id,
    );
    const user = db
      .prepare(
        "SELECT id, name, email, phone, role, isPremium, avatar, cvUrl, createdAt FROM users WHERE id = ?",
      )
      .get(req.user.id);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile." });
  }
});

// Upload avatar
router.post(
  "/avatar",
  authMiddleware,
  avatarUpload.single("avatar"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided." });
      }
      const avatarUrl = `/uploads/${req.file.filename}`;
      db.prepare("UPDATE users SET avatar = ? WHERE id = ?").run(
        avatarUrl,
        req.user.id,
      );
      const user = db
        .prepare(
          "SELECT id, name, email, phone, role, isPremium, avatar, cvUrl, createdAt FROM users WHERE id = ?",
        )
        .get(req.user.id);
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: "Failed to upload avatar." });
    }
  },
);

// Upload CV
router.post("/cv", authMiddleware, cvUpload.single("cv"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No CV file provided." });
    }
    const cvUrl = `/uploads/${req.file.filename}`;
    db.prepare("UPDATE users SET cvUrl = ? WHERE id = ?").run(
      cvUrl,
      req.user.id,
    );
    const user = db
      .prepare(
        "SELECT id, name, email, phone, role, isPremium, avatar, cvUrl, createdAt FROM users WHERE id = ?",
      )
      .get(req.user.id);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to upload CV." });
  }
});

module.exports = router;
