const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "../json/serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

module.exports = { admin, db };

/*
const firebaseConfig = {
  apiKey: "AIzaSyCrp8saBlA4b8tvYTGWtsR5kTiCy4_vEcg",
  authDomain: "lemon-chat-web.firebaseapp.com",
  projectId: "lemon-chat-web",
  storageBucket: "lemon-chat-web.firebasestorage.app",
  messagingSenderId: "890768942288",
  appId: "1:890768942288:web:cc45e7d355817dfcbeaad5",
  measurementId: "G-0HR5SD7VVV"
};
*/