import db from "../dbconfig.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const register = (req, res) => {
  const q = "SELECT * FROM users WHERE email = ? OR username = ?";
  console.log(req.body);
  db.query(q, [req.body.email, req.body.username], async (err, data) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Database query error", error: err });
    if (data.length)
      return res.status(409).json({ message: "User already exists!" });

    const hashedPW = await bcrypt.hash(req.body.password, 10);
    const q =
      "INSERT INTO users(`username`, `email`, `password`, `created_at`) VALUES (?, ?, ?, NOW())";
    const values = [req.body.username, req.body.email, hashedPW];

    db.query(q, values, (err, data) => {
      if (err)
        return res
          .status(500)
          .json({ message: "Database insertion error", error: err });
      return res.status(201).json({ message: "Registered successfully" });
    });
  });
};

export const login = (req, res) => {
  const q = "SELECT * FROM users where username = ?";
  db.query(q, req.body.username, async (err, data) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Database query error", error: err });
    if (data.length === 0)
      return res.status(404).json({ message: "Username does not exist" });

    const pwMatched = await bcrypt.compare(req.body.password, data[0].password);
    if (pwMatched) {
      const token = jwt.sign({ id: data[0].id }, process.env.JWT_KEY);
      const { password, ...other } = data[0];

      res.cookie("access_token", token, {
        httpOnly: true,
        sameSite: "lax"
      }).status(200).json({ message: "Login successfully", ...other })

    } else {
      return res
        .status(401)
        .json({ message: "Incorrect username or password" });
    }
  }); 
};

export const logout = (req, res) => {
  console.log(res.cookies)
  res.clearCookie("access_token", {
    sameSite: "lax",
  }).status(200).json("User has been logged out");
};
