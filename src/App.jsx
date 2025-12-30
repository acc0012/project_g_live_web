import { useEffect, useRef, useState } from "react";

import { fetchSignals } from "./api/fetchSignals";
import { fetchCandlesFull } from "./api/fetchCandlesFull";
import { fetchCandlesLatest } from "./api/fetchCandlesLatest";
import { fetchCandlesByDate } from "./api/fetchCandlesByDate";

import { replayCandles } from "./logic/replayCandles";
import { liveUpdate } from "./logic/liveUpdate";
import { breakoutFromOpen } from "./logic/breakoutFromOpen";

import { loadTradeState, saveTradeState } from "./storage/tradeState";
import { loadHistorical, saveHistorical } from "./storage/historicalState";

import StockTable from "./components/StockTable";

const MARGIN = 5;

// =================================================
// APP
// =================================================
export default function App() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [inputDate, setInputDate] = useState("");

  const tradeStateRef = useRef({});
  const tradeDateRef = useRef(null);
  const initializedRef = useRef(false);
  const pollingRef = useRef(null);

  // =================================================
  // LIVE MODE – INIT (ONCE PER DAY)
  // =================================================
  async function initLiveOnce() {
    const signalsRes = await fetchSignals();

    if (!signalsRes.found) {
      setStatus("BUY signals not available for today");
      return;
    }

    const date = signalsRes.trade_date;
    tradeDateRef.current = date;

    const cached = loadTradeState(date);
    if (cached) {
      tradeStateRef.current = cached;
      initializedRef.current = true;
      return;
    }

    const signals = signalsRes.data;
    const allCandles = await fetchCandlesFull();

    const state = {};
    signals.forEach(s => {
      const candles = allCandles[s.symbol] || [];
      state[s.symbol] = replayCandles(s, candles);
    });

    tradeStateRef.current = state;
    saveTradeState(date, state);
    initializedRef.current = true;
  }

  // =================================================
  // LIVE MODE – POLLING
  // =================================================
  async function liveTick() {
    if (!initializedRef.current) return;

    const signalsRes = await fetchSignals();
    const signals = signalsRes.data;
    const ltpMap = await fetchCandlesLatest();

    const nextState = { ...tradeStateRef.current };
    const rowsOut = [];

    signals.forEach(s => {
      const ltp = ltpMap[s.symbol];
      if (!ltp) return;

      const prev = nextState[s.symbol];
      const state = liveUpdate(s, ltp, prev);
      nextState[s.symbol] = state;

      const effective = state.exit_price ?? ltp;
      const pnl1 = +(effective - s.entry).toFixed(2);
      const pnlPct = +((pnl1 / s.entry) * 100).toFixed(2);
      const capitalUsed = +(s.entry * s.qty).toFixed(2);

      rowsOut.push({
        symbol: s.symbol,
        entry: s.entry,
        ltp,

        status: state.status,
        entry_time: state.entry_time,
        exit_price: state.exit_price,
        exit_time: state.exit_time,

        qty: s.qty,
        capital_used: capitalUsed,
        margin_required: +(capitalUsed / MARGIN).toFixed(2),

        pnl_pct: pnlPct,
        pnl_capital: +(pnl1 * s.qty).toFixed(2),
        pnl_margin: +(pnl1 * s.qty).toFixed(2),

        updated_at: new Date().toLocaleTimeString()
      });
    });

    tradeStateRef.current = nextState;
    saveTradeState(tradeDateRef.current, nextState);

    setRows(rowsOut);
    setStatus("");
  }

  // =================================================
  // HISTORICAL MODE
  // =================================================
  async function runHistorical() {
    if (!inputDate) return;

    setStatus("Running historical breakout analysis...");
    setRows([]);

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    const isoDate = inputDate;

    const cached = loadHistorical(isoDate);
    if (cached) {
      setRows(cached.results);
      setStatus(`Historical breakout results for ${isoDate} (cached)`);
      return;
    }

    const allCandles = await fetchCandlesByDate(isoDate);

    if (Object.values(allCandles).every(c => !c || c.length === 0)) {
      setStatus("Market holiday / no data for selected date");
      return;
    }

    const rowsOut = [];

    Object.entries(allCandles).forEach(([symbol, candles]) => {
      const r = breakoutFromOpen(candles);
      if (r.status === "NO_DATA") return;

      const effective =
        r.exit_price ??
        (r.status === "ENTERED" ? r.entry : r.open);

      const pnl1 = +(effective - r.entry).toFixed(2);
      const pnlPct = +((pnl1 / r.entry) * 100).toFixed(2);

      rowsOut.push({
        symbol,
        open: r.open,
        entry: r.entry,
        ltp: effective,

        status: r.status,
        entry_time: r.entry_time,
        exit_price: r.exit_price,
        exit_time: r.exit_time,

        qty: "-",
        capital_used: "-",
        margin_required: "-",

        pnl_pct: pnlPct,
        pnl_capital: "-",
        pnl_margin: "-",

        updated_at: isoDate
      });
    });

    saveHistorical(isoDate, {
      date: isoDate,
      created_at: new Date().toISOString(),
      params: {
        entryPct: 0.03,
        stoplossPct: 0.01,
        rr: 1
      },
      candles: allCandles,
      results: rowsOut
    });

    setRows(rowsOut);
    setStatus(`Historical breakout results for ${isoDate}`);
  }

  // =================================================
  // CLEAR ALL DATA (NEW BUTTON)
  // =================================================
  function clearAllData() {
    if (!window.confirm("Clear all cached data and reset app?")) return;

    localStorage.clear();

    tradeStateRef.current = {};
    tradeDateRef.current = null;
    initializedRef.current = false;

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    setRows([]);
    setStatus("All local data cleared. Reloading live mode...");
    setInputDate("");

    initLiveOnce();
    pollingRef.current = setInterval(liveTick, 3000);
  }

  // =================================================
  // LIVE STARTUP
  // =================================================
  useEffect(() => {
    // ✅ CLEAR UI ON APP RESTART
    setRows([]);
    setStatus("");

    initLiveOnce();
    pollingRef.current = setInterval(liveTick, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // =================================================
  // UI
  // =================================================
  return (
    <div className="container-fluid mt-4">
      <h3 className="text-center">📊 Live BUY Breakout Monitor</h3>
      <p className="text-center text-muted">
        Present time: {new Date().toLocaleTimeString()}
      </p>

      {/* ===== CONTROLS ===== */}
      <div className="d-flex justify-content-center gap-2 mb-3">
        <input
          type="date"
          value={inputDate}
          onChange={e => setInputDate(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          className="form-control w-auto"
        />

        <button
          className="btn btn-primary"
          onClick={runHistorical}
          disabled={!inputDate}
        >
          Run Historical
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => window.location.reload()}
        >
          Back to Live
        </button>

        <button
          className="btn btn-danger"
          onClick={clearAllData}
        >
          Clear Data
        </button>
      </div>

      {/* ===== STATUS ===== */}
      {status && (
        <div className="status-box text-center mb-2">
          {status}
        </div>
      )}

      <StockTable rows={rows} />
    </div>
  );
}
