import db from "../dbconfig.js";
import { serverError } from "../errors.js";

export const getProfile = (req, res) => {
  const userID = req.params.id;
  const q = `SELECT users.id, users.username, users.created_at, 
                posts.id AS post_id, posts.user_id, posts.title, posts.content, 
                posts.views, posts.created_at AS post_created_at, posts.updated_at, 
                posts.privacy, 
                GROUP_CONCAT(tags.tag_name) AS tags 
              FROM users 
              LEFT JOIN posts ON users.id = posts.user_id AND (posts.privacy = 'public' OR users.id = ?) 
              LEFT JOIN post_tags ON posts.id = post_tags.post_id 
              LEFT JOIN tags ON post_tags.tag_id = tags.id 
              WHERE users.id = ?
              GROUP BY users.id, users.username, users.created_at, posts.id, posts.user_id, posts.title, posts.content, posts.views, posts.created_at, posts.updated_at, posts.privacy;`;

  db.query(q, [req.user?.id ?? 0, userID], (err, data) => {
    if (err) return serverError(res, err);
    if (!data.length) return res.status(404).json({ message: "Profile not found" });
    return res.json(data);
  });
};
