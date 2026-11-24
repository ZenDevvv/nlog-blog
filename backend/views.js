// The post row lock serializes concurrent increments across requests/instances.
// Store a keyed IP hash, never the raw address; shared-IP visitors count together.
export async function countView(pool, postId, viewerHash, userId = 0) {
  const connection = await pool.promise().getConnection();
  try {
    await connection.beginTransaction();
    const [posts] = await connection.query("SELECT id FROM posts WHERE id = ? AND (privacy = 'public' OR user_id = ?) FOR UPDATE", [postId, userId]);
    if (!posts.length) {
      await connection.rollback();
      return { found: false, counted: false };
    }
    const [previous] = await connection.query(
      "SELECT last_viewed_at <= DATE_SUB(NOW(), INTERVAL 24 HOUR) AS eligible FROM post_views WHERE post_id = ? AND viewer_hash = ? FOR UPDATE",
      [postId, viewerHash]
    );
    const counted = !previous.length || Boolean(previous[0].eligible);
    if (counted) {
      await connection.query("INSERT INTO post_views (post_id, viewer_hash, last_viewed_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE last_viewed_at = NOW()", [postId, viewerHash]);
      await connection.query("UPDATE posts SET views = views + 1, updated_at = updated_at WHERE id = ?", [postId]);
    }
    await connection.commit();
    return { found: true, counted };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
