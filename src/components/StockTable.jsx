import { useState, useMemo, useRef, useEffect } from "react";

const DEFAULT_CAPITAL = 20000;
const DEFAULT_BREAKOUT = 3; // %
const DEFAULT_TARGET = 6;   // %
const MARGIN = 5;

export default function StockTable({ rows }) {
  const [capital, setCapital] = useState(DEFAULT_CAPITAL);
  const [breakoutPct, setBreakoutPct] = useState(DEFAULT_BREAKOUT);
  const [targetPct, setTargetPct] = useState(DEFAULT_TARGET);
  const [filter, setFilter] = useState("");
  const [qtyMap, setQtyMap] = useState({});
  const [sortConfig, setSortConfig] = useState({
    key: "status",
    direction: "asc"
  });

  // =========================
  // 🔥 LTP TRACKERS (SAFE)
  // =========================
  const prevLtpRef = useRef({});
  const [ltpDir, setLtpDir] = useState({}); // UP | DOWN

  // calculate LTP direction AFTER render
  useEffect(() => {
    setLtpDir(prevDir => {
      const next = { ...prevDir };

      rows.forEach(r => {
        const prev = prevLtpRef.current[r.symbol];

        if (prev != null && r.ltp != null) {
          if (r.ltp > prev) next[r.symbol] = "UP";
          else if (r.ltp < prev) next[r.symbol] = "DOWN";
          else next[r.symbol] = "";
        }

        if (r.ltp != null) {
          prevLtpRef.current[r.symbol] = r.ltp;
        }
      });

      return next;
    });
  }, [rows]);

  // =========================
  // HELPERS
  // =========================
  const badge = s =>
    s === "ENTERED" ? "bg-success"
    : s === "EXITED_TARGET" ? "bg-primary"
    : s === "EXITED_SL" ? "bg-danger"
    : "bg-secondary";

  const pnlClass = v =>
    v >= 0 ? "text-success fw-semibold" : "text-danger fw-semibold";

  const statusRank = s => ({
    EXITED_TARGET: 0,
    EXITED_SL: 1,
    ENTERED: 2,
    PENDING: 3
  }[s] ?? 99);

  const fmt = v =>
    Number(v).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

  // =========================
  // FILTER + SORT
  // =========================
  const processedRows = useMemo(() => {
    let data = [...rows];

    if (filter.trim()) {
      data = data.filter(r =>
        r.symbol?.toLowerCase().includes(filter.toLowerCase())
      );
    }

    data.sort((a, b) => {
      const v1 = a[sortConfig.key];
      const v2 = b[sortConfig.key];

      if (sortConfig.key === "status") {
        return statusRank(v1) - statusRank(v2);
      }

      if (!isNaN(v1) && !isNaN(v2)) {
        return Number(v1) - Number(v2);
      }

      return String(v1 ?? "").localeCompare(String(v2 ?? ""));
    });

    if (sortConfig.direction === "desc") data.reverse();
    return data;
  }, [rows, filter, sortConfig]);

  // =========================
  // QTY HANDLER
  // =========================
  function changeQty(symbol, delta, maxQty) {
    setQtyMap(prev => {
      const curr = prev[symbol] ?? maxQty;
      const next = Math.min(Math.max(curr + delta, 0), maxQty);
      return { ...prev, [symbol]: next };
    });
  }

  // =========================
  // RENDER
  // =========================
  return (
    <>
      {/* TOP CONTROLS */}
      <div className="d-flex justify-content-between mb-2 align-items-center">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <div className="d-flex align-items-center gap-2">
            <strong>Capital:</strong>
            <input
              type="number"
              className="form-control form-control-sm"
              style={{ width: 110 }}
              value={capital}
              onChange={e => setCapital(+e.target.value || 0)}
            />
          </div>

          <div className="d-flex align-items-center gap-2">
            <strong>Breakout %:</strong>
            <input
              type="number"
              step="0.1"
              className="form-control form-control-sm"
              style={{ width: 80 }}
              value={breakoutPct}
              onChange={e => setBreakoutPct(+e.target.value || 0)}
            />
          </div>

          <span className="text-muted small">Margin: {MARGIN}×</span>
        </div>

        <input
          type="text"
          className="form-control form-control-sm w-auto"
          placeholder="🔍 Filter symbol"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      {/* TABLE */}
      <div className="table-responsive d-none d-md-block">
        <table className="table table-sm align-middle text-center">
          <thead style={{ background: "#f8f9fa" }}>
            <tr>
              <th>Symbol</th>
              <th>Open</th>
              <th>Entry ({breakoutPct}%)</th>
              <th>LTP</th>
              <th>Status</th>
              <th>Entry Time</th>
              <th>Exit</th>
              <th>Exit Time</th>
              <th>P/L %</th>
              <th>₹ / Share</th>
              <th>Max Qty</th>
              <th>Qty</th>
              <th>Capital Used</th>
              <th>Margin Req</th>
              <th>₹ P/L</th>
              <th>Updated</th>
            </tr>
          </thead>

          <tbody>
            {processedRows.map(r => {
              let ltpClass = "";
              if (ltpDir[r.symbol] === "UP") {
                ltpClass = "bg-success text-white";
              } else if (ltpDir[r.symbol] === "DOWN") {
                ltpClass = "bg-danger text-white";
              }

              const entry = r.open
                ? +(r.open * (1 + breakoutPct / 100)).toFixed(2)
                : r.entry;

              const exitPrice =
                r.exit_price ??
                (r.status === "ENTERED" ? r.ltp : entry);

              const profitPerShare = +(exitPrice - entry).toFixed(2);
              const pnlPct = entry
                ? +(((exitPrice - entry) / entry) * 100).toFixed(2)
                : 0;

              const maxQty = entry ? Math.floor(capital / entry) : 0;
              const qty = qtyMap[r.symbol] ?? maxQty;

              const capitalUsed = +(entry * qty).toFixed(2);
              const marginRequired = +(capitalUsed / MARGIN).toFixed(2);
              const totalPL = +(profitPerShare * qty).toFixed(2);

              return (
                <tr key={r.symbol}>
                  <td><strong>{r.symbol}</strong></td>
                  <td>{r.open ?? "-"}</td>
                  <td>{entry}</td>
                  <td className={ltpClass}>{r.ltp}</td>

                  <td>
                    <span className={`badge ${badge(r.status)}`}>
                      {r.status}
                    </span>
                  </td>

                  <td>{r.entry_time || "-"}</td>
                  <td>{r.exit_price ?? "-"}</td>
                  <td>{r.exit_time || "-"}</td>

                  <td className={pnlClass(pnlPct)}>{pnlPct}%</td>
                  <td className={pnlClass(profitPerShare)}>
                    ₹{fmt(profitPerShare)}
                  </td>

                  <td>{maxQty}</td>

                  <td>
                    <div className="d-flex justify-content-center gap-1">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => changeQty(r.symbol, -1, maxQty)}
                      >−</button>
                      <span>{qty}</span>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => changeQty(r.symbol, +1, maxQty)}
                      >+</button>
                    </div>
                  </td>

                  <td>₹{fmt(capitalUsed)}</td>
                  <td>₹{fmt(marginRequired)}</td>
                  <td className={pnlClass(totalPL)}>₹{fmt(totalPL)}</td>
                  <td className="text-muted small">{r.updated_at}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
