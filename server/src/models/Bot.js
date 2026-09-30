import mongoose from "mongoose";
export default mongoose.model("Bot", new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, required: true },
  symbol: { type: String, default: "BTCUSDT" },
  interval: { type: String, default: "1h" },
  strategy: { type: String, enum: ["sma", "rsi"], default: "sma" },
  fast: { type: Number, default: 10 }, slow: { type: Number, default: 30 },
  rsiPeriod: { type: Number, default: 14 }, oversold: { type: Number, default: 30 }, overbought: { type: Number, default: 70 },
  tradePct: { type: Number, default: 50, min: 1, max: 100 },
  running: { type: Boolean, default: false },
  cash: { type: Number, default: 10000 }, qty: { type: Number, default: 0 },
  lastSignal: { type: String, default: "HOLD" },
}, { timestamps: true }));
