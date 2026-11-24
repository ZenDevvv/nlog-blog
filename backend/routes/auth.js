import express from "express";
import { register, login, logout } from "../controllers/auth.js";

const router = express.Router();

router.post("/register", (req, res, next) => req.app.locals.security.registrationLimit(req, res, next), register);
router.post("/login",
  (req, res, next) => req.app.locals.security.loginLimit(req, res, next),
  (req, res, next) => req.app.locals.security.accountLoginLimit(req, res, next),
  login);
router.post("/logout", logout);

export default router
