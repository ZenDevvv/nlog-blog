import jwt from "jsonwebtoken";

// Lets a request through only with a valid access_token cookie; sets req.user to its payload.
export const requireAuth = (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  jwt.verify(token, process.env.JWT_KEY, { algorithms: ["HS256"] }, (err, user) => {
    if (err) return res.status(403).json({ message: "Session is not valid" });
    req.user = user;
    next();
  });
};
