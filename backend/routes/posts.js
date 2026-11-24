import express from "express";
import {
  addPost,
  deletePost,
  editPost,
  getAllPost,
  getPost,
  searchPosts,
  incrementViews,
  trendingPosts,
} from "../controllers/posts.js";
import { requireAuth } from "../middleware/auth.js";

import { validateId } from "../validation.js";

const router = express.Router();
router.param("id", (req, res, next) => validateId(req, res, next));

router.get("/trending", trendingPosts)
router.get("/search", searchPosts);
router.get("/", requireAuth, getAllPost);
router.get("/:id", getPost);

router.post("/", requireAuth, addPost);

router.put("/:id", requireAuth, editPost);
router.put("/:id/increment-views", incrementViews);

router.delete("/:id", requireAuth, deletePost);


export default router;
