export function breakoutFromOpen(candles, params = {}) {
  const {
    entryPct = 0.05,      // +3% breakout from open
    stoplossPct = 0.01,   // -1% from open
    rr = 1               // Risk–Reward ratio
  } = params;

  if (!candles || candles.length === 0) {
    return { status: "NO_DATA" };
  }

  // ==============================
  // NORMALIZE TIMESTAMP → MS
  // ==============================
  const toMs = ts => (ts < 1e12 ? ts * 1000 : ts);

  // ==============================
  // ENTRY TIME RULE (>= 09:20)
  // ==============================
  const isAfter920 = ts => {
    const d = new Date(ts);
    return (
      d.getHours() > 9 ||
      (d.getHours() === 9 && d.getMinutes() >= 20)
    );
  };

  // ==============================
  // FIND VALID OPEN CANDLE
  // Priority:
  // 1️⃣ 9:15
  // 2️⃣ 9:16
  // 3️⃣ First valid candle
  // ==============================
  let openIndex = candles.findIndex(c => {
    const d = new Date(toMs(c[0]));
    const h = d.getHours();
    const m = d.getMinutes();
    const open = c[1];

    return (
      ((h === 9 && m === 15) || (h === 9 && m === 16)) &&
      open != null &&
      !isNaN(open)
    );
  });

  if (openIndex === -1) {
    openIndex = candles.findIndex(c => c[1] != null && !isNaN(c[1]));
  }

  if (openIndex === -1) {
    return { status: "NO_DATA" };
  }

  const open = candles[openIndex][1];

  // ==============================
  // PRICE LEVELS
  // ==============================
  const entry = +(open * (1 + entryPct)).toFixed(2);
  const stoploss = +(open * (1 - stoplossPct)).toFixed(2);

  const risk = +(entry - stoploss).toFixed(2);
  const target = +(entry + risk * rr).toFixed(2);

  let state = {
    open,
    entry,
    stoploss,
    target,
    rr,
    status: "PENDING",
    entry_time: null,
    exit_time: null,
    exit_price: null
  };

  // ==============================
  // REPLAY CANDLES AFTER OPEN
  // ==============================
  for (let i = openIndex + 1; i < candles.length; i++) {
    const c = candles[i];
    const ts = toMs(c[0]);
    const high = c[2];
    const low = c[3];

    if (high == null || low == null) continue;

    const time = new Date(ts).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit"
    });

    // ✅ ENTRY ONLY AFTER 09:20
    if (
      state.status === "PENDING" &&
      isAfter920(ts) &&
      high >= entry
    ) {
      state.status = "ENTERED";
      state.entry_time = time;
      continue;
    }

    // TARGET HIT
    if (state.status === "ENTERED" && high >= target) {
      state.status = "EXITED_TARGET";
      state.exit_time = time;
      state.exit_price = target;
      break;
    }

    // STOPLOSS HIT
    if (state.status === "ENTERED" && low <= stoploss) {
      state.status = "EXITED_SL";
      state.exit_time = time;
      state.exit_price = stoploss;
      break;
    }
  }

  return state;
}
