import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, Play, Trophy, Zap } from 'lucide-react';
import { playNumberSequence, playRewardSequence } from '../motion/anime.js';
import { formatDayDate, getRoleTerminology, autoPauseFocus, beginDistraction, closeActiveFocusForReplacement, createActiveFocus, finishFocusRun, FOCUS_AUTO_PAUSE_AFTER_MS, getDistractionSummary, getFocusActiveSeconds, getFocusControlAvailability, getFocusTimerState, getSemesterWeek, getSessionXp, getStreakFreezeInfo, getSubtaskProgress, getTaskFocusMinutes, getTaskXp, replaceActiveFocus, resumeDistraction, selectDailyMission, todayString } from '../lib/domain.js';
import { playFeedbackTone, startFocusSoundscape, stopFocusSoundscape } from '../lib/audio.js';
import { ConfirmDialog, EmptyState, Illustration, Modal } from '../components/ui.jsx';
import { FocusStageCopy } from '../components/focus/FocusStageCopy.jsx';
import { FocusTimer } from '../components/focus/FocusTimer.jsx';
import { DistractionTracker } from '../components/focus/DistractionTracker.jsx';
import { FocusDesk } from '../components/focus/FocusDesk.jsx';
import { FocusControls } from '../components/focus/FocusControls.jsx';
import { FocusRecap } from '../components/focus/FocusRecap.jsx';
import { sendNotification } from '../lib/reminders.js';

export function FocusPage({ data, commit, toggleTask }) {
  const params = new URLSearchParams(window.location.search);
  const requestedId = Number(params.get('taskId'));
  const requestedTask = data.tasks.find((task) => task.id === requestedId && !task.archived);
  const requestedIntent = params.get('intent');
  const activeTask = data.tasks.find((item) => item.id === data.activeFocus?.taskId);
  const nextTask = requestedTask || selectDailyMission(data.tasks);
  const task = data.activeFocus ? activeTask : nextTask;
  const course = data.courses.find((item) => item.id === task?.courseId) || null;
  const meeting = course?.meetings?.find((item) => item.number === task?.meetingNumber) || null;
  const terms = getRoleTerminology(data.profile.role);
  const [now, setNow] = useState(Date.now());
  const [customMinutes, setCustomMinutes] = useState(data.preferences.customFocusMinutes || 40);
  const [sessionNote, setSessionNote] = useState('');
  const [focusNotice, setFocusNotice] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(() => Boolean(data.activeFocus && (requestedIntent === 'start' || requestedIntent === 'choose')));
  const [resumePromptOpen, setResumePromptOpen] = useState(false);
  const [completeTaskPromptOpen, setCompleteTaskPromptOpen] = useState(false);
  const [timerCompletionOpen, setTimerCompletionOpen] = useState(false);
  // Hook wajib dipanggil tanpa syarat: menaruhnya di sisi kanan || membuat
  // jumlah hook berubah saat preferensi motion berganti (mis. dari tab lain).
  const systemReduced = useReducedMotion();
  const reduced = data.preferences.motion === 'compact' || systemReduced;
  const rewardRef = useRef(null);
  const focusNoticeTimerRef = useRef(null);
  const hiddenSinceRef = useRef(null);
  const autoPauseTimerRef = useRef(null);
  const autoPausedRef = useRef(false);
  const autoCompletedFocusRef = useRef(null);
  const focusRef = useRef(data.activeFocus);
  focusRef.current = data.activeFocus;

  useEffect(() => {
    const refreshNow = () => setNow(Date.now());
    const timer = window.setInterval(refreshNow, 1000);
    const refreshWhenVisible = () => { if (!document.hidden) refreshNow(); };
    window.addEventListener('focus', refreshNow);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshNow);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);
  useEffect(() => () => {
    window.clearTimeout(focusNoticeTimerRef.current);
    window.clearTimeout(autoPauseTimerRef.current);
    stopFocusSoundscape({ fade: false });
  }, []);
  useEffect(() => {
    const stopWhenHidden = () => { if (document.hidden) stopFocusSoundscape(); };
    document.addEventListener('visibilitychange', stopWhenHidden);
    return () => document.removeEventListener('visibilitychange', stopWhenHidden);
  }, []);
  useEffect(() => {
    if (data.activeFocus?.status === 'break' && data.activeFocus.breakEndsAt && now >= data.activeFocus.breakEndsAt) commit((current) => ({ ...current, activeFocus: null }));
  }, [now, data.activeFocus, commit]);
  useEffect(() => { if (!data.activeFocus) setConflictOpen(false); }, [data.activeFocus]);
  useEffect(() => {
    if (!data.activeFocus || activeTask) return;
    stopFocusSoundscape();
    commit((current) => closeActiveFocusForReplacement(current, Date.now()), 'Tugas fokus sudah dihapus. Sesi dihentikan tanpa reward.');
  }, [data.activeFocus, activeTask, commit]);

  const focus = data.activeFocus;
  const taskFocusMinutes = getTaskFocusMinutes(nextTask, data.preferences.focusPreset);
  const timerState = getFocusTimerState(focus, taskFocusMinutes, now);
  const { activeSeconds: liveSeconds, plannedSeconds } = timerState;
  const breakRemainingSeconds = Number.isFinite(Number(focus?.breakEndsAt)) ? Math.max(0, Math.ceil((Number(focus.breakEndsAt) - now) / 1000)) : 0;
  const isReady = !focus && Boolean(task);
  const isFocusing = focus?.status === 'focusing';
  const isPaused = focus?.status === 'paused';
  const isDistracted = focus?.status === 'distracted';
  const isBreak = focus?.status === 'break';
  const isRecapOnly = isBreak && !focus?.breakEndsAt;
  const isReviewSession = focus?.mode === 'review';
  const isReviewReady = !focus && Boolean(task?.completed);
  const isReview = isReviewSession || isReviewReady;
  const controls = getFocusControlAvailability(focus);
  const completion = plannedSeconds ? Math.min(100, Math.round((liveSeconds / plannedSeconds) * 100)) : 0;
  const subtaskProgress = getSubtaskProgress(task || { subtasks: [] });
  const distractionSummary = getDistractionSummary(focus, now);
  const distractionMessage = isDistracted
    ? 'Timer dan soundscape berhenti. Waktu di luar fokus akan dicatat sampai kamu kembali.'
    : isPaused
      ? 'Jeda sesi sedang aktif. Jeda terencana tidak masuk hitungan distraksi.'
      : isBreak
        ? 'Ringkasan ini menyimpan momen ketika fokusmu sempat beralih.'
        : 'Tekan Tandai distraksi saat sadar fokusmu sempat beralih. Jeda sesi tetap tersedia untuk istirahat yang disengaja.';
  const semesterWeek = getSemesterWeek(task?.dueDate, data.semester);
  const soundEnabled = Boolean(data.preferences.sound && data.preferences.focusSoundscape !== 'none' && data.preferences.focusSoundVolume > 0);
  const sessionXp = isReviewSession ? 0 : getSessionXp(liveSeconds, timerState.plannedMinutes);
  const activeStatusLabel = isReviewSession ? 'review tugas' : isRecapOnly ? 'recap sesi' : isBreak ? 'waktu istirahat' : isDistracted ? 'distraksi' : isPaused ? 'sesi yang dijeda' : 'sesi fokus';
  const completionPromptMessage = isFocusing
    ? `Timer untuk “${task?.text || 'tugas ini'}” masih berjalan. Jika dilanjutkan, tugas akan ditandai selesai, timer berhenti, dan recap sesi disimpan.`
    : `Sesi untuk “${task?.text || 'tugas ini'}” belum ditutup. Jika dilanjutkan, tugas akan ditandai selesai dan recap sesi disimpan.`;

  const pauseAfterInactivity = (pausedAt) => {
    let didPause = false;
    commit((current) => {
      const currentFocus = current.activeFocus;
      if (!currentFocus || currentFocus.status !== 'focusing') return current;
      didPause = true;
      return { ...current, activeFocus: autoPauseFocus(currentFocus, pausedAt) };
    }, 'Sesi dijeda otomatis karena TaskFlow tidak terlihat.');
    if (didPause) {
      autoPausedRef.current = true;
      stopFocusSoundscape();
    }
    return didPause;
  };

  useEffect(() => {
    const clearAutoPauseTimer = () => {
      window.clearTimeout(autoPauseTimerRef.current);
      autoPauseTimerRef.current = null;
    };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (focusRef.current?.status !== 'focusing' || hiddenSinceRef.current !== null) return;
        const hiddenAt = Date.now();
        hiddenSinceRef.current = hiddenAt;
        autoPauseTimerRef.current = window.setTimeout(() => {
          if (document.hidden && hiddenSinceRef.current === hiddenAt) pauseAfterInactivity(hiddenAt + FOCUS_AUTO_PAUSE_AFTER_MS);
        }, FOCUS_AUTO_PAUSE_AFTER_MS);
        return;
      }
      const hiddenAt = hiddenSinceRef.current;
      clearAutoPauseTimer();
      hiddenSinceRef.current = null;
      const wasHiddenTooLong = hiddenAt !== null && Date.now() - hiddenAt >= FOCUS_AUTO_PAUSE_AFTER_MS;
      const didPause = wasHiddenTooLong && focusRef.current?.status === 'focusing' ? pauseAfterInactivity(hiddenAt + FOCUS_AUTO_PAUSE_AFTER_MS) : false;
      if (didPause || autoPausedRef.current) {
        autoPausedRef.current = false;
        setResumePromptOpen(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (document.hidden) handleVisibilityChange();
    return () => {
      clearAutoPauseTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [commit]);

  const clearStartIntent = () => window.history.replaceState(null, '', 'focus.html');
  const continueExistingFocus = () => {
    setConflictOpen(false);
    clearStartIntent();
  };

  const showFocusNotice = () => {
    if (reduced) return;
    setFocusNotice(true);
    window.clearTimeout(focusNoticeTimerRef.current);
    focusNoticeTimerRef.current = window.setTimeout(() => setFocusNotice(false), 700);
  };
  const startSound = () => { if (soundEnabled) startFocusSoundscape(data.preferences.focusSoundscape, data.preferences.focusSoundVolume); };
  const feedback = (kind) => { if (data.preferences.sound) playFeedbackTone(kind, data.preferences.focusSoundVolume); };
  const startFocus = (minutes = taskFocusMinutes) => {
    if (!task) return;
    const start = Date.now();
    const planned = Math.min(180, Math.max(5, Number(minutes) || 25));
    const mode = task.completed ? 'review' : 'focus';
    commit((current) => ({ ...current, preferences: { ...current.preferences, customFocusMinutes: planned }, activeFocus: createActiveFocus(task.id, planned, start, mode) }), mode === 'review' ? 'Timer review dimulai. Status tugas dan XP tidak berubah.' : 'Fokus dimulai.');
    startSound();
    feedback('focusStart');
    showFocusNotice();
  };
  const startFreshFocus = () => {
    if (!nextTask) return;
    const start = Date.now();
    const planned = taskFocusMinutes;
    const mode = nextTask.completed ? 'review' : 'focus';
    commit((current) => {
      const replaced = replaceActiveFocus(current, nextTask.id, planned, start, mode);
      return { ...replaced, preferences: { ...replaced.preferences, customFocusMinutes: planned } };
    }, mode === 'review' ? `Sesi lama diakhiri. Review untuk “${nextTask.text}” dimulai.` : `Sesi lama diakhiri. Fokus baru untuk “${nextTask.text}” dimulai.`);
    setConflictOpen(false);
    clearStartIntent();
    startSound();
    feedback('focusStart');
    showFocusNotice();
  };
  const pauseFocus = () => {
    stopFocusSoundscape();
    feedback('pause');
    commit((current) => {
      const currentFocus = current.activeFocus;
      if (!currentFocus) return current;
      const elapsed = getFocusActiveSeconds(currentFocus, Date.now());
      return { ...current, activeFocus: { ...currentFocus, status: 'paused', activeSeconds: elapsed, runningSince: null } };
    }, 'Sesi dijeda.');
  };
  const resumeFocus = () => {
    setResumePromptOpen(false);
    const resumedAt = Date.now();
    commit((current) => ({ ...current, activeFocus: current.activeFocus?.status === 'distracted' ? resumeDistraction(current.activeFocus, resumedAt) : { ...current.activeFocus, status: 'focusing', runningSince: resumedAt } }), 'Fokus dilanjutkan.');
    startSound();
    feedback('resume');
  };
  const markDistraction = () => {
    if (!isFocusing) return;
    const distractedAt = Date.now();
    stopFocusSoundscape();
    feedback('pause');
    commit((current) => ({ ...current, activeFocus: beginDistraction(current.activeFocus, distractedAt) }), 'Distraksi tercatat.');
  };
  const resumeFromDistraction = () => {
    if (!isDistracted) return;
    const resumedAt = Date.now();
    commit((current) => ({ ...current, activeFocus: resumeDistraction(current.activeFocus, resumedAt) }), 'Kembali fokus.');
    startSound();
    feedback('resume');
  };
  const finishFocus = () => {
    const ended = Date.now();
    const dateKey = todayString(new Date(ended));
    const streakFreezeInfo = isReviewSession ? null : getStreakFreezeInfo(data.progress, dateKey);
    const freezeNote = streakFreezeInfo ? ` Streak diselamatkan pakai ${streakFreezeInfo.used} freeze bulan ini (sisa ${streakFreezeInfo.remainingAfter}).` : '';
    stopFocusSoundscape();
    feedback('complete');
    commit((current) => finishFocusRun(current, { at: ended, startBreak: !isReviewSession }).data, isReviewSession ? 'Review selesai. Status tugas dan XP tidak berubah.' : `Sesi selesai. Reward XP masuk.${freezeNote}`);
    if (data.preferences.notify) sendNotification(isReviewSession ? 'Review tugas selesai' : 'Focus Run selesai', task ? `${isReviewSession ? 'Review' : 'Sesi'} untuk “${task.text}” sudah berakhir.` : 'Sesi fokus selesai.');
    requestAnimationFrame(() => { playRewardSequence(rewardRef.current, reduced); playNumberSequence(rewardRef.current, reduced); });
  };
  const completeTaskAndStopFocus = (automatic = false) => {
    if (!task || task.completed || !focus || focus.status === 'break' || isReviewSession) return;
    const ended = Date.now();
    const dateKey = todayString(new Date(ended));
    const streakFreezeInfo = getStreakFreezeInfo(data.progress, dateKey);
    const freezeNote = streakFreezeInfo ? ` Streak diselamatkan pakai ${streakFreezeInfo.used} freeze bulan ini (sisa ${streakFreezeInfo.remainingAfter}).` : '';
    autoCompletedFocusRef.current = focus.sessionStartedAt;
    stopFocusSoundscape();
    feedback('complete');
    commit((current) => finishFocusRun(current, { at: ended, completeTask: true, startBreak: false }).data, automatic
      ? `Selamat, tugas “${task.text}” telah selesai. Timer berhenti dan recap siap dilihat. +${getTaskXp(task)} XP.${freezeNote}`
      : `Tugas selesai. Timer berhenti dan recap sesi siap dilihat. +${getTaskXp(task)} XP.${freezeNote}`);
    setCompleteTaskPromptOpen(false);
    if (automatic) setTimerCompletionOpen(true);
    if (data.preferences.notify) sendNotification('Tugas selesai', `“${task.text}” telah ditandai selesai.`);
    requestAnimationFrame(() => { playRewardSequence(rewardRef.current, reduced); playNumberSequence(rewardRef.current, reduced); });
  };
  const abandonFocus = () => {
    stopFocusSoundscape();
    const ended = Date.now();
    commit((current) => closeActiveFocusForReplacement(current, ended), 'Sesi diakhiri tanpa reward.');
  };
  const clearBreak = () => commit((current) => {
    const sessionId = current.activeFocus?.sessionId;
    const note = sessionNote.trim();
    const sessions = note && sessionId ? current.sessions.map((session) => session.id === sessionId ? { ...session, note } : session) : current.sessions;
    return { ...current, sessions, activeFocus: null };
  }, 'Recap sesi disimpan.');
  const toggleSubtask = (subtaskId) => commit((current) => ({ ...current, tasks: current.tasks.map((item) => item.id !== task.id ? item : { ...item, subtasks: item.subtasks.map((subtask) => subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask), updatedAt: Date.now() }) }));
  const setSoundscape = (focusSoundscape) => {
    commit((current) => ({ ...current, preferences: { ...current.preferences, focusSoundscape } }));
    if (!isFocusing) return;
    if (focusSoundscape === 'none' || !data.preferences.sound || data.preferences.focusSoundVolume <= 0) {
      stopFocusSoundscape();
      return;
    }
    startFocusSoundscape(focusSoundscape, data.preferences.focusSoundVolume);
  };
  const requestTaskCompletion = () => {
    if (!task || task.completed) return;
    if (focus && focus.status !== 'break' && !isReviewSession) {
      setCompleteTaskPromptOpen(true);
      return;
    }
    toggleTask(task.id);
  };

  // Timer mencapai target bukan berarti tugas selesai. Copy overtime
  // di FocusTimer sudah: "Selesaikan sesi saat kamu siap." Jangan auto-complete.

  useEffect(() => {
    if (!focus || focus.status === 'break' || isReviewSession || !task?.completed) return;
    stopFocusSoundscape();
    commit((current) => finishFocusRun(current, { at: Date.now(), startBreak: false }).data, 'Tugas sudah selesai. Timer dihentikan dan recap sesi siap dilihat.');
  }, [focus?.sessionStartedAt, focus?.status, isReviewSession, task?.completed, commit]);

  // Dikumpulkan sekali supaya komponen anak tidak perlu menerima belasan prop
  // boolean yang terpisah-pisah.
  const status = { isReady, isFocusing, isPaused, isDistracted, isBreak, isRecapOnly, isReviewSession, isReview, isReviewReady };
  const focusActions = { startFocus, pauseFocus, resumeFocus, markDistraction, resumeFromDistraction, finishFocus, requestTaskCompletion, abandonFocus, clearBreak };

  return <div className="focus-page">
    <div className="focus-topbar"><a className="focus-back" href="index.html"><ArrowLeft size={17} />Kembali ke Beranda</a><span className="focus-brand"><span className="brand-mark brand-mark-small" aria-hidden="true"><span /></span>TaskFlow Focus Run</span><span className="focus-date">{formatDayDate(new Date())}</span></div>
    {task ? <motion.section className={`focus-stage ${isFocusing || isDistracted ? 'focus-stage-active' : ''} ${isReview ? 'focus-stage-review' : ''}`} initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease: 'easeOut' }}>
      <FocusStageCopy status={status} task={task} course={course} meeting={meeting} terms={terms} semesterWeek={semesterWeek} />
      <Illustration type={isBreak ? 'milestone' : 'focus-run'} alt="Ilustrasi Focus Run" className="focus-illustration" />
      <FocusTimer status={status} timer={timerState} breakRemainingSeconds={breakRemainingSeconds} completion={completion} reduced={reduced} />
      {isReview && !isBreak && <section className="focus-review-note" role="status"><Check size={18} /><div><strong>Mode review</strong><span>Tugas ini sudah selesai. Kamu bisa meninjau catatan, checklist, dan tautannya tanpa mengubah XP.</span></div></section>}
      {focus && <DistractionTracker isDistracted={isDistracted} summary={distractionSummary} message={distractionMessage} />}
      <FocusDesk task={task} course={course} meeting={meeting} terms={terms} preferences={data.preferences} soundEnabled={soundEnabled} onSelectSoundscape={setSoundscape} />
      {isReady && <form className="custom-focus" onSubmit={(event) => { event.preventDefault(); startFocus(customMinutes); }}><label htmlFor="custom-focus">{isReviewReady ? 'Durasi review custom (5-180 menit)' : 'Durasi custom (5-180 menit)'}</label><input id="custom-focus" className="input" type="number" min="5" max="180" value={customMinutes} onChange={(event) => setCustomMinutes(event.target.value)} /><button className="btn btn-secondary" type="submit">{isReviewReady ? 'Mulai review custom' : 'Mulai custom'}</button></form>}
      {task.subtasks?.length > 0 && (
        <section className="focus-checklist">
          <div><p className="section-kicker">Checklist</p><h2>{subtaskProgress.done}/{subtaskProgress.total} langkah selesai</h2></div>
          <div className="focus-progress">
            <motion.span animate={{ width: `${Math.round(subtaskProgress.ratio * 100)}%` }} transition={{ duration: reduced ? 0.12 : 0.28 }} />
          </div>
          <ul className="focus-subtasks">
            {task.subtasks.map((item) => (
              <motion.li key={item.id} layout>
                <label><input type="checkbox" checked={item.completed} onChange={() => toggleSubtask(item.id)} /><span>{item.text}</span></label>
              </motion.li>
            ))}
          </ul>
        </section>
      )}
      <FocusControls status={status} controls={controls} taskFocusMinutes={taskFocusMinutes} sessionXp={sessionXp} reduced={reduced} actions={focusActions} />
      <FocusRecap open={isBreak} isReviewSession={isReviewSession} activeSeconds={liveSeconds} sessionXp={sessionXp} subtaskProgress={subtaskProgress} distractionSummary={distractionSummary} note={sessionNote} onNoteChange={setSessionNote} reduced={reduced} />
      <div ref={rewardRef} className="focus-reward"><span><Zap size={15} />{isReviewSession ? 'Review tanpa XP' : `+${isBreak ? sessionXp : 0} XP sesi`}</span><span><Trophy size={15} />{data.progress.totalXp} XP total</span></div>
      <div className="focus-task-action">{!task.completed ? isFocusing ? <span className="break-note"><Check size={15} />Gunakan tombol “Selesaikan tugas” saat pekerjaan benar-benar selesai.</span> : <button className="text-link" type="button" onClick={requestTaskCompletion}><Check size={15} />Selesaikan tugas</button> : <span className="completed-note"><Check size={15} />{isReview ? 'Tugas ini sudah selesai — mode review aktif' : 'Tugas ini sudah selesai'}</span>}<a className="text-link" href="tasks.html">Pilih misi lain <ArrowRight size={15} /></a></div>
    </motion.section> : <EmptyState type="empty-task" title="Belum ada misi untuk difokuskan" message="Tambahkan tugas terlebih dahulu, lalu kembali untuk menjalankan Focus Run." action="Buka Tugas" onAction={() => { window.location.href = 'tasks.html'; }} />}
    <Modal open={conflictOpen} onClose={continueExistingFocus} title="Ada sesi yang belum selesai" eyebrow="Focus Run">
      <p className="dialog-message">Kamu masih punya {activeStatusLabel}{activeTask ? ` untuk “${activeTask.text}”` : ''}. Pilih dengan jelas agar task baru tidak diam-diam tertimpa sesi lama.</p>
      {nextTask && <div className="focus-conflict-target"><span>Misi baru</span><strong>{nextTask.text}</strong><small>{taskFocusMinutes} menit · {isBreak ? 'break ditutup, sesi selesai tetap tersimpan' : 'sesi lama disimpan sebagai abandoned tanpa reward'}</small></div>}
      <div className="dialog-footer focus-conflict-actions"><button className="btn btn-secondary" type="button" onClick={continueExistingFocus}>Lanjutkan sesi lama</button>{nextTask && <button className="btn btn-primary" type="button" onClick={startFreshFocus}>Mulai sesi baru</button>}</div>
    </Modal>
    <Modal open={resumePromptOpen} onClose={() => setResumePromptOpen(false)} title="Sesi dijeda otomatis" eyebrow="Focus Run">
      <p className="dialog-message">TaskFlow menjeda timer setelah tab tidak terlihat selama 5 menit, supaya waktu tidur perangkat atau tab lain tidak dihitung sebagai fokus.</p>
      <div className="dialog-footer focus-conflict-actions"><button className="btn btn-secondary" type="button" onClick={() => setResumePromptOpen(false)}>Tetap jeda</button><button className="btn btn-primary" type="button" onClick={resumeFocus}>Lanjutkan fokus</button></div>
    </Modal>
    <ConfirmDialog open={completeTaskPromptOpen} onClose={() => setCompleteTaskPromptOpen(false)} title="Yakin ingin menyelesaikan tugas?" message={completionPromptMessage} confirmLabel="Ya, selesaikan tugas" onConfirm={() => completeTaskAndStopFocus(false)} />
    <Modal open={timerCompletionOpen} onClose={() => setTimerCompletionOpen(false)} title="Selamat, tugas telah selesai" eyebrow="Focus Run">
      <p className="dialog-message">Waktu fokusmu sudah mencapai target. Tugas ditandai selesai dan timer fokus berhenti; recap sesi tetap bisa kamu simpan.</p>
      <div className="dialog-footer"><button className="btn btn-primary" type="button" onClick={() => setTimerCompletionOpen(false)}>Lihat recap</button><a className="btn btn-secondary" href="tasks.html">Kembali ke Tugas</a></div>
    </Modal>
    <AnimatePresence>{focusNotice && <motion.div className="focus-start-notice" role="status" initial={{ opacity: 0, scale: 0.98, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}><Play size={17} fill="currentColor" />Fokus dimulai</motion.div>}</AnimatePresence>
  </div>;
}
