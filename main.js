const express = require("express");
const rateLimit = require('express-rate-limit');
const session = require('express-session');
require("dotenv").config();
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");
const QRCode = require("qrcode");
const admin = require("firebase-admin");
const { db } = require("./firebase/firebase");
const time = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "full" });
const timeClock = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta", timeStyle: "medium" });

const { createCaptcha } = require("./utils/createCaptcha");

const {
  HttpError,
  Lemon
} = require("./utils/allFunction");

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

const captchaLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 30,
  message: {
      ok: false,
      message: "Apakah Kamu Sedang Melakukan DoS ??"
  }
});

// ===============================

app.set("trust proxy", 1);

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'super-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 300000 }
}));

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
    socket.user = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key');
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
        return socket.emit("error", "Kamu Tidak Di Izinkan Untuk Membuat Room");

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
      return res.send(Lemon.createHTMLLogin(status, qrImg));
    }

    if (status.ready) {
      res.send(Lemon.createHTMLLoginSukses(status));
    } else {
      res.send(Lemon.createHTMLLoading());
    }
  } catch (error) {
    console.error("QR page error:", error);
    res.status(500).send(Lemon.createHTMLError(error));
  }
});

app.get("/whatsapp/restart", (req, res) => {
  try {
    const { sandi } = req.query;
    if (!sandi) {
      return res.status(400).json({ ok: false, message: "Masukkan kata sandi di req body. /whatsapp/restart?sandi=12345" });
    }
    if (sandi !== process.env.WHATSAPP_RESTART_PASSWORD) {
      return res.status(403).json({ ok: false, message: "Kata sandi salah" });
    }
    console.log("🔄 Manual WhatsApp restart requested");
    restartWhatsApp();
    res.json({ ok: true, message: "WhatsApp restart initiated" });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.get("/whatsapp/clean", (_, res) => {
  try {
    console.log("Manual session clean requested");
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

// Captcha ================================

app.get("/api/captcha", captchaLimiter, async (req, res) => {
  try {
    const imageBuffer = await createCaptcha(req);
    res.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Content-Length': imageBuffer.length
    });
    res.end(imageBuffer);
  } catch (err) {
    console.error("Captcha error:", err.message);
    res.status(500).json({ ok: false, message: "Gagal membuat captcha" });
  }
});


// Register ================================


app.post("/api/register", async (req, res) => {
  try {
    const { phone, username, password, code } = req.body;
    if (!phone || !username || !password || !code)
      throw new Error("Data tidak lengkap");

    Lemon.checkNumber(phone);

    const otpCheck = await verifyOtp(phone, code, "register");
    if (!otpCheck.valid) throw new Error("OTP tidak valid");

    await registerUser({ phone, username, password });
    res.json({ ok: true });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(400).json({ ok: false, message: err.message });
  }
});


app.post("/api/register/otp/send", captchaLimiter, async (req, res) => {
  try {
    const { phone, captcha } = req.body;
    if (!phone) {
      throw new Error("Nomor telepon wajib diisi");
    }

    const storedCaptcha = req.session.captchaCode;
    delete req.session.captchaCode;

    if (!storedCaptcha) {
      throw new Error(`Captcha kedaluwarsa. Silakan klik gambar untuk kode baru.\n${time}:${timeClock}\n`);
    }
    if (!captcha || captcha.toUpperCase() !== storedCaptcha.toUpperCase()) {
      throw new Error(`Kode Captcha salah. Silakan coba lagi.\n${time}:${timeClock}\n`);
    }

    const whatsappStatus = getWhatsAppStatus();
    if (!whatsappStatus.ready) {
      throw new Error("Terjadi kesalahan pada server, Silahkan hubungi 6282172175234");
    }

    Lemon.checkNumber(phone);
    const otp = await createOtp(phone, "register");
    await sendOtp(phone, otp, "register");

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
      errorMessage = "WhatsApp server belum siap";
    } else if (err.message.includes("Bad MAC")) {
      errorMessage = "Session WhatsApp bermasalah";
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
    
    const result = await verifyOtp(phone, code, "register", false);
    
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

    Lemon.checkNumber(phone);

    const otpCheck = await verifyOtp(phone, code, "reset");
    if (!otpCheck.valid) throw new Error("OTP tidak valid");

    await resetPassword({ phone, newPassword });
    res.json({ ok: true });
  } catch (err) {
    console.error("Reset password error:", err.message);
    res.status(400).json({ ok: false, message: err.message });
  }
});


app.post("/api/reset/otp/send", captchaLimiter, async (req, res) => {
  
  try {
    const { phone, captcha } = req.body;
    if (!phone) throw new Error("Phone required");
      
    const storedCaptcha = req.session.captchaCode;
    delete req.session.captchaCode;

    if (!storedCaptcha) {
      throw new Error(`Captcha kedaluwarsa. Silakan klik gambar untuk kode baru.\n${time}:${timeClock}\n`);
    }
    if (!captcha || captcha.toUpperCase() !== storedCaptcha.toUpperCase()) {
      throw new Error(`Kode Captcha salah. Silakan coba lagi.\n${time}:${timeClock}\n`);
    }
    
    const whatsappStatus = getWhatsAppStatus();
    if (!whatsappStatus.ready) {
      throw new Error("WhatsApp belum siap. Silakan scan QR di /whatsapp/login");
    }

    Lemon.checkNumber(phone);

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

    Lemon.checkNumber(phone);

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