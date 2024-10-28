import db from "../dbconfig.js";
import jwt from "jsonwebtoken";

export const getAllPost = (req, res) => {
  const q = req.query.tag
    ? `SELECT posts.id AS post_id, user_id, title, content, views, posts.created_at, posts.updated_at, privacy, username, 
       GROUP_CONCAT(DISTINCT tag_name) AS tags
        FROM posts
        JOIN users ON posts.user_id = users.id
        LEFT JOIN post_tags ON post_tags.post_id = posts.id
        LEFT JOIN tags ON post_tags.tag_id = tags.id
        WHERE posts.id IN (
            SELECT post_tags.post_id
            FROM post_tags
            JOIN tags ON post_tags.tag_id = tags.id
            WHERE tags.tag_name = '${req.query.tag}'
        )
        GROUP BY posts.id;`
    : `SELECT posts.id AS post_id, user_id, title, content, views, posts.created_at, updated_at, privacy, username, 
          GROUP_CONCAT(tag_name) AS tags 
        FROM posts 
        JOIN users ON posts.user_id = users.id 
        LEFT JOIN post_tags ON post_tags.post_id = posts.id 
        LEFT JOIN tags ON post_tags.tag_id = tags.id 
        GROUP BY posts.id`;
  db.query(q, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
};

export const getPost = (req, res) => {
  const q = `SELECT posts.id, title, content, views, posts.created_at, updated_at, privacy, username 
            FROM posts
            JOIN users ON posts.user_id = users.id
            WHERE posts.id = ${req.params.id}
            `;
  db.query(q, [req.params.id], (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
};

export const addPost = (req, res) => {
  const q =
    "INSERT INTO posts (`user_id`, `title`, `content`, `created_at`, `updated_at`) VALUES(?,?,?,NOW(), NOW())";
  const values = [req.params.id, req.body.title, req.body.content];
  db.query(q, values, (err, data) => {
    if (err) return res.json(err);
    return res.json("Added successfully");
  });
};

export const editPost = (req, res) => {
  const q =
    "UPDATE posts SET `title`=?, `content`=?, `updated_at`=NOW() WHERE id=?";
  const values = [req.body.title, req.body.content, req.params.id];
  db.query(q, values, (err, data) => {
    if (err) return res.json(err);
    return res.json("updated successfully");
  });
};

export const deletePost = (req, res) => {
  const token = req.cookies.access_token;
  if (!token) return res.status(401).json("Not Authenticated!");

  jwt.verify(token, process.env.JWT_KEY, (err, userInfo) => {
    if (err) return res.status(403).json("Token is not valid!");

    console.log([userInfo.id, req.params.id])
    const q = "DELETE FROM posts where id=? AND user_id=?";
    db.query(q, [Number(req.params.id), userInfo.id], (err, data) => {
      if (err) res.json(err);
      console.log(data)
      return res.json("deleted successfully");
    });
  });
};
 