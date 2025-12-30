const keyForDate = date => `trade_state_${date}`;

export function loadTradeState(date) {
  const raw = localStorage.getItem(keyForDate(date));
  return raw ? JSON.parse(raw) : null;
}

export function saveTradeState(date, state) {
  localStorage.setItem(keyForDate(date), JSON.stringify(state));
}
