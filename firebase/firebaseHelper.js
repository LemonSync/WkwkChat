const { db } = require("./firebase");
const acak = require("bcryptjs");
const admin = require("firebase-admin");
const { HttpError } = require("../utils/allFunction");

const OTP_COOLDOWN = 60 * 1000;

/** Create OTP
 * @param {string} phone
 * @param {string} metodeMasuk - "register" | "reset"
 * @param {number} ttlMinutes
 */
async function createOtp(phone, metodeMasuk, ttlMinutes = 5) {
  const now = Date.now();

  if (metodeMasuk === "register") {
    const userSnap = await db.collection("users").doc(phone).get();
    if (userSnap.exists) {
      throw new HttpError("Nomor sudah terdaftar", 409);
    }
  }

  if (metodeMasuk === "reset") {
    const userSnap = await db.collection("users").doc(phone).get();
    if (!userSnap.exists) {
      throw new HttpError("Nomor belum terdaftar", 401);
    }
  }

  const snap = await db
    .collection("otps")
    .where("phone", "==", phone)
    .where("metodeMasuk", "==", metodeMasuk)
    .orderBy("waktuDibuat", "desc")
    .limit(1)
    .get();

  if (!snap.empty) {
    const lastOtp = snap.docs[0].data();
    if (now - (lastOtp.lastSentAt || 0) < OTP_COOLDOWN) {
      const waktuTunggu = Math.ceil(
        (OTP_COOLDOWN - (now - lastOtp.lastSentAt)) / 1000
      );
      throw new Error(
        `Mohon tunggu ${waktuTunggu} detik sebelum mengirim OTP lagi`
      );
    }
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await db.collection("otps").add({
    phone,
    otp,
    metodeMasuk,
    waktuHabis: now + ttlMinutes * 60 * 1000,
    waktuDibuat: admin.firestore.FieldValue.serverTimestamp(),
    lastSentAt: now,
  });

  return otp;
}

/**
 * Verify OTP
 * @param {string} phone
 * @param {string} otp
 * @param {string} metodeMasuk
 * @param {boolean} deleteAfterUse
 */
async function verifyOtp(phone, otp, metodeMasuk, deleteAfterUse = true) {
  const snap = await db
    .collection("otps")
    .where("phone", "==", phone)
    .where("metodeMasuk", "==", metodeMasuk)
    .orderBy("waktuDibuat", "desc")
    .limit(1)
    .get();

  if (snap.empty) return { valid: false };

  const doc = snap.docs[0];
  const data = doc.data();

  if (data.otp !== otp) return { valid: false };

  if (Date.now() > data.waktuHabis) {
    if (deleteAfterUse) await doc.ref.delete();
    return { valid: false, expired: true };
  }

  if (deleteAfterUse) await doc.ref.delete();
  return { valid: true };
}

/** Register User
 * @param {string} phone
 * @param {string} username
 * @param {string} password
 */
async function registerUser({ phone, username, password }) {
  const ref = db.collection("users").doc(phone);
  const snap = await ref.get();

  if (snap.exists) throw new Error("User sudah terdaftar");

  const passwordAcak = await acak.hash(password, 10);

  await ref.set({
    phone,
    username,
    role: "user",
    passwordAcak,
    waktuDibuat: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true };
}

/** Login User
 * @param {string} phone
 * @param {string} password
 */
async function loginUser({ phone, password }) {
  const ref = db.collection("users").doc(phone);
  const snap = await ref.get();

  if (!snap.exists) throw new Error("User tidak ditemukan");

  const user = snap.data();
  const valid = await acak.compare(password, user.passwordAcak);

  if (!valid) throw new Error("Password salah");

  return {
    phone: user.phone,
    username: user.username,
    role: user.role,
  };
}

/** Reset Password
 * @param {string} phone
 * @param {string} newPassword
 */
async function resetPassword({ phone, newPassword }) {
  const ref = db.collection("users").doc(phone);
  const snap = await ref.get();

  if (!snap.exists) throw new Error("User tidak ditemukan");

  const passwordAcak = await acak.hash(newPassword, 10);
  await ref.update({ passwordAcak });

  return { ok: true };
}

/** Save Message
 * @param {string} roomId
 * @param {string} user
 * @param {string} text
 */
async function saveMessage({ roomId, user, text }) {
  await db.collection("rooms").doc(roomId).collection("messages").add({
    user,
    text,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

module.exports = {
  createOtp,
  verifyOtp,
  registerUser,
  loginUser,
  resetPassword,
  saveMessage,
};
