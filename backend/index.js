import dotenv from "dotenv";
import db from "./dbconfig.js";
dotenv.config();

import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import postsRoutes from "./routes/posts.js";
import cookieParser from "cookie-parser";
import { serverError } from "./errors.js";

import { validateId } from "./validation.js";

const app = express();
const port = process.env.PORT || 8080;


app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_SERVER,
    credentials: true,
  })
);

app.use("/auth", authRoutes);
app.use("/posts", postsRoutes);

app.get("/", (req, res) => {
  res.json({ status: "Connected" });
});

app.get("/profile/:id", validateId, (req, res) => {
  const userID = req.params.id;

  const q = `SELECT users.id, users.username, users.created_at, 
                posts.id AS post_id, posts.user_id, posts.title, posts.content, 
                posts.views, posts.created_at AS post_created_at, posts.updated_at, 
                posts.privacy, 
                GROUP_CONCAT(tags.tag_name) AS tags 
              FROM users 
              LEFT JOIN posts ON users.id = posts.user_id 
              LEFT JOIN post_tags ON posts.id = post_tags.post_id 
              LEFT JOIN tags ON post_tags.tag_id = tags.id 
              WHERE users.id = ?
              GROUP BY users.id, users.username, users.created_at, posts.id, posts.user_id, posts.title, posts.content, posts.views, posts.created_at, posts.updated_at, posts.privacy;`;

  db.query(q, [userID], (err, data) => {
    if (err) return serverError(res, err);

    // Directly return the data
    return res.json(data);
  });
});

app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") return res.status(413).json({ message: "Request body is too large (maximum 100 KB)" });
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid JSON body" });
  return serverError(res, err);
});

app.listen(port, () => {
  console.log("listening to port", port);
});
