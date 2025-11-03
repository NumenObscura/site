// server.js
import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// Environment variables
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
const GOOGLE_SCRIPT_KEY = process.env.GOOGLE_SCRIPT_KEY;

const HASHED_PASS_LOGIN = process.env.HASHED_PASS_LOGIN || "$2a$12$0GyevvDraOWwNX9YZsQPZeEE1G9y4b9aqnutThb3zuS34JZAzb6Gy";
const HASHED_PASS_SECRET = process.env.HASHED_PASS_SECRET || "$2a$12$bbhSXrQ4VnT.6WYDJ5QZGuYj8e8LQ89VnJiinhcudbffb37HJ1ic.";

// In-memory store of users
const users = new Map();

// Google Sheet logger
async function logToSheet(name, token, action = "unspecified") {
  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        token,
        action,
        secret: GOOGLE_SCRIPT_KEY
      }),
    });
    console.log(`[LOGGED] ${name} (${action}) → Sheet updated`);
  } catch (err) {
    console.error("Failed to log to Google Sheet:", err);
  }
}

// LOGIN endpoint
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
    await logToSheet(name, token, "login");
  } else {
    await logToSheet(name, record.token, "login (repeat)");
  }

  return res.json({ ok: true, token: record.token });
});

// PASSPHRASE endpoint
app.post("/api/verify-passphrase", async (req, res) => {
  const { passphrase, name } = req.body || {};
  const valid = await bcrypt.compare(passphrase, HASHED_PASS_SECRET);
  if (!valid) return res.status(401).json({ ok: false });

  const token = users.get(name)?.token || "N/A";
  await logToSheet(name || "Unknown", token, "passphrase_ok");

  return res.json({
    ok: true,
    snippet: `// Secret snippet revealed
console.log("Access granted: hidden code");`,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on http://localhost:" + PORT));
