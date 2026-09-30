import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Bot from "../models/Bot.js";

const r = Router();
const sign = u => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

r.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 6) return res.status(400).json({ error: "Enter an email and a password of 6+ characters." });
  if (await User.findOne({ email })) return res.status(409).json({ error: "That email is already registered." });
  const user = await User.create({ email, password: await bcrypt.hash(password, 10) });
  await Bot.create({ user: user._id });
  res.json({ token: sign(user) });
});

r.post("/login", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user || !(await bcrypt.compare(req.body.password || "", user.password)))
    return res.status(401).json({ error: "Email or password is incorrect." });
  res.json({ token: sign(user) });
});
export default r;
