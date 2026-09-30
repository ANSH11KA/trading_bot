const sma = (a, n) => a.length < n ? null : a.slice(-n).reduce((s, x) => s + x, 0) / n;

export function rsi(closes, n) {
  if (closes.length <= n) return null;
  let g = 0, l = 0;
  for (let i = closes.length - n; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    d >= 0 ? (g += d) : (l -= d);
  }
  return l === 0 ? 100 : 100 - 100 / (1 + g / l);
}

// Returns "BUY" | "SELL" | "HOLD" given closes and whether we hold a position.
export function signal(closes, c, hasPosition) {
  if (c.strategy === "sma") {
    const f = sma(closes, c.fast), s = sma(closes, c.slow);
    if (f == null || s == null) return "HOLD";
    if (f > s && !hasPosition) return "BUY";
    if (f < s && hasPosition) return "SELL";
    return "HOLD";
  }
  const r = rsi(closes, c.rsiPeriod);
  if (r == null) return "HOLD";
  if (r < c.oversold && !hasPosition) return "BUY";
  if (r > c.overbought && hasPosition) return "SELL";
  return "HOLD";
}

export function backtest(candles, c, startCash = 10000) {
  let cash = startCash, qty = 0, trades = 0;
  const closes = [], equity = [];
  for (const k of candles) {
    closes.push(k.close);
    const s = signal(closes, c, qty > 0);
    if (s === "BUY") { const spend = cash * c.tradePct / 100; qty += spend / k.close; cash -= spend; trades++; }
    else if (s === "SELL") { cash += qty * k.close; qty = 0; trades++; }
    equity.push({ time: k.time, equity: +(cash + qty * k.close).toFixed(2), price: k.close });
  }
  const end = equity.at(-1).equity;
  return {
    trades, equity,
    returnPct: +((end / startCash - 1) * 100).toFixed(2),
    buyHoldPct: +((closes.at(-1) / closes[0] - 1) * 100).toFixed(2),
  };
}
