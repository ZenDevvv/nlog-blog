CREATE TABLE IF NOT EXISTS post_views (
  post_id INT NOT NULL,
  viewer_hash CHAR(64) NOT NULL,
  last_viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, viewer_hash),
  CONSTRAINT post_views_post_fk FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
