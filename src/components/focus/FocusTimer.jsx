import { AnimatePresence, motion } from 'motion/react';
import { formatTimer } from '../../lib/domain.js';

function statusKey({ isBreak, isRecapOnly, isDistracted, isPaused, isReview, isFocusing }, isOvertime) {
  if (isBreak) return isRecapOnly ? 'recap' : 'break';
  if (isDistracted) return 'distracted';
  if (isPaused) return 'paused';
  if (isReview) return 'review';
  if (isOvertime) return 'overtime';
  return isFocusing ? 'focusing' : 'ready';
}

function statusLabel({ isBreak, isRecapOnly, isDistracted, isPaused, isReview, isFocusing }, isOvertime) {
  if (isBreak) return isRecapOnly ? 'Sesi selesai' : 'Waktu istirahat';
  if (isDistracted) return 'Distraksi aktif';
  if (isPaused) return 'Dijeda';
  if (isReview) return isFocusing ? 'Review berjalan' : 'Siap review';
  if (isOvertime) return 'Waktu tambahan';
  return isFocusing ? 'Fokus sekarang' : 'Siap dimulai';
}

function timerValue(status, timer, breakRemainingSeconds) {
  if (status.isBreak) return status.isRecapOnly ? formatTimer(timer.activeSeconds) : formatTimer(breakRemainingSeconds);
  if (status.isReady) return formatTimer(timer.plannedSeconds);
  if (timer.isOvertime) return `+${formatTimer(timer.overtimeSeconds)}`;
  return formatTimer(timer.remainingSeconds);
}

function timerSubtitle(status, timer) {
  if (status.isBreak) {
    return status.isRecapOnly
      ? 'Timer fokus sudah berhenti. Simpan recap saat kamu siap.'
      : 'Kamu bisa kembali kapan saja.';
  }
  if (status.isReview) {
    return status.isFocusing
      ? 'Timer review berjalan. Status tugas dan XP tidak berubah.'
      : `${timer.plannedMinutes} menit review opsional`;
  }
  if (status.isDistracted) return 'Timer berhenti sementara.';
  if (timer.isOvertime) return `Target ${timer.plannedMinutes} menit tercapai. Selesaikan sesi saat kamu siap.`;
  return `${timer.plannedMinutes} menit sesi fokus`;
}

export function FocusTimer({ status, timer, breakRemainingSeconds, completion, reduced }) {
  return (
    <div className="focus-timer-wrap">
      <div className={`focus-timer ${status.isPaused ? 'is-paused' : ''} ${status.isDistracted ? 'is-distracted' : ''} ${status.isBreak ? 'is-break' : ''} ${timer.isOvertime ? 'is-overtime' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.span key={statusKey(status, timer.isOvertime)} className="timer-status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
            {statusLabel(status, timer.isOvertime)}
          </motion.span>
        </AnimatePresence>
        <strong aria-live="off">{timerValue(status, timer, breakRemainingSeconds)}</strong>
        <span className="timer-subtitle">{timerSubtitle(status, timer)}</span>
      </div>
      <div className="focus-progress">
        <motion.span animate={{ width: `${status.isBreak ? 100 : completion}%` }} transition={{ duration: reduced ? 0.12 : 0.42, ease: 'easeOut' }} />
      </div>
    </div>
  );
}
