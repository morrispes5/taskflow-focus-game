import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, CirclePlay, EyeOff, ExternalLink, FolderOpen, ListTodo, Pause, Play, Trophy, Volume2, VolumeX, Zap } from 'lucide-react';
import { playNumberSequence, playRewardSequence } from '../motion/anime.js';
import { applySessionReward, autoPauseFocus, beginDistraction, closeActiveFocusForReplacement, closeDistraction, createActiveFocus, FOCUS_AUTO_PAUSE_AFTER_MS, getDistractionSummary, getDueInfo, getFocusActiveSeconds, getFocusControlAvailability, getFocusTimerState, getSemesterWeek, getSessionXp, getStreakFreezeInfo, getSubtaskProgress, getTaskFocusMinutes, replaceActiveFocus, resumeDistraction, selectDailyMission, todayString } from '../lib/domain.js';
import { FOCUS_SOUNDSCAPES, FOCUS_SOUNDSCAPE_LABELS } from '../lib/storage.js';
import { playFeedbackTone, startFocusSoundscape, stopFocusSoundscape } from '../lib/audio.js';
import { EmptyState, Illustration, Modal } from '../components/ui.jsx';
import { sendNotification } from '../lib/reminders.js';

function formatTimer(seconds) { const numeric = Number(seconds); const safe = Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0; return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`; }

function formatFocusDate(date) {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
}

export function FocusPage({ data, commit, toggleTask }) {
  const params = new URLSearchParams(window.location.search);
  const requestedId = Number(params.get('taskId'));
  const requestedTask = data.tasks.find((task) => task.id === requestedId && !task.archived);
  const requestedIntent = params.get('intent');
  const activeTask = data.tasks.find((item) => item.id === data.activeFocus?.taskId);
  const nextTask = requestedTask || selectDailyMission(data.tasks);
  const task = data.activeFocus ? activeTask : nextTask;
  const course = data.courses.find((item) => item.id === task?.courseId) || null;
  const [now, setNow] = useState(Date.now());
  const [customMinutes, setCustomMinutes] = useState(data.preferences.customFocusMinutes || 40);
  const [sessionNote, setSessionNote] = useState('');
  const [focusNotice, setFocusNotice] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(() => Boolean(data.activeFocus && (requestedIntent === 'start' || requestedIntent === 'choose')));
  const [resumePromptOpen, setResumePromptOpen] = useState(false);
  const reduced = data.preferences.motion === 'compact' || useReducedMotion();
  const rewardRef = useRef(null);
  const focusNoticeTimerRef = useRef(null);
  const hiddenSinceRef = useRef(null);
  const autoPauseTimerRef = useRef(null);
  const autoPausedRef = useRef(false);
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

  const focus = data.activeFocus;
  const taskFocusMinutes = getTaskFocusMinutes(nextTask, data.preferences.focusPreset);
  const timerState = getFocusTimerState(focus, taskFocusMinutes, now);
  const { activeSeconds: liveSeconds, plannedSeconds, remainingSeconds, overtimeSeconds, isOvertime } = timerState;
  const breakRemainingSeconds = Number.isFinite(Number(focus?.breakEndsAt)) ? Math.max(0, Math.ceil((Number(focus.breakEndsAt) - now) / 1000)) : 0;
  const isReady = !focus && Boolean(task);
  const isFocusing = focus?.status === 'focusing';
  const isPaused = focus?.status === 'paused';
  const isDistracted = focus?.status === 'distracted';
  const isBreak = focus?.status === 'break';
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
  const activeStatusLabel = isBreak ? 'waktu istirahat' : isDistracted ? 'distraksi' : isPaused ? 'sesi yang dijeda' : 'sesi fokus';

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
    commit((current) => ({ ...current, preferences: { ...current.preferences, customFocusMinutes: planned }, activeFocus: createActiveFocus(task.id, planned, start) }), 'Fokus dimulai.');
    startSound();
    feedback('focusStart');
    showFocusNotice();
  };
  const startFreshFocus = () => {
    if (!nextTask) return;
    const start = Date.now();
    const planned = taskFocusMinutes;
    commit((current) => {
      const replaced = replaceActiveFocus(current, nextTask.id, planned, start);
      return { ...replaced, preferences: { ...replaced.preferences, customFocusMinutes: planned } };
    }, `Sesi lama diakhiri. Fokus baru untuk “${nextTask.text}” dimulai.`);
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
    const streakFreezeInfo = getStreakFreezeInfo(data.progress, dateKey);
    const freezeNote = streakFreezeInfo ? ` Streak diselamatkan pakai ${streakFreezeInfo.used} freeze bulan ini (sisa ${streakFreezeInfo.remainingAfter}).` : '';
    stopFocusSoundscape();
    feedback('complete');
    commit((current) => {
      const currentFocus = current.activeFocus;
      if (!currentFocus) return current;
      const closedFocus = closeDistraction(currentFocus, ended);
      const activeSeconds = getFocusActiveSeconds(closedFocus, ended);
      const distractionSeconds = getDistractionSummary(closedFocus, ended).totalSeconds;
      const session = { id: ended, taskId: closedFocus.taskId, plannedMinutes: closedFocus.plannedMinutes, activeSeconds, status: 'completed', startedAt: closedFocus.sessionStartedAt, endedAt: ended, rewardApplied: true, note: '', distractions: closedFocus.distractions, distractionSeconds };
      const progress = applySessionReward(current.progress, activeSeconds, closedFocus.plannedMinutes, dateKey);
      return { ...current, progress, sessions: [...current.sessions, session], activeFocus: { ...closedFocus, status: 'break', activeSeconds, runningSince: null, breakEndsAt: ended + closedFocus.breakMinutes * 60000, sessionId: ended } };
    }, `Sesi selesai. Reward XP masuk.${freezeNote}`);
    if (data.preferences.notify) sendNotification('Focus Run selesai', task ? `Sesi untuk “${task.text}” sudah berakhir.` : 'Sesi fokus selesai.');
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

  return <div className="focus-page">
    <div className="focus-topbar"><a className="focus-back" href="index.html"><ArrowLeft size={17} />Kembali ke Beranda</a><span className="focus-brand"><span className="brand-mark brand-mark-small" aria-hidden="true"><span /></span>TaskFlow Focus Run</span><span className="focus-date">{formatFocusDate(new Date())}</span></div>
    {task ? <motion.section className={`focus-stage ${isFocusing || isDistracted ? 'focus-stage-active' : ''}`} initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease: 'easeOut' }}>
      <div className="focus-stage-copy"><p className="eyebrow">{isBreak ? 'Recap sesi' : isDistracted ? 'Distraksi aktif' : isPaused ? 'Sesi dijeda' : isFocusing ? 'Sedang fokus' : 'Meja kerja tugas'}</p><h1>{isBreak ? 'Satu langkah selesai. Ambil jeda yang layak.' : task.text}</h1><div className="focus-task-meta"><span className={`priority-badge priority-${task.priority}`}>{task.priority === 'high' ? 'Tinggi' : task.priority === 'medium' ? 'Sedang' : 'Rendah'}</span><span>{course?.name || task.category || 'Tanpa kategori'}</span><span>{getDueInfo(task).label}</span>{semesterWeek && <span>Minggu ke-{semesterWeek}</span>}</div></div>
      <Illustration type={isBreak ? 'milestone' : 'focus-run'} alt="Ilustrasi Focus Run" className="focus-illustration" />
      <div className="focus-timer-wrap"><div className={`focus-timer ${isPaused ? 'is-paused' : ''} ${isDistracted ? 'is-distracted' : ''} ${isBreak ? 'is-break' : ''} ${isOvertime ? 'is-overtime' : ''}`}><AnimatePresence mode="wait"><motion.span key={isBreak ? 'break' : isDistracted ? 'distracted' : isPaused ? 'paused' : isOvertime ? 'overtime' : isFocusing ? 'focusing' : 'ready'} className="timer-status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>{isBreak ? 'Waktu istirahat' : isDistracted ? 'Distraksi aktif' : isPaused ? 'Dijeda' : isOvertime ? 'Waktu tambahan' : isFocusing ? 'Fokus sekarang' : 'Siap dimulai'}</motion.span></AnimatePresence><strong aria-live="off">{isBreak ? formatTimer(breakRemainingSeconds) : isReady ? formatTimer(plannedSeconds) : isOvertime ? `+${formatTimer(overtimeSeconds)}` : formatTimer(remainingSeconds)}</strong><span className="timer-subtitle">{isBreak ? 'Kamu bisa kembali kapan saja.' : isDistracted ? 'Timer berhenti sementara.' : isOvertime ? `Target ${timerState.plannedMinutes} menit tercapai. Selesaikan sesi saat kamu siap.` : `${timerState.plannedMinutes} menit sesi fokus`}</span></div><div className="focus-progress"><motion.span animate={{ width: `${isBreak ? 100 : completion}%` }} transition={{ duration: reduced ? 0.12 : 0.42, ease: 'easeOut' }} /></div></div>
      {focus && <section className={`focus-distraction ${isDistracted ? 'is-active' : ''}`} aria-label="Pelacak distraksi"><div className="focus-distraction-copy"><div className="focus-desk-heading"><EyeOff size={18} /><div><p className="section-kicker">Distraction Tracker</p><h2>{isDistracted ? 'Tidak apa-apa. Kembali saat siap.' : distractionSummary.count ? `${distractionSummary.count} distraksi tercatat` : 'Fokusmu masih utuh.'}</h2></div></div><p>{distractionMessage}</p></div><div className="focus-distraction-stats"><span><strong>{distractionSummary.count}</strong> kali</span><span><strong>{formatTimer(distractionSummary.totalSeconds)}</strong> di luar fokus</span></div></section>}
      <section className="focus-desk" aria-label="Meja kerja tugas"><div className="focus-brief"><div className="focus-desk-heading"><ListTodo size={18} /><div><p className="section-kicker">Brief tugas</p><h2>Semua yang kamu butuhkan, tetap dekat.</h2></div></div>{task.notes ? <p>{task.notes}</p> : <p className="muted-light">Belum ada catatan. Tambahkan instruksi atau rubrik dari halaman Tugas bila diperlukan.</p>}<div className="focus-resource-links">{course?.driveUrl && <a className="focus-resource" href={course.driveUrl} target="_blank" rel="noreferrer"><FolderOpen size={16} />Buka folder materi <ExternalLink size={13} /></a>}{task.url && <a className="focus-resource" href={task.url} target="_blank" rel="noreferrer"><ExternalLink size={16} />Buka link tugas <ExternalLink size={13} /></a>}</div></div><div className="focus-sound-panel"><div className="focus-desk-heading"><Volume2 size={18} /><div><p className="section-kicker">Soundscape lokal</p><h2>{soundEnabled ? FOCUS_SOUNDSCAPE_LABELS[data.preferences.focusSoundscape] : 'Hening'}</h2></div></div><div className="soundscape-options" role="group" aria-label="Pilih soundscape">{FOCUS_SOUNDSCAPES.map((soundscape) => <button key={soundscape} className={data.preferences.focusSoundscape === soundscape ? 'active' : ''} type="button" onClick={() => setSoundscape(soundscape)} aria-pressed={data.preferences.focusSoundscape === soundscape}>{soundscape === 'none' ? <VolumeX size={14} /> : <Volume2 size={14} />}{FOCUS_SOUNDSCAPE_LABELS[soundscape]}</button>)}</div><p>{data.preferences.sound ? `Volume ${data.preferences.focusSoundVolume}%. Suara hanya mulai setelah tombol Mulai ditekan.` : 'Bunyi dinonaktifkan dari Pengaturan.'}</p></div></section>
      {isReady && <form className="custom-focus" onSubmit={(event) => { event.preventDefault(); startFocus(customMinutes); }}><label htmlFor="custom-focus">Durasi custom (5-180 menit)</label><input id="custom-focus" className="input" type="number" min="5" max="180" value={customMinutes} onChange={(event) => setCustomMinutes(event.target.value)} /><button className="btn btn-secondary" type="submit">Mulai custom</button></form>}
      {task.subtasks?.length > 0 && <section className="focus-checklist"><div><p className="section-kicker">Checklist</p><h2>{subtaskProgress.done}/{subtaskProgress.total} langkah selesai</h2></div><div className="focus-progress"><motion.span animate={{ width: `${Math.round(subtaskProgress.ratio * 100)}%` }} transition={{ duration: reduced ? 0.12 : 0.28 }} /></div><ul className="focus-subtasks">{task.subtasks.map((item) => <motion.li key={item.id} layout><label><input type="checkbox" checked={item.completed} onChange={() => toggleSubtask(item.id)} /><span>{item.text}</span></label></motion.li>)}</ul></section>}
      <div className="focus-controls"><AnimatePresence mode="wait">{isReady && <motion.div key="ready" className="focus-control-group" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><button className="btn btn-dark btn-large" type="button" onClick={() => startFocus(taskFocusMinutes)}><CirclePlay size={19} fill="currentColor" />Mulai {taskFocusMinutes} menit</button><button className="btn btn-ghost" type="button" onClick={() => startFocus(50)}>Mulai 50 menit</button></motion.div>}{isFocusing && <motion.div key="focusing" className="focus-control-group" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><button className="btn btn-dark btn-large" type="button" onClick={pauseFocus} disabled={!controls.canPause}><Pause size={19} />Jeda sesi</button><button className="btn btn-ghost" type="button" onClick={markDistraction} disabled={!controls.canMarkDistraction}><EyeOff size={18} />Tandai distraksi</button><button className="btn btn-ghost" type="button" onClick={finishFocus} disabled={!controls.canFinish}>Selesaikan sesi</button></motion.div>}{isDistracted && <motion.div key="distracted" className="focus-control-group" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><button className="btn btn-dark btn-large" type="button" onClick={resumeFromDistraction}><Play size={18} fill="currentColor" />Kembali fokus</button><button className="btn btn-ghost" type="button" onClick={abandonFocus}>Akhiri sesi</button></motion.div>}{isPaused && <motion.div key="paused" className="focus-control-group" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><button className="btn btn-dark btn-large" type="button" onClick={resumeFocus}><Play size={18} fill="currentColor" />Lanjutkan</button><button className="btn btn-ghost" type="button" onClick={abandonFocus}>Akhiri sesi</button></motion.div>}{isBreak && <motion.div key="break" className="focus-control-group" initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><button className="btn btn-dark btn-large" type="button" onClick={clearBreak}><Check size={18} />Simpan recap</button><span className="break-note">Sesi memberi +{getSessionXp(liveSeconds, timerState.plannedMinutes)} XP</span></motion.div>}</AnimatePresence></div>
      <AnimatePresence>{isBreak && <motion.section className="focus-recap" initial={{ opacity: 0, y: reduced ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.28 }}><p className="section-kicker">Recap selesai</p><h2>{formatTimer(liveSeconds)} aktif, +{getSessionXp(liveSeconds, timerState.plannedMinutes)} XP</h2><p>{subtaskProgress.total ? `${subtaskProgress.done} dari ${subtaskProgress.total} checklist selesai.` : 'Tidak ada checklist pada tugas ini.'}</p><p>{distractionSummary.count ? `${distractionSummary.count} distraksi · ${formatTimer(distractionSummary.totalSeconds)} di luar fokus.` : 'Tidak ada distraksi tercatat.'}</p><label className="field-group session-note"><span>Catatan sesi <span className="label-hint">opsional</span></span><textarea className="input" maxLength={240} value={sessionNote} onChange={(event) => setSessionNote(event.target.value)} placeholder="Apa yang sempat kamu selesaikan?" /></label></motion.section>}</AnimatePresence>
      <div ref={rewardRef} className="focus-reward"><span><Zap size={15} />+{isBreak ? getSessionXp(liveSeconds, timerState.plannedMinutes) : 0} XP sesi</span><span><Trophy size={15} />{data.progress.totalXp} XP total</span></div>
      <div className="focus-task-action">{!task.completed ? <button className="text-link" type="button" onClick={() => toggleTask(task.id)}><Check size={15} />Tandai tugas selesai</button> : <span className="completed-note"><Check size={15} />Tugas ini sudah selesai</span>}<a className="text-link" href="tasks.html">Pilih misi lain <ArrowRight size={15} /></a></div>
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
    <AnimatePresence>{focusNotice && <motion.div className="focus-start-notice" role="status" initial={{ opacity: 0, scale: 0.98, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}><Play size={17} fill="currentColor" />Fokus dimulai</motion.div>}</AnimatePresence>
  </div>;
}
