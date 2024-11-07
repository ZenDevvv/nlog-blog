import dotenv from "dotenv";
import db from "./dbconfig.js";
dotenv.config();

import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import postsRoutes from "./routes/posts.js";
import cookieParser from "cookie-parser";

const app = express();
const PORT = 8080;

app.use(express.json());
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
  return res.send("Open client @");
});

app.get("/profile/:id", (req, res) => {
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
              GROUP BY users.id, posts.id;`;

  db.query(q, [userID], (err, data) => {
    if (err) return res.json(err);

    // Directly return the data
    return res.json(data);
  });
});

app.listen(PORT, () => {
  console.log("listening to port", PORT);
});
