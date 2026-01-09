/*

Menngunakan Baileys untuk integrasi WhatsApp
versi: 4.4.0
repository: https://github.com/WhiskeySockets/Baileys
sumber: https://www.whiskeysockets.com/
License: MIT
kredit: WhiskeySockets
modifikasi: ERES FRAN SETIA SIMBOLON

Bebas dimodifikas oleh siapa saja.

*/


const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");

const { packageName } = require("../utils/packageName");

const Pino = require("pino");
const fs = require("fs");
const path = require("path");

let sock;
let ready = false;
let isInit = false;
let qrNow = null;
let rekoneksiKembali = 0;
const MAX_REKONEKSI = 5;

function hapusSesiKorup() {
  const SESI_PATH = "sesi_wa";
  try {
    if (fs.existsSync(SESI_PATH)) {
      console.log("Mebersihkan session korup....");
      fs.rmSync(SESI_PATH, { recursive: true, force: true });
    }
    
    const files = fs.readdirSync(".");
    files.forEach(file => {
      if (file.includes(".json") && file.includes("session")) {
        fs.unlinkSync(file);
      }
    });
    
    console.log("Session lama dibersihkan");
    return true;
  } catch (error) {
    console.log("Gagal Mmebersihkan session:", error.message);
    return false;
  }
}

async function initWhatsApp() {
  if (isInit) {
    console.log("Masih dalam proses init");
    return;
  }
  
  try {
    isInit = true;
    ready = false;
    qrNow = null;
    
    console.log("Memulai inisialisasi.....");
    
    if (rekoneksiKembali >= MAX_REKONEKSI) {
      console.log("Terlalu banyak percobaan reconnect, membersihkan session....");
      hapusSesiKorup();
      rekoneksiKembali = 0;
    }
    
    const { state, saveCreds } = await useMultiFileAuthState("sesi_wa");
    
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Versi saat ini: v${version.join('.')} ${isLatest ? '(terbaru)' : ''}`);
    

    // Sebaiknya jangan diubah ygy
    sock = makeWASocket({
      version,
      auth: state,
      logger: Pino({ level: "warn" }),
      printQRInTerminal: true,
      browser: packageName(),
      userAgent: "Mozilla/5.0 (Lemon-Chat-System/1.0.0) AppleWebKit/537.36",
      syncFullHistory: false,
      markOnlineOnConnect: false,
      defaultQueryTimeoutMs: 30000,
      connectTimeoutMs: 30000,
      keepAliveIntervalMs: 10000,
      emitOwnEvents: true,
      mobile: false,
      businessName: "Lemon Sync",
      businessWebsite: ["https://github.com/lemonsync"],
      retryRequestDelayMs: 1000,
      fireInitQueries: true,
      generateHighQualityLinkPreview: true,
      getMessage: async (key) => {
        return {
          conversation: "pesan"
        };
      },
      transactionOpts: {
        maxCommitRetries: 3,
        delayBetweenTriesMs: 1000
      }
    });

    sock.ev.on("creds.update", async (creds) => {
      console.log("Mengupdate key.....");
      await saveCreds();
    });

    sock.ev.on("connection.update", (update) => {
      const { connection, lastConnect, qr, isLoginNew } = update;
      
      console.log(`Update koneksi: ${connection}`);
      
      if (qr) {
        qrNow = qr;
        console.log("Scan qr di /whatsapp/login");
        rekoneksiKembali = 0;
      }
      
      if (connection === "open") {
        ready = true;
        qrNow = null;
        rekoneksiKembali = 0;
        console.log("✅ Sukses login ke WhatsApp");
        console.log(`👤 User: ${sock.user?.id || 'Unknown'}`);
        console.log(`📱 Platform: ${sock.user?.platform || 'Unknown'}`);
      }
      
      if (connection === "close") {
        ready = false;
        isInit = false;
        
        const statusCode = lastConnect?.error?.output?.statusCode;
        const error = lastConnect?.error;
        
        console.log("❌ WhatsApp terputus");
        console.log("Status code:", statusCode);
        console.log("Error:", error?.message || "Unknown error");
        
        if (error?.message?.includes("Bad MAC")) {
          console.log("ERROR: Bad MAC - Session corrupt!");
          console.log("Membersihkan session dan membuat baru...");
          hapusSesiKorup();
        }
        
        if (statusCode === DisconnectReason.loggedOut) {
          console.log("Log out dari WhatsApp");
          console.log("Membersihkan session...");
          hapusSesiKorup();
          rekoneksiKembali = 0;
        }
        
        if (statusCode === DisconnectReason.connectionLost) {
          rekoneksiKembali++;
          console.log(`Percobaan rekoneksi ${rekoneksiKembali}/${MAX_REKONEKSI}`);
        }
        
        const shouldRekoneksi = 
          statusCode !== DisconnectReason.loggedOut && 
          rekoneksiKembali < MAX_REKONEKSI;
        
        if (shouldRekoneksi) {
          console.log(`rEkoneksi dalam 3 detik...`);
          setTimeout(() => {
            initWhatsApp();
          }, 3000);
        } else {
          console.log("Masa rekoneksi sdah habis....");
          console.log("Restart hosting/server untuk mendapatkan qr baru");
        }
      }
      
      if (isLoginNew) {
        console.log("Login terdeteksi");
        ready = true;
      }
    });

    sock.ev.on("ws-close", () => {
      console.log("🔌 WebSocket closed");
    });
    
    sock.ev.on("ws-error", (error) => {
      console.log("🔥 WebSocket error:", error);
    });

  } catch (error) {
    console.error("🔥 Gagal inisialisasi WhatsApp:", error.message);
    console.error("Stack:", error.stack);
    
    isInit = false;
    ready = false;
    
    if (error.message.includes("Bad MAC") || error.message.includes("corrupt")) {
      console.log("Membersihkan sesi korup....");
      hapusSesiKorup();
    }
    
    console.log("Coba lagi dalam 5 detik.....");
    setTimeout(() => {
      initWhatsApp();
    }, 5000);
  }
}

function getQR() {
  return qrNow;
}

function isWhatsappReady() {
  if (sock && sock.user) {
    return ready && sock.user.id !== undefined;
  }
  return false;
}

async function sendMessage(phone, text) {
  if (!isWhatsappReady()) {
    throw new Error("WhatsApp belum siap. Pastikan sudah scan QR di /whatsapp/login");
  }
  
  if (!sock) {
    throw new Error("WhatsApp socket tidak tersedia");
  }
  
  const jid = phone.replace(/\D/g, "") + "@s.whatsapp.net";
  console.log(`Mengirim pesan ke ${jid}`);
  
  try {
    const result = await sock.sendMessage(jid, { text });
    console.log(`Pesan terkirim ke ${phone}`);
    return result;
  } catch (error) {
    console.error(`Gagal mengirim ke ${phone}:`, error.message);
    throw error;
  }
}

async function sendOtp(phone, otp, type) {
  if (!isWhatsappReady()) {
    throw new Error("WhatsApp belum siap. Pastikan sudah scan QR di /whatsapp/login");
  }
  
  const jid = phone.replace(/\D/g, "") + "@s.whatsapp.net";
  const mention = `@${jid.split("@")[0]}`;
  
  const text =
    type === "register"
      ? `👋 Halo Kak ${mention}\n\n📱 OTP Kamu Adalah:\n🔢 *${otp}*\n📝 Metode: *Registrasi*\n\n⏰ Berlaku hingga 5 menit kedepan\n🚩 Jangan bagikan kode ini kepada siapa pun.\n\nLemon Chat Team`
      : `👋 Halo Kak ${mention}\n\n📱 OTP Kamu Adalah:\n🔢 *${otp}*\n📝 Metode: *Reset Password*\n\n⏰ Berlaku hingga 5 menit kedepan\n🚩 Jangan bagikan kode ini kepada siapa pun.\n\nLemon Chat Team`;
  
  console.log(`📤 Mengirim OTP ${otp} ke ${phone} (${type})`);
  
  try {
    const result = await sock.sendMessage(jid, {
      text,
      mentions: [jid],
    });
    
    console.log(`✅ OTP berhasil dikirim ke ${phone}`);
    return result;
  } catch (error) {
    console.error(`❌ Gagal mengirim OTP ke ${phone}:`, error.message);
    
    if (error.message.includes("not registered") || error.message.includes("401")) {
      throw new Error(`Nomor ${phone} tidak terdaftar di WhatsApp`);
    }
    
    throw error;
  }
}

function restartWhatsApp() {
  console.log("🔄 Manual restart WhatsApp...");
  
  if (sock) {
    try {
      sock.end();
    } catch (error) {
    }
    sock = null;
  }
  
  ready = false;
  isInit = false;
  qrNow = null;
  
  hapusSesiKorup();
  
  setTimeout(() => {
    initWhatsApp();
  }, 1000);
}

function getWhatsAppStatus() {
  return {
    ready: isWhatsappReady(),
    hasQR: !!qrNow,
    isInitialized: isInit,
    user: sock?.user ? {
      id: sock.user.id,
      name: sock.user.name,
      platform: sock.user.platform
    } : null,
    rekoneksiKembali,
    SESI_PATHExists: fs.existsSync("sesi_wa")
  };
}

module.exports = {
  initWhatsApp,
  getQR,
  isWhatsappReady,
  sendMessage,
  sendOtp,
  restartWhatsApp,
  getWhatsAppStatus,
  hapusSesiKorup
};
