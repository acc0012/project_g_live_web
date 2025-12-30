export function replayCandles(signal, candles) {
  let state = {
    status: "PENDING",
    entry_time: null,
    exit_time: null,
    exit_price: null
  };

  for (const c of candles) {
    const ts = c[0] * 1000;
    const high = c[2];
    const low = c[3];

    const time = new Date(ts).toLocaleTimeString();

    if (state.status === "PENDING" && high >= signal.entry) {
      state.status = "ENTERED";
      state.entry_time = time;
    }

    if (state.status === "ENTERED" && high >= signal.target) {
      state.status = "EXITED_TARGET";
      state.exit_time = time;
      state.exit_price = signal.target;
      break;
    }

    if (state.status === "ENTERED" && low <= signal.stoploss) {
      state.status = "EXITED_SL";
      state.exit_time = time;
      state.exit_price = signal.stoploss;
      break;
    }
  }

  return state;
}
