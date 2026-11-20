// Grafik pola → ubin SVG (ilustrasi kartu sampai foto kain asli diunggah).
export function motifUrl(m: { rows: string[]; colors: Record<string, string> }) {
  const h = m.rows.length, w = m.rows[0]?.length ?? 0;
  const rects = m.rows.flatMap((r, y) => [...r].map((c, x) => `<rect x='${x}' y='${h - 1 - y}' width='1.02' height='1.02' fill='${m.colors[c] ?? '#ccc'}'/>`)).join('');
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' width='${w * 6}' height='${h * 6}' shape-rendering='crispEdges'>${rects}</svg>`)}")`;
}
