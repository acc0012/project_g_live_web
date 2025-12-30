const PREFIX = "HISTORICAL_BREAKOUT_v1_";

/**
 * Load historical breakout data for a date
 * Returns:
 * {
 *   date,
 *   created_at,
 *   params,
 *   candles,   // FULL raw candles
 *   results    // computed table rows
 * }
 */
export function loadHistorical(date) {
  if (!date) return null;

  try {
    const raw = localStorage.getItem(PREFIX + date);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // basic schema validation
    if (
      !parsed ||
      parsed.date !== date ||
      !parsed.results ||
      !parsed.candles
    ) {
      return null;
    }

    return parsed;
  } catch (err) {
    console.warn("Failed to load historical cache:", err);
    return null;
  }
}

/**
 * Save historical breakout snapshot
 * Stores BOTH:
 *  - raw candle data
 *  - computed results
 */
export function saveHistorical(date, payload) {
  if (!date || !payload) return;

  try {
    const data = {
      version: 1,
      date,
      created_at: payload.created_at || new Date().toISOString(),
      params: payload.params || {},
      candles: payload.candles || {},
      results: payload.results || []
    };

    const json = JSON.stringify(data);

    // crude size guard (~4.5MB safety)
    if (json.length > 4_500_000) {
      console.warn(
        "Historical data too large for localStorage, skipping save"
      );
      return;
    }

    localStorage.setItem(PREFIX + date, json);
  } catch (err) {
    console.warn("Failed to save historical cache:", err);
  }
}

/**
 * Remove cached historical data for a date
 */
export function clearHistorical(date) {
  try {
    localStorage.removeItem(PREFIX + date);
  } catch {
    /* ignore */
  }
}

/**
 * Clear ALL historical breakout data
 */
export function clearAllHistorical() {
  try {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(PREFIX)) {
        localStorage.removeItem(k);
      }
    });
  } catch {
    /* ignore */
  }
}

/**
 * Debug helper – list cached historical dates
 */
export function listHistoricalDates() {
  try {
    return Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .map(k => k.replace(PREFIX, ""));
  } catch {
    return [];
  }
}
