const API_URLS = Array.from({ length: 10 }, (_, i) =>
  `https://project-g-stock-${i + 1}.vercel.app/api/live-candles?latest=true`
);

export async function fetchCandlesLatest() {
  const responses = await Promise.all(
    API_URLS.map(url => fetch(url).then(r => r.json()))
  );

  const ltpMap = {};
  responses.forEach(res => {
    const data = res.data || {};
    Object.entries(data).forEach(([symbol, candle]) => {
      if (candle && candle.close) {
        ltpMap[symbol] = candle.close;
      }
    });
  });

  return ltpMap;
}
