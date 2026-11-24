import db from "../dbconfig.js";
import { countView } from "../views.js";
import { validatePost, validTag } from "../validation.js";
import { serverError } from "../errors.js";
import {
  uploadPostCoverImage,
  deletePostCoverImage,
} from "../cloudinary.js";

const getImageStorage = (req) =>
  req.app?.locals?.imageStorage ?? {
    uploadPostCoverImage,
    deletePostCoverImage,
  };

const safeDeleteImage = async (storage, publicId) => {
  if (!publicId) return;
  try {
    await storage.deletePostCoverImage(publicId);
  } catch (cleanupErr) {
    console.error("Failed to delete Cloudinary image:", publicId, cleanupErr);
  }
};

export const getAllPost = (req, res) => {
  const { tag } = req.query;
  if (tag !== undefined && !validTag(tag)) {
    return res.status(400).json({ message: "Invalid tag" });
  }

  const q = tag
    ? `SELECT posts.id AS post_id, user_id, title, content, posts.image_url, views, posts.created_at, posts.updated_at, privacy, username, 
        GROUP_CONCAT(DISTINCT tag_name) AS tags
          FROM posts
          JOIN users ON posts.user_id = users.id
          LEFT JOIN post_tags ON post_tags.post_id = posts.id
          LEFT JOIN tags ON post_tags.tag_id = tags.id
          WHERE posts.privacy = 'public' AND posts.id IN (
              SELECT post_tags.post_id
              FROM post_tags
              JOIN tags ON post_tags.tag_id = tags.id
              WHERE tags.tag_name = ?
          )
          GROUP BY posts.id, posts.user_id, posts.title, posts.content, posts.image_url, posts.views, posts.created_at, posts.updated_at, posts.privacy, users.username;`
    : `SELECT posts.id AS post_id, user_id, title, content, posts.image_url, views, posts.created_at, updated_at, privacy, username, 
            GROUP_CONCAT(tag_name) AS tags 
          FROM posts 
          JOIN users ON posts.user_id = users.id 
          LEFT JOIN post_tags ON post_tags.post_id = posts.id 
          LEFT JOIN tags ON post_tags.tag_id = tags.id 
          WHERE posts.privacy = 'public'
          GROUP BY posts.id, posts.user_id, posts.title, posts.content, posts.image_url, posts.views, posts.created_at, posts.updated_at, posts.privacy, users.username`;

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
    posts.user_id,
    posts.title, 
    posts.content,
    posts.image_url, 
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
    posts.id = ? AND (posts.privacy = 'public' OR posts.user_id = ?)
GROUP BY 
    posts.id, posts.user_id, posts.title, posts.content, posts.image_url, posts.views, posts.created_at, posts.updated_at, posts.privacy, users.username;`;
  db.query(q, [postID, req.user?.id ?? 0], (err, data) => {
    if (err) return serverError(res, err);
    if (!data.length) return res.status(404).json({ message: "Post not found" });
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
  const storage = getImageStorage(req);

  let uploaded = null;
  try {
    if (req.validatedImage) {
      uploaded = await storage.uploadPostCoverImage({
        buffer: req.validatedImage.buffer,
        mime: req.validatedImage.mime,
        userId: req.user.id,
      });
    }

    const [post] = await db
      .promise()
      .query(
        "INSERT INTO posts (`user_id`, `title`, `content`, `image_url`, `image_public_id`, `created_at`, `updated_at`) VALUES(?,?,?,?,?,NOW(), NOW())",
        [
          req.user.id,
          title,
          content,
          uploaded?.url ?? null,
          uploaded?.publicId ?? null,
        ]
      );
    await saveTags(post.insertId, tags);
    return res.status(201).json({
      message: "Post Created",
      id: post.insertId,
      image_url: uploaded?.url ?? null,
    });
  } catch (err) {
    if (uploaded?.publicId) {
      await safeDeleteImage(storage, uploaded.publicId);
    }
    if (err?.code === "CLOUDINARY_NOT_CONFIGURED") {
      return res
        .status(503)
        .json({ message: "Image uploads are not configured on the server" });
    }
    return serverError(res, err);
  }
};

export const editPost = async (req, res) => {
  const result = validatePost(req.body);
  if (result.error) return res.status(400).json({ message: result.error });
  const { title, content, tags } = result.value;
  const postId = req.params.id;
  const storage = getImageStorage(req);
  const removeImage =
    req.body.removeImage === true || req.body.removeImage === "true";

  let uploaded = null;
  try {
    const [existingRows] = await db
      .promise()
      .query("SELECT id, image_url, image_public_id FROM posts WHERE id=? AND user_id=?", [
        postId,
        req.user.id,
      ]);
    if (!existingRows.length) {
      return res.status(404).json({ message: "Post not found" });
    }
    const existing = existingRows[0];

    if (req.validatedImage) {
      uploaded = await storage.uploadPostCoverImage({
        buffer: req.validatedImage.buffer,
        mime: req.validatedImage.mime,
        userId: req.user.id,
      });
    }

    const nextImageUrl = uploaded
      ? uploaded.url
      : removeImage
        ? null
        : existing.image_url;
    const nextImagePublicId = uploaded
      ? uploaded.publicId
      : removeImage
        ? null
        : existing.image_public_id;

    const [updated] = await db
      .promise()
      .query(
        "UPDATE posts SET `title`=?, `content`=?, `image_url`=?, `image_public_id`=?, `updated_at`=NOW() WHERE id=? AND user_id=?",
        [
          title,
          content,
          nextImageUrl,
          nextImagePublicId,
          postId,
          req.user.id,
        ]
      );
    if (updated.affectedRows === 0) {
      if (uploaded?.publicId) await safeDeleteImage(storage, uploaded.publicId);
      return res.status(404).json({ message: "Post not found" });
    }

    if (req.body.tags !== undefined) {
      await db.promise().query("DELETE FROM post_tags WHERE post_id=?", [postId]);
      await saveTags(postId, tags);
    }

    if (
      existing.image_public_id &&
      existing.image_public_id !== nextImagePublicId
    ) {
      await safeDeleteImage(storage, existing.image_public_id);
    }

    return res.status(200).json({
      message: "Post updated successfully",
      image_url: nextImageUrl,
    });
  } catch (err) {
    if (uploaded?.publicId) {
      await safeDeleteImage(storage, uploaded.publicId);
    }
    if (err?.code === "CLOUDINARY_NOT_CONFIGURED") {
      return res
        .status(503)
        .json({ message: "Image uploads are not configured on the server" });
    }
    return serverError(res, err);
  }
};

export const deletePost = async (req, res) => {
  const storage = getImageStorage(req);
  try {
    const [existingRows] = await db
      .promise()
      .query("SELECT image_public_id FROM posts WHERE id=? AND user_id=?", [
        req.params.id,
        req.user.id,
      ]);
    if (!existingRows.length) {
      return res.status(404).json({ message: "Post not found" });
    }

    const [data] = await db
      .promise()
      .query("DELETE FROM posts WHERE id=? AND user_id=?", [
        req.params.id,
        req.user.id,
      ]);
    if (data.affectedRows === 0) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (existingRows[0].image_public_id) {
      await safeDeleteImage(storage, existingRows[0].image_public_id);
    }
    return res.status(200).json({ message: "deleted successfully" });
  } catch (err) {
    return serverError(res, err);
  }
};

export const searchPosts = (req, res) => {
  const searchTerm = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!searchTerm || searchTerm.length > 200) {
    return res.status(400).json({ message: "Search term must be 1–200 characters" });
  }

  const q = `SELECT posts.id AS post_id, user_id, title, content, posts.image_url, views, posts.created_at, posts.updated_at, privacy, users.username, 
              GROUP_CONCAT(DISTINCT tags.tag_name) AS tags
              FROM posts
              JOIN users ON posts.user_id = users.id
              LEFT JOIN post_tags ON post_tags.post_id = posts.id
              LEFT JOIN tags ON post_tags.tag_id = tags.id
              WHERE posts.privacy = 'public' AND (users.username LIKE ? OR posts.title LIKE ? OR posts.content LIKE ? OR tags.tag_name LIKE ?)
              GROUP BY posts.id, posts.user_id, posts.title, posts.content, posts.image_url, posts.views, posts.created_at, posts.updated_at, posts.privacy, users.username;`;

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
    const result = await countView(db, req.params.id, req.app.locals.security.viewerHash(req), req.user?.id ?? 0);
    if (!result.found) return res.status(404).json({ message: "Post not found" });
    return res.status(200).json({ message: result.counted ? "View counted" : "View already counted", counted: result.counted });
  } catch (err) {
    return serverError(res, err);
  }
};

export const trendingPosts = (req, res) => {
  const q = `SELECT posts.id AS post_id, user_id, title, content, posts.image_url, views, posts.created_at, updated_at, privacy, username, 
              GROUP_CONCAT(tags.tag_name) AS tags
              FROM posts 
              JOIN users ON posts.user_id = users.id 
              LEFT JOIN post_tags ON posts.id = post_tags.post_id 
              LEFT JOIN tags ON post_tags.tag_id = tags.id 
              WHERE posts.privacy = 'public'
              GROUP BY posts.id, posts.user_id, posts.title, posts.content, posts.image_url, posts.views, posts.created_at, posts.updated_at, posts.privacy, users.username
              ORDER BY views DESC;`

  db.query(q, (err, data) => {
    if (err) return serverError(res, err);
    return res.status(200).json(data);
  });
};
