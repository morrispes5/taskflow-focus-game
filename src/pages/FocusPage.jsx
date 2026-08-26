import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, CirclePlay, ExternalLink, FolderOpen, ListTodo, Pause, Play, Trophy, Volume2, VolumeX, Zap } from 'lucide-react';
import { playNumberSequence, playRewardSequence } from '../motion/anime.js';
import { applySessionReward, getDueInfo, getSemesterWeek, getSessionXp, getSubtaskProgress, selectDailyMission } from '../lib/domain.js';
import { FOCUS_SOUNDSCAPES, FOCUS_SOUNDSCAPE_LABELS } from '../lib/storage.js';
import { playFeedbackTone, startFocusSoundscape, stopFocusSoundscape } from '../lib/audio.js';
import { EmptyState, Illustration } from '../components/ui.jsx';
import { sendNotification } from '../lib/reminders.js';

function formatTimer(seconds) { const safe = Math.max(0, Math.floor(seconds)); return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`; }

function formatFocusDate(date) {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
}

export function FocusPage({ data, commit, toggleTask }) {
  const params = new URLSearchParams(window.location.search);
  const requestedId = Number(params.get('taskId'));
  const requestedTask = data.tasks.find((task) => task.id === requestedId && !task.archived);
  const activeTaskId = data.activeFocus?.taskId || requestedTask?.id || selectDailyMission(data.tasks)?.id;
  const task = data.tasks.find((item) => item.id === activeTaskId);
  const course = data.courses.find((item) => item.id === task?.courseId) || null;
  const [now, setNow] = useState(Date.now());
  const [customMinutes, setCustomMinutes] = useState(data.preferences.customFocusMinutes || 40);
  const [sessionNote, setSessionNote] = useState('');
  const [focusNotice, setFocusNotice] = useState(false);
  const reduced = data.preferences.motion === 'compact' || useReducedMotion();
  const rewardRef = useRef(null);
  const focusNoticeTimerRef = useRef(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => () => {
    window.clearTimeout(focusNoticeTimerRef.current);
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

  const focus = data.activeFocus;
  const liveSeconds = focus?.status === 'focusing' && focus.runningSince ? focus.activeSeconds + Math.floor((now - focus.runningSince) / 1000) : focus?.activeSeconds || 0;
  const plannedSeconds = (focus?.plannedMinutes || data.preferences.focusPreset || 25) * 60;
  const remainingSeconds = Math.max(0, plannedSeconds - liveSeconds);
  const isReady = !focus && Boolean(task);
  const isFocusing = focus?.status === 'focusing';
  const isPaused = focus?.status === 'paused';
  const isBreak = focus?.status === 'break';
  const completion = plannedSeconds ? Math.min(100, Math.round((liveSeconds / plannedSeconds) * 100)) : 0;
  const subtaskProgress = getSubtaskProgress(task || { subtasks: [] });
  const semesterWeek = getSemesterWeek(task?.dueDate, data.semester);
  const soundEnabled = Boolean(data.preferences.sound && data.preferences.focusSoundscape !== 'none' && data.preferences.focusSoundVolume > 0);

  const showFocusNotice = () => {
    if (reduced) return;
    setFocusNotice(true);
    window.clearTimeout(focusNoticeTimerRef.current);
    focusNoticeTimerRef.current = window.setTimeout(() => setFocusNotice(false), 700);
  };
  const startSound = () => { if (soundEnabled) startFocusSoundscape(data.preferences.focusSoundscape, data.preferences.focusSoundVolume); };
  const feedback = (kind) => { if (data.preferences.sound) playFeedbackTone(kind, data.preferences.focusSoundVolume); };
  const startFocus = (minutes = data.preferences.focusPreset) => {
    if (!task) return;
    const start = Date.now();
    const planned = Math.min(180, Math.max(5, Number(minutes) || 25));
    commit((current) => ({ ...current, preferences: { ...current.preferences, customFocusMinutes: planned }, activeFocus: { taskId: task.id, plannedMinutes: planned, breakMinutes: planned >= 50 ? 10 : 5, status: 'focusing', activeSeconds: 0, runningSince: start, sessionStartedAt: start, breakEndsAt: null } }), 'Fokus dimulai.');
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
      const elapsed = currentFocus.activeSeconds + Math.floor((Date.now() - currentFocus.runningSince) / 1000);
      return { ...current, activeFocus: { ...currentFocus, status: 'paused', activeSeconds: elapsed, runningSince: null } };
    }, 'Sesi dijeda.');
  };
  const resumeFocus = () => {
    commit((current) => ({ ...current, activeFocus: { ...current.activeFocus, status: 'focusing', runningSince: Date.now() } }), 'Fokus dilanjutkan.');
    startSound();
    feedback('resume');
  };
  const finishFocus = () => {
    const ended = Date.now();
    stopFocusSoundscape();
    feedback('complete');
    commit((current) => {
      const currentFocus = current.activeFocus;
      if (!currentFocus) return current;
      const activeSeconds = currentFocus.activeSeconds + (currentFocus.runningSince ? Math.floor((ended - currentFocus.runningSince) / 1000) : 0);
      const session = { id: ended, taskId: currentFocus.taskId, plannedMinutes: currentFocus.plannedMinutes, activeSeconds, status: 'completed', startedAt: currentFocus.sessionStartedAt, endedAt: ended, rewardApplied: true, note: '' };
      const progress = applySessionReward(current.progress, activeSeconds);
      return { ...current, progress, sessions: [...current.sessions, session], activeFocus: { ...currentFocus, status: 'break', activeSeconds, runningSince: null, breakEndsAt: ended + currentFocus.breakMinutes * 60000, sessionId: ended } };
    }, 'Sesi selesai. Reward XP masuk.');
    if (data.preferences.notify) sendNotification('Focus Run selesai', task ? `Sesi untuk “${task.text}” sudah berakhir.` : 'Sesi fokus selesai.');
    requestAnimationFrame(() => { playRewardSequence(rewardRef.current, reduced); playNumberSequence(rewardRef.current, reduced); });
  };
  const abandonFocus = () => {
    stopFocusSoundscape();
    commit((current) => {
      const currentFocus = current.activeFocus;
      if (!currentFocus) return current;
      const ended = Date.now();
      const activeSeconds = currentFocus.activeSeconds + (currentFocus.runningSince ? Math.floor((ended - currentFocus.runningSince) / 1000) : 0);
      return { ...current, sessions: [...current.sessions, { id: ended, taskId: currentFocus.taskId, plannedMinutes: currentFocus.plannedMinutes, activeSeconds, status: 'abandoned', startedAt: currentFocus.sessionStartedAt, endedAt: ended, rewardApplied: false, note: '' }], activeFocus: null };
    }, 'Sesi diakhiri tanpa reward.');
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
    {task ? <motion.section className={`focus-stage ${isFocusing ? 'focus-stage-active' : ''}`} initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease: 'easeOut' }}>
      <div className="focus-stage-copy"><p className="eyebrow">{isBreak ? 'Recap sesi' : isPaused ? 'Sesi dijeda' : isFocusing ? 'Sedang fokus' : 'Meja kerja tugas'}</p><h1>{isBreak ? 'Satu langkah selesai. Ambil jeda yang layak.' : task.text}</h1><div className="focus-task-meta"><span className={`priority-badge priority-${task.priority}`}>{task.priority === 'high' ? 'Tinggi' : task.priority === 'medium' ? 'Sedang' : 'Rendah'}</span><span>{course?.name || task.category || 'Tanpa kategori'}</span><span>{getDueInfo(task).label}</span>{semesterWeek && <span>Minggu ke-{semesterWeek}</span>}</div></div>
      <Illustration type={isBreak ? 'milestone' : 'focus-run'} alt="Ilustrasi Focus Run" className="focus-illustration" />
      <div className="focus-timer-wrap"><div className={`focus-timer ${isPaused ? 'is-paused' : ''} ${isBreak ? 'is-break' : ''}`}><AnimatePresence mode="wait"><motion.span key={isBreak ? 'break' : isPaused ? 'paused' : isFocusing ? 'focusing' : 'ready'} className="timer-status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>{isBreak ? 'Waktu istirahat' : isPaused ? 'Dijeda' : isFocusing ? 'Fokus sekarang' : 'Siap dimulai'}</motion.span></AnimatePresence><strong>{isBreak ? formatTimer(Math.max(0, Math.ceil((focus.breakEndsAt - now) / 1000))) : formatTimer(isReady ? plannedSeconds : remainingSeconds)}</strong><span className="timer-subtitle">{isBreak ? 'Kamu bisa kembali kapan saja.' : `${focus?.plannedMinutes || data.preferences.focusPreset || 25} menit sesi fokus`}</span></div><div className="focus-progress"><motion.span animate={{ width: `${isBreak ? 100 : completion}%` }} transition={{ duration: reduced ? 0.12 : 0.42, ease: 'easeOut' }} /></div></div>
      <section className="focus-desk" aria-label="Meja kerja tugas"><div className="focus-brief"><div className="focus-desk-heading"><ListTodo size={18} /><div><p className="section-kicker">Brief tugas</p><h2>Semua yang kamu butuhkan, tetap dekat.</h2></div></div>{task.notes ? <p>{task.notes}</p> : <p className="muted-light">Belum ada catatan. Tambahkan instruksi atau rubrik dari halaman Tugas bila diperlukan.</p>}<div className="focus-resource-links">{course?.driveUrl && <a className="focus-resource" href={course.driveUrl} target="_blank" rel="noreferrer"><FolderOpen size={16} />Buka folder materi <ExternalLink size={13} /></a>}{task.url && <a className="focus-resource" href={task.url} target="_blank" rel="noreferrer"><ExternalLink size={16} />Buka link tugas <ExternalLink size={13} /></a>}</div></div><div className="focus-sound-panel"><div className="focus-desk-heading"><Volume2 size={18} /><div><p className="section-kicker">Soundscape lokal</p><h2>{soundEnabled ? FOCUS_SOUNDSCAPE_LABELS[data.preferences.focusSoundscape] : 'Hening'}</h2></div></div><div className="soundscape-options" role="group" aria-label="Pilih soundscape">{FOCUS_SOUNDSCAPES.map((soundscape) => <button key={soundscape} className={data.preferences.focusSoundscape === soundscape ? 'active' : ''} type="button" onClick={() => setSoundscape(soundscape)} aria-pressed={data.preferences.focusSoundscape === soundscape}>{soundscape === 'none' ? <VolumeX size={14} /> : <Volume2 size={14} />}{FOCUS_SOUNDSCAPE_LABELS[soundscape]}</button>)}</div><p>{data.preferences.sound ? `Volume ${data.preferences.focusSoundVolume}%. Suara hanya mulai setelah tombol Mulai ditekan.` : 'Bunyi dinonaktifkan dari Pengaturan.'}</p></div></section>
      {isReady && <form className="custom-focus" onSubmit={(event) => { event.preventDefault(); startFocus(customMinutes); }}><label htmlFor="custom-focus">Durasi custom (5-180 menit)</label><input id="custom-focus" className="input" type="number" min="5" max="180" value={customMinutes} onChange={(event) => setCustomMinutes(event.target.value)} /><button className="btn btn-secondary" type="submit">Mulai custom</button></form>}
      {task.subtasks?.length > 0 && <section className="focus-checklist"><div><p className="section-kicker">Checklist</p><h2>{subtaskProgress.done}/{subtaskProgress.total} langkah selesai</h2></div><div className="focus-progress"><motion.span animate={{ width: `${Math.round(subtaskProgress.ratio * 100)}%` }} transition={{ duration: reduced ? 0.12 : 0.28 }} /></div><ul className="focus-subtasks">{task.subtasks.map((item) => <motion.li key={item.id} layout><label><input type="checkbox" checked={item.completed} onChange={() => toggleSubtask(item.id)} /><span>{item.text}</span></label></motion.li>)}</ul></section>}
      <div className="focus-controls"><AnimatePresence mode="wait">{isReady && <motion.div key="ready" className="focus-controls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><button className="btn btn-dark btn-large" type="button" onClick={() => startFocus(data.preferences.focusPreset)}><CirclePlay size={19} fill="currentColor" />Mulai {data.preferences.focusPreset} menit</button><button className="btn btn-ghost" type="button" onClick={() => startFocus(50)}>Mulai 50 menit</button></motion.div>}{isFocusing && <motion.div key="focusing" className="focus-controls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><button className="btn btn-dark btn-large" type="button" onClick={pauseFocus}><Pause size={19} />Jeda sesi</button><button className="btn btn-ghost" type="button" onClick={finishFocus}>Selesaikan sesi</button></motion.div>}{isPaused && <motion.div key="paused" className="focus-controls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><button className="btn btn-dark btn-large" type="button" onClick={resumeFocus}><Play size={18} fill="currentColor" />Lanjutkan</button><button className="btn btn-ghost" type="button" onClick={abandonFocus}>Akhiri sesi</button></motion.div>}{isBreak && <motion.div key="break" className="focus-controls" initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><button className="btn btn-dark btn-large" type="button" onClick={clearBreak}><Check size={18} />Simpan recap</button><span className="break-note">Sesi memberi +{getSessionXp(liveSeconds)} XP</span></motion.div>}</AnimatePresence></div>
      <AnimatePresence>{isBreak && <motion.section className="focus-recap" initial={{ opacity: 0, y: reduced ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.28 }}><p className="section-kicker">Recap selesai</p><h2>{formatTimer(liveSeconds)} aktif, +{getSessionXp(liveSeconds)} XP</h2><p>{subtaskProgress.total ? `${subtaskProgress.done} dari ${subtaskProgress.total} checklist selesai.` : 'Tidak ada checklist pada tugas ini.'}</p><label className="field-group session-note"><span>Catatan sesi <span className="label-hint">opsional</span></span><textarea className="input" maxLength={240} value={sessionNote} onChange={(event) => setSessionNote(event.target.value)} placeholder="Apa yang sempat kamu selesaikan?" /></label></motion.section>}</AnimatePresence>
      <div ref={rewardRef} className="focus-reward"><span><Zap size={15} />+{isBreak ? getSessionXp(liveSeconds) : 0} XP sesi</span><span><Trophy size={15} />{data.progress.totalXp} XP total</span></div>
      <div className="focus-task-action">{!task.completed ? <button className="text-link" type="button" onClick={() => toggleTask(task.id)}><Check size={15} />Tandai tugas selesai</button> : <span className="completed-note"><Check size={15} />Tugas ini sudah selesai</span>}<a className="text-link" href="tasks.html">Pilih misi lain <ArrowRight size={15} /></a></div>
    </motion.section> : <EmptyState type="empty-task" title="Belum ada misi untuk difokuskan" message="Tambahkan tugas terlebih dahulu, lalu kembali untuk menjalankan Focus Run." action="Buka Tugas" onAction={() => { window.location.href = 'tasks.html'; }} />}
    <AnimatePresence>{focusNotice && <motion.div className="focus-start-notice" role="status" initial={{ opacity: 0, scale: 0.98, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}><Play size={17} fill="currentColor" />Fokus dimulai</motion.div>}</AnimatePresence>
  </div>;
}
