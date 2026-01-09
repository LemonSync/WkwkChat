const express = require("express");
require("dotenv").config();
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");
const QRCode = require("qrcode");
const admin = require("firebase-admin");
const { db } = require("./firebase/firebase");

const { HttpError, checkNumber } = require("./utils/allFunction");

const {
  createOtp,
  verifyOtp,
  registerUser,
  loginUser,
  resetPassword,
  saveMessage,
} = require("./firebase/firebaseHelper");

const {
  initWhatsApp,
  isWhatsappReady,
  getQR,
  sendOtp,
  restartWhatsApp,
  getWhatsAppStatus,
  hapusSesiKorup
} = require("./whatsapp/baileys");

const app = express();

// ===============================

app.set("trust proxy", 1);

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================

app.use(express.static(path.join(__dirname, "public")));

// ===============================

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ===============================

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Unauthorized"));

  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

// ===============================

io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.user.username);

  // Buat Room
  socket.on("create-room", async (roomId) => {
    try {
      if (socket.user.role !== "creator")
        return socket.emit("error", "Tidak punya izin membuat room");

      if (!roomId) return socket.emit("error", "Room ID wajib");

      const ref = db.collection("rooms").doc(roomId);
      const snap = await ref.get();

      if (snap.exists) return socket.emit("error", "Room sudah ada");

      await ref.set({
        roomId,
        createdBy: socket.user.phone,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      socket.emit("room-created", roomId);
    } catch (e) {
      socket.emit("error", e.message);
    }
  });

  // Join Room
  socket.on("join-room", async (roomId) => {
    if (!roomId) return;

    const ref = db.collection("rooms").doc(roomId);
    const snap = await ref.get();

    if (!snap.exists) return socket.emit("error", "Room tidak ditemukan");

    socket.join(roomId);

    socket.emit("joined", roomId);
    socket.to(roomId).emit("system", {
      text: `${socket.user.username} bergabung`,
      time: Date.now(),
    });
  });

  // Kirim Pesan
  socket.on("send-message", async ({ roomId, message }) => {
    if (!roomId || !message) return;

    const roomSnap = await db.collection("rooms").doc(roomId).get();
    if (!roomSnap.exists) return socket.emit("error", "Room tidak ditemukan");

    await saveMessage({
      roomId,
      user: socket.user.username,
      text: message,
    });

    io.to(roomId).emit("message", {
      user: socket.user.username,
      text: message,
      time: Date.now(),
    });
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.user.username);
  });
});

try {
  initWhatsApp();
  console.log("🔄 WhatsApp initialization started");
} catch (error) {
  console.error("❌ Failed to init WhatsApp:", error.message);
}

// ===============================

app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Whatsapp QR Login ================

app.get("/whatsapp/login", async (_, res) => {
  try {
    const qr = getQR();
    const status = getWhatsAppStatus();

    if (qr) {
      const qrImg = await QRCode.toDataURL(qr);
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Scan WhatsApp QR</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 30px; 
              background: #f5f5f5;
            }
            .container { 
              max-width: 500px; 
              margin: 0 auto; 
              background: white; 
              padding: 30px; 
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h2 { color: #25D366; }
            img { 
              max-width: 300px; 
              border: 2px solid #ddd; 
              border-radius: 5px;
              margin: 20px 0;
            }
            .status { 
              padding: 10px; 
              border-radius: 5px; 
              margin: 15px 0;
              font-weight: bold;
            }
            .ready { background: #d4edda; color: #155724; }
            .waiting { background: #fff3cd; color: #856404; }
            .error { background: #f8d7da; color: #721c24; }
            .info { background: #d1ecf1; color: #0c5460; margin: 10px 0; padding: 10px; border-radius: 5px; }
            button { 
              padding: 10px 20px; 
              background: #25D366; 
              color: white; 
              border: none; 
              border-radius: 5px; 
              cursor: pointer;
              font-size: 16px;
              margin: 5px;
            }
            button:hover { background: #1da851; }
            button.restart { background: #ffc107; color: #000; }
            button.clean { background: #dc3545; }
            .button-group { margin: 20px 0; }
            pre {
              background: #f8f9fa;
              padding: 10px;
              border-radius: 5px;
              text-align: left;
              overflow: auto;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>📱 Scan QR Code WhatsApp</h2>
            <div class="info">
              <strong>Cara scan:</strong><br>
              1. Buka WhatsApp di HP<br>
              2. Settings → Linked Devices → Link a Device<br>
              3. Scan QR code di bawah
            </div>
            
            <img src="${qrImg}" />
            
            <div class="status waiting">
              ⏳ Menunggu scan... (Refresh otomatis setiap 5 detik)
            </div>
            
            <div class="button-group">
              <button onclick="location.reload()">🔄 Refresh Status</button>
              <button class="restart" onclick="restartWhatsApp()">🔁 Restart WhatsApp</button>
              <button class="clean" onclick="cleanSession()">🧹 Clean Session</button>
            </div>
            
            <div style="margin-top: 20px; text-align: left;">
              <strong>Debug Info:</strong>
              <pre>${JSON.stringify(status, null, 2)}</pre>
            </div>
            
            <p><a href="/">⬅ Kembali ke Aplikasi</a></p>
            
            <script>
              // Auto refresh setiap 5 detik jika belum ready
              if (!${status.ready}) {
                setTimeout(() => location.reload(), 5000);
              }
              
              function restartWhatsApp() {
                fetch('/whatsapp/restart', { method: 'POST' })
                  .then(() => {
                    alert('WhatsApp restart initiated!');
                    setTimeout(() => location.reload(), 2000);
                  })
                  .catch(err => alert('Error: ' + err));
              }
              
              function cleanSession() {
                if (confirm('Yakin hapus session? Akan perlu scan QR lagi.')) {
                  fetch('/whatsapp/clean', { method: 'POST' })
                    .then(() => {
                      alert('Session cleaned!');
                      setTimeout(() => location.reload(), 2000);
                    })
                    .catch(err => alert('Error: ' + err));
                }
              }
            </script>
          </div>
        </body>
        </html>
      `);
    }

    if (status.ready) {
      res.send(`
        <div style="text-align: center; padding: 50px;">
          <h2 style="color: green;">✅ WhatsApp Ready!</h2>
          <p>WhatsApp sudah terhubung dan siap mengirim OTP</p>
          <p><a href="/">Kembali ke Aplikasi</a></p>
          <div style="margin-top: 30px; text-align: left; display: inline-block;">
            <strong>Status:</strong>
            <pre>${JSON.stringify(status, null, 2)}</pre>
          </div>
        </div>
      `);
    } else {
      res.send(`
        <div style="text-align: center; padding: 50px;">
          <h2 style="color: orange;">⏳ Generating QR Code...</h2>
          <p>Silakan refresh halaman ini dalam beberapa detik</p>
          <p><button onclick="location.reload()">Refresh</button></p>
          <script>setTimeout(() => location.reload(), 3000);</script>
        </div>
      `);
    }
  } catch (error) {
    console.error("QR page error:", error);
    res.status(500).send(`
      <div style="text-align: center; padding: 50px;">
        <h2 style="color: red;">❌ Error Loading QR</h2>
        <p>${error.message}</p>
        <p><a href="/whatsapp/restart" onclick="event.preventDefault(); fetch('/whatsapp/restart', {method:'POST'}).then(()=>location.reload())">Restart WhatsApp</a></p>
      </div>
    `);
  }
});

app.get("/whatsapp/restart", (_, res) => {
  try {
    console.log("🔄 Manual WhatsApp restart requested");
    restartWhatsApp();
    res.json({ ok: true, message: "WhatsApp restart initiated" });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.get("/whatsapp/clean", (_, res) => {
  try {
    console.log("🧹 Manual session clean requested");
    hapusSesiKorup();
    setTimeout(() => {
      initWhatsApp();
    }, 1000);
    res.json({ ok: true, message: "Session cleaned and restarting" });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.get("/whatsapp/status", (_, res) => {
  try {
    const status = getWhatsAppStatus();
    res.json({ ok: true, status });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Register ================================

app.post("/api/register", async (req, res) => {
  try {
    const { phone, username, password, code } = req.body;
    if (!phone || !username || !password || !code)
      throw new Error("Data tidak lengkap");

    checkNumber(phone);

    const otpCheck = await verifyOtp(phone, code, "register");
    if (!otpCheck.valid) throw new Error("OTP tidak valid");

    await registerUser({ phone, username, password });
    res.json({ ok: true });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(400).json({ ok: false, message: err.message });
  }
});

app.post("/api/register/otp/send", async (req, res) => {
  console.log("📱 OTP Send request:", req.body);
  
  try {
    const { phone } = req.body;
    if (!phone) {
      console.log("❌ No phone provided");
      throw new Error("Nomor telepon wajib diisi");
    }

    const whatsappStatus = getWhatsAppStatus();
    console.log("WhatsApp status:", whatsappStatus);
    
    if (!whatsappStatus.ready) {
      console.log("❌ WhatsApp not ready. Status:", whatsappStatus);
      throw new Error("WhatsApp belum siap. Silakan scan QR di /whatsapp/login terlebih dahulu");
    }

    checkNumber(phone);
    console.log("✅ Phone validated:", phone);

    const otp = await createOtp(phone, "register");
    console.log(`✅ OTP created: ${otp} for ${phone}`);

    console.log(`📤 Sending OTP via WhatsApp to ${phone}...`);
    await sendOtp(phone, otp, "register");
    console.log(`✅ OTP sent successfully to ${phone}`);

    res.json({ 
      ok: true, 
      message: "OTP berhasil dikirim ke WhatsApp",
      debug: { 
        phone, 
        otpLength: otp.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error("❌ OTP Send Error:", err.message);
    console.error("Stack:", err.stack);
    
    let errorMessage = err.message;
    if (err.message.includes("not registered")) {
      errorMessage = `Nomor ${req.body?.phone} tidak terdaftar di WhatsApp`;
    } else if (err.message.includes("WhatsApp belum siap")) {
      errorMessage = "WhatsApp server belum siap. Silakan scan QR code di /whatsapp/login";
    } else if (err.message.includes("Bad MAC")) {
      errorMessage = "Session WhatsApp bermasalah. Silakan restart di /whatsapp/login";
    }
    
    res.status(400).json({ 
      ok: false, 
      message: errorMessage,
      error: err.toString(),
      help: "Buka /whatsapp/login untuk scan QR WhatsApp"
    });
  }
});

app.post("/api/register/otp/verify", async (req, res) => {
  try {
    const { phone, code } = req.body;
    console.log(`🔍 Verifying OTP: ${phone} → ${code}`);
    
    const result = await verifyOtp(phone, code, "register", false);
    console.log(`✅ OTP verification result: ${result.valid ? 'VALID' : 'INVALID'}`);
    
    res.json({ valid: result.valid });
  } catch (err) {
    console.error("OTP verify error:", err.message);
    res.status(400).json({ valid: false, message: err.message });
  }
});

// Reset Password ================================

app.post("/api/reset", async (req, res) => {
  try {
    const { phone, code, newPassword } = req.body;
    if (!phone || !code || !newPassword) throw new Error("Data tidak lengkap");

    checkNumber(phone);

    const otpCheck = await verifyOtp(phone, code, "reset");
    if (!otpCheck.valid) throw new Error("OTP tidak valid");

    await resetPassword({ phone, newPassword });
    res.json({ ok: true });
  } catch (err) {
    console.error("Reset password error:", err.message);
    res.status(400).json({ ok: false, message: err.message });
  }
});

app.post("/api/reset/otp/send", async (req, res) => {
  console.log("📱 Reset OTP Send request:", req.body);
  
  try {
    const { phone } = req.body;
    if (!phone) throw new Error("Phone required");
    
    const whatsappStatus = getWhatsAppStatus();
    if (!whatsappStatus.ready) {
      throw new Error("WhatsApp belum siap. Silakan scan QR di /whatsapp/login");
    }

    checkNumber(phone);

    const otp = await createOtp(phone, "reset");
    await sendOtp(phone, otp, "reset");

    res.json({ 
      ok: true, 
      message: "OTP reset berhasil dikirim",
      debug: { phone, timestamp: new Date().toISOString() }
    });
  } catch (err) {
    console.error("Reset OTP send error:", err.message);
    
    let errorMessage = err.message;
    if (err.message.includes("not registered")) {
      errorMessage = `Nomor ${req.body?.phone} tidak terdaftar di WhatsApp`;
    }
    
    res.status(400).json({ 
      ok: false, 
      message: errorMessage,
      help: "Buka /whatsapp/login untuk scan QR WhatsApp"
    });
  }
});

app.post("/api/reset/otp/verify", async (req, res) => {
  try {
    const { phone, code } = req.body;
    const result = await verifyOtp(phone, code, "reset", false);
    res.json({ valid: result.valid });
  } catch (err) {
    console.error("Reset OTP verify error:", err.message);
    res.status(400).json({ valid: false, message: err.message });
  }
});

// Login ================================

app.post("/api/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) throw new Error("Data tidak lengkap");

    checkNumber(phone);

    const user = await loginUser({ phone, password });

    const token = jwt.sign(
      {
        phone: user.phone,
        username: user.username,
        role: user.role || "user",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ 
      ok: true, 
      token,
      user: {
        phone: user.phone,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(401).json({ 
      ok: false, 
      message: err.message,
      error: "Invalid credentials"
    });
  }
});

app.get("/health", (_, res) => {
  const status = {
    server: "running",
    timestamp: new Date().toISOString(),
    firebase: "connected",
    whatsapp: getWhatsAppStatus(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  };
  res.json(status);
});

// ===============================

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, req, res, next) => {
  console.error("🔥 GLOBAL ERROR:", err.message);
  console.error("Stack:", err.stack);
  
  res.status(err.statusCode || 500).json({
    ok: false,
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.toString() : undefined
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📱 WhatsApp QR: http://localhost:${PORT}/whatsapp/login`);
  console.log(`🔧 WhatsApp status: http://localhost:${PORT}/whatsapp/status`);
});