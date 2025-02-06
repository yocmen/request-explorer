const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Create or open database
const dbPath = path.join(__dirname, "config.db");
const db = new sqlite3.Database(dbPath);

// Initialize table
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS url_configs (
      id TEXT PRIMARY KEY,
      status INTEGER NOT NULL,
      body TEXT NOT NULL,
      contentType TEXT NOT NULL
    )
  `);
});

// Get config by ID
function getConfig(id) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM url_configs WHERE id = ?", [id], (err, row) => {
      if (err) {
        return reject(err);
      }
      resolve(row);
    });
  });
}

// Create or update config
function setConfig(id, { status, body, contentType }) {
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO url_configs (id, status, body, contentType)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET status=excluded.status, body=excluded.body, contentType=excluded.contentType
    `,
      [id, status, body, contentType],
      (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      }
    );
  });
}

module.exports = {
  getConfig,
  setConfig,
};
