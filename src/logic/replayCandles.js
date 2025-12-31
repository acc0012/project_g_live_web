export function replayCandles(signal, candles) {
  let state = {
    status: "PENDING",
    entry_time: null,
    exit_time: null,
    exit_price: null
  };

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

  for (const c of candles) {
    const ts = c[0] * 1000;
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
      high >= signal.entry
    ) {
      state.status = "ENTERED";
      state.entry_time = time;
      continue;
    }

    // TARGET HIT
    if (state.status === "ENTERED" && high >= signal.target) {
      state.status = "EXITED_TARGET";
      state.exit_time = time;
      state.exit_price = signal.target;
      break;
    }

    // STOPLOSS HIT
    if (state.status === "ENTERED" && low <= signal.stoploss) {
      state.status = "EXITED_SL";
      state.exit_time = time;
      state.exit_price = signal.stoploss;
      break;
    }
  }

  return state;
}
