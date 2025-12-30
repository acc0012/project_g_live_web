export function liveUpdate(signal, ltp, prevState) {
  const now = new Date().toLocaleTimeString();
  const state = { ...prevState };

  if (state.status === "PENDING" && ltp >= signal.entry) {
    state.status = "ENTERED";
    state.entry_time = now;
  }

  if (state.status === "ENTERED" && ltp >= signal.target) {
    state.status = "EXITED_TARGET";
    state.exit_time = now;
    state.exit_price = signal.target;
  }

  if (state.status === "ENTERED" && ltp <= signal.stoploss) {
    state.status = "EXITED_SL";
    state.exit_time = now;
    state.exit_price = signal.stoploss;
  }

  return state;
}
