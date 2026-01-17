<h3 align="center">WKWKCHAT</h3>

### DAFTAR ISI
* [PENGENALAN](#pengenalan)
* [FITUR](#fitur)
* [PENGGUNAAN](#penggunaan)
* [PENGINSTALAN](#penginstalan)
* [HIMBAUAN](#himbauan)


# Pengenalan

###### Apa itu `WkwkChat` ?
Jadi, Singkatnya `WkwkChat` adalah sebuah website yang dimana dapat mengirimkan pesan secara **<ins>Real Time</ins>**. Mengapa bisa begitu ? Ya Karena `WkwkChat` menggunakan teknologi socket dan database yang mendukung perubahan field secara real time juga. Dilengkapi dengan sistem daftar, login, dan reset password yang bagus. Website ini juga dilengkapi dengan auth yang mantap juga.

###### Emang Aman ?
Ya, tentu saja. Karena website ini dilengkapi dengan *antispam* otp menggunakan logika **captcha**. Dan peminimalisiran kebocoran data atau DDOS.

###### Emang, Teknologi apa aja yang dipakai ?
Teknologi yang dipakai dalam website `WkwkChat` ini adalah teknologi sederhana, dan mungkin semua orang pernah menggunakannya.
Didasari oleh **NodeJS** website ini menggunakan:

Frontend
* VueJS
* JWT DECODE
* SocketIO (Cient)
* Vue Router
 
Backend
* Express
* Express Session
* SocketIO
* Firebase Admin SDK
*  Baileys (Whatsapp Web API)
*  JWT
*  bcryptjs
*  Canvas
 
Database
* Firebase Firestore

###### Kemana OTP akan dikirim saat verifikasi ?
Nah, Kerena untuk daftar memerlukan verifikasi, Website `WkwkChat` menggunakan Baileys Whatsapp untuk mengirim verifikasi.

###### Maksud dari menggunakan Baileys ?
Baileys adalah WhatsApp Web API, jadi secara langsung itu seperti menautkan akun whatsapp(yang digunakan untuk mengirim otp) ke sistemnya. jadi ibaratkan saat kita ingin memasang whatsapp kita ke komputer atau situs desktop lainnya. Contohnya **[Web WhatsApp](https://web.whatsapp.com)**.

###### Untuk logika captchanya bagaimana ?
Nah, website ini menggunakan logika captcha untuk sesi antispam agar *Anonymous* tidak dapat melakukan DDOS disini. Logika yang dipakai cukup sederhana, yaitu mengubah kode menjadi gambar dan mengirimnya ke client(user) dan saat user menginput kode, sistem akan mengecek kebenaran kode tersebut.

###### Apa tujuan terciptanya website ini ?
Jujur secara pribadi, saya(Eres) membangun website ini untuk melatih kemampuan saya(Eres) dalam segi pemrograman. Baik itu dibagian Frontend yaitu UI atau UXnya ataupun Backend dalam segi logikanya.

###### Apakah kodenya dapat dimodifikasi oleh siapa saja ?
Ya, tentu saja! Asalkan menaruh `Kredit/WM` saja hehe.

-----------------

<br><br>
# Fitur

Fitur yang terdapat di website `WkwkChat` ini adalah:

Auth
* Login
* Daftar
* Lupa Password
* Captcha
* Kirim OTP
* Route (alihkan jika belum masuk)

Chat
* Join Room (user, creator)
* Send Message (user, creator)
* Logout (user, creator)
* Create Room (creator)

----------------

<br><br>
# Penggunaan

Petunjuk penggunaan kode adalah sebagai berikut:

1. serviceAccountKey.json
   
   Pastikan kamu mengambil key firebase kamu dan menaruhnya di path [./json/](https://github.com/LemonSync/WkwkChat/tree/main/json)
   **Note**: Jangan sekali-kali menyebarkan serviceAccountKey kamu ke public

2. ENV
   
   Berikut adalah nilai env yang dibutuhkan
   SESSION_SECRET = [string] Secret key untuk Express Session
   JWT_SECRET = [string] Secret Key Untuk JWT
   WHATSAPP_RESTART_PASSWORD = [string] Password untuk **`/whatsapp/restart?sandi=password`**

3. WhatsApp Sync

   1. Masuk ke `/whatsapp/login/`
   2. Scan QR jika sudah muncul
   3. Tunggu sejenak
   4. Selesai
  
4. WhatsApp Restart

   1. Masuk ke `/whatsapp/restart/?sandi=sesuai-env`
   2. Tunggu sejenak
   3. Jika berhasil, silahkan login ke `/whatsapp/login/`
  
5. Session Baileys

   Ada di `/sesi_wa/` dan akan dihapus otomatis jika sesinya korup

6. Frontend

   Mungkin ini Kamu butuhkan jika ingin menggunakan Frontend Kamu sendiri

   ```js
   fetch(`/api/register/otp/send`) {
      credentials: 'include'
   }
   ```

--------------

<br><br>

# Penginstalan

1. Jalankan `npm i`
2. Jalankan `node main.js`
3. Masuk ke `/whatsapp/login/`
4. Scan menggunakan WhatsApp Kamu
5. Selesai
