const path = require("path");
const {
  HTMLLogin,
  HTMLLoginSukses,
  HTMLLoading,
  HTMLError,
} = require("./createHTML");

const { createCanvas, loadImage } = require('canvas');

class HttpError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

class Lemon {
  static checkNumber(phone, bannedNumbers) {
    const data = require(path.join(__dirname, "../json/bannedNumber.json"));
    if (data.nomor.includes(phone)) {
      throw new HttpError("Nomor ini diblokir dari penggunaan layanan.", 403);
    }
  }

  static createHTMLLogin(status, qrImg) {
    return HTMLLogin(status, qrImg);
  }

  static createHTMLLoginSukses(status) {
    return HTMLLoginSukses(status);
  }

  static createHTMLLoading() {
    return HTMLLoading();
  }

  static createHTMLError(error) {
    return HTMLError(error);
  }

  static async createImage(kode) {
    const width = 1000; 
    const height = 1000;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    try {
      const imagePath = path.join(__dirname, '../media/image/kodeImage.jpg');
      const imageBackground = await loadImage(imagePath);

      ctx.drawImage(imageBackground, 0, 0, width, height);
      
      ctx.font = 'bold 50pt Sans-serif'; 
      ctx.fillStyle = '#007400';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      ctx.fillText(kode, width / 2, 50);

      return canvas.toBuffer('image/jpeg', { quality: 0.8 });

    } catch (error) {
      console.error(error);
      throw new HttpError("Gagal membuat gambar.", 500);
    }
  }
}

module.exports = { HttpError, Lemon };
