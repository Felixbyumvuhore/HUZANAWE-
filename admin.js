const express = require("express");
const db = require("../db/database");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

const router = express.Router();

// Get all users
router.get("/users", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const users = db
      .prepare(
        "SELECT id, name, email, phone, role, isPremium, createdAt FROM users ORDER BY createdAt DESC",
      )
      .all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

// Delete user
router.delete("/users/:id", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.role === "admin")
      return res.status(400).json({ error: "Cannot delete admin." });

    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);

    db.prepare(
      "INSERT INTO activity_log (userId, action, details) VALUES (?, ?, ?)",
    ).run(
      req.user.id,
      "user_deleted",
      `Deleted user ${user.name} (${user.email})`,
    );

    res.json({ message: "User deleted." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user." });
  }
});

// Get all providers (admin view)
router.get("/providers", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const providers = db
      .prepare(
        `
      SELECT p.*, u.name, u.email, u.phone, u.isPremium
      FROM providers p JOIN users u ON p.userId = u.id
      ORDER BY p.createdAt DESC
    `,
      )
      .all();
    res.json(providers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch providers." });
  }
});

// Delete provider
router.delete("/providers/:id", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const provider = db
      .prepare("SELECT * FROM providers WHERE id = ?")
      .get(req.params.id);
    if (!provider)
      return res.status(404).json({ error: "Provider not found." });

    db.prepare("DELETE FROM providers WHERE id = ?").run(req.params.id);
    db.prepare("UPDATE users SET role = ? WHERE id = ?").run(
      "client",
      provider.userId,
    );

    db.prepare(
      "INSERT INTO activity_log (userId, action, details) VALUES (?, ?, ?)",
    ).run(
      req.user.id,
      "provider_deleted",
      `Removed provider #${req.params.id}`,
    );

    res.json({ message: "Provider removed." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete provider." });
  }
});

// Analytics
router.get("/analytics", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const totalUsers = db
      .prepare("SELECT COUNT(*) as count FROM users")
      .get().count;
    const totalProviders = db
      .prepare("SELECT COUNT(*) as count FROM providers")
      .get().count;
    const totalReviews = db
      .prepare("SELECT COUNT(*) as count FROM reviews")
      .get().count;
    const premiumUsers = db
      .prepare("SELECT COUNT(*) as count FROM users WHERE isPremium = 1")
      .get().count;
    const totalPayments = db
      .prepare("SELECT COUNT(*) as count FROM payments")
      .get().count;
    const confirmedPayments = db
      .prepare(
        "SELECT COUNT(*) as count FROM payments WHERE status = 'confirmed'",
      )
      .get().count;
    const pendingPayments = db
      .prepare(
        "SELECT COUNT(*) as count FROM payments WHERE status = 'pending'",
      )
      .get().count;
    const totalRevenue = db
      .prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'confirmed'",
      )
      .get().total;
    const topCategories = db
      .prepare(
        `
      SELECT category, COUNT(*) as count FROM providers GROUP BY category ORDER BY count DESC LIMIT 5
    `,
      )
      .all();
    const recentUsers = db
      .prepare(
        "SELECT id, name, email, role, createdAt FROM users ORDER BY createdAt DESC LIMIT 5",
      )
      .all();

    res.json({
      totalUsers,
      totalProviders,
      totalReviews,
      premiumUsers,
      totalPayments,
      confirmedPayments,
      pendingPayments,
      totalRevenue,
      topCategories,
      recentUsers,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch analytics." });
  }
});

// Activity log
router.get("/activity", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const activities = db
      .prepare(
        `SELECT a.*, u.name as userName, u.email as userEmail
       FROM activity_log a LEFT JOIN users u ON a.userId = u.id
       ORDER BY a.createdAt DESC LIMIT ?`,
      )
      .all(limit);
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch activity log." });
  }
});

// --- Location management ---
router.get("/locations", authMiddleware, adminMiddleware, (_req, res) => {
  try {
    const locations = db
      .prepare("SELECT * FROM locations ORDER BY name ASC")
      .all();
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch locations." });
  }
});

router.post("/locations", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Location name is required." });
    }

    const existing = db
      .prepare("SELECT id FROM locations WHERE name = ?")
      .get(name.trim());
    if (existing) {
      return res.status(400).json({ error: "Location already exists." });
    }

    const result = db
      .prepare("INSERT INTO locations (name) VALUES (?)")
      .run(name.trim());

    db.prepare(
      "INSERT INTO activity_log (userId, action, details) VALUES (?, ?, ?)",
    ).run(req.user.id, "location_added", `Added location: ${name.trim()}`);

    const location = db
      .prepare("SELECT * FROM locations WHERE id = ?")
      .get(result.lastInsertRowid);
    res.status(201).json(location);
  } catch (err) {
    res.status(500).json({ error: "Failed to add location." });
  }
});

router.delete("/locations/:id", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const location = db
      .prepare("SELECT * FROM locations WHERE id = ?")
      .get(req.params.id);
    if (!location)
      return res.status(404).json({ error: "Location not found." });

    db.prepare("DELETE FROM locations WHERE id = ?").run(req.params.id);

    db.prepare(
      "INSERT INTO activity_log (userId, action, details) VALUES (?, ?, ?)",
    ).run(
      req.user.id,
      "location_deleted",
      `Deleted location: ${location.name}`,
    );

    res.json({ message: "Location deleted." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete location." });
  }
});

// Public: get all locations (for dropdowns)
router.get("/locations/public", (_req, res) => {
  try {
    const locations = db
      .prepare("SELECT id, name FROM locations ORDER BY name ASC")
      .all();
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch locations." });
  }
});

module.exports = router;
