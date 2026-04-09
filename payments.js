const express = require("express");
const db = require("../db/database");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

const router = express.Router();

const PAYMENT_INFO = {
  momo: { number: "0784010076", name: "Mobile Money" },
  bank: { account: "4007101374592", bank: "Equity Bank", name: "Bank Transfer" },
};

// Get payment info
router.get("/info", authMiddleware, (_req, res) => {
  res.json(PAYMENT_INFO);
});

// Client pays 1000 RWF to contact a provider
router.post("/client-pay", authMiddleware, (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ error: "Only clients can make this payment." });
    }

    const { providerId, method, phone } = req.body;
    if (!providerId || !method) {
      return res.status(400).json({ error: "Provider and payment method are required." });
    }
    if (!["momo", "bank"].includes(method)) {
      return res.status(400).json({ error: "Invalid payment method." });
    }
    if (method === "momo" && !phone) {
      return res.status(400).json({ error: "Phone number is required for Mobile Money." });
    }

    // Find provider's userId
    const provider = db.prepare("SELECT userId FROM providers WHERE id = ?").get(providerId);
    if (!provider) {
      return res.status(404).json({ error: "Provider not found." });
    }

    // Check if already paid and confirmed
    const existing = db.prepare(
      "SELECT id, status FROM payments WHERE payerId = ? AND targetUserId = ? AND payerRole = 'client'"
    ).get(req.user.id, provider.userId);

    if (existing && existing.status === "confirmed") {
      return res.status(400).json({ error: "You have already paid for this provider." });
    }
    if (existing && existing.status === "pending") {
      return res.status(400).json({ error: "Your payment is pending admin confirmation." });
    }

    const ref = "CP-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    const result = db.prepare(
      "INSERT INTO payments (payerId, payerRole, targetUserId, amount, method, phone, status, reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(req.user.id, "client", provider.userId, 1000, method, phone || null, method === "momo" ? "pending" : "pending", ref);

    // Log activity
    db.prepare(
      "INSERT INTO activity_log (userId, action, details) VALUES (?, ?, ?)"
    ).run(req.user.id, "payment_initiated", `Client payment of 1000 RWF for provider #${providerId} via ${method}. Ref: ${ref}`);

    const payment = db.prepare("SELECT * FROM payments WHERE id = ?").get(result.lastInsertRowid);

    // For MoMo, simulate instant visibility (mark as pending but instantly visible)
    res.status(201).json({
      message: method === "momo"
        ? "Mobile Money payment submitted! Waiting for admin confirmation."
        : "Bank payment submitted! Waiting for admin confirmation.",
      payment,
      paymentInfo: PAYMENT_INFO[method],
    });
  } catch (err) {
    res.status(500).json({ error: "Payment failed." });
  }
});

// Provider pays 1500 RWF to access a client
router.post("/provider-pay", authMiddleware, (req, res) => {
  try {
    if (req.user.role !== "provider") {
      return res.status(403).json({ error: "Only providers can make this payment." });
    }

    const { clientId, method, phone } = req.body;
    if (!clientId || !method) {
      return res.status(400).json({ error: "Client and payment method are required." });
    }
    if (!["momo", "bank"].includes(method)) {
      return res.status(400).json({ error: "Invalid payment method." });
    }
    if (method === "momo" && !phone) {
      return res.status(400).json({ error: "Phone number is required for Mobile Money." });
    }

    const client = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'client'").get(clientId);
    if (!client) {
      return res.status(404).json({ error: "Client not found." });
    }

    // Check if already paid and confirmed
    const existing = db.prepare(
      "SELECT id, status FROM payments WHERE payerId = ? AND targetUserId = ? AND payerRole = 'provider'"
    ).get(req.user.id, clientId);

    if (existing && existing.status === "confirmed") {
      return res.status(400).json({ error: "You have already paid for this client." });
    }
    if (existing && existing.status === "pending") {
      return res.status(400).json({ error: "Your payment is pending admin confirmation." });
    }

    const ref = "PP-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    const result = db.prepare(
      "INSERT INTO payments (payerId, payerRole, targetUserId, amount, method, phone, status, reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(req.user.id, "provider", clientId, 1500, method, phone || null, "pending", ref);

    db.prepare(
      "INSERT INTO activity_log (userId, action, details) VALUES (?, ?, ?)"
    ).run(req.user.id, "payment_initiated", `Provider payment of 1500 RWF for client #${clientId} via ${method}. Ref: ${ref}`);

    const payment = db.prepare("SELECT * FROM payments WHERE id = ?").get(result.lastInsertRowid);

    res.status(201).json({
      message: method === "momo"
        ? "Mobile Money payment submitted! Waiting for admin confirmation."
        : "Bank payment submitted! Waiting for admin confirmation.",
      payment,
      paymentInfo: PAYMENT_INFO[method],
    });
  } catch (err) {
    res.status(500).json({ error: "Payment failed." });
  }
});

// Get my payments
router.get("/my", authMiddleware, (req, res) => {
  try {
    const payments = db.prepare(
      `SELECT p.*, u.name as targetName, u.email as targetEmail
       FROM payments p JOIN users u ON p.targetUserId = u.id
       WHERE p.payerId = ? ORDER BY p.createdAt DESC`
    ).all(req.user.id);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch payments." });
  }
});

// Check if client has paid for a specific provider
router.get("/check/client/:providerId", authMiddleware, (req, res) => {
  try {
    const provider = db.prepare("SELECT userId FROM providers WHERE id = ?").get(req.params.providerId);
    if (!provider) return res.status(404).json({ error: "Provider not found." });

    const payment = db.prepare(
      "SELECT id, status FROM payments WHERE payerId = ? AND targetUserId = ? AND payerRole = 'client'"
    ).get(req.user.id, provider.userId);

    res.json({
      paid: payment?.status === "confirmed",
      pending: payment?.status === "pending",
      payment: payment || null,
    });
  } catch (err) {
    res.status(500).json({ error: "Check failed." });
  }
});

// Check if provider has paid for a specific client
router.get("/check/provider/:clientId", authMiddleware, (req, res) => {
  try {
    const payment = db.prepare(
      "SELECT id, status FROM payments WHERE payerId = ? AND targetUserId = ? AND payerRole = 'provider'"
    ).get(req.user.id, parseInt(req.params.clientId));

    res.json({
      paid: payment?.status === "confirmed",
      pending: payment?.status === "pending",
      payment: payment || null,
    });
  } catch (err) {
    res.status(500).json({ error: "Check failed." });
  }
});

// Admin: Get all payments
router.get("/all", authMiddleware, adminMiddleware, (_req, res) => {
  try {
    const payments = db.prepare(
      `SELECT p.*, 
        payer.name as payerName, payer.email as payerEmail,
        target.name as targetName, target.email as targetEmail
       FROM payments p 
       JOIN users payer ON p.payerId = payer.id
       JOIN users target ON p.targetUserId = target.id
       ORDER BY p.createdAt DESC`
    ).all();
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch payments." });
  }
});

// Admin: Confirm payment
router.put("/:id/confirm", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const payment = db.prepare("SELECT * FROM payments WHERE id = ?").get(req.params.id);
    if (!payment) return res.status(404).json({ error: "Payment not found." });
    if (payment.status === "confirmed") {
      return res.status(400).json({ error: "Payment already confirmed." });
    }

    db.prepare(
      "UPDATE payments SET status = 'confirmed', confirmedBy = ?, confirmedAt = datetime('now') WHERE id = ?"
    ).run(req.user.id, req.params.id);

    db.prepare(
      "INSERT INTO activity_log (userId, action, details) VALUES (?, ?, ?)"
    ).run(req.user.id, "payment_confirmed", `Admin confirmed payment #${req.params.id} (${payment.reference})`);

    const updated = db.prepare("SELECT * FROM payments WHERE id = ?").get(req.params.id);
    res.json({ message: "Payment confirmed.", payment: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to confirm payment." });
  }
});

// Admin: Reject payment
router.put("/:id/reject", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const payment = db.prepare("SELECT * FROM payments WHERE id = ?").get(req.params.id);
    if (!payment) return res.status(404).json({ error: "Payment not found." });

    db.prepare("UPDATE payments SET status = 'rejected' WHERE id = ?").run(req.params.id);

    db.prepare(
      "INSERT INTO activity_log (userId, action, details) VALUES (?, ?, ?)"
    ).run(req.user.id, "payment_rejected", `Admin rejected payment #${req.params.id} (${payment.reference})`);

    res.json({ message: "Payment rejected." });
  } catch (err) {
    res.status(500).json({ error: "Failed to reject payment." });
  }
});

module.exports = router;
