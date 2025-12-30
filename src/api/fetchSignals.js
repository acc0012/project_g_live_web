export async function fetchSignals(date) {
  const url = date
    ? `https://project-get-entry.vercel.app/api/signals?date=${date}`
    : `https://project-get-entry.vercel.app/api/signals`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch signals");

  return res.json();
}
