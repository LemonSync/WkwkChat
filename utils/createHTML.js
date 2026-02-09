/** 
 * Membuat halaman HTML untuk login WhatsApp 
 * @param {Object} status - Status koneksi WhatsApp 
 * @param {string} qrImg - Data URL gambar QR code 
 */
function HTMLLogin(status, qrImg) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Login</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex; align-items: center; justify-content: center; 
            min-height: 100vh; margin: 0; background: #f0f2f5; color: #3b4a54;
        }
        .card { 
            background: white; padding: 40px; border-radius: 20px; 
            box-shadow: 0 4px 20px rgba(180, 118, 118, 0.08); text-align: center; max-width: 380px; width: 90%;
        }
        h2 { margin-top: 0; color: #1fa855; }
        .qr-box { 
            background: #fff; border: 1px solid #e9edef; 
            padding: 15px; border-radius: 12px; margin: 25px 0; 
        }
        .qr-box img { width: 100%; height: auto; display: block; }
        .status { font-size: 14px; margin-bottom: 20px; color: #667781; }
        
        .btn-group { display: flex; flex-direction: column; gap: 10px; }
        button { 
            padding: 12px; border: none; border-radius: 8px; 
            font-weight: 600; cursor: pointer; transition: 0.2s; font-size: 14px;
        }
        .btn-primary { background: #1fa855; color: white; }
        .btn-primary:hover { background: #158341; }
        .btn-ghost { background: transparent; color: #ef4444; border: 1px solid #f8d7da; }
        .btn-ghost:hover { background: #fef2f2; }
        
        .steps { text-align: left; font-size: 13px; background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        ol { margin: 5px 0 0 20px; padding: 0; }
    </style>
</head>
<body>
    <div class="card">
        <h2>WhatsApp Web</h2>
        
        <div class="steps">
            <strong>Cara Menghubungkan:</strong>
            <ol>
                <li>Buka WhatsApp di HP Anda</li>
                <li>Ketuk Menu atau Setelan & pilih <b>Perangkat Tertaut</b></li>
                <li>Arahkan kamera ke layar ini</li>
            </ol>
        </div>

        <div class="qr-box">
            <img src="${qrImg}" alt="QR Code">
        </div>

        <div class="status">
            ${status.ready ? "✅ Terhubung" : "⏳ Menunggu scan..."}
        </div>

        <div class="btn-group">
            <button class="btn-primary" onclick="location.reload()">Refresh Halaman</button>
            <button class="btn-ghost" onclick="cleanSession()">Hapus Sesi & Keluar</button>
        </div>
    </div>

    <script>
        if (!${status.ready}) {
            setTimeout(() => location.reload(), 5000);
        }

        function cleanSession() {
            if (confirm('Hapus sesi dan scan ulang?')) {
                fetch('/whatsapp/clean', { method: 'POST' })
                    .then(() => location.reload())
                    .catch(err => alert('Gagal: ' + err));
            }
        }
    </script>
</body>
</html>
`;
}

function HTMLLoginSukses(status) {
  return `
  <div style="font-family: sans-serif; display: flex; justify-content: center; padding: 50px; background-color: #f4f7f6;">
    <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 400px; width: 100%; text-align: center;">
      
      <h2 style="color: #25D366; margin-bottom: 10px;">✅ WhatsApp Ready!</h2>
      <p style="color: #666; margin-bottom: 25px;">WhatsApp sudah terhubung dan siap mengirim OTP</p>
      
      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; text-align: left; font-size: 14px; line-height: 1.6; border: 1px solid #eee;">
        <strong style="display: block; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Status Koneksi:</strong>
        
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888;">Status:</span>
          <span style="font-weight: 500;">${status.ready ? 'Ready' : 'Not Ready'}</span>
        </div>
        
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888;">User:</span>
          <span style="font-weight: 500;">${status.user?.name || 'WhatsApp Account'}</span>
        </div>
  
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888;">ID:</span>
          <span style="font-weight: 500;">${status.user?.id || '-'}</span>
        </div>
        
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888;">Platform:</span>
          <span style="font-weight: 500;">${status.user?.platform || 'Device'}</span>
        </div>
  
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888;">Di Inisialisasi:</span>
          <span style="font-weight: 500;">${status.isInitialized ? 'Ya' : 'Tidak'}</span>
        </div>
  
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888;">hasQR:</span>
          <span style="font-weight: 500;">${status.hasQR ? 'Ya' : 'Tidak'}</span>
        </div>
        
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888;">Rekoneksi:</span>
          <span style="font-weight: 500;">${status.rekoneksiKembali ? 'Ya' : 'Tidak'}</span>
        </div>
        
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888;">Sesi:</span>
          <span style="font-weight: 500;">${status.SESI_PATH_Exists ? 'Tersedia' : 'Kosong'}</span>
        </div>
      </div>
      <div style="margin-top: 30px;">
        <a href="/" style="text-decoration: none; color: #fff; background: #25D366; padding: 10px 20px; border-radius: 6px; font-weight: bold; display: inline-block;">
          Kembali ke Aplikasi
        </a>
      </div>
    </div>
  </div>
  `
}

function HTMLLoading() {
  return `
  <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      button:hover { background-color: #e69500; }
    </style>
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 300px; padding: 20px;">
  <div style="text-align: center; background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); max-width: 400px;">
    
    <div style="margin: 0 auto 20px; width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid orange; border-radius: 50%; animation: spin 1s linear infinite;"></div>

    <h2 style="color: orange; margin-bottom: 10px;">⏳ Generating QR Code...</h2>
    <p style="color: #666; font-size: 15px; line-height: 1.5;">
      Sistem sedang menyiapkan kode QR. <br> 
      Halaman akan memuat ulang otomatis dalam 5 detik
    </p>

    <div style="margin-top: 25px;">
      <button onclick="location.reload()" style="background-color: orange; color: white; border: none; padding: 10px 25px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.3s; box-shadow: 0 4px 6px rgba(255, 165, 0, 0.2);">
        Refresh Sekarang
      </button>
    </div>
    <script>
      setTimeout(() => location.reload(), 5000);
    </script>
  </div>
</div>
  `
}

function HTMLError(error) {
  return `
  <div style="text-align: center; padding: 50px;">
        <h2 style="color: red;">❌ Error Loading QR</h2>
        <p>${error.message}</p>
        <p><a href="/whatsapp/restart" onclick="event.preventDefault(); fetch('/whatsapp/restart', {method:'POST'}).then(()=>location.reload())">Restart WhatsApp</a></p>
      </div>
  `
}

module.exports = { HTMLLogin, HTMLLoginSukses, HTMLLoading, HTMLError };