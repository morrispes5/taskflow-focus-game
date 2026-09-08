import { useState } from 'react';
import { ArrowRight, CalendarCheck } from 'lucide-react';
import { formatDate } from '../../lib/domain.js';
import { ConfirmDialog } from '../ui.jsx';

function reviewNote(review) {
  if (review.slipped.length) return `${review.slipped.length} tugas lewat tanggalnya minggu ini. Bawa ke minggu depan atau ubah rencananya.`;
  if (review.completed.length) return 'Tidak ada yang tertinggal minggu ini. Tutup minggu dengan tenang.';
  return 'Minggu ini belum ada yang tercatat selesai. Tidak apa-apa, mulai lagi dari satu tugas.';
}

export function WeekReview({ review, onCarryOver }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const slippedIds = review.slipped.map((task) => task.id);

  return (
    <section className="card metric-card week-review">
      <div className="card-header">
        <div><p className="section-kicker">Tutup minggu</p><h2>{review.label}</h2></div>
        <CalendarCheck size={20} className="muted" />
      </div>
      <div className="summary-lines">
        <div><span>Selesai minggu ini</span><strong>{review.completed.length}</strong></div>
        <div><span>Lewat tanggalnya</span><strong className={review.slipped.length ? 'danger-text' : ''}>{review.slipped.length}</strong></div>
        <div><span>Masih menunggu</span><strong>{review.upcoming.length}</strong></div>
        <div><span>Menit fokus</span><strong>{review.focusMinutes}</strong></div>
      </div>
      <p className="muted">{reviewNote(review)}</p>
      {review.slipped.length > 0 && (
        <>
          <ul className="metric-list">
            {review.slipped.map((task) => (
              <li key={task.id}>
                <div><span>{task.text}</span></div>
                <strong>{formatDate(task.dueDate)}</strong>
              </li>
            ))}
          </ul>
          <button className="btn btn-secondary" type="button" onClick={() => setConfirmOpen(true)}>
            Bawa {review.slipped.length} tugas ke minggu depan <ArrowRight size={15} />
          </button>
        </>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Bawa tugas ini ke minggu depan?"
        message={`${review.slipped.length} tugas akan digeser tujuh hari, tetap pada hari yang sama. Status, catatan, dan XP tidak berubah.`}
        confirmLabel="Geser ke minggu depan"
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => onCarryOver(slippedIds)}
      />
    </section>
  );
}
