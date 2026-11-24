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
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { uploadCoverImage } from "../middleware/upload.js";

import { validateId } from "../validation.js";

const router = express.Router();
const writeLimit = (req, res, next) => req.app.locals.security.writeLimit(req, res, next);
router.param("id", (req, res, next) => validateId(req, res, next));

router.get("/trending", trendingPosts)
router.get("/search", searchPosts);
router.get("/", getAllPost);
router.get("/:id", optionalAuth, getPost);

router.post("/", requireAuth, writeLimit, uploadCoverImage, addPost);

router.put("/:id", requireAuth, writeLimit, uploadCoverImage, editPost);
router.put("/:id/increment-views", optionalAuth, (req, res, next) => req.app.locals.security.viewLimit(req, res, next), incrementViews);

router.delete("/:id", requireAuth, writeLimit, deletePost);


export default router;
