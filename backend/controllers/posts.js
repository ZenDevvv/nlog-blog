import db from "../dbconfig.js";
import { countView } from "../views.js";
import { validatePost, validTag } from "../validation.js";
import { serverError } from "../errors.js";

export const getAllPost = (req, res) => {
  const { tag } = req.query;
  if (tag !== undefined && !validTag(tag)) {
    return res.status(400).json({ message: "Invalid tag" });
  }

  const q = tag
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
              WHERE tags.tag_name = ?
          )
          GROUP BY posts.id, posts.user_id, posts.title, posts.content, posts.views, posts.created_at, posts.updated_at, posts.privacy, users.username;`
    : `SELECT posts.id AS post_id, user_id, title, content, views, posts.created_at, updated_at, privacy, username, 
            GROUP_CONCAT(tag_name) AS tags 
          FROM posts 
          JOIN users ON posts.user_id = users.id 
          LEFT JOIN post_tags ON post_tags.post_id = posts.id 
          LEFT JOIN tags ON post_tags.tag_id = tags.id 
          GROUP BY posts.id, posts.user_id, posts.title, posts.content, posts.views, posts.created_at, posts.updated_at, posts.privacy, users.username`;

  db.query(q, tag ? [tag] : [], (err, data) => {
    if (err) return serverError(res, err);
    return res.status(200).json(data);
  });
};

export const getPost = (req, res) => {
  // const q = `UPDATE posts SET views = views+1 WHERE id=?`;
  const postID = req.params.id;

  const q = `SELECT 
    posts.id, 
    posts.title, 
    posts.content, 
    posts.views, 
    posts.created_at, 
    posts.updated_at, 
    posts.privacy, 
    users.username, 
    GROUP_CONCAT(tags.tag_name) AS tags
FROM 
    posts
LEFT JOIN 
    users ON posts.user_id = users.id
LEFT JOIN 
    post_tags ON posts.id = post_tags.post_id
LEFT JOIN 
    tags ON post_tags.tag_id = tags.id
WHERE 
    posts.id = ?
GROUP BY 
    posts.id, posts.title, posts.content, posts.views, posts.created_at, posts.updated_at, posts.privacy, users.username;`;
  db.query(q, [postID], (err, data) => {
    if (err) return serverError(res, err);
    return res.status(200).json(data);
  });
};

const saveTags = async (postId, tags) => {
  for (const tag of new Set(tags)) {
    const [saved] = await db
      .promise()
      .query("INSERT INTO tags (tag_name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)", [tag]);
    await db.promise().query("INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)", [postId, saved.insertId]);
  }
};

export const addPost = async (req, res) => {
  const result = validatePost(req.body);
  if (result.error) return res.status(400).json({ message: result.error });
  const { title, content, tags } = result.value;

  try {
    const [post] = await db
      .promise()
      .query("INSERT INTO posts (`user_id`, `title`, `content`, `created_at`, `updated_at`) VALUES(?,?,?,NOW(), NOW())", [
        req.user.id,
        title,
        content,
      ]);
    await saveTags(post.insertId, tags);
    return res.status(201).json({ message: "Post Created" });
  } catch (err) {
    return serverError(res, err);
  }
};

export const editPost = async (req, res) => {
  const result = validatePost(req.body);
  if (result.error) return res.status(400).json({ message: result.error });
  const { title, content, tags } = result.value;
  const postId = req.params.id;

  try {
    const [updated] = await db
      .promise()
      .query("UPDATE posts SET `title`=?, `content`=?, `updated_at`=NOW() WHERE id=? AND user_id=?", [
        title,
        content,
        postId,
        req.user.id,
      ]);
    if (updated.affectedRows === 0) return res.status(404).json({ message: "Post not found" });

    if (req.body.tags !== undefined) {
      await db.promise().query("DELETE FROM post_tags WHERE post_id=?", [postId]);
      await saveTags(postId, tags);
    }
    return res.status(200).json({ message: "Post updated successfully" });
  } catch (err) {
    return serverError(res, err);
  }
};

export const deletePost = (req, res) => {
  const q = "DELETE FROM posts where id=? AND user_id=?";
  db.query(q, [req.params.id, req.user.id], (err, data) => {
    if (err) return serverError(res, err);
    if (data.affectedRows === 0) return res.status(404).json({ message: "Post not found" });
    return res.status(200).json({ message: "deleted successfully" });
  });
};

export const searchPosts = (req, res) => {
  const searchTerm = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!searchTerm || searchTerm.length > 200) {
    return res.status(400).json({ message: "Search term must be 1–200 characters" });
  }

  const q = `SELECT posts.id AS post_id, user_id, title, content, views, posts.created_at, posts.updated_at, privacy, users.username, 
              GROUP_CONCAT(DISTINCT tags.tag_name) AS tags
              FROM posts
              JOIN users ON posts.user_id = users.id
              LEFT JOIN post_tags ON post_tags.post_id = posts.id
              LEFT JOIN tags ON post_tags.tag_id = tags.id
              WHERE users.username LIKE ? OR posts.title LIKE ? OR posts.content LIKE ? OR tags.tag_name LIKE ?
              GROUP BY posts.id, posts.user_id, posts.title, posts.content, posts.views, posts.created_at, posts.updated_at, posts.privacy, users.username;`;

  db.query(
    q,
    [
      `%${searchTerm}%`,
      `%${searchTerm}%`,
      `%${searchTerm}%`,
      `%${searchTerm}%`,
    ],
    (err, data) => {
      if (err) return serverError(res, err);
      return res.status(200).json(data);
    }
  );
};

export const incrementViews = async (req, res) => {
  try {
    const result = await countView(db, req.params.id, req.app.locals.security.viewerHash(req));
    if (!result.found) return res.status(404).json({ message: "Post not found" });
    return res.status(200).json({ message: result.counted ? "View counted" : "View already counted", counted: result.counted });
  } catch (err) {
    return serverError(res, err);
  }
};

export const trendingPosts = (req, res) => {
  const q = `SELECT posts.id AS post_id, user_id, title, content, views, posts.created_at, updated_at, privacy, username, 
              GROUP_CONCAT(tags.tag_name) AS tags
              FROM posts 
              JOIN users ON posts.user_id = users.id 
              LEFT JOIN post_tags ON posts.id = post_tags.post_id 
              LEFT JOIN tags ON post_tags.tag_id = tags.id 
              GROUP BY posts.id, posts.user_id, posts.title, posts.content, posts.views, posts.created_at, posts.updated_at, posts.privacy, users.username
              ORDER BY views DESC;`

  db.query(q, (err, data) => {
    if (err) return serverError(res, err);
    return res.status(200).json(data);
  });
};
