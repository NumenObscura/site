// script.js
document.addEventListener("DOMContentLoaded", () => {
    const storyContainer = document.getElementById("story-container");
    const triggerWord = document.getElementById("trigger-word");
    const terminalContainer = document.getElementById("terminal-container");
    const terminalOutput = document.getElementById("terminal-output");
    const userInput = document.getElementById("user-input");
    const humSound = document.getElementById("hum-sound");

    triggerWord.addEventListener("click", fadeToTerminal);
    initGlitch();

    function fadeToTerminal() {
        storyContainer.style.opacity = "0";
        setTimeout(() => {
            document.body.style.backgroundColor = "black";
            storyContainer.classList.add("hidden");
            terminalContainer.classList.remove("hidden");
            checkExistingLogin();
        }, 350);
    }

    async function checkExistingLogin() {
        const savedName = localStorage.getItem("userName");
        const savedToken = localStorage.getItem("token");

        if (savedName && savedToken) {
            await typeLog(`[BOOT] Welcome back, ${savedName}.`);
            startHum();
            enableCommandMode(savedName);
        } else {
            startTerminal();
        }
    }

    function typeLog(text, speed = 15) {
        return new Promise((resolve) => {
            const line = document.createElement("div");
            terminalOutput.appendChild(line);
            let i = 0;
            function step() {
                if (i < text.length) {
                    line.textContent += text.charAt(i++);
                    terminalOutput.scrollTop = terminalOutput.scrollHeight;
                    setTimeout(step, speed);
                } else {
                    terminalOutput.appendChild(document.createElement("br"));
                    resolve();
                }
            }
            step();
        });
    }

    async function startTerminal() {
        terminalOutput.textContent = "";
        await typeLog("[BOOT] Initializing Obscura Interface...");
        await typeLog("[LOGIN] Identify yourself:");

        let stage = "name";
        let name = "";

        const onKey = async (e) => {
            if (e.key !== "Enter") return;
            const value = userInput.value.trim();
            userInput.value = "";

            if (stage === "name") {
                name = value || "unknown";
                await typeLog(`[LOGIN] User registered: ${name}`);
                await typeLog("[LOGIN] Enter access key:");
                stage = "password";
            } else if (stage === "password") {
                const res = await fetch("/api/auth", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, pass: value }),
                });
                const j = await res.json();
                if (j.ok && j.token) {
                    await typeLog("[SEC] Access granted.");
                    localStorage.setItem("userName", name);
                    localStorage.setItem("token", j.token);
                    startHum();
                    enableCommandMode(name);
                    userInput.removeEventListener("keydown", onKey);
                } else {
                    await typeLog("[SEC] Access denied. Try again.");
                }
            }
        };

        userInput.addEventListener("keydown", onKey);
    }

    function enableCommandMode(userName) {
        typeLog("[OBSCURA v3.1.0] Core active. Awaiting command input.");
        userInput.focus();

        const handler = async (e) => {
            if (e.key !== "Enter") return;
            const raw = userInput.value.trim();
            userInput.value = "";
            if (!raw) return;
            const cmd = raw.toLowerCase();
            instantLog(`${userName}> ${cmd}`);

            if (cmd === "help") {
                await typeLog("[OBSCURA v3.1.0] Commands: help, status, decode, logout, exit");
            } else if (cmd === "status") {
                await typeLog("[OBSCURA v3.1.0] Systems nominal.");
            } else if (cmd === "logout") {
                localStorage.removeItem("userName");
                localStorage.removeItem("token");
                await typeLog("[OBSCURA v3.1.0] Session data cleared. Reboot required.");
            } else if (cmd === "exit") {
                await typeLog("[OBSCURA v3.1.0] Terminating session...");
                await stopHum();
                userInput.removeEventListener("keydown", handler);
                await typeLog("[LOGIN] Identify yourself:");
                startTerminal(); // restart login flow
            } else if (cmd.startsWith("decode")) {
                const passphrase = cmd.replace(/^decode\s*/, "").trim();
                if (passphrase) {
                    await verifyPassphrase(passphrase);
                } else {
                    await typeLog("[OBSCURA v3.1.0] Enter decryption key:");
                    const keyListener = async (e2) => {
                        if (e2.key !== "Enter") return;
                        const entered = userInput.value.trim().toLowerCase();
                        userInput.value = "";
                        userInput.removeEventListener("keydown", keyListener);
                        await verifyPassphrase(entered);
                    };
                    userInput.addEventListener("keydown", keyListener);
                }
            } else {
                await typeLog("[OBSCURA v3.1.0] Command not recognized.");
            }
        };

        userInput.addEventListener("keydown", handler);
    }

    async function verifyPassphrase(passphrase) {
        const cleaned = passphrase.toLowerCase().trim();
        const res = await fetch("/api/verify-passphrase", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ passphrase: cleaned }),
        });
        const j = await res.json();
        if (j.ok && j.snippet) {
            await typeLog("[ARCHIVE] Passphrase accepted. Revealing protocol...");
            const pre = document.createElement("pre");
            pre.className = "code-snippet";
            pre.textContent = j.snippet;
            terminalOutput.appendChild(pre);
            terminalOutput.scrollTop = terminalOutput.scrollHeight;
        } else {
            await typeLog("[OBSCURA v3.1.0] Incorrect decryption key.");
        }
    }

    function instantLog(text) {
        const line = document.createElement("div");
        line.textContent = text;
        terminalOutput.appendChild(line);
        terminalOutput.appendChild(document.createElement("br"));
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    function startHum() {
        humSound.volume = 0;
        humSound.play().catch(() => { });
        const iv = setInterval(() => {
            humSound.volume = Math.min(0.25, humSound.volume + 0.02);
            if (humSound.volume >= 0.25) clearInterval(iv);
        }, 150);
    }

    function stopHum() {
        return new Promise((resolve) => {
            const fade = setInterval(() => {
                humSound.volume = Math.max(0, humSound.volume - 0.02);
                if (humSound.volume <= 0) {
                    clearInterval(fade);
                    humSound.pause();
                    humSound.currentTime = 0;
                    resolve();
                }
            }, 150);
        });
    }

    function initGlitch() {
        const zone = document.getElementById("glitch-zone");
        const text = zone.textContent;
        zone.textContent = "";
        text.split("").forEach((ch) => {
            const s = document.createElement("span");
            s.textContent = ch;
            zone.appendChild(s);
        });
        const spans = zone.querySelectorAll("span");
        setInterval(() => {
            if (Math.random() < 0.3) {
                const i = Math.floor(Math.random() * spans.length);
                spans[i].classList.add("glitch");
                setTimeout(() => spans[i].classList.remove("glitch"), 120);
            }
        }, 8000 + Math.random() * 7000);
    }
});
