const express = require("express");
const db = require("../db/database");
const { authMiddleware, providerMiddleware } = require("../middleware/auth");

const router = express.Router();

// Get all providers with optional filters
router.get("/", (req, res) => {
    try {
        const {
            category,
            location,
            minPrice,
            maxPrice,
            minRating,
            search,
            limit,
            offset,
        } = req.query;

        let query = `
      SELECT p.*, u.name, u.email, u.phone, u.isPremium
      FROM providers p
      JOIN users u ON p.userId = u.id
      WHERE 1=1
    `;
        const params = [];

        if (category) {
            query += " AND LOWER(p.category) = LOWER(?)";
            params.push(category);
        }
        if (location) {
            query += " AND LOWER(p.location) LIKE LOWER(?)";
            params.push(`%${location}%`);
        }
        if (minPrice) {
            query += " AND p.price >= ?";
            params.push(Number(minPrice));
        }
        if (maxPrice) {
            query += " AND p.price <= ?";
            params.push(Number(maxPrice));
        }
        if (minRating) {
            query += " AND p.rating >= ?";
            params.push(Number(minRating));
        }
        if (search) {
            query +=
                " AND (LOWER(u.name) LIKE LOWER(?) OR LOWER(p.category) LIKE LOWER(?) OR LOWER(p.description) LIKE LOWER(?))";
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += " ORDER BY p.rating DESC";

        if (limit) {
            query += " LIMIT ?";
            params.push(Number(limit));
        }
        if (offset) {
            query += " OFFSET ?";
            params.push(Number(offset));
        }

        const providers = db.prepare(query).all(...params);

        // Get portfolio and services for each provider
        const enriched = providers.map((p) => {
            const portfolio = db
                .prepare("SELECT * FROM portfolio WHERE providerId = ?")
                .all(p.id);
            const services = db
                .prepare("SELECT * FROM services WHERE providerId = ?")
                .all(p.id);
            return {...p, portfolio, services };
        });

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch providers." });
    }
});

// Get single provider
router.get("/:id", (req, res) => {
    try {
        const provider = db
            .prepare(
                `
      SELECT p.*, u.name, u.email, u.phone, u.isPremium
      FROM providers p
      JOIN users u ON p.userId = u.id
      WHERE p.id = ?
    `,
            )
            .get(req.params.id);

        if (!provider)
            return res.status(404).json({ error: "Provider not found." });

        const portfolio = db
            .prepare("SELECT * FROM portfolio WHERE providerId = ?")
            .all(provider.id);
        const services = db
            .prepare("SELECT * FROM services WHERE providerId = ?")
            .all(provider.id);
        const reviews = db
            .prepare(
                `
      SELECT r.*, u.name as userName
      FROM reviews r
      JOIN users u ON r.userId = u.id
      WHERE r.providerId = ?
      ORDER BY r.createdAt DESC
    `,
            )
            .all(provider.id);

        res.json({...provider, portfolio, services, reviews });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch provider." });
    }
});

// Update provider profile
router.put("/:id", authMiddleware, providerMiddleware, (req, res) => {
    try {
        const provider = db
            .prepare("SELECT * FROM providers WHERE id = ?")
            .get(req.params.id);
        if (!provider)
            return res.status(404).json({ error: "Provider not found." });
        if (provider.userId !== req.user.id && req.user.role !== "admin") {
            return res.status(403).json({ error: "Not authorized." });
        }

        const { category, location, price, description } = req.body;

        db.prepare(
            `
      UPDATE providers SET
        category = COALESCE(?, category),
        location = COALESCE(?, location),
        price = COALESCE(?, price),
        description = COALESCE(?, description)
      WHERE id = ?
    `,
        ).run(
            category || null,
            location || null,
            price ?? null,
            description || null,
            req.params.id,
        );

        // Also update user name/phone if provided
        if (req.body.name || req.body.phone) {
            db.prepare(
                `
        UPDATE users SET
          name = COALESCE(?, name),
          phone = COALESCE(?, phone)
        WHERE id = ?
      `,
            ).run(req.body.name || null, req.body.phone || null, provider.userId);
        }

        const updated = db
            .prepare(
                `
      SELECT p.*, u.name, u.email, u.phone
      FROM providers p JOIN users u ON p.userId = u.id
      WHERE p.id = ?
    `,
            )
            .get(req.params.id);

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: "Failed to update provider." });
    }
});

// Add service to provider
router.post("/:id/services", authMiddleware, providerMiddleware, (req, res) => {
    try {
        const provider = db
            .prepare("SELECT * FROM providers WHERE id = ?")
            .get(req.params.id);
        if (!provider ||
            (provider.userId !== req.user.id && req.user.role !== "admin")
        ) {
            return res.status(403).json({ error: "Not authorized." });
        }

        const { name, price, duration } = req.body;
        if (!name || price === undefined) {
            return res
                .status(400)
                .json({ error: "Service name and price are required." });
        }

        const result = db
            .prepare(
                "INSERT INTO services (providerId, name, price, duration) VALUES (?, ?, ?, ?)",
            )
            .run(req.params.id, name, price, duration || null);

        const service = db
            .prepare("SELECT * FROM services WHERE id = ?")
            .get(result.lastInsertRowid);
        res.status(201).json(service);
    } catch (err) {
        res.status(500).json({ error: "Failed to add service." });
    }
});

// Delete service
router.delete(
    "/:id/services/:serviceId",
    authMiddleware,
    providerMiddleware,
    (req, res) => {
        try {
            const provider = db
                .prepare("SELECT * FROM providers WHERE id = ?")
                .get(req.params.id);
            if (!provider ||
                (provider.userId !== req.user.id && req.user.role !== "admin")
            ) {
                return res.status(403).json({ error: "Not authorized." });
            }
            db.prepare("DELETE FROM services WHERE id = ? AND providerId = ?").run(
                req.params.serviceId,
                req.params.id,
            );
            res.json({ message: "Service deleted." });
        } catch (err) {
            res.status(500).json({ error: "Failed to delete service." });
        }
    },
);

// Get categories list
router.get("/meta/categories", (_req, res) => {
    try {
        const categories = db
            .prepare("SELECT DISTINCT category FROM providers ORDER BY category")
            .all();
        res.json(categories.map((c) => c.category));
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch categories." });
    }
});

module.exports = router;