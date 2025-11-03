// server.js
import express from "express";
import crypto from "crypto";
import cors from "cors";
import bodyParser from "body-parser";
import { google } from "googleapis";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// === GOOGLE SHEETS SETUP ===
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// === USER DATA ===
const users = new Map(); // name → { hash, token }

// === FUNCTIONS ===
async function logToSheet(name, token, passphrase_ok = false) {
  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A:D",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[name, token, now, passphrase_ok ? "YES" : "NO"]],
      },
    });
    console.log(`[LOGGED] ${name} at ${now}`);
  } catch (err) {
    console.error("❌ Sheet logging failed:", err.message);
  }
}

// === AUTH ENDPOINT ===
app.post("/api/auth", async (req, res) => {
  const { name, pass } = req.body;

  const valid = await bcrypt.compare(pass, process.env.HASHED_PASS_LOGIN);
  if (valid) {
    let record = users.get(name);
    if (!record) {
      const token = crypto.randomBytes(24).toString("hex");
      record = { token };
      users.set(name, record);
      console.log(`[AUTH OK] ${name} → token=${token}`);
      await logToSheet(name, token);
    } else {
      console.log(`[AUTH RETURN] ${name} → token=${record.token}`);
      await logToSheet(name, record.token);
    }
    return res.json({ ok: true, token: record.token });
  }

  res.json({ ok: false });
});

// === PASSPHRASE CHECK ===
app.post("/api/verify-passphrase", async (req, res) => {
  const { passphrase, name } = req.body;

  const valid = await bcrypt.compare(passphrase, process.env.HASHED_PASS_SECRET);
  if (valid) {
    const token = users.get(name)?.token || "N/A";
    await logToSheet(name, token, true);
    return res.json({
      ok: true,
      snippet: `// Secret snippet revealed
console.log("Access granted: hidden code");`,
    });
  }

  res.json({ ok: false });
});

// === SERVER ===
app.listen(process.env.PORT || 3000, () =>
  console.log(`✅ Server running on http://localhost:${process.env.PORT || 3000}`)
);
