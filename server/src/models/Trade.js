import mongoose from "mongoose";
export default mongoose.model("Trade", new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  symbol: String, side: { type: String, enum: ["BUY", "SELL"] },
  price: Number, qty: Number, value: Number, reason: String,
}, { timestamps: true }));
