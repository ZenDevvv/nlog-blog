import db from "../dbconfig.js";
import jwt from "jsonwebtoken";

export const getAllPost = (req, res) => {
  const token = req.cookies.access_token;
  if (!token) return res.status(401).json("Not Authenticated!");

  jwt.verify(token, process.env.JWT_KEY, (err, userInfo) => {
    if (err) return res.status(403).json("Token is not valid!");

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
  })
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
    posts.id;`;
  db.query(q, [postID], (err, data) => {
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

    const postId = data.insertId;
    const tags = req.body.tags;

    if (tags && tags.length > 0) {
      let insertCount = 0;

      tags.forEach((tag) => {
        const q =
          "INSERT INTO tags (tag_name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)";
        db.query(q, [tag], (err, data) => {
          if (err) return res.json(err);
          const tagId = data.insertId;
          const insertToPostTagsQ =
            "INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)";
          db.query(insertToPostTagsQ, [postId, tagId], (err, data) => {
            if (err) return res.json(err);

            insertCount++;
            if (insertCount === tags.length) {
              return res.json("Added successfully");
            }
          });
        });
      });
    } else {
      return res.json("Added successfully");
    }
  });
};

export const editPost = (req, res) => {
  const q =
    "UPDATE posts SET `title`=?, `content`=?, `updated_at`=NOW() WHERE id=?";
  const values = [req.body.title, req.body.content, req.params.id];

  db.query(q, values, (err, data) => {
    if (err) return res.json(err);

    const postId = req.params.id;
    const tags = req.body.tags;

    // Handle tags if provided
    if (tags && tags.length > 0) {
      // First, delete existing tags for the post
      const deleteTagsQ = "DELETE FROM post_tags WHERE post_id=?";
      db.query(deleteTagsQ, [postId], (err) => {
        if (err) return res.json(err);

        let insertCount = 0;
        tags.forEach((tag) => {
          const q =
            "INSERT INTO tags (tag_name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)";
          db.query(q, [tag], (err, data) => {
            if (err) return res.json(err);
            const tagId = data.insertId;
            const insertToPostTagsQ =
              "INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)";
            db.query(insertToPostTagsQ, [postId, tagId], (err) => {
              if (err) return res.json(err);

              insertCount++;
              if (insertCount === tags.length) {
                return res.json("Post updated successfully");
              }
            });
          });
        });
      });
    } else {
      return res.json("Post updated successfully");
    }
  });
};

export const deletePost = (req, res) => {
  const token = req.cookies.access_token;
  if (!token) return res.status(401).json("Not Authenticated!");

  jwt.verify(token, process.env.JWT_KEY, (err, userInfo) => {
    if (err) return res.status(403).json("Token is not valid!");

    const q = "DELETE FROM posts where id=? AND user_id=?";
    db.query(q, [Number(req.params.id), userInfo.id], (err, data) => {
      if (err) res.json(err);
      console.log(data);
      return res.json("deleted successfully");
    });
  });
};

export const searchPosts = (req, res) => {
  console.log("search post!");
  const searchTerm = req.query.q; // Get the search term from query parameters
  if (!searchTerm) return res.status(400).json("Search term is required!");

  const q = `SELECT posts.id AS post_id, user_id, title, content, views, posts.created_at, posts.updated_at, privacy, users.username, 
              GROUP_CONCAT(DISTINCT tags.tag_name) AS tags
              FROM posts
              JOIN users ON posts.user_id = users.id
              LEFT JOIN post_tags ON post_tags.post_id = posts.id
              LEFT JOIN tags ON post_tags.tag_id = tags.id
              WHERE users.username LIKE ? OR posts.title LIKE ? OR posts.content LIKE ? OR tags.tag_name LIKE ?
              GROUP BY posts.id;`;

  db.query(
    q,
    [
      `%${searchTerm}%`,
      `%${searchTerm}%`,
      `%${searchTerm}%`,
      `%${searchTerm}%`,
    ],
    (err, data) => {
      if (err) return res.json(err);
      return res.json(data);
    }
  );
};

export const incrementViews = (req, res) => {
  console.log("increment")
  const postID = req.params.id; 
  const q = `UPDATE posts SET views = views + 1, updated_at = updated_at WHERE id = ?;
`; 

  db.query(q, [postID], (err, data) => {
    if (err) return res.json(err); 
    return res.json("Views incremented successfully"); 
  });
};

export const trendingPosts = (req, res) => {
  console.log("reached trending!")
  const q = `SELECT posts.id AS post_id, user_id, title, content, views, posts.created_at, updated_at, privacy, username, 
              GROUP_CONCAT(tags.tag_name) AS tags
              FROM posts 
              JOIN users ON posts.user_id = users.id 
              LEFT JOIN post_tags ON posts.id = post_tags.post_id 
              LEFT JOIN tags ON post_tags.tag_id = tags.id 
              GROUP BY posts.id 
              ORDER BY views DESC;`

  db.query(q, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
};
