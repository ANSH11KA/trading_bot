import Bot from "../models/Bot.js";
import Trade from "../models/Trade.js";
import { getCandles } from "./market.js";
import { signal } from "./strategies.js";

const timers = new Map();
const TICK_MS = 30_000;
const MIN_ORDER = 10; // USDT

async function executeTrade(bot, side, price) {
  // PAPER TRADING: swap this function for real exchange calls to go live.
  let qty;
  if (side === "BUY") {
    const spend = bot.cash * bot.tradePct / 100;
    if (spend < MIN_ORDER) return;
    qty = spend / price; bot.cash -= spend; bot.qty += qty;
  } else {
    if (bot.qty * price < MIN_ORDER) return;
    qty = bot.qty; bot.cash += qty * price; bot.qty = 0;
  }
  await Trade.create({ user: bot.user, symbol: bot.symbol, side, price, qty, value: qty * price, reason: bot.strategy });
}

async function tick(botId) {
  try {
    const bot = await Bot.findById(botId);
    if (!bot || !bot.running) return stopLoop(botId);
    const candles = await getCandles(bot.symbol, bot.interval, 200);
    const closes = candles.map(c => c.close);
    const s = signal(closes, bot, bot.qty > 0);
    if (s !== "HOLD") await executeTrade(bot, s, closes.at(-1));
    bot.lastSignal = s;
    await bot.save();
  } catch (e) { console.error("tick failed:", e.message); }
}

export function startLoop(botId) {
  const id = String(botId);
  if (timers.has(id)) return;
  tick(id);
  timers.set(id, setInterval(() => tick(id), TICK_MS));
}
export function stopLoop(botId) {
  const id = String(botId);
  clearInterval(timers.get(id)); timers.delete(id);
}
export async function resumeAll() {
  for (const b of await Bot.find({ running: true })) startLoop(b._id);
}
