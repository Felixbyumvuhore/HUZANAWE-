const express = require("express");
const db = require("../db/database");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// Helper: check if two users can chat
function canChat(userId1, userId2) {
  const user1 = db.prepare("SELECT id, role FROM users WHERE id = ?").get(userId1);
  const user2 = db.prepare("SELECT id, role FROM users WHERE id = ?").get(userId2);
  if (!user1 || !user2) return { allowed: false, reason: "User not found." };

  // Admin can chat with anyone
  if (user1.role === "admin" || user2.role === "admin") {
    return { allowed: true };
  }

  // Client <-> Provider: client must have paid 1000 and admin confirmed
  if (
    (user1.role === "client" && user2.role === "provider") ||
    (user1.role === "provider" && user2.role === "client")
  ) {
    const clientId = user1.role === "client" ? user1.id : user2.id;
    const providerId = user1.role === "provider" ? user1.id : user2.id;

    // Check client payment to provider
    const clientPayment = db.prepare(
      "SELECT status FROM payments WHERE payerId = ? AND targetUserId = ? AND payerRole = 'client' AND status = 'confirmed'"
    ).get(clientId, providerId);

    if (!clientPayment) {
      return { allowed: false, reason: "Client must pay 1000 RWF first (and admin must confirm)." };
    }

    // Check provider payment for this client
    const providerPayment = db.prepare(
      "SELECT status FROM payments WHERE payerId = ? AND targetUserId = ? AND payerRole = 'provider' AND status = 'confirmed'"
    ).get(providerId, clientId);

    if (!providerPayment) {
      return { allowed: false, reason: "Provider must pay 1500 RWF to access this client." };
    }

    return { allowed: true };
  }

  return { allowed: false, reason: "Chat not allowed between these users." };
}

// Get or create conversation
function getOrCreateConversation(userId1, userId2) {
  const lo = Math.min(userId1, userId2);
  const hi = Math.max(userId1, userId2);

  let conv = db.prepare(
    "SELECT * FROM conversations WHERE user1Id = ? AND user2Id = ?"
  ).get(lo, hi);

  if (!conv) {
    const result = db.prepare(
      "INSERT INTO conversations (user1Id, user2Id) VALUES (?, ?)"
    ).run(lo, hi);
    conv = db.prepare("SELECT * FROM conversations WHERE id = ?").get(result.lastInsertRowid);
  }

  return conv;
}

// Get all my conversations
router.get("/conversations", authMiddleware, (req, res) => {
  try {
    const convos = db.prepare(
      `SELECT c.*,
        u1.name as user1Name, u1.avatar as user1Avatar, u1.role as user1Role,
        u2.name as user2Name, u2.avatar as user2Avatar, u2.role as user2Role,
        (SELECT content FROM messages WHERE conversationId = c.id ORDER BY createdAt DESC LIMIT 1) as lastMessage,
        (SELECT createdAt FROM messages WHERE conversationId = c.id ORDER BY createdAt DESC LIMIT 1) as lastMessageAt,
        (SELECT COUNT(*) FROM messages WHERE conversationId = c.id AND senderId != ? AND readAt IS NULL) as unreadCount
       FROM conversations c
       JOIN users u1 ON c.user1Id = u1.id
       JOIN users u2 ON c.user2Id = u2.id
       WHERE c.user1Id = ? OR c.user2Id = ?
       ORDER BY lastMessageAt DESC`
    ).all(req.user.id, req.user.id, req.user.id);

    res.json(convos);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch conversations." });
  }
});

// Get messages for a conversation
router.get("/conversations/:id/messages", authMiddleware, (req, res) => {
  try {
    const conv = db.prepare("SELECT * FROM conversations WHERE id = ?").get(req.params.id);
    if (!conv) return res.status(404).json({ error: "Conversation not found." });

    if (conv.user1Id !== req.user.id && conv.user2Id !== req.user.id) {
      // Allow admin to view any conversation
      const user = db.prepare("SELECT role FROM users WHERE id = ?").get(req.user.id);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Access denied." });
      }
    }

    const messages = db.prepare(
      `SELECT m.*, u.name as senderName, u.avatar as senderAvatar
       FROM messages m JOIN users u ON m.senderId = u.id
       WHERE m.conversationId = ?
       ORDER BY m.createdAt ASC`
    ).all(req.params.id);

    // Mark messages as read
    db.prepare(
      "UPDATE messages SET readAt = datetime('now') WHERE conversationId = ? AND senderId != ? AND readAt IS NULL"
    ).run(req.params.id, req.user.id);

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages." });
  }
});

// Send a message
router.post("/conversations/:id/messages", authMiddleware, (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Message content is required." });
    }

    const conv = db.prepare("SELECT * FROM conversations WHERE id = ?").get(req.params.id);
    if (!conv) return res.status(404).json({ error: "Conversation not found." });

    if (conv.user1Id !== req.user.id && conv.user2Id !== req.user.id) {
      const user = db.prepare("SELECT role FROM users WHERE id = ?").get(req.user.id);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Access denied." });
      }
    }

    const result = db.prepare(
      "INSERT INTO messages (conversationId, senderId, content) VALUES (?, ?, ?)"
    ).run(req.params.id, req.user.id, content.trim());

    const message = db.prepare(
      `SELECT m.*, u.name as senderName, u.avatar as senderAvatar
       FROM messages m JOIN users u ON m.senderId = u.id
       WHERE m.id = ?`
    ).get(result.lastInsertRowid);

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: "Failed to send message." });
  }
});

// Start a new conversation (checks payment access)
router.post("/start", authMiddleware, (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ error: "Target user is required." });
    }
    if (parseInt(targetUserId) === req.user.id) {
      return res.status(400).json({ error: "Cannot chat with yourself." });
    }

    const target = db.prepare("SELECT id, name, role FROM users WHERE id = ?").get(targetUserId);
    if (!target) return res.status(404).json({ error: "User not found." });

    const access = canChat(req.user.id, parseInt(targetUserId));
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    const conv = getOrCreateConversation(req.user.id, parseInt(targetUserId));
    res.json(conv);
  } catch (err) {
    res.status(500).json({ error: "Failed to start conversation." });
  }
});

// Get unread message count
router.get("/unread", authMiddleware, (req, res) => {
  try {
    const result = db.prepare(
      `SELECT COUNT(*) as count FROM messages m
       JOIN conversations c ON m.conversationId = c.id
       WHERE (c.user1Id = ? OR c.user2Id = ?)
       AND m.senderId != ? AND m.readAt IS NULL`
    ).get(req.user.id, req.user.id, req.user.id);

    res.json({ unread: result.count });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch unread count." });
  }
});

module.exports = router;
