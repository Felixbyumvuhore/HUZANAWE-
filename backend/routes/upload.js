const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../db/database');
const { authMiddleware, providerMiddleware } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Upload portfolio image
router.post('/:providerId', authMiddleware, providerMiddleware, upload.single('image'), (req, res) => {
    try {
        const provider = db.prepare('SELECT * FROM providers WHERE id = ?').get(req.params.providerId);
        if (!provider || (provider.userId !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'Not authorized.' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided.' });
        }

        const imageUrl = `/uploads/${req.file.filename}`;
        const result = db.prepare(
            'INSERT INTO portfolio (providerId, imageUrl) VALUES (?, ?)'
        ).run(req.params.providerId, imageUrl);

        const image = db.prepare('SELECT * FROM portfolio WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(image);
    } catch (err) {
        res.status(500).json({ error: 'Failed to upload image.' });
    }
});

// Delete portfolio image
router.delete('/:providerId/:imageId', authMiddleware, providerMiddleware, (req, res) => {
    try {
        const provider = db.prepare('SELECT * FROM providers WHERE id = ?').get(req.params.providerId);
        if (!provider || (provider.userId !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'Not authorized.' });
        }

        db.prepare('DELETE FROM portfolio WHERE id = ? AND providerId = ?').run(req.params.imageId, req.params.providerId);
        res.json({ message: 'Image deleted.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete image.' });
    }
});

module.exports = router;