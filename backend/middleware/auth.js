import jwt from "jsonwebtoken";

// Lets a request through only with a valid access_token cookie; sets req.user to its payload.
export const requireAuth = (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  jwt.verify(token, process.env.JWT_KEY, { algorithms: ["HS256"] }, (err, user) => {
    if (err || !Number.isInteger(user?.id) || user.id < 1 || user.id > 2147483647) return res.status(403).json({ message: "Session is not valid" });
    req.user = user;
    next();
  });
};

// Read routes treat missing/expired sessions as guests and never trust client state.
export const optionalAuth = (req, res, next) => {
  const token = req.cookies?.access_token;
  if (token) {
    try {
      const user = jwt.verify(token, process.env.JWT_KEY, { algorithms: ["HS256"] });
      if (Number.isInteger(user?.id) && user.id > 0 && user.id <= 2147483647) req.user = user;
    } catch { /* Public browsing remains available when a session expires. */ }
  }
  next();
};
