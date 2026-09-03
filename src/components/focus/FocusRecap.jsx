import { AnimatePresence, motion } from 'motion/react';
import { formatTimer } from '../../lib/domain.js';

export function FocusRecap({ open, isReviewSession, activeSeconds, sessionXp, subtaskProgress, distractionSummary, note, onNoteChange, reduced }) {
  const checklistLine = subtaskProgress.total
    ? `${subtaskProgress.done} dari ${subtaskProgress.total} checklist selesai.`
    : 'Tidak ada checklist pada tugas ini.';
  const distractionLine = distractionSummary.count
    ? `${distractionSummary.count} distraksi · ${formatTimer(distractionSummary.totalSeconds)} di luar fokus.`
    : 'Tidak ada distraksi tercatat.';
  return (
    <AnimatePresence>
      {open && (
        <motion.section className="focus-recap" initial={{ opacity: 0, y: reduced ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.28 }}>
          <p className="section-kicker">{isReviewSession ? 'Recap review' : 'Recap selesai'}</p>
          <h2>{formatTimer(activeSeconds)} aktif, {isReviewSession ? 'tanpa XP (review)' : `+${sessionXp} XP`}</h2>
          <p>{checklistLine}</p>
          <p>{distractionLine}</p>
          <label className="field-group session-note">
            <span>Catatan {isReviewSession ? 'review' : 'sesi'} <span className="label-hint">opsional</span></span>
            <textarea className="input" maxLength={240} value={note} onChange={(event) => onNoteChange(event.target.value)} placeholder={isReviewSession ? 'Apa yang kamu tinjau?' : 'Apa yang sempat kamu selesaikan?'} />
          </label>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
