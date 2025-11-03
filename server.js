// server.js
import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch"; // <-- make sure to install this: npm install node-fetch

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// Replace with your Google Apps Script URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/PASTE_YOUR_SCRIPT_ID_HERE/exec";

// Replace with your bcrypt hashes
const HASHED_PASS_LOGIN = process.env.HASHED_PASS_LOGIN || "$2a$12$0GyevvDraOWwNX9YZsQPZeEE1G9y4b9aqnutThb3zuS34JZAzb6Gy";
const HASHED_PASS_SECRET = process.env.HASHED_PASS_SECRET || "$2a$12$bbhSXrQ4VnT.6WYDJ5QZGuYj8e8LQ89VnJiinhcudbffb37HJ1ic.";

// In-memory store
const users = new Map();

async function logToSheet(name, token) {
  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, token }),
    });
    console.log(`[LOGGED] ${name} → Sheet updated`);
  } catch (err) {
    console.error("Failed to log to Google Sheet:", err);
  }
}

app.post("/api/auth", async (req, res) => {
  const { name, pass } = req.body || {};
  if (!name || !pass) return res.status(400).json({ ok: false });

  const valid = await bcrypt.compare(pass, HASHED_PASS_LOGIN);
  if (!valid) return res.status(401).json({ ok: false });

  let record = users.get(name);
  if (!record) {
    const token = crypto.randomBytes(24).toString("hex");
    record = { token };
    users.set(name, record);
    await logToSheet(name, token);
  } else {
    // returning user — log again but reuse token
    await logToSheet(name, record.token);
  }

  return res.json({ ok: true, token: record.token });
});

app.post("/api/verify-passphrase", async (req, res) => {
  const { passphrase } = req.body || {};
  const valid = await bcrypt.compare(passphrase, HASHED_PASS_SECRET);
  if (!valid) return res.status(401).json({ ok: false });

  return res.json({
    ok: true,
    snippet: `// Secret snippet revealed
console.log("Access granted: hidden code");`,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on http://localhost:" + PORT));
