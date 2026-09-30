import { useEffect, useState, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "./api.js";

const money = n => n == null ? "–" : "$" + Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });

function Auth({ onDone }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const submit = async e => {
    e.preventDefault(); setErr("");
    try { const { token } = await api(`/auth/${mode}`, "POST", f); localStorage.setItem("token", token); onDone(); }
    catch (x) { setErr(x.message); }
  };
  return (
    <form className="auth" onSubmit={submit}>
      <h1>Paper Trading Bot</h1>
      <p>Test strategies on live market prices with $10,000 of pretend money.</p>
      <input placeholder="Email" type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
      <input placeholder="Password (6+ characters)" type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
      {err && <div className="err">{err}</div>}
      <button className="primary">{mode === "login" ? "Sign in" : "Create account"}</button>
      <button type="button" className="link" onClick={() => setMode(mode === "login" ? "register" : "login")}>
        {mode === "login" ? "New here? Create an account" : "Have an account? Sign in"}
      </button>
    </form>
  );
}

function Dashboard() {
  const [d, setD] = useState(null);
  const [trades, setTrades] = useState([]);
  const [cfg, setCfg] = useState(null);
  const [bt, setBt] = useState(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const [b, t] = await Promise.all([api("/bot"), api("/trades")]);
    setD(b); setTrades(t); setCfg(c => c || b.bot);
  }, []);
  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i); }, [load]);

  const run = async (fn, ok) => { setMsg(""); try { await fn(); if (ok) setMsg(ok); await load(); } catch (e) { setMsg(e.message); } };
  const set = (k, v) => setCfg({ ...cfg, [k]: v });
  const num = k => e => set(k, Number(e.target.value));
  if (!d || !cfg) return <p className="loading">Loading your bot…</p>;
  const { bot } = d, locked = bot.running;
  const pnl = d.equity == null ? null : ((d.equity / 10000 - 1) * 100).toFixed(2);

  return (
    <main>
      <header>
        <h1>{bot.symbol} <span className={bot.running ? "pill on" : "pill"}>{bot.running ? "Running" : "Stopped"}</span></h1>
        <button className="link" onClick={() => { localStorage.removeItem("token"); location.reload(); }}>Sign out</button>
      </header>

      <section className="stats">
        <div><label>Price</label><b>{money(d.price)}</b></div>
        <div><label>Cash</label><b>{money(bot.cash)}</b></div>
        <div><label>Holding</label><b>{bot.qty.toFixed(6)}</b></div>
        <div><label>Total value</label><b>{money(d.equity)}</b></div>
        <div><label>Profit / loss</label><b className={pnl >= 0 ? "gain" : "loss"}>{pnl == null ? "–" : pnl + "%"}</b></div>
        <div><label>Last signal</label><b>{bot.lastSignal}</b></div>
      </section>

      <section className="panel">
        <h2>Strategy</h2>
        <div className="grid">
          <label>Pair<input disabled={locked} value={cfg.symbol} onChange={e => set("symbol", e.target.value.toUpperCase())} /></label>
          <label>Candle size
            <select disabled={locked} value={cfg.interval} onChange={e => set("interval", e.target.value)}>
              {["1m", "5m", "15m", "1h", "4h", "1d"].map(i => <option key={i}>{i}</option>)}
            </select></label>
          <label>Strategy
            <select disabled={locked} value={cfg.strategy} onChange={e => set("strategy", e.target.value)}>
              <option value="sma">Moving average crossover</option><option value="rsi">RSI</option>
            </select></label>
          {cfg.strategy === "sma" ? <>
            <label>Fast average<input type="number" disabled={locked} value={cfg.fast} onChange={num("fast")} /></label>
            <label>Slow average<input type="number" disabled={locked} value={cfg.slow} onChange={num("slow")} /></label>
          </> : <>
            <label>RSI period<input type="number" disabled={locked} value={cfg.rsiPeriod} onChange={num("rsiPeriod")} /></label>
            <label>Buy below<input type="number" disabled={locked} value={cfg.oversold} onChange={num("oversold")} /></label>
            <label>Sell above<input type="number" disabled={locked} value={cfg.overbought} onChange={num("overbought")} /></label>
          </>}
          <label>Cash used per buy (%)<input type="number" disabled={locked} value={cfg.tradePct} onChange={num("tradePct")} /></label>
        </div>
        <div className="row">
          <button disabled={locked} onClick={() => run(() => api("/bot", "PUT", cfg), "Settings saved")}>Save settings</button>
          <button disabled={locked} onClick={() => run(async () => setBt(await api("/backtest", "POST", cfg)))}>Backtest last 500 candles</button>
          {locked
            ? <button className="danger" onClick={() => run(() => api("/bot/stop", "POST"), "Bot stopped")}>Stop bot</button>
            : <button className="primary" onClick={() => run(async () => { await api("/bot", "PUT", cfg); await api("/bot/start", "POST"); }, "Bot started")}>Start bot</button>}
          <button disabled={locked} className="link" onClick={() => run(() => api("/bot/reset", "POST"), "Portfolio reset to $10,000")}>Reset portfolio</button>
        </div>
        {msg && <div className="msg">{msg}</div>}
      </section>

      {bt && <section className="panel">
        <h2>Backtest result</h2>
        <p>Strategy <b className={bt.returnPct >= 0 ? "gain" : "loss"}>{bt.returnPct}%</b> vs. buy-and-hold <b>{bt.buyHoldPct}%</b> across {bt.trades} trades.</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={bt.equity}>
            <XAxis dataKey="time" tickFormatter={t => new Date(t).toLocaleDateString()} minTickGap={50} />
            <YAxis domain={["auto", "auto"]} width={70} />
            <Tooltip labelFormatter={t => new Date(t).toLocaleString()} />
            <Line dot={false} dataKey="equity" stroke="#0F8B6D" strokeWidth={2} name="Strategy value" />
          </LineChart>
        </ResponsiveContainer>
      </section>}

      <section className="panel">
        <h2>Trade history</h2>
        {trades.length === 0 ? <p>No trades yet. Start the bot and signals will appear here.</p> :
          <div className="scroll"><table><thead><tr><th>Time</th><th>Side</th><th>Price</th><th>Amount</th><th>Value</th></tr></thead>
            <tbody>{trades.map(t => <tr key={t._id}>
              <td>{new Date(t.createdAt).toLocaleString()}</td>
              <td className={t.side === "BUY" ? "gain" : "loss"}>{t.side}</td>
              <td>{money(t.price)}</td><td>{t.qty.toFixed(6)}</td><td>{money(t.value)}</td></tr>)}</tbody></table></div>}
      </section>
    </main>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem("token"));
  return authed ? <Dashboard /> : <Auth onDone={() => setAuthed(true)} />;
}
