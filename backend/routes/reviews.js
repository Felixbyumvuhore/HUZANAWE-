const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get reviews for a provider
router.get('/:providerId', (req, res) => {
    try {
        const reviews = db.prepare(`
      SELECT r.*, u.name as userName
      FROM reviews r
      JOIN users u ON r.userId = u.id
      WHERE r.providerId = ?
      ORDER BY r.createdAt DESC
    `).all(req.params.providerId);

        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch reviews.' });
    }
});

// Add review
router.post('/', authMiddleware, (req, res) => {
    try {
        const { providerId, rating, comment } = req.body;

        if (!providerId || !rating) {
            return res.status(400).json({ error: 'Provider ID and rating are required.' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
        }

        const provider = db.prepare('SELECT * FROM providers WHERE id = ?').get(providerId);
        if (!provider) return res.status(404).json({ error: 'Provider not found.' });

        // Check if user already reviewed this provider
        const existing = db.prepare('SELECT id FROM reviews WHERE userId = ? AND providerId = ?').get(req.user.id, providerId);
        if (existing) {
            return res.status(400).json({ error: 'You have already reviewed this provider.' });
        }

        db.prepare(
            'INSERT INTO reviews (userId, providerId, rating, comment) VALUES (?, ?, ?, ?)'
        ).run(req.user.id, providerId, rating, comment || null);

        // Update provider average rating
        const stats = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE providerId = ?').get(providerId);
        db.prepare('UPDATE providers SET rating = ?, totalReviews = ? WHERE id = ?').run(
            Math.round(stats.avg * 10) / 10,
            stats.count,
            providerId
        );

        const reviews = db.prepare(`
      SELECT r.*, u.name as userName
      FROM reviews r JOIN users u ON r.userId = u.id
      WHERE r.providerId = ?
      ORDER BY r.createdAt DESC
    `).all(providerId);

        res.status(201).json(reviews);
    } catch (err) {
        res.status(500).json({ error: 'Failed to add review.' });
    }
});

module.exports = router;