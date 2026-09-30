# MERN Trading Bot (paper trading)

MongoDB + Express + React + Node. Users register, configure a strategy (SMA crossover or RSI),
backtest it on real Binance candles, then run it live against **simulated** money (paper trading).

## Run
1. Start MongoDB (local `mongod` or a MongoDB Atlas URI).
2. Server: `cd server && cp .env.example .env && npm install && npm run dev`  (port 5000)
3. Client: `cd client && npm install && npm run dev`  (port 5173, proxies /api to 5000)

Market data comes from Binance's public API (no key needed). Your network must be able to reach api.binance.com.

## API
POST /api/auth/register | /api/auth/login  -> { token }
GET  /api/bot                -> bot config + portfolio + last price
PUT  /api/bot                -> update config
POST /api/bot/start | /stop | /reset
GET  /api/trades
POST /api/backtest           -> { returnPct, buyHoldPct, trades, equity[] }

## Going live (not included on purpose)
Replace `executeTrade` in server/src/services/engine.js with signed Binance order calls
(testnet first). Add stop-loss, position limits and rate-limit handling before risking real money.
