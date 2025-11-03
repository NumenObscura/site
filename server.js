// server.js
import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// Store users in memory
const users = new Map(); // name -> { token }

// Bcrypt hashed passwords (from your .env)
const HASHED_PASS_LOGIN = "$2a$12$0GyevvDraOWwNX9YZsQPZeEE1G9y4b9aqnutThb3zuS34JZAzb6Gy"; // cicada3301
const HASHED_PASS_SECRET = "$2a$12$bbhSXrQ4VnT.6WYDJ5QZGuYj8e8LQ89VnJiinhcudbffb37HJ1ic."; // vide ultra visum

// --- AUTH: login ---
app.post("/api/auth", async (req, res) => {
    const { name, pass } = req.body;
    const valid = await bcrypt.compare(pass, HASHED_PASS_LOGIN);

    if (valid) {
        let record = users.get(name);
        if (!record) {
            const token = crypto.randomBytes(24).toString("hex");
            record = { token };
            users.set(name, record);
            console.log(`[AUTH OK] ${name} → token=${token}`);
        } else {
            console.log(`[AUTH RETURN] ${name} → token=${record.token}`);
        }
        return res.json({ ok: true, token: record.token });
    }

    res.json({ ok: false });
});

// --- Verify secret phrase ---
app.post("/api/verify-passphrase", async (req, res) => {
    const { passphrase } = req.body;
    const valid = await bcrypt.compare(passphrase, HASHED_PASS_SECRET);

    if (valid) {
        return res.json({
            ok: true,
            snippet: `#Copy, paste and run on any image to reveal the hidden code
#!/usr/bin/env python3
from PIL import Image

print("Enter path to your image file:")
path = input("> ").strip()
img = Image.open(path).convert("RGB")
pixels = img.load()

message = []
for y in range(img.height):
    for x in range(img.width):
        r, g, b = pixels[x, y]
        if abs(r - g) < 3 and abs(g - b) < 3:  # roughly grayscale pixel
            # reverse +100 offset
            val = r - 100
            if 32 <= val <= 126:
                message.append(chr(val))

hidden = "".join(message)
if hidden:
    print("\nPossible hidden message:\n")
    print("→", hidden)
else:
    print("\nNo readable ASCII sequence found.")

input("\nPress Enter to exit...")
`,
        });
    }

    res.json({ ok: false });
});

// --- Run server ---
app.listen(3000, () => console.log("Server running on http://localhost:3000"));
