// middleware/auth.js
const jwt = require("jsonwebtoken");
const cfg = require("../auth-config");

// 签发 Token（供 login 调用）
function signToken(payload = {}) {
  return jwt.sign(payload, cfg.jwtSecret, {
    expiresIn : cfg.jwtExpiresIn,
    issuer    : cfg.jwtIssuer,
    audience  : cfg.jwtAudience
  });
}

// 校验中间件（保护需要登录的接口）
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ ok:false, error:"Missing token" });

  try {
    req.jwt = jwt.verify(token, cfg.jwtSecret, {
      issuer  : cfg.jwtIssuer,
      audience: cfg.jwtAudience
    });
    return next();
  } catch (err) {
    return res.status(401).json({ ok:false, error:"Invalid / expired token" });
  }
}

const { logLogin } = require("../audit/audit-logger");

function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  return (xf && xf.split(",")[0].trim()) || req.socket?.remoteAddress || "";
}

// 驗證失敗時（例）
logLogin({
  actor_user_id: userIdOr0,             // 若能辨識，填用戶ID；否則 0
  success: false,
  ip: clientIp(req),
  ua: req.get("user-agent") || "",
  description: "invalid credentials"
});

// 驗證成功時（例）
logLogin({
  actor_user_id: user.user_id,
  success: true,
  ip: clientIp(req),
  ua: req.get("user-agent") || "",
  description: "login ok"
});


module.exports = { signToken, verifyToken };
