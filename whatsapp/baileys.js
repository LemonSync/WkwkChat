const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys")

const Pino = require("pino")

let sock
let ready = false
let isInit = false
let currentQR = null

async function initWhatsApp() {
  if (isInit) return
  isInit = true

  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys")
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    auth: state,
    logger: Pino({ level: "silent" }),
    browser: ["Ubuntu", "Chrome", "22.04"]
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update

    // 🔑 SIMPAN QR
    if (qr) {
      currentQR = qr
      console.log("📸 QR tersedia, buka /whatsapp/login")
    }

    if (connection === "open") {
      ready = true
      currentQR = null
      console.log("✅ WhatsApp LOGIN BERHASIL")
    }

    if (connection === "close") {
      ready = false
      isInit = false

      const code = lastDisconnect?.error?.output?.statusCode
      console.log("❌ WhatsApp terputus:", code)

      if (code !== DisconnectReason.loggedOut) {
        console.log("🔄 Reconnecting...")
        setTimeout(initWhatsApp, 3000)
      } else {
        console.log("⚠️ Logout total, hapus auth_info_baileys")
      }
    }
  })
}

function getQR() {
  return currentQR
}

function isWhatsappReady() {
  return ready
}

async function sendMessage(phone, text) {
  if (!ready) throw new Error("WhatsApp belum siap");

  const jid = phone.replace(/\D/g, "") + "@s.whatsapp.net";

  await sock.sendMessage(jid, { text });
}

async function sendOtp(phone, otp, type) {
  const jid = phone.replace(/\D/g, "") + "@s.whatsapp.net"
  const mention = `@${jid.split("@")[0]}`

  const text =
    type === "register"
      ? `👋 Halo Kak ${mention}\n\n- OTP Kamu Adalah:\n- *${otp}*\n- Metode: *Registrasi*\n\n\n> Berlaku hingga \`5 Menit\` kedepan.\n> 🚩 Jangan bagikan kode ini kepada siapa pun.`
      : `👋 Halo Kak ${mention}\n\n- OTP Kamu Adalah:\n- *${otp}*\n- Metode: *Reset Password*\n\n\n> Berlaku hingga \`5 Menit\` kedepan.\n> 🚩 Jangan bagikan kode ini kepada siapa pun.`

  await sock.sendMessage(jid, {
    text,
    mentions: [jid]
  })
}



module.exports = {
  initWhatsApp,
  getQR,
  isWhatsappReady,
  sendMessage,
  sendOtp
}
