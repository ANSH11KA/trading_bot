import { Router } from "express";
import Bot from "../models/Bot.js";
import Trade from "../models/Trade.js";
import auth from "../middleware/auth.js";
import { getCandles, getPrice } from "../services/market.js";
import { backtest } from "../services/strategies.js";
import { startLoop, stopLoop } from "../services/engine.js";

const r = Router();
r.use(auth);
const FIELDS = ["symbol", "interval", "strategy", "fast", "slow", "rsiPeriod", "oversold", "overbought", "tradePct"];
const pick = body => Object.fromEntries(FIELDS.filter(f => body[f] !== undefined).map(f => [f, body[f]]));

r.get("/bot", async (req, res) => {
  const bot = await Bot.findOne({ user: req.userId });
  let price = null;
  try { price = await getPrice(bot.symbol); } catch {}
  res.json({ bot, price, equity: price ? +(bot.cash + bot.qty * price).toFixed(2) : null });
});

r.put("/bot", async (req, res) => {
  const bot = await Bot.findOne({ user: req.userId });
  if (bot.running) return res.status(409).json({ error: "Stop the bot before changing its settings." });
  const d = pick(req.body);
  if (d.symbol) d.symbol = String(d.symbol).toUpperCase();
  if (d.fast && d.slow && +d.fast >= +d.slow) return res.status(400).json({ error: "Fast SMA must be shorter than slow SMA." });
  Object.assign(bot, d);
  await bot.save();
  res.json({ bot });
});

r.post("/bot/start", async (req, res) => {
  const bot = await Bot.findOneAndUpdate({ user: req.userId }, { running: true }, { new: true });
  startLoop(bot._id); res.json({ bot });
});
r.post("/bot/stop", async (req, res) => {
  const bot = await Bot.findOneAndUpdate({ user: req.userId }, { running: false }, { new: true });
  stopLoop(bot._id); res.json({ bot });
});
r.post("/bot/reset", async (req, res) => {
  const bot = await Bot.findOne({ user: req.userId });
  if (bot.running) return res.status(409).json({ error: "Stop the bot before resetting." });
  Object.assign(bot, { cash: 10000, qty: 0, lastSignal: "HOLD" });
  await bot.save(); await Trade.deleteMany({ user: req.userId });
  res.json({ bot });
});

r.get("/trades", async (req, res) => res.json(await Trade.find({ user: req.userId }).sort({ createdAt: -1 }).limit(100)));

r.post("/backtest", async (req, res) => {
  try {
    const bot = await Bot.findOne({ user: req.userId });
    const cfg = { ...bot.toObject(), ...pick(req.body) };
    res.json(backtest(await getCandles(cfg.symbol.toUpperCase(), cfg.interval, 500), cfg));
  } catch (e) { res.status(502).json({ error: e.message }); }
});
export default r;
