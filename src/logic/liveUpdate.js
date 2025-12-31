export function liveUpdate(signal, ltp, prevState) {
  const now = new Date();
  const state = { ...prevState };

  // ==============================
  // ENTRY TIME RULE (>= 09:20)
  // ==============================
  const isAfter920 = () => {
    const h = now.getHours();
    const m = now.getMinutes();
    return h > 9 || (h === 9 && m >= 20);
  };

  const nowStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });

  // ✅ ENTRY ONLY AFTER 09:20
  if (
    state.status === "PENDING" &&
    isAfter920() &&
    ltp >= signal.entry
  ) {
    state.status = "ENTERED";
    state.entry_time = nowStr;
  }

  // TARGET HIT
  if (state.status === "ENTERED" && ltp >= signal.target) {
    state.status = "EXITED_TARGET";
    state.exit_time = nowStr;
    state.exit_price = signal.target;
  }

  // STOPLOSS HIT
  if (state.status === "ENTERED" && ltp <= signal.stoploss) {
    state.status = "EXITED_SL";
    state.exit_time = nowStr;
    state.exit_price = signal.stoploss;
  }

  return state;
}
