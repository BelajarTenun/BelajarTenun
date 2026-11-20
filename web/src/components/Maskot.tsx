// "Nara", maskot BelajarTenun: penenun muda berkerudung yang memegang sekoci, dengan selembar kain bermotif di belakangnya.
// Ilustrasi asli (SVG), warna hangat; variasi pose lewat prop.
type Pose = 'menyapa' | 'menenun' | 'bangga';

export default function Maskot({ pose = 'menyapa', className }: { pose?: Pose; className?: string }) {
  const lengan = pose === 'menyapa'
    ? <path d="M150 150 q22 -18 30 -46" stroke="#7a3e1d" strokeWidth="14" strokeLinecap="round" fill="none" />
    : pose === 'bangga'
      ? <path d="M150 150 q26 -6 34 -40" stroke="#7a3e1d" strokeWidth="14" strokeLinecap="round" fill="none" />
      : <path d="M150 156 q20 6 34 2" stroke="#7a3e1d" strokeWidth="14" strokeLinecap="round" fill="none" />;
  return (
    <svg className={className} viewBox="0 0 240 240" role="img" aria-label="Nara, maskot BelajarTenun">
      {/* lingkaran matahari + titik bintang */}
      <circle cx="132" cy="112" r="96" fill="#d4b866" opacity=".55" />
      <circle cx="52" cy="46" r="4" fill="#fff" opacity=".8" /><circle cx="210" cy="62" r="6" fill="none" stroke="#fff" strokeWidth="2" opacity=".8" />
      <circle cx="198" cy="190" r="5" fill="#fff" opacity=".8" /><circle cx="36" cy="150" r="3" fill="#fff" opacity=".7" />
      {/* kain bermotif (belah ketupat) melambai di belakang */}
      <g transform="rotate(-8 70 120)">
        <rect x="18" y="70" width="86" height="104" rx="8" fill="#141c3a" />
        {[0, 1, 2].map((r) => [0, 1].map((c) => (
          <path key={`${r}${c}`} d={`M${40 + c * 40} ${84 + r * 32} l14 14 l-14 14 l-14 -14z`} fill="#d4b866" />
        )))}
        <path d="M18 170 h86" stroke="#d4b866" strokeWidth="4" strokeDasharray="6 5" />
      </g>
      {/* badan */}
      <path d="M78 232 q4 -76 56 -84 q52 8 56 84z" fill="#f5efe2" stroke="#141c3a" strokeWidth="2" />
      <path d="M104 232 q2 -44 30 -52 q28 8 30 52z" fill="#d4b866" opacity=".9" />
      {[0, 1, 2, 3].map((i) => <path key={i} d={`M${112 + i * 14} 200 l6 6 l-6 6 l-6 -6z`} fill="#141c3a" />)}
      {/* lengan kiri memegang sekoci */}
      <path d="M118 158 q-20 14 -28 34" stroke="#7a3e1d" strokeWidth="14" strokeLinecap="round" fill="none" />
      <g transform="rotate(-24 84 200)">
        <rect x="58" y="192" width="54" height="14" rx="7" fill="#c98a4b" />
        <rect x="74" y="195" width="22" height="8" rx="4" fill="#d4b866" />
      </g>
      {lengan}
      {pose === 'menyapa' && <circle cx="181" cy="100" r="9" fill="#7a3e1d" />}
      {/* kepala + kerudung */}
      <path d="M96 104 q0 -54 38 -54 q38 0 38 54 q0 26 -14 40 h-48 q-14 -14 -14 -40z" fill="#2f3a6b" />
      <ellipse cx="134" cy="108" rx="28" ry="31" fill="#9a5a32" />
      <path d="M104 92 q30 -34 60 0 q-6 -30 -30 -32 q-24 2 -30 32z" fill="#2f3a6b" />
      <path d="M104 92 q30 -18 60 0" stroke="#d4b866" strokeWidth="3" fill="none" />
      {/* wajah */}
      <circle cx="123" cy="108" r="3.6" fill="#2b1608" /><circle cx="146" cy="108" r="3.6" fill="#2b1608" />
      <circle cx="117" cy="119" r="5" fill="#d97a5a" opacity=".35" /><circle cx="152" cy="119" r="5" fill="#d97a5a" opacity=".35" />
      {pose === 'bangga'
        ? <path d="M124 121 q10 12 21 0 z" fill="#2b1608" />
        : <path d="M125 122 q9 8 19 0" stroke="#2b1608" strokeWidth="3" strokeLinecap="round" fill="none" />}
    </svg>
  );
}
