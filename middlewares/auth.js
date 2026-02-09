const jwt = require("jsonwebtoken");

/** Middleware to authenticate JWT token */
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: "Token tidak ada" });
  }

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Token tidak valid" });
  }
}

module.exports = auth;
