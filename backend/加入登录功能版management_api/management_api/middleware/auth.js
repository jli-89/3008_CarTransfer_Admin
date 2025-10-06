// middleware/auth.js
const jwt = require("jsonwebtoken");
const cfg = require("../auth-config");

// 簽發 Token（供 login 調用）
function signToken(payload = {}) {
  return jwt.sign(payload, cfg.jwtSecret, {
    expiresIn: cfg.jwtExpiresIn,
    issuer   : cfg.jwtIssuer,
    audience : cfg.jwtAudience,
  });
}

// 校驗中介層（保護需要登入的 API）
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ ok: false, error: "Missing token" });

  try {
    req.jwt = jwt.verify(token, cfg.jwtSecret, {
      issuer  : cfg.jwtIssuer,
      audience: cfg.jwtAudience,
    });
    return next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: "Invalid / expired token" });
  }
}

module.exports = { signToken, verifyToken };
