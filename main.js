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
  saveMessage
} = require("./firebase/firebaseHelper");

const {
  initWhatsApp,
  isWhatsappReady,
  getQR,
  sendOtp
} = require("./whatsapp/baileys");

const app = express();

/* ===============================
   BASIC SERVER SETUP
================================ */
app.set("trust proxy", 1);

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===============================
   FRONTEND
================================ */
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ===============================
   HTTP + SOCKET
================================ */
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

/* ===============================
   SOCKET AUTH (JWT)
================================ */
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

/* ===============================
   SOCKET EVENTS
================================ */
io.on("connection", socket => {
  console.log("🔌 Connected:", socket.user.username);

  /* ===== CREATE ROOM (CREATOR ONLY) ===== */
  socket.on("create-room", async roomId => {
    try {
      if (socket.user.role !== "creator")
        return socket.emit("error", "Tidak punya izin membuat room");

      if (!roomId) return socket.emit("error", "Room ID wajib");

      const ref = db.collection("rooms").doc(roomId);
      const snap = await ref.get();

      if (snap.exists)
        return socket.emit("error", "Room sudah ada");

      await ref.set({
        roomId,
        createdBy: socket.user.phone,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      socket.emit("room-created", roomId);
    } catch (e) {
      socket.emit("error", e.message);
    }
  });

  /* ===== JOIN ROOM (SEMUA USER) ===== */
  socket.on("join-room", async roomId => {
    if (!roomId) return;

    const ref = db.collection("rooms").doc(roomId);
    const snap = await ref.get();

    if (!snap.exists)
      return socket.emit("error", "Room tidak ditemukan");

    socket.join(roomId);

    socket.emit("joined", roomId);
    socket.to(roomId).emit("system", {
      text: `${socket.user.username} bergabung`,
      time: Date.now()
    });
  });

  /* ===== SEND MESSAGE (SEMUA ROLE) ===== */
  socket.on("send-message", async ({ roomId, message }) => {
  if (!roomId || !message) return

  const roomSnap = await db.collection("rooms").doc(roomId).get()
  if (!roomSnap.exists)
    return socket.emit("error", "Room tidak ditemukan")

  await saveMessage({
    roomId,
    user: socket.user.username,
    text: message
  })

  io.to(roomId).emit("message", {
    user: socket.user.username,
    text: message,
    time: Date.now()
  })
})


  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.user.username);
  });
});

/* ===============================
   INIT WHATSAPP
================================ */
initWhatsApp();

/* ===============================
   ROUTES
================================ */
app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ===== WHATSAPP LOGIN ===== */
app.get("/whatsapp/login", async (_, res) => {
  const qr = getQR();

  if (qr) {
    const qrImg = await QRCode.toDataURL(qr);
    return res.send(`
      <h2>Scan QR WhatsApp</h2>
      <img src="${qrImg}" />
      <p>WhatsApp → Linked Devices</p>
    `);
  }

  res.send(isWhatsappReady()
    ? "✅ WhatsApp siap"
    : "⏳ Menunggu QR..."
  );
});

/* ===============================
   OTP REGISTER
================================ */
app.post("/api/register/otp/send", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) throw new Error("Phone required");
    if (!isWhatsappReady()) throw new Error("WhatsApp not ready");

    checkNumber(phone);

    const otp = await createOtp(phone, "register");
    await sendOtp(phone, otp, "register")

    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

app.post("/api/register/otp/verify", async (req, res) => {
  try {
    const { phone, code } = req.body;
    const result = await verifyOtp(phone, code, "register", false);
    res.json({ valid: result.valid });
  } catch (err) {
    res.status(400).json({ valid: false });
  }
});

/* ===============================
   REGISTER
================================ */
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
    res.status(400).json({ ok: false, message: err.message });
  }
});

/* ===============================
   OTP RESET
================================ */
app.post("/api/reset/otp/send", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) throw new Error("Phone required");
    if (!isWhatsappReady()) throw new Error("WhatsApp not ready");

    checkNumber(phone);

    const otp = await createOtp(phone, "reset");
    await sendOtp(phone, otp, "reset")

    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

app.post("/api/reset/otp/verify", async (req, res) => {
  try {
    const { phone, code } = req.body;
    const result = await verifyOtp(phone, code, "reset", false);
    res.json({ valid: result.valid });
  } catch {
    res.status(400).json({ valid: false });
  }
});

/* ===============================
   RESET PASSWORD
================================ */
app.post("/api/reset", async (req, res) => {
  try {
    const { phone, code, newPassword } = req.body;
    if (!phone || !code || !newPassword)
      throw new Error("Data tidak lengkap");

    checkNumber(phone);

    const otpCheck = await verifyOtp(phone, code, "reset");
    if (!otpCheck.valid) throw new Error("OTP tidak valid");

    await resetPassword({ phone, newPassword });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

/* ===============================
   LOGIN
================================ */
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
        role: user.role || "user"
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ ok: true, token });
  } catch (err) {
    res.status(401).json({ ok: false, message: err.message });
  }
});

/* ===============================
   ERROR HANDLER
================================ */
app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err.message);
  res.status(err.statusCode || 500).json({
    ok: false,
    message: err.message
  });
});

/* ===============================
   START SERVER
================================ */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
