import dotenv from "dotenv";
import db from "./dbconfig.js";
dotenv.config();

import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import postsRoutes from "./routes/posts.js";
import cookieParser from "cookie-parser";
import { serverError } from "./errors.js";

import { optionalAuth } from "./middleware/auth.js";
import { getProfile } from "./controllers/profile.js";
import { createSecurity } from "./security.js";

import { validateId } from "./validation.js";

const app = express();
const port = process.env.PORT || 8080;


// Render terminates HTTPS at its reverse proxy. Local requests trust no proxy.
app.set("trust proxy", process.env.RENDER === "true" ? 1 : false);
const security = createSecurity({
  secret: process.env.JWT_KEY,
  origin: process.env.CLIENT_SERVER || (process.env.NODE_ENV !== "production" ? "http://localhost:5173" : undefined),
  production: process.env.NODE_ENV === "production",
});
app.locals.security = security;
app.use(security.headers);
app.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
app.use(
  cors({
    origin: security.origin,
    allowedHeaders: ["Content-Type", "X-CSRF-Token"],
    exposedHeaders: ["RateLimit", "RateLimit-Policy", "Retry-After"],
    credentials: true,
  })
);

app.use(security.apiLimit);
app.use(cookieParser());
app.use(express.json({ limit: "100kb" }));
app.use(security.csrfProtect);
app.get("/auth/csrf", security.csrfToken);
app.use("/auth", authRoutes);
app.use("/posts", postsRoutes);

app.get("/", (req, res) => {
  res.json({ status: "Connected" });
});

app.get("/profile/:id", validateId, optionalAuth, getProfile);

app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") return res.status(413).json({ message: "Request body is too large (maximum 100 KB)" });
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid JSON body" });
  return serverError(res, err);
});

app.listen(port, () => {
  console.log("listening to port", port);
});
