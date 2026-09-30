const BASE = "https://api.binance.com/api/v3";
export async function getCandles(symbol, interval, limit = 500) {
  const r = await fetch(`${BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
  if (!r.ok) throw new Error(`Binance error ${r.status}: check symbol/interval`);
  const rows = await r.json();
  return rows.map(k => ({ time: k[0], close: +k[4] }));
}
export async function getPrice(symbol) {
  const r = await fetch(`${BASE}/ticker/price?symbol=${symbol}`);
  if (!r.ok) throw new Error("Could not fetch price");
  return +(await r.json()).price;
}
