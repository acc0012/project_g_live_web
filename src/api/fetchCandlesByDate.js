const API_URLS = Array.from({ length: 10 }, (_, i) =>
  `https://project-g-stock-${i + 1}.vercel.app/api/live-candles`
);

export async function fetchCandlesByDate(yyyy_mm_dd) {
  const responses = await Promise.all(
    API_URLS.map(url =>
      fetch(`${url}?date=${yyyy_mm_dd}`).then(r => r.json())
    )
  );

  const merged = {};
  responses.forEach(res => {
    const data = res.data || {};
    Object.entries(data).forEach(([symbol, candles]) => {
      merged[symbol] = candles || [];
    });
  });

  return merged;
}
