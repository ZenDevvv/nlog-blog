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

const router = express.Router();

router.get("/trending", trendingPosts)
router.get("/search", searchPosts);
router.get("/", getAllPost);
router.get("/:id", getPost);

router.post("/:id", addPost);

router.put("/:id", editPost);
router.put("/:id/increment-views", incrementViews);

router.delete("/:id", deletePost);


export default router;
