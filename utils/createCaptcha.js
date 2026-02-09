const { Lemon } = require("./allFunction");

/**
 * Create CAPTCHA
 * @param {object} req - Express request object
 * @return {Promise<Buffer>} - CAPTCHA image buffer
 */
async function createCaptcha(req) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    req.session.captchaCode = code;

    return await Lemon.createImage(code);
}

module.exports = { createCaptcha };