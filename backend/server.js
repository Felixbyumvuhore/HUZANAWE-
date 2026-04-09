require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { initDatabase } = require("./db/database");

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

// Root route
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    message: "Huzanawe API is running",
    docs: "/api/health",
  });
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Huzanawe API is running" });
});

async function start() {
  await initDatabase();

  // Routes (loaded after DB is initialized)
  app.use("/api/auth", require("./routes/auth"));
  app.use("/api/providers", require("./routes/providers"));
  app.use("/api/reviews", require("./routes/reviews"));
  app.use("/api/admin", require("./routes/admin"));
  app.use("/api/upload", require("./routes/upload"));
  app.use("/api/payments", require("./routes/payments"));
  app.use("/api/chat", require("./routes/chat"));

  app.listen(PORT, () => {
    console.log(`Huzanawe server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
