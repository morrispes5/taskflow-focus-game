import { EyeOff } from 'lucide-react';
import { formatTimer } from '../../lib/domain.js';

export function DistractionTracker({ isDistracted, summary, message }) {
  const heading = isDistracted
    ? 'Tidak apa-apa. Kembali saat siap.'
    : summary.count ? `${summary.count} distraksi tercatat` : 'Fokusmu masih utuh.';
  return (
    <section className={`focus-distraction ${isDistracted ? 'is-active' : ''}`} aria-label="Pelacak distraksi">
      <div className="focus-distraction-copy">
        <div className="focus-desk-heading">
          <EyeOff size={18} />
          <div><p className="section-kicker">Distraction Tracker</p><h2>{heading}</h2></div>
        </div>
        <p>{message}</p>
      </div>
      <div className="focus-distraction-stats">
        <span><strong>{summary.count}</strong> kali</span>
        <span><strong>{formatTimer(summary.totalSeconds)}</strong> di luar fokus</span>
      </div>
    </section>
  );
}
