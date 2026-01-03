const path = require("path");

class HttpError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** Cek nomor di bannedNumbers */
function checkNumber(phone, bannedNumbers) {
  const data = require(path.join(__dirname, "../json/bannedNumber.json"));
  if (data.nomor.includes(phone)) {
    throw new HttpError("Nomor ini diblokir dari penggunaan layanan.", 403);
  }
}

module.exports = { HttpError, checkNumber };
