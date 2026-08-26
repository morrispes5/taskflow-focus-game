import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, CirclePlay, Clock3, Play, Trophy, Zap } from 'lucide-react';
import { playNumberSequence, playRewardSequence } from '../motion/anime.js';
import { applySessionReward, getDueInfo, getSessionXp, selectDailyMission } from '../lib/domain.js';
import { EmptyState, Illustration } from '../components/ui.jsx';
import { playFocusChime, sendNotification } from '../lib/reminders.js';

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
  const [now, setNow] = useState(Date.now());
  const [customMinutes, setCustomMinutes] = useState(data.preferences.customFocusMinutes || 40);
  const [sessionNote, setSessionNote] = useState('');
  const reduced = data.preferences.motion === 'compact' || useReducedMotion();
  const rewardRef = useRef(null);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (data.activeFocus?.status === 'break' && data.activeFocus.breakEndsAt && now >= data.activeFocus.breakEndsAt) { commit((current) => ({ ...current, activeFocus: null })); } }, [now, data.activeFocus, commit]);
  const liveSeconds = data.activeFocus?.status === 'focusing' && data.activeFocus.runningSince ? data.activeFocus.activeSeconds + Math.floor((now - data.activeFocus.runningSince) / 1000) : data.activeFocus?.activeSeconds || 0;
  const plannedSeconds = (data.activeFocus?.plannedMinutes || data.preferences.focusPreset || 25) * 60;
  const remainingSeconds = Math.max(0, plannedSeconds - liveSeconds);
  const isReady = !data.activeFocus && Boolean(task);
  const isFocusing = data.activeFocus?.status === 'focusing';
  const isPaused = data.activeFocus?.status === 'paused';
  const isBreak = data.activeFocus?.status === 'break';
  const isFinished = Boolean(data.activeFocus?.status === 'completed');
  const startFocus = (minutes = data.preferences.focusPreset) => { if (!task) return; const start = Date.now(); const planned = Math.min(180, Math.max(5, Number(minutes) || 25)); commit((current) => ({ ...current, preferences: { ...current.preferences, customFocusMinutes: planned }, activeFocus: { taskId: task.id, plannedMinutes: planned, breakMinutes: planned >= 50 ? 10 : 5, status: 'focusing', activeSeconds: 0, runningSince: start, sessionStartedAt: start, breakEndsAt: null } })); };
  const pauseFocus = () => commit((current) => { const focus = current.activeFocus; if (!focus) return current; const elapsed = focus.activeSeconds + Math.floor((Date.now() - focus.runningSince) / 1000); return { ...current, activeFocus: { ...focus, status: 'paused', activeSeconds: elapsed, runningSince: null } }; });
  const resumeFocus = () => commit((current) => ({ ...current, activeFocus: { ...current.activeFocus, status: 'focusing', runningSince: Date.now() } }));
  const finishFocus = () => {
    const ended = Date.now();
    commit((current) => {
      const focus = current.activeFocus;
      if (!focus) return current;
      const activeSeconds = focus.activeSeconds + (focus.runningSince ? Math.floor((ended - focus.runningSince) / 1000) : 0);
      const session = { id: ended, taskId: focus.taskId, plannedMinutes: focus.plannedMinutes, activeSeconds, status: 'completed', startedAt: focus.sessionStartedAt, endedAt: ended, rewardApplied: true, note: '' };
      const progress = applySessionReward(current.progress, activeSeconds);
      return { ...current, progress, sessions: [...current.sessions, session], activeFocus: { ...focus, status: 'break', activeSeconds, runningSince: null, breakEndsAt: ended + focus.breakMinutes * 60000, sessionId: ended } };
    }, 'Sesi selesai. Reward XP masuk.');
    if (data.preferences.sound) playFocusChime();
    if (data.preferences.notify) sendNotification('Focus Run selesai', task ? `Sesi untuk “${task.text}” sudah berakhir.` : 'Sesi fokus selesai.');
    requestAnimationFrame(() => { playRewardSequence(rewardRef.current, reduced); playNumberSequence(rewardRef.current, reduced); });
  };
  const abandonFocus = () => commit((current) => { const focus = current.activeFocus; if (!focus) return current; const ended = Date.now(); const activeSeconds = focus.activeSeconds + (focus.runningSince ? Math.floor((ended - focus.runningSince) / 1000) : 0); return { ...current, sessions: [...current.sessions, { id: ended, taskId: focus.taskId, plannedMinutes: focus.plannedMinutes, activeSeconds, status: 'abandoned', startedAt: focus.sessionStartedAt, endedAt: ended, rewardApplied: false, note: '' }], activeFocus: null }; });
  const clearBreak = () => commit((current) => {
    const sessionId = current.activeFocus?.sessionId;
    const note = sessionNote.trim();
    const sessions = note && sessionId ? current.sessions.map((session) => session.id === sessionId ? { ...session, note } : session) : current.sessions;
    return { ...current, sessions, activeFocus: null };
  });
  const toggleSubtask = (subtaskId) => commit((current) => ({
    ...current,
    tasks: current.tasks.map((item) => item.id !== task.id ? item : { ...item, subtasks: item.subtasks.map((subtask) => subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask), updatedAt: Date.now() })
  }));
  const completion = plannedSeconds ? Math.min(100, Math.round((liveSeconds / plannedSeconds) * 100)) : 0;
  return <div className="focus-page"><div className="focus-topbar"><a className="focus-back" href="index.html"><ArrowLeft size={17} />Kembali ke Beranda</a><span className="focus-brand"><span className="brand-mark brand-mark-small" aria-hidden="true"><span /></span>TaskFlow Focus Run</span><span className="focus-date">{formatFocusDate(new Date())}</span></div>{task ? <motion.section className={`focus-stage ${isFocusing ? 'focus-stage-active' : ''}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42 }}><div className="focus-stage-copy"><p className="eyebrow">{isBreak ? 'Sesi selesai' : isPaused ? 'Sesi dijeda' : isFocusing ? 'Sedang fokus' : 'Misi terpilih'}</p><h1>{isBreak ? 'Tarik napas. Kamu baru saja bergerak maju.' : task.text}</h1><div className="focus-task-meta"><span className={`priority-badge priority-${task.priority}`}>{task.priority === 'high' ? 'Tinggi' : task.priority === 'medium' ? 'Sedang' : 'Rendah'}</span><span>{task.category || 'Tanpa kategori'}</span><span>{getDueInfo(task).label}</span></div></div><Illustration type={isBreak ? 'milestone' : 'focus-run'} alt="Ilustrasi Focus Run" className="focus-illustration"/><div className="focus-timer-wrap"><div className={`focus-timer ${isPaused ? 'is-paused' : ''} ${isBreak ? 'is-break' : ''}`}><span className="timer-status">{isBreak ? 'Waktu istirahat' : isPaused ? 'Dijeda' : isFocusing ? 'Fokus sekarang' : 'Siap dimulai'}</span><strong>{isBreak ? formatTimer(Math.max(0, Math.ceil((data.activeFocus.breakEndsAt - now) / 1000))) : formatTimer(isReady ? plannedSeconds : remainingSeconds)}</strong><span className="timer-subtitle">{isBreak ? 'Kamu bisa kembali kapan saja.' : `${data.activeFocus?.plannedMinutes || data.preferences.focusPreset || 25} menit sesi fokus`}</span></div><div className="focus-progress"><span style={{ width: `${isBreak ? 100 : completion}%` }} /></div></div>
    {isReady && <form className="custom-focus" onSubmit={(event) => { event.preventDefault(); startFocus(customMinutes); }}><label htmlFor="custom-focus">Durasi custom (5–180 menit)</label><input id="custom-focus" className="input" type="number" min="5" max="180" value={customMinutes} onChange={(event) => setCustomMinutes(event.target.value)} /><button className="btn btn-secondary" type="submit">Mulai custom</button></form>}
    {task.subtasks?.length > 0 && <ul className="focus-subtasks">{task.subtasks.map((item) => <li key={item.id}><label><input type="checkbox" checked={item.completed} onChange={() => toggleSubtask(item.id)} /><span>{item.text}</span></label></li>)}</ul>}
    <div className="focus-controls">{isReady && <><button className="btn btn-dark btn-large" type="button" onClick={() => startFocus(data.preferences.focusPreset)}><CirclePlay size={19} fill="currentColor" />Mulai {data.preferences.focusPreset} menit</button><button className="btn btn-ghost" type="button" onClick={() => startFocus(50)}>Mulai 50 menit</button></>}{isFocusing && <><button className="btn btn-dark btn-large" type="button" onClick={pauseFocus}><Clock3 size={19} />Jeda sesi</button><button className="btn btn-ghost" type="button" onClick={finishFocus}>Selesaikan sesi</button></>}{isPaused && <><button className="btn btn-dark btn-large" type="button" onClick={resumeFocus}><Play size={18} fill="currentColor" />Lanjutkan</button><button className="btn btn-ghost" type="button" onClick={abandonFocus}>Akhiri sesi</button></>}{isBreak && <><button className="btn btn-dark btn-large" type="button" onClick={clearBreak}><Check size={18} />Selesai istirahat</button><span className="break-note">Sesi memberi +{getSessionXp(liveSeconds)} XP</span></>}{isFinished && <span className="break-note">Reward sudah masuk ke progresmu.</span>}</div>
    {isBreak && <label className="field-group session-note"><span>Catatan sesi <span className="label-hint">opsional</span></span><textarea className="input" maxLength={240} value={sessionNote} onChange={(event) => setSessionNote(event.target.value)} placeholder="Apa yang sempat kamu selesaikan?" /></label>}
    <div ref={rewardRef} className="focus-reward"><span><Zap size={15} />+{isBreak ? getSessionXp(liveSeconds) : 0} XP sesi</span><span><Trophy size={15} />{data.progress.totalXp} XP total</span></div>
    {task.notes && <p className="focus-notes">{task.notes}</p>}
    {task.url && <a className="text-link" href={task.url} target="_blank" rel="noreferrer">Buka tautan tugas <ArrowRight size={15} /></a>}
    <div className="focus-task-action">{!task.completed ? <button className="text-link" type="button" onClick={() => toggleTask(task.id)}><Check size={15} />Tandai tugas selesai</button> : <span className="completed-note"><Check size={15} />Tugas ini sudah selesai</span>}<a className="text-link" href="tasks.html">Pilih misi lain <ArrowRight size={15} /></a></div></motion.section> : <EmptyState type="empty-task" title="Belum ada misi untuk difokuskan" message="Tambahkan tugas terlebih dahulu, lalu kembali untuk menjalankan Focus Run." action="Buka Tugas" onAction={() => { window.location.href = 'tasks.html'; }} />}</div>;
}
