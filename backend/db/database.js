const initSqlJs = require("sql.js");
const path = require("path");
const fs = require("fs");

const DB_PATH = path.join(__dirname, "..", "huzanawe.db");

let _db = null;

function saveDb() {
  if (!_db) return;
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

class Statement {
  constructor(db, sql) {
    this._db = db;
    this._sql = sql;
  }

  run(...params) {
    const stmt = this._db.prepare(this._sql);
    if (params.length > 0) stmt.bind(params);
    stmt.step();
    stmt.free();
    const idRes = this._db.exec("SELECT last_insert_rowid()");
    const lastInsertRowid =
      (idRes[0] && idRes[0].values[0] && idRes[0].values[0][0]) || 0;
    const chRes = this._db.exec("SELECT changes()");
    const changes =
      (chRes[0] && chRes[0].values[0] && chRes[0].values[0][0]) || 0;
    saveDb();
    return { lastInsertRowid, changes };
  }

  get(...params) {
    const stmt = this._db.prepare(this._sql);
    if (params.length > 0) stmt.bind(params);
    let result = null;
    if (stmt.step()) {
      result = stmt.getAsObject();
    }
    stmt.free();
    return result || undefined;
  }

  all(...params) {
    const stmt = this._db.prepare(this._sql);
    if (params.length > 0) stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }
}

const wrapper = {
  exec(sql) {
    _db.exec(sql);
    saveDb();
  },
  prepare(sql) {
    return new Statement(_db, sql);
  },
  pragma(_setting) {
    // Handled during init
  },
};

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(buffer);
  } else {
    _db = new SQL.Database();
  }

  _db.run("PRAGMA foreign_keys = ON");

  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'client' CHECK(role IN ('client', 'provider', 'admin')),
      isPremium INTEGER NOT NULL DEFAULT 0,
      avatar TEXT,
      cvUrl TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL UNIQUE,
      category TEXT NOT NULL,
      location TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      description TEXT,
      rating REAL NOT NULL DEFAULT 0,
      totalReviews INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS portfolio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      providerId INTEGER NOT NULL,
      imageUrl TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (providerId) REFERENCES providers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      providerId INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (providerId) REFERENCES providers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      providerId INTEGER NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      duration TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (providerId) REFERENCES providers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payerId INTEGER NOT NULL,
      payerRole TEXT NOT NULL CHECK(payerRole IN ('client', 'provider')),
      targetUserId INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      method TEXT NOT NULL CHECK(method IN ('momo', 'bank')),
      phone TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'rejected')),
      reference TEXT,
      confirmedBy INTEGER,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      confirmedAt TEXT,
      FOREIGN KEY (payerId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (targetUserId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (confirmedBy) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1Id INTEGER NOT NULL,
      user2Id INTEGER NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user1Id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (user2Id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user1Id, user2Id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversationId INTEGER NOT NULL,
      senderId INTEGER NOT NULL,
      content TEXT NOT NULL,
      readAt TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Migrate: add avatar/cvUrl columns if missing
  try {
    _db.exec("ALTER TABLE users ADD COLUMN avatar TEXT");
  } catch (_) {
    /* column may already exist */
  }
  try {
    _db.exec("ALTER TABLE users ADD COLUMN cvUrl TEXT");
  } catch (_) {
    /* column may already exist */
  }

  // Seed admin account if not exists
  const bcrypt = require("bcryptjs");
  const adminExists = wrapper
    .prepare("SELECT id FROM users WHERE role = ?")
    .get("admin");
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync("admin123", 10);
    wrapper
      .prepare(
        "INSERT INTO users (name, email, phone, password, role, isPremium) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(
        "Admin",
        "admin@huzanawe.com",
        "+250780000000",
        hashedPassword,
        "admin",
        1,
      );
  }

  saveDb();
}

module.exports = wrapper;
module.exports.initDatabase = initDatabase;
