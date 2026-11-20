import type { ModuleSummary } from '../lib/api';
import { motifUrl } from '../lib/motif';

// Foto kain bila ada; bila belum, ilustrasi dari grafik pola; bila tidak ada keduanya, tekstur netral.
export default function KainFoto({ m, className = 'kain-photo' }: { m: Pick<ModuleSummary, 'cover' | 'motif' | 'fabricName' | 'title'>; className?: string }) {
  const kind = m.cover ? '' : m.motif ? ' motif' : ' tanpa-foto';
  return <span className={className + kind} role="img"
    style={m.cover ? { backgroundImage: `url("${m.cover}")` } : m.motif ? { backgroundImage: motifUrl(m.motif) } : undefined}
    aria-label={m.cover ? `Foto kain ${m.fabricName || m.title}` : m.motif ? 'Ilustrasi dari grafik pola' : 'Foto kain belum tersedia'} />;
}
