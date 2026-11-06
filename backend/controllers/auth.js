import db from "../dbconfig.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { serverError } from "../errors.js";

const isProduction = process.env.NODE_ENV === "production";
const SESSION_DAYS = 7;

const isText = (value) => typeof value === "string" && value.length > 0;

export const register = async (req, res) => {
  const { username, email, password } = req.body;
  if (![username, email, password].every(isText)) {
    return res.status(400).json({ message: "Username, email and password are required" });
  }

  try {
    const [existing] = await db
      .promise()
      .query("SELECT id FROM users WHERE email = ? OR username = ?", [email, username]);
    if (existing.length) return res.status(409).json({ message: "User already exists!" });

    const hashedPW = await bcrypt.hash(password, 10);
    await db
      .promise()
      .query(
        "INSERT INTO users(`username`, `email`, `password`, `created_at`) VALUES (?, ?, ?, NOW())",
        [username, email, hashedPW]
      );
    return res.status(201).json({ message: "Registered successfully" });
  } catch (err) {
    return serverError(res, err);
  }
};

export const login = async (req, res) => {
  const { username, password } = req.body;
  if (![username, password].every(isText)) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  try {
    const [users] = await db.promise().query("SELECT * FROM users WHERE username = ?", [username]);
    const pwMatched = users.length > 0 && (await bcrypt.compare(password, users[0].password));
    if (!pwMatched) return res.status(401).json({ message: "Incorrect username or password" });

    const token = jwt.sign({ id: users[0].id }, process.env.JWT_KEY, {
      algorithm: "HS256",
      expiresIn: `${SESSION_DAYS}d`,
    });
    const { password: _hash, ...other } = users[0];

    return res
      .cookie("access_token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({ message: "Login successfully", ...other });
  } catch (err) {
    return serverError(res, err);
  }
};

export const logout = (req, res) => {
  res
    .clearCookie("access_token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    })
    .status(200)
    .json("User has been logged out");
};
