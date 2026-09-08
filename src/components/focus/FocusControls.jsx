import { AnimatePresence, motion } from 'motion/react';
import { Check, CirclePlay, EyeOff, Pause, Play } from 'lucide-react';

const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

export function FocusControls({ status, controls, taskFocusMinutes, sessionXp, reduced, actions }) {
  const { isReady, isFocusing, isDistracted, isPaused, isBreak, isReviewReady, isReviewSession } = status;
  const endLabel = isReviewSession ? 'Akhiri review' : 'Akhiri tanpa menyelesaikan tugas';
  return (
    <div className="focus-controls">
      <AnimatePresence mode="wait">
        {isReady && (
          <motion.div key="ready" className="focus-control-group" {...fade}>
            <button className="btn btn-dark btn-large" type="button" onClick={() => actions.startFocus(taskFocusMinutes)}>
              <CirclePlay size={19} fill="currentColor" />{isReviewReady ? `Mulai review ${taskFocusMinutes} menit` : `Mulai ${taskFocusMinutes} menit`}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => actions.startFocus(isReviewReady ? 10 : 50)}>
              {isReviewReady ? 'Review 10 menit' : 'Mulai 50 menit'}
            </button>
          </motion.div>
        )}
        {isFocusing && (
          <motion.div key="focusing" className="focus-control-group" {...fade}>
            <button className="btn btn-dark btn-large" type="button" onClick={actions.pauseFocus} disabled={!controls.canPause}><Pause size={19} />{isReviewSession ? 'Jeda review' : 'Jeda sesi'}</button>
            <button className="btn btn-ghost" type="button" onClick={actions.markDistraction} disabled={!controls.canMarkDistraction}><EyeOff size={18} />Tandai distraksi</button>
            <button className="btn btn-ghost" type="button" onClick={isReviewSession ? actions.finishFocus : actions.requestTaskCompletion} disabled={!controls.canFinish}>{isReviewSession ? 'Selesaikan review' : 'Selesaikan tugas'}</button>
          </motion.div>
        )}
        {isDistracted && (
          <motion.div key="distracted" className="focus-control-group" {...fade}>
            <button className="btn btn-dark btn-large" type="button" onClick={actions.resumeFromDistraction}><Play size={18} fill="currentColor" />{isReviewSession ? 'Kembali review' : 'Kembali fokus'}</button>
            <button className="btn btn-ghost" type="button" onClick={actions.abandonFocus}>{endLabel}</button>
          </motion.div>
        )}
        {isPaused && (
          <motion.div key="paused" className="focus-control-group" {...fade}>
            <button className="btn btn-dark btn-large" type="button" onClick={actions.resumeFocus}><Play size={18} fill="currentColor" />{isReviewSession ? 'Lanjutkan review' : 'Lanjutkan'}</button>
            <button className="btn btn-ghost" type="button" onClick={actions.abandonFocus}>{endLabel}</button>
          </motion.div>
        )}
        {isBreak && (
          <motion.div key="break" className="focus-control-group" initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <button className="btn btn-dark btn-large" type="button" onClick={actions.clearBreak}><Check size={18} />Simpan recap</button>
            <span className="break-note">{isReviewSession ? 'Review tidak menambah XP' : `Sesi memberi +${sessionXp} XP`}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
