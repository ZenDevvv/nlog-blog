import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import jwt from "jsonwebtoken";

export function createSecurity({ secret, origin, production = false, limits = {} }) {
  if (!secret) throw new Error("JWT_KEY must be configured");
  if (!origin || new URL(origin).origin !== origin) throw new Error("CLIENT_SERVER must be an exact frontend origin without a trailing slash");
  const cookieName = production ? "__Host-csrf" : "csrf";
  const cookieOptions = { httpOnly: true, secure: production, sameSite: production ? "none" : "lax", path: "/", maxAge: 60 * 60 * 1000 };
  const hash = value => createHmac("sha256", secret).update(value).digest("hex");
  const limiter = (key, max, windowMs, options = {}) => rateLimit({
    windowMs, limit: limits[key] ?? max, standardHeaders: "draft-8", legacyHeaders: false,
    message: { message: "Too many requests. Please try again later." }, ...options,
  });
  const validToken = token => {
    try { return jwt.verify(token, secret, { algorithms: ["HS256"], audience: "nlog-csrf" }).purpose === "csrf"; }
    catch { return false; }
  };
  return {
    headers: helmet(),
    origin,
    apiLimit: limiter("api", 300, 15 * 60 * 1000, { skip: req => req.method === "GET" && req.path === "/" }),
    loginLimit: limiter("login", 10, 15 * 60 * 1000, { skipSuccessfulRequests: true }),
    accountLoginLimit: limiter("account", 10, 15 * 60 * 1000, {
      skipSuccessfulRequests: true,
      keyGenerator: req => hash("login:" + (typeof req.body?.username === "string" ? req.body.username.trim().toLowerCase() : "invalid")),
    }),
    registrationLimit: limiter("registration", 5, 60 * 60 * 1000),
    writeLimit: limiter("write", 30, 15 * 60 * 1000, { keyGenerator: req => String(req.user.id) }),
    viewLimit: limiter("view", 60, 60 * 1000),
    viewerHash: req => hash("view:" + req.ip),
    csrfToken(req, res) {
      if (req.get("origin") && req.get("origin") !== origin) return res.status(403).json({ message: "Origin not allowed" });
      const existing = req.cookies[cookieName];
      const token = validToken(existing) ? existing : jwt.sign({ purpose: "csrf", nonce: randomBytes(32).toString("hex") }, secret, { algorithm: "HS256", audience: "nlog-csrf", expiresIn: "1h" });
      res.set("Cache-Control", "no-store");
      return res.cookie(cookieName, token, cookieOptions).json({ csrfToken: token });
    },
    csrfProtect(req, res, next) {
      if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
      const cookie = req.cookies[cookieName];
      const header = req.get("x-csrf-token");
      const originAllowed = !req.get("origin") || req.get("origin") === origin;
      if (!originAllowed || typeof cookie !== "string" || typeof header !== "string" ||
          cookie.length > 2048 || Buffer.byteLength(header) !== Buffer.byteLength(cookie) ||
          !timingSafeEqual(Buffer.from(cookie), Buffer.from(header)) || !validToken(cookie)) {
        return res.status(403).json({ code: "CSRF_INVALID", message: "Security token expired or missing. Please try again." });
      }
      next();
    },
  };
}
