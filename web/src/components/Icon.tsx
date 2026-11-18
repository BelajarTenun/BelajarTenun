// Ikon garis 24px (gaya lucide, seperti di Ilmora).
const P: Record<string, string> = {
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5',
  chart: 'M4 19V9M10 19V5M16 19v-7M22 19H2',
  archive: 'M4 7h16v13H4zM3 4h18v3H3zM10 11h4',
  shield: 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  arrowUpRight: 'M7 17 17 7M7 7h10v10',
  chevronRight: 'm9 18 6-6-6-6',
  chevronLeft: 'm15 18-6-6 6-6',
  glasses: 'M2 13a4 4 0 1 0 8 0 4 4 0 0 0-8 0zM14 13a4 4 0 1 0 8 0 4 4 0 0 0-8 0zM10 13h4M2 13l2-7h3M22 13l-2-7h-3',
  phone: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
  play: 'M6 4l14 8-14 8z',
  video: 'M3 6h12v12H3zM15 10l6-3v10l-6-3',
  loom: 'M5 3v18M19 3v18M5 7h14M5 12h14M5 17h14M9 7v10M14 7v10',
  mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3',
  micOff: 'M2 2l20 20M9 9v3a3 3 0 0 0 5.1 2.1M15 9.3V5a3 3 0 0 0-5.9-.7M17 16.9A7 7 0 0 1 5 12v-2M19 10v2a7 7 0 0 1-.1 1.2M12 19v3',
  x: 'M18 6 6 18M6 6l12 12',
  check: 'M20 6 9 17l-5-5',
  flame: 'M12 2c1 3.5 5 6 5 11a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5.5.3 1.6 1 2.5 2 3C12 8 12 5 12 2z',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
};
export default function Icon({ name, className }: { name: keyof typeof P | string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] ?? ''} />
    </svg>
  );
}
