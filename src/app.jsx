import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft, ArrowRight, BarChart3, CalendarClock, Check, CircleHelp,
  CirclePlay, Clock3, Download, Flame, Gauge, LayoutDashboard, ListChecks,
  Menu, MoreHorizontal, Pencil, Play, Search, Settings, Sparkles, Target,
  Trash2, Trophy, Upload, X, Zap
} from 'lucide-react';
import { playHeroSequence, playNumberSequence, playRewardSequence } from './motion/anime.js';
import { loadAppData, saveAppData, createBackup, parseBackupPayload, normalizeProgress, DEFAULT_PROFILE, DEFAULT_ONBOARDING, PROFILE_ROLES, PROFILE_ROLE_LABELS } from './lib/storage.js';
import {
  filterTasks, formatDate, getAnalytics, getDashboardStats, getDueInfo, getLevel, getNextLevelXp,
  getProfileRecommendations, getSessionXp, getTaskXp, isOverdue, makeTask, selectDailyMission, sortTasks, todayString,
  updateStreak, validateProfileInput, validateTaskInput
} from './lib/domain.js';

const PAGE_META = {
  home: { label: 'Beranda', eyebrow: 'Ruang fokus pribadi', title: 'Pilih satu hal. Mulai dari sana.', description: 'TaskFlow membantu kamu mengubah daftar tugas menjadi progres yang terasa nyata.' },
  tasks: { label: 'Tugas', eyebrow: 'Quest board', title: 'Semua misi, lebih mudah dipilih.', description: 'Tangkap tugas dengan cepat, lalu pilih mana yang layak mendapat fokusmu sekarang.' },
  focus: { label: 'Fokus', eyebrow: 'Focus Run', title: 'Satu sesi. Satu misi.', description: 'Singkirkan noise dan beri waktu yang utuh untuk pekerjaan yang sedang kamu pilih.' },
  analytics: { label: 'Analitik', eyebrow: 'Perjalananmu', title: 'Lihat ritme, bukan skor kosong.', description: 'Baca pola kerja dari tugas dan sesi fokus yang benar-benar kamu jalankan.' },
  settings: { label: 'Pengaturan', eyebrow: 'Ruang kerjamu', title: 'Atur TaskFlow sesuai caramu.', description: 'Profil, preferensi fokus, dan data tetap berada di perangkat ini.' }
};

const NAV_ITEMS = [
  { href: 'index.html', page: 'home', label: 'Beranda', Icon: LayoutDashboard },
  { href: 'tasks.html', page: 'tasks', label: 'Tugas', Icon: ListChecks },
  { href: 'focus.html', page: 'focus', label: 'Fokus', Icon: Target },
  { href: 'analytics.html', page: 'analytics', label: 'Analitik', Icon: BarChart3 },
  { href: 'settings.html', page: 'settings', label: 'Pengaturan', Icon: Settings }
];

function getCurrentPage() { return document.body.dataset.page || 'home'; }

function addMilestones(progress, context) {
  const milestones = new Set(progress.milestones || []);
  if (context.taskCompleted) milestones.add('first-task');
  if (context.sessionCompleted) milestones.add('first-run');
  if (progress.currentStreak >= 3) milestones.add('three-day-streak');
  if (progress.totalXp >= 100) milestones.add('level-two');
  return { ...progress, milestones: [...milestones] };
}

function awardConsistency(progress, dateKey) {
  if (progress.lastConsistencyRewardDate === dateKey) return progress;
  return { ...progress, totalXp: progress.totalXp + 5, lastConsistencyRewardDate: dateKey };
}

function applyTaskCompletionReward(progress, task) {
  if (progress.rewardedTaskIds.includes(task.id)) return progress;
  const dateKey = todayString();
  let next = updateStreak(progress, dateKey);
  next = awardConsistency(next, dateKey);
  next = { ...next, totalXp: next.totalXp + getTaskXp(task), rewardedTaskIds: [...next.rewardedTaskIds, task.id] };
  next.level = getLevel(next.totalXp);
  return addMilestones(next, { taskCompleted: true });
}

function applySessionReward(progress, activeSeconds) {
  const dateKey = todayString();
  let next = updateStreak(progress, dateKey);
  next = awardConsistency(next, dateKey);
  next = { ...next, totalXp: next.totalXp + getSessionXp(activeSeconds) };
  next.level = getLevel(next.totalXp);
  return addMilestones(next, { sessionCompleted: true });
}

export default function TaskFlowApp() {
  const page = getCurrentPage();
  const [data, setData] = useState(() => loadAppData());
  const [notice, setNotice] = useState(null);
  const [tourOpen, setTourOpen] = useState(() => {
    const initial = loadAppData();
    return initial.onboarding.profileCompleted && !initial.onboarding.tutorialCompleted && !initial.onboarding.tutorialSkipped;
  });
  const dataRef = useRef(data);

  const commit = useCallback((updater, message = '') => {
    const next = updater(dataRef.current);
    dataRef.current = next;
    setData(next);
    saveAppData(next);
    if (message) setNotice({ id: Date.now(), text: message });
  }, []);

  useEffect(() => {
    const refresh = () => {
      const next = loadAppData();
      dataRef.current = next;
      setData(next);
    };
    window.addEventListener('storage', refresh);
    window.addEventListener('taskflow:data-changed', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('taskflow:data-changed', refresh);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.motion = data.preferences.motion;
    document.documentElement.dataset.page = page;
  }, [data.preferences.motion, page]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const toggleTask = useCallback((taskId) => {
    const target = dataRef.current.tasks.find((task) => task.id === taskId);
    const message = target ? (target.completed ? 'Tugas dibuka kembali.' : `Tugas selesai. +${getTaskXp(target)} XP.`) : '';
    commit((current) => {
      const currentTarget = current.tasks.find((task) => task.id === taskId);
      if (!currentTarget) return current;
      const completed = !currentTarget.completed;
      const now = Date.now();
      const tasks = current.tasks.map((task) => task.id === taskId ? { ...task, completed, completedAt: completed ? now : null, updatedAt: now } : task);
      let progress = current.progress;
      if (completed) progress = applyTaskCompletionReward(progress, currentTarget);
      return { ...current, tasks, progress };
    }, message);
  }, [commit]);

  const updatePreferences = (preferences) => commit((current) => ({ ...current, preferences: { ...current.preferences, ...preferences } }));

  const completeProfile = (input) => {
    const completedAt = Date.now();
    commit((current) => ({
      ...current,
      profile: { ...current.profile, name: input.name.trim(), role: input.role, goal: input.goal.trim() },
      onboarding: { ...current.onboarding, profileCompleted: true, tutorialCompleted: false, tutorialSkipped: false, completedAt }
    }), 'Profil tersimpan.');
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setTourOpen(true);
  };

  const closeTutorial = (result = 'skip') => {
    setTourOpen(false);
    commit((current) => ({
      ...current,
      onboarding: {
        ...current.onboarding,
        tutorialCompleted: result === 'complete' ? true : current.onboarding.tutorialCompleted,
        tutorialSkipped: result === 'skip' ? true : current.onboarding.tutorialSkipped
      }
    }));
  };

  return (
    <MotionConfig reducedMotion={data.preferences.motion === 'compact' ? 'always' : 'user'}>
      <AppShell page={page} profile={data.profile} progress={data.progress} onboarding={data.onboarding} notice={notice} tourOpen={tourOpen} onCompleteProfile={completeProfile} onCloseTutorial={closeTutorial}>
        {page === 'home' && <HomePage data={data} commit={commit} toggleTask={toggleTask} />}
        {page === 'tasks' && <TasksPage data={data} commit={commit} toggleTask={toggleTask} />}
        {page === 'focus' && <FocusPage data={data} commit={commit} toggleTask={toggleTask} />}
        {page === 'analytics' && <AnalyticsPage data={data} />}
        {page === 'settings' && <SettingsPage data={data} commit={commit} updatePreferences={updatePreferences} onStartTutorial={() => setTourOpen(true)} />}
      </AppShell>
    </MotionConfig>
  );
}

function AppShell({ page, profile, progress, onboarding, notice, tourOpen, onCompleteProfile, onCloseTutorial, children }) {
  const meta = PAGE_META[page] || PAGE_META.home;
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className={`app-frame app-frame-${page}`}>
      <header className="app-header">
        <nav className={`navbar container ${menuOpen ? 'menu-open' : ''}`} aria-label="Navigasi utama">
          <a className="brand" href="index.html" aria-label="TaskFlow Beranda" onClick={() => setMenuOpen(false)}>
            <span className="brand-mark" aria-hidden="true"><span /></span>
            <span className="brand-copy"><strong>TaskFlow</strong><small>Focus, then flow.</small></span>
          </a>
          <div className="nav-links">
            {NAV_ITEMS.map(({ href, page: itemPage, label, Icon }) => (
              <a key={itemPage} data-tour={itemPage} className={`nav-link ${page === itemPage ? 'active' : ''}`} href={href} aria-current={page === itemPage ? 'page' : undefined} onClick={() => setMenuOpen(false)}>
                <Icon size={16} strokeWidth={2.2} aria-hidden="true" /><span>{label}</span>
              </a>
            ))}
          </div>
          <div className="header-progress" title={`${progress.totalXp} XP`}>
            <span className="header-level"><Zap size={14} aria-hidden="true" /> Lv {progress.level}</span>
            <span className="header-streak"><Flame size={14} aria-hidden="true" /> {progress.currentStreak}</span>
          </div>
          <button className="icon-button menu-button" type="button" aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={menuOpen} title={menuOpen ? 'Tutup menu' : 'Buka menu'} onClick={() => setMenuOpen((current) => !current)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </nav>
      </header>
      <main className="container page-shell">
        {!onboarding.profileCompleted ? <ProfileGate profile={profile} onComplete={onCompleteProfile} /> : <>
        {page !== 'focus' && page !== 'home' && (
          <motion.section className="page-heading" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
            <div>
              <p className="eyebrow">{meta.eyebrow}</p>
              <h1>{meta.title}</h1>
              <p className="page-description">{page === 'home' ? `Hai ${profile.name}, ${meta.description}` : meta.description}</p>
            </div>
          </motion.section>
        )}
        {children}
        </>}
      </main>
      <AnimatePresence>{notice && <motion.div className="toast" role="status" aria-live="polite" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}><Check size={15} />{notice.text}</motion.div>}</AnimatePresence>
      {onboarding.profileCompleted && tourOpen && <OnboardingTour onComplete={() => onCloseTutorial('complete')} onSkip={() => onCloseTutorial('skip')} />}
    </div>
  );
}

function ProfileGate({ profile, onComplete }) {
  const [form, setForm] = useState({ name: profile.name || '', role: profile.role || '', goal: profile.goal || '' });
  const [error, setError] = useState(null);
  const nameRef = useRef(null);
  useEffect(() => { requestAnimationFrame(() => nameRef.current?.focus()); }, []);
  const setField = (field, value) => { setForm((current) => ({ ...current, [field]: value })); if (error?.field === field) setError(null); };
  const submit = (event) => { event.preventDefault(); const validation = validateProfileInput(form); if (validation) { setError(validation); return; } onComplete(form); };
  return <section className="first-run-shell" aria-labelledby="profile-gate-title"><div className="profile-gate"><div className="profile-gate-copy"><p className="eyebrow">Ruang fokus pribadimu</p><h1 id="profile-gate-title">Mulai dari hal yang penting buatmu.</h1><p>TaskFlow akan memakai sedikit konteks ini untuk menyusun langkah yang terasa relevan. Semua informasi hanya disimpan di browser ini.</p><Illustration type="milestone" alt="Ilustrasi memulai perjalanan fokus" className="profile-gate-illustration" /></div><form className="profile-gate-form form-stack" onSubmit={submit}><div><p className="section-kicker">Kenalan sebentar</p><h2>Isi profilmu dulu</h2><p className="muted">Tidak perlu akun. Cukup tiga hal untuk memulai.</p></div><div className="field-group"><label htmlFor="onboarding-name">Nama panggilan</label><input ref={nameRef} id="onboarding-name" className="input" value={form.name} onChange={(event) => setField('name', event.target.value)} maxLength={40} autoComplete="nickname" aria-invalid={error?.field === 'name'} aria-describedby="onboarding-name-error" placeholder="Contoh: Vio" /><p id="onboarding-name-error" className="field-error" role="alert">{error?.field === 'name' ? error.message : ''}</p></div><div className="field-group"><label htmlFor="onboarding-role">Peranmu</label><select id="onboarding-role" className="input" value={form.role} onChange={(event) => setField('role', event.target.value)} aria-invalid={error?.field === 'role'}><option value="">Pilih peran</option>{PROFILE_ROLES.map((role) => <option key={role} value={role}>{PROFILE_ROLE_LABELS[role]}</option>)}</select><p className="field-error" role="alert">{error?.field === 'role' ? error.message : ''}</p></div><div className="field-group"><label htmlFor="onboarding-goal">Tujuan utama saat ini</label><textarea id="onboarding-goal" className="input" value={form.goal} onChange={(event) => setField('goal', event.target.value)} maxLength={120} aria-invalid={error?.field === 'goal'} aria-describedby="onboarding-goal-error" placeholder="Contoh: Menyelesaikan proyek akhir dengan lebih teratur" /><p id="onboarding-goal-error" className="field-error" role="alert">{error?.field === 'goal' ? error.message : ''}</p></div><button className="btn btn-primary btn-large" type="submit"><Sparkles size={18} />Mulai ruang fokus</button><p className="form-note"><CircleHelp size={14} />Profil ini tidak dikirim ke mana pun.</p></form></div></section>;
}

const TOUR_STEPS = [
  { title: 'Ini ruang fokusmu', description: 'Beranda merangkum misi, progres, dan langkah yang paling masuk akal untukmu hari ini.', selectors: ['.home-hero-preview', '[data-tour="recommendations"]', '[data-tour="tasks"]', '.home-hero'] },
  { title: 'Tangkap tugas tanpa ribet', description: 'Gunakan halaman Tugas untuk menulis cepat atau menambahkan deadline, prioritas, dan estimasi fokus.', selectors: ['.task-capture', '.home-hero [data-tour="tasks"]', '[data-tour="tasks"]'] },
  { title: 'Jalankan satu sesi fokus', description: 'Focus Run membantu kamu memberi waktu utuh untuk satu misi tanpa membuat daftar terasa berat.', selectors: ['.mission-card', '.home-hero-preview', '.focus-stage', '[data-tour="focus"]', '.task-results'] },
  { title: 'Baca ritmemu', description: 'Analitik menunjukkan pola yang benar-benar terjadi dari task dan sesi yang kamu selesaikan.', selectors: ['.summary-lines', '.analytics-stats', '.summary-card', '[data-tour="analytics"]', '.analytics-columns', '.task-results'] }
];

function OnboardingTour({ onComplete, onSkip }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const cardRef = useRef(null);
  const step = TOUR_STEPS[stepIndex];
  useEffect(() => {
    const refresh = () => {
      const target = step.selectors.map((selector) => document.querySelector(selector)).find((element) => {
        const rect = element?.getBoundingClientRect();
        return rect && rect.width > 0 && rect.height > 0;
      });
      if (!target) { setTargetRect(null); return; }
      const rectBeforeScroll = target.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const isOutsideViewport = rectBeforeScroll.top < 72 || rectBeforeScroll.bottom > viewportHeight - 170;
      if (isOutsideViewport) target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
      const rect = target.getBoundingClientRect();
      setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };
    refresh();
    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, true);
    const frame = requestAnimationFrame(refresh);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', refresh); window.removeEventListener('scroll', refresh, true); };
  }, [step]);
  useEffect(() => {
    cardRef.current?.focus();
    const onKeyDown = (event) => { if (event.key === 'Escape') onSkip(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onSkip, stepIndex]);
  const next = () => { if (stepIndex === TOUR_STEPS.length - 1) onComplete(); else setStepIndex((current) => current + 1); };
  return <div className="tour-layer"><div className="tour-overlay" aria-hidden="true" />{targetRect && <div className="tour-spotlight" aria-hidden="true" style={{ top: targetRect.top - 8, left: targetRect.left - 8, width: targetRect.width + 16, height: targetRect.height + 16 }} />}<section ref={cardRef} className="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title" tabIndex="-1"><div className="tour-card-topline"><span className="section-kicker">Panduan TaskFlow</span><span>{stepIndex + 1} / {TOUR_STEPS.length}</span></div><h2 id="tour-title">{step.title}</h2><p>{step.description}</p><div className="tour-progress" aria-hidden="true"><span style={{ width: `${((stepIndex + 1) / TOUR_STEPS.length) * 100}%` }} /></div><div className="tour-actions"><button className="btn btn-ghost" type="button" onClick={onSkip}>Lewati tutorial</button><div><button className="btn btn-secondary" type="button" onClick={() => setStepIndex((current) => Math.max(0, current - 1))} disabled={stepIndex === 0}>Kembali</button><button className="btn btn-primary" type="button" onClick={next}>{stepIndex === TOUR_STEPS.length - 1 ? 'Selesai' : 'Berikutnya'}<ArrowRight size={16} /></button></div></div></section></div>;
}

function PageActions({ children }) { return <div className="page-actions">{children}</div>; }

function Illustration({ type, alt, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={`illustration-fallback illustration-${type} ${className}`} aria-hidden="true"><Sparkles size={28} /></div>;
  return <img className={`illustration illustration-${type} ${className}`} src={`${import.meta.env.BASE_URL}assets/illustrations/${type}.png`} alt={alt} onError={() => setFailed(true)} />;
}

function StatCard({ label, value, hint, icon: Icon, accent = '' }) {
  return <motion.article className={`stat-card ${accent}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}><span className="stat-icon"><Icon size={17} aria-hidden="true" /></span><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-hint">{hint}</span></motion.article>;
}

function ProgressMeter({ value, max = 100, label, tone = 'mint' }) {
  const percentage = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return <div className="meter-group"><div className="meter-heading"><span>{label}</span><strong>{percentage}%</strong></div><div className={`meter meter-${tone}`} role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percentage}><span style={{ width: `${percentage}%` }} /></div></div>;
}

function TaskRow({ task, onToggle, onEdit, onDelete, compact = false }) {
  const due = getDueInfo(task);
  return (
    <motion.li className={`task-row ${task.completed ? 'is-completed' : ''}`} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
      <label className="task-check" title={task.completed ? 'Buka kembali tugas' : 'Tandai selesai'}>
        <input type="checkbox" checked={task.completed} onChange={() => onToggle(task.id)} aria-label={`${task.completed ? 'Buka kembali' : 'Tandai selesai'}: ${task.text}`} />
        <span aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
      </label>
      <div className="task-details">
        <div className="task-title-line"><span className="task-text">{task.text}</span><span className={`priority-badge priority-${task.priority}`}>{task.priority === 'high' ? 'Tinggi' : task.priority === 'medium' ? 'Sedang' : 'Rendah'}</span></div>
        <div className="task-meta"><span className={`task-due task-due-${due.tone}`}><CalendarClock size={13} aria-hidden="true" />{due.label}</span>{task.category && <span className="category-badge">{task.category}</span>}<span className="task-estimate"><Clock3 size={12} aria-hidden="true" />{task.estimateMinutes} m fokus</span><span className="task-reward"><Zap size={12} aria-hidden="true" />+{getTaskXp(task)} XP</span></div>
      </div>
      {!compact && <div className="task-actions"><a className="icon-button" href={`focus.html?taskId=${task.id}`} aria-label={`Mulai fokus: ${task.text}`} title="Mulai Focus Run"><Play size={16} fill="currentColor" /></a><button className="icon-button" type="button" onClick={() => onEdit(task)} aria-label={`Edit tugas: ${task.text}`} title="Edit tugas"><Pencil size={16} /></button><button className="icon-button danger-hover" type="button" onClick={() => onDelete(task)} aria-label={`Hapus tugas: ${task.text}`} title="Hapus tugas"><Trash2 size={16} /></button></div>}
    </motion.li>
  );
}

function EmptyState({ type = 'empty-task', title, message, action, onAction }) {
  return <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Illustration type={type} alt="" /><h3>{title}</h3><p>{message}</p>{action && <button className="btn btn-secondary" type="button" onClick={onAction}>{action}</button>}</motion.div>;
}

function Modal({ open, onClose, title, eyebrow = 'TaskFlow', children, compact = false }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={dialogRef} className={`dialog ${compact ? 'dialog-compact' : ''}`} onCancel={(event) => { event.preventDefault(); onClose(); }} onClose={onClose} aria-labelledby="dialog-title"><div className="dialog-card"><div className="dialog-header"><div><p className="section-kicker">{eyebrow}</p><h2 id="dialog-title">{title}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Tutup dialog" title="Tutup"><X size={18} /></button></div>{children}</div></dialog>;
}

function TaskDialog({ open, task, onClose, onSave }) {
  const [form, setForm] = useState({ text: '', dueDate: '', priority: 'medium', category: '', estimateMinutes: 25 });
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    setForm({ text: task?.text || '', dueDate: task?.dueDate || '', priority: task?.priority || 'medium', category: task?.category || '', estimateMinutes: task?.estimateMinutes || 25 });
    setError(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open, task]);
  const setField = (field, value) => { setForm((current) => ({ ...current, [field]: value })); if (error?.field === field) setError(null); };
  const submit = (event) => { event.preventDefault(); const validation = validateTaskInput(form); if (validation) { setError(validation); return; } onSave(form, task?.id); onClose(); };
  return <Modal open={open} onClose={onClose} title={task ? 'Edit tugas' : 'Tambah tugas'} eyebrow="Atur misi"><form className="form-stack" onSubmit={submit}>
    <div className="field-group"><label htmlFor="task-title">Judul tugas <span aria-hidden="true">*</span></label><input ref={inputRef} id="task-title" className="input" value={form.text} onChange={(event) => setField('text', event.target.value)} maxLength={120} aria-invalid={error?.field === 'text'} aria-describedby="task-title-error" autoComplete="off" /><p id="task-title-error" className="field-error" role="alert">{error?.field === 'text' ? error.message : ''}</p></div>
    <div className="form-grid-two"><div className="field-group"><label htmlFor="task-due">Deadline <span className="label-hint">opsional</span></label><input id="task-due" className="input" type="date" value={form.dueDate} onChange={(event) => setField('dueDate', event.target.value)} aria-invalid={error?.field === 'dueDate'} /><p className="field-error">{error?.field === 'dueDate' ? error.message : ''}</p></div><div className="field-group"><label htmlFor="task-priority">Prioritas</label><select id="task-priority" className="input" value={form.priority} onChange={(event) => setField('priority', event.target.value)}><option value="high">Tinggi</option><option value="medium">Sedang</option><option value="low">Rendah</option></select></div></div>
    <div className="field-group"><label htmlFor="task-estimate">Estimasi fokus</label><select id="task-estimate" className="input" value={form.estimateMinutes} onChange={(event) => setField('estimateMinutes', Number(event.target.value))}><option value="15">15 menit · cepat</option><option value="25">25 menit · standar</option><option value="50">50 menit · mendalam</option><option value="90">90 menit · panjang</option></select><p className="field-help">Pilih durasi yang realistis untuk satu sesi.</p></div>
    <div className="field-group"><label htmlFor="task-category">Kategori / mata pelajaran <span className="label-hint">opsional</span></label><input id="task-category" className="input" value={form.category} onChange={(event) => setField('category', event.target.value)} maxLength={32} placeholder="Contoh: Matematika" list="category-suggestions" aria-invalid={error?.field === 'category'} /><datalist id="category-suggestions"><option value="Kuliah" /><option value="Proyek" /><option value="Organisasi" /><option value="Pribadi" /></datalist><p className="field-error" role="alert">{error?.field === 'category' ? error.message : ''}</p></div>
    <div className="dialog-footer"><button className="btn btn-secondary" type="button" onClick={onClose}>Batal</button><button className="btn btn-primary" type="submit"><Check size={16} />Simpan tugas</button></div>
  </form></Modal>;
}

function ConfirmDialog({ open, title, message, confirmLabel = 'Lanjutkan', danger = false, onClose, onConfirm }) {
  return <Modal open={open} onClose={onClose} title={title} eyebrow="Konfirmasi" compact><p className="dialog-message">{message}</p><div className="dialog-footer"><button className="btn btn-secondary" type="button" onClick={onClose}>Batal</button><button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} type="button" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button></div></Modal>;
}

function RecommendationPanel({ data, commit, onCreateTask }) {
  const recommendationSource = useMemo(() => getProfileRecommendations(data.profile).filter((item) => !data.tasks.some((task) => task.text.toLowerCase() === item.text.toLowerCase())), [data.profile.role, data.profile.goal, data.tasks]);
  const recommendationKey = recommendationSource.map((item) => item.id).join('|');
  const [drafts, setDrafts] = useState(() => recommendationSource);
  const [selectedIds, setSelectedIds] = useState(() => recommendationSource.map((item) => item.id));
  const [status, setStatus] = useState('');
  useEffect(() => { setDrafts(recommendationSource); setSelectedIds(recommendationSource.map((item) => item.id)); setStatus(''); }, [recommendationKey]);
  if (!data.profile.role || !data.profile.goal) return <section className="recommendation-panel card" data-tour="recommendations"><div className="recommendation-empty"><span className="card-icon"><Sparkles size={18} /></span><div><p className="section-kicker">Rekomendasi personal</p><h2>Lengkapi profil untuk mulai membaca kebutuhanmu.</h2><p className="muted">Tambahkan peran dan tujuan utama dari Pengaturan agar TaskFlow bisa menyusun langkah yang lebih relevan.</p><a className="btn btn-secondary" href="settings.html">Lengkapi profil <ArrowRight size={16} /></a></div></div></section>;
  if (!recommendationSource.length) return <section className="recommendation-panel card" data-tour="recommendations"><div className="recommendation-empty"><span className="card-icon"><Check size={18} /></span><div><p className="section-kicker">Rekomendasi personal</p><h2>Langkah awalmu sudah tersimpan.</h2><p className="muted">Tambah tujuan baru di Pengaturan jika kamu ingin melihat rangkaian saran yang berbeda.</p><button className="text-link" type="button" onClick={onCreateTask}>Buat tugas sendiri <ArrowRight size={15} /></button></div></div></section>;
  const toggle = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const updateDraft = (id, text) => setDrafts((current) => current.map((item) => item.id === id ? { ...item, text } : item));
  const addSelected = () => {
    const selected = drafts.filter((item) => selectedIds.includes(item.id) && item.text.trim());
    if (!selected.length) { setStatus('Pilih setidaknya satu langkah yang ingin ditambahkan.'); return; }
    const stamp = Date.now();
    commit((current) => ({ ...current, tasks: [...selected.map((item, index) => makeTask({ text: item.text.trim(), priority: 'medium', category: item.category, estimateMinutes: 25 }, stamp + index)), ...current.tasks] }), `${selected.length} rekomendasi ditambahkan.`);
    setStatus('Langkah pilihanmu sudah masuk ke Tugas.');
  };
  return <section className="recommendation-panel card" data-tour="recommendations"><div className="recommendation-header"><div><p className="section-kicker">Dari tujuanmu</p><h2>Mulai dengan langkah yang terasa masuk akal.</h2><p className="muted">Saran ini dibuat lokal dari tujuan “{data.profile.goal}”. Edit atau pilih yang paling cocok.</p></div><span className="card-icon"><Sparkles size={18} /></span></div><div className="recommendation-list">{drafts.map((item) => <label className="recommendation-item" key={item.id}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggle(item.id)} /><span className="recommendation-check" aria-hidden="true"><Check size={13} /></span><input className="input" value={item.text} onChange={(event) => updateDraft(item.id, event.target.value)} aria-label={`Edit rekomendasi: ${item.text}`} /><span className="category-badge">{item.category}</span></label>)}</div><div className="recommendation-footer"><button className="text-link" type="button" onClick={onCreateTask}>Buat tugas sendiri <ArrowRight size={15} /></button><div className="recommendation-actions"><span className="form-status" role="status">{status}</span><button className="btn btn-primary" type="button" onClick={addSelected}><ListChecks size={16} />Tambahkan pilihan</button></div></div></section>;
}

function HomePage({ data, commit, toggleTask }) {
  const [dialogTask, setDialogTask] = useState(null);
  const heroRef = useRef(null);
  const reduced = data.preferences.motion === 'compact';
  const stats = getDashboardStats(data.tasks, data.progress, data.sessions);
  const mission = selectDailyMission(data.tasks);
  const focusTasks = sortTasks(data.tasks.filter((task) => !task.completed), 'dueSoon').slice(0, 5);
  const levelProgress = data.progress.totalXp % 100;
  const saveTask = (input, id) => commit((current) => id ? ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, ...input, category: input.category.trim() || null, dueDate: input.dueDate || null, estimateMinutes: Number(input.estimateMinutes) || 25, updatedAt: Date.now() } : task) }) : ({ ...current, tasks: [makeTask(input), ...current.tasks] }), id ? 'Tugas diperbarui.' : 'Tugas ditambahkan.');
  useEffect(() => {
    const animation = playHeroSequence(heroRef.current, reduced);
    return () => animation?.pause?.();
  }, [reduced]);
  return <>
    <motion.section ref={heroRef} className="home-hero" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34 }}>
      <div className="home-hero-copy">
        <p className="eyebrow" data-hero-item>Ruang fokus untuk pelajar</p>
        <h1 data-hero-item>Tugasmu masuk.<br />Fokusmu keluar.</h1>
        <p className="home-hero-description" data-hero-item>Hai {data.profile.name}, TaskFlow mengubah daftar tugas menjadi satu misi yang jelas, satu sesi fokus, dan progres yang terasa nyata.</p>
        <PageActions>
          {mission ? <a className="btn btn-primary" data-hero-item href={`focus.html?taskId=${mission.id}`}><CirclePlay size={17} fill="currentColor" />Mulai misi berikutnya</a> : <button className="btn btn-primary" data-hero-item type="button" onClick={() => setDialogTask({})}><Sparkles size={17} />Buat misi pertama</button>}
          <a className="btn btn-secondary" data-hero-item data-tour="tasks" href="tasks.html"><ListChecks size={16} />Lihat task board</a>
        </PageActions>
        <div className="home-loop" data-hero-item aria-label="Alur TaskFlow"><span><strong>01</strong>Pilih misi</span><span><strong>02</strong>Jalankan fokus</span><span><strong>03</strong>Baca progres</span></div>
      </div>
      <motion.div className="home-hero-preview" data-hero-item initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.12 }}>
        <div className="preview-topline"><span className="eyebrow">Focus Run</span><span className="quiet-status"><span className="status-dot" />Siap dimulai</span></div>
        <p className="preview-label">Misi yang sedang kamu pilih</p>
        <h2>{mission ? mission.text : 'Ruang fokusmu siap diisi.'}</h2>
        <div className="preview-meta"><span>{mission ? getDueInfo(mission).label : 'Tambahkan tugas'}</span>{mission?.category && <span>{mission.category}</span>}</div>
        <div className="preview-focus-row"><div className="preview-timer"><strong>{mission?.estimateMinutes || 25}:00</strong><span>durasi awal</span></div><Illustration type="focus-run" alt="Ilustrasi Focus Run" className="preview-illustration" /></div>
        <div className="preview-footer"><span><Zap size={14} />+{mission ? getTaskXp(mission) : 0} XP saat selesai</span><span className="preview-arrow"><ArrowRight size={16} /></span></div>
      </motion.div>
    </motion.section>
    <RecommendationPanel data={data} commit={commit} onCreateTask={() => setDialogTask({})} />
    <section className="stats-grid" aria-label="Ringkasan progres"><StatCard label="Tugas aktif" value={stats.active} hint={`${stats.total} total tugas`} icon={ListChecks} accent="stat-accent-cobalt" /><StatCard label="Jatuh tempo hari ini" value={stats.dueToday} hint="Yang perlu dilihat" icon={CalendarClock} /><StatCard label="Menit fokus" value={stats.focusMinutes} hint="Sesi selesai" icon={Clock3} /><StatCard label="Streak" value={`${stats.streak} hari`} hint={`${stats.xp} XP terkumpul`} icon={Flame} accent="stat-accent-mint" /></section>
    <section className="home-grid">
      <motion.article className="mission-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36 }}>
        <div className="mission-copy"><div className="card-topline"><span className="eyebrow">Focus Run</span><span className="quiet-status"><span className="status-dot" />Siap dimulai</span></div>{mission ? <><h2>{mission.text}</h2><div className="mission-meta"><span className={`priority-badge priority-${mission.priority}`}>{mission.priority === 'high' ? 'Prioritas tinggi' : mission.priority === 'medium' ? 'Prioritas sedang' : 'Prioritas rendah'}</span><span>{getDueInfo(mission).label}</span>{mission.category && <span>{mission.category}</span>}</div><a className="btn btn-dark" href={`focus.html?taskId=${mission.id}`}><CirclePlay size={18} fill="currentColor" />Mulai Focus Run<ArrowRight size={16} /></a></> : <><h2>Belum ada misi yang menunggu.</h2><p className="muted">Tambahkan tugas, lalu biarkan TaskFlow membantumu memilih langkah berikutnya.</p><button className="btn btn-dark" type="button" onClick={() => setDialogTask({})}>Buat misi pertama <ArrowRight size={16} /></button></>}</div><Illustration type="focus-run" alt="Ilustrasi sesi fokus" className="mission-illustration" />
      </motion.article>
      <motion.aside className="progress-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, delay: 0.06 }}><div className="card-topline"><span className="section-kicker">Perjalanan level</span><span className="level-label"><Zap size={14} />Lv {data.progress.level}</span></div><div className="level-number">{data.progress.totalXp}<small>/ {getNextLevelXp(data.progress.totalXp)} XP</small></div><ProgressMeter value={levelProgress} label="Menuju level berikutnya" /><div className="progress-foot"><span><Trophy size={15} />{data.progress.milestones.length} milestone</span><span><Flame size={15} />{data.progress.bestStreak} best streak</span></div></motion.aside>
    </section>
    <section className="section-heading-row"><div><p className="section-kicker">Hari ini</p><h2>Daftar yang layak mendapat perhatian</h2></div><a className="text-link" href="tasks.html">Lihat semua <ArrowRight size={15} /></a></section>
    <section className="content-grid home-lower"><article className="card task-card"><div className="card-header"><div><h3>Quest aktif</h3><p className="muted">Maksimal lima misi agar fokus tetap tajam.</p></div><span className="counter-badge"><strong>{focusTasks.length}</strong> terlihat</span></div>{focusTasks.length ? <ul className="task-list"><AnimatePresence>{focusTasks.map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} onEdit={setDialogTask} onDelete={() => {}} compact />)}</AnimatePresence></ul> : <EmptyState title="Semua misi selesai" message="Momentum bagus. Tambah satu misi baru atau istirahat sebentar." action="Tambah tugas" onAction={() => setDialogTask({})} />}</article><article className="card summary-card"><div className="card-header"><div><p className="section-kicker">Ringkasan hari</p><h3>Progres yang terlihat</h3></div><Gauge size={20} className="muted" /></div><div className="summary-big"><strong>{stats.completedWeek}</strong><span>tugas selesai minggu ini</span></div><div className="summary-lines"><div><span>Jatuh tempo hari ini</span><strong>{stats.dueToday}</strong></div><div><span>Terlambat</span><strong className={stats.overdue ? 'danger-text' : ''}>{stats.overdue}</strong></div><div><span>Sesi fokus selesai</span><strong>{data.sessions.filter((session) => session.status === 'completed').length}</strong></div></div><a className="text-link" href="analytics.html">Baca perjalananmu <ArrowRight size={15} /></a></article></section>
    <TaskDialog open={dialogTask !== null} task={dialogTask?.id ? dialogTask : null} onClose={() => setDialogTask(null)} onSave={saveTask} />
  </>;
}

function TasksPage({ data, commit, toggleTask }) {
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [dialogTask, setDialogTask] = useState(null);
  const [confirmTask, setConfirmTask] = useState(null);
  const [quickText, setQuickText] = useState('');
  const [quickError, setQuickError] = useState('');
  const quickInputRef = useRef(null);
  useEffect(() => {
    const focusQuickAdd = (event) => {
      const tagName = event.target?.tagName;
      if (event.key.toLowerCase() !== 'n' || ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName)) return;
      event.preventDefault();
      quickInputRef.current?.focus();
    };
    window.addEventListener('keydown', focusQuickAdd);
    return () => window.removeEventListener('keydown', focusQuickAdd);
  }, []);
  const categories = [...new Set(data.tasks.map((task) => task.category || 'Tanpa kategori'))].sort((a, b) => a.localeCompare(b, 'id'));
  const visibleTasks = sortTasks(filterTasks(data.tasks, { status, priority, category, search }), sort);
  const saveTask = (input, id) => commit((current) => id ? ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, text: input.text.trim(), dueDate: input.dueDate || null, priority: input.priority, category: input.category.trim() || null, estimateMinutes: Number(input.estimateMinutes) || 25, updatedAt: Date.now() } : task) }) : ({ ...current, tasks: [makeTask(input), ...current.tasks] }), id ? 'Tugas diperbarui.' : 'Tugas ditambahkan.');
  const addQuick = (event) => { event.preventDefault(); const validation = validateTaskInput({ text: quickText }); if (validation) { setQuickError(validation.message); return; } saveTask({ text: quickText, priority: 'medium', category: '', dueDate: '' }); setQuickText(''); setQuickError(''); };
  return <>
    <section className="task-capture card"><div className="capture-title"><div><p className="section-kicker">Tangkap cepat</p><h2>Apa yang ingin kamu selesaikan?</h2></div><span className="shortcut-hint">Tekan N untuk mulai, Enter untuk tambah</span></div><form className="quick-add-form" onSubmit={addQuick}><label className="sr-only" htmlFor="quick-task">Judul tugas baru</label><input ref={quickInputRef} id="quick-task" className="input input-large" value={quickText} onChange={(event) => { setQuickText(event.target.value); setQuickError(''); }} placeholder="Contoh: Selesaikan outline presentasi" maxLength={120} aria-invalid={Boolean(quickError)} /><button className="btn btn-primary" type="submit"><Zap size={16} />Tambah cepat</button><button className="btn btn-secondary" type="button" onClick={() => setDialogTask({})}><MoreHorizontal size={17} />Tambah detail</button></form>{quickError && <p className="form-error" role="alert">{quickError}</p>}</section>
    <section className="toolbar-section"><div className="filter-tabs" role="group" aria-label="Filter status tugas">{[['all', 'Semua'], ['active', 'Aktif'], ['completed', 'Selesai']].map(([key, label]) => <button key={key} className={`chip ${status === key ? 'active' : ''}`} type="button" onClick={() => setStatus(key)}>{label}<span>{key === 'all' ? data.tasks.length : key === 'active' ? data.tasks.filter((task) => !task.completed).length : data.tasks.filter((task) => task.completed).length}</span></button>)}</div><span className="counter-badge"><strong>{data.tasks.filter((task) => !task.completed).length}</strong> aktif</span></section>
    <section className="task-filter-grid"><label className="search-field"><Search size={17} aria-hidden="true" /><span className="sr-only">Cari tugas</span><input className="input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari tugas atau kategori..." /></label><label><span className="sr-only">Filter prioritas</span><select className="input" value={priority} onChange={(event) => setPriority(event.target.value)}><option value="all">Semua prioritas</option><option value="high">Prioritas tinggi</option><option value="medium">Prioritas sedang</option><option value="low">Prioritas rendah</option></select></label><label><span className="sr-only">Filter kategori</span><select className="input" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Semua kategori</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label><span className="sr-only">Urutkan tugas</span><select className="input" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Terbaru</option><option value="dueSoon">Deadline terdekat</option><option value="priority">Prioritas tertinggi</option></select></label></section>
    <section className="task-results card"><div className="list-summary" role="status" aria-live="polite">Menampilkan {visibleTasks.length} dari {data.tasks.length} tugas</div>{visibleTasks.length ? <ul className="task-list task-list-room"><AnimatePresence mode="popLayout">{visibleTasks.map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} onEdit={setDialogTask} onDelete={setConfirmTask} />)}</AnimatePresence></ul> : <EmptyState type={data.tasks.length ? 'empty-task' : 'empty-task'} title={!data.tasks.length ? 'Belum ada tugas' : search || priority !== 'all' || category !== 'all' ? 'Tidak ada hasil' : status === 'active' ? 'Tidak ada tugas aktif' : 'Tidak ada tugas selesai'} message={!data.tasks.length ? 'Tulis misi pertamamu di bagian atas untuk mulai membangun momentum.' : 'Coba ubah kata kunci atau filter agar daftar lain terlihat.'} action="Tambah tugas" onAction={() => setDialogTask({})} />}</section>
    <TaskDialog open={dialogTask !== null} task={dialogTask?.id ? dialogTask : null} onClose={() => setDialogTask(null)} onSave={saveTask} />
    <ConfirmDialog open={Boolean(confirmTask)} title="Hapus tugas ini?" message="Tugas yang dihapus tidak bisa dipulihkan dari TaskFlow." confirmLabel="Hapus tugas" danger onClose={() => setConfirmTask(null)} onConfirm={() => commit((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== confirmTask?.id) }), 'Tugas dihapus.')} />
  </>;
}

function formatTimer(seconds) { const safe = Math.max(0, Math.floor(seconds)); return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`; }

function formatFocusDate(date) {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
}

function FocusPage({ data, commit, toggleTask }) {
  const params = new URLSearchParams(window.location.search);
  const requestedId = Number(params.get('taskId'));
  const requestedTask = data.tasks.find((task) => task.id === requestedId);
  const activeTaskId = data.activeFocus?.taskId || requestedTask?.id || selectDailyMission(data.tasks)?.id;
  const task = data.tasks.find((item) => item.id === activeTaskId);
  const [now, setNow] = useState(Date.now());
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
  const startFocus = (minutes = data.preferences.focusPreset) => { if (!task) return; const start = Date.now(); commit((current) => ({ ...current, activeFocus: { taskId: task.id, plannedMinutes: minutes, breakMinutes: minutes >= 50 ? 10 : 5, status: 'focusing', activeSeconds: 0, runningSince: start, sessionStartedAt: start, breakEndsAt: null } })); };
  const pauseFocus = () => commit((current) => { const focus = current.activeFocus; if (!focus) return current; const elapsed = focus.activeSeconds + Math.floor((Date.now() - focus.runningSince) / 1000); return { ...current, activeFocus: { ...focus, status: 'paused', activeSeconds: elapsed, runningSince: null } }; });
  const resumeFocus = () => commit((current) => ({ ...current, activeFocus: { ...current.activeFocus, status: 'focusing', runningSince: Date.now() } }));
  const finishFocus = () => { const ended = Date.now(); commit((current) => { const focus = current.activeFocus; if (!focus) return current; const activeSeconds = focus.activeSeconds + (focus.runningSince ? Math.floor((ended - focus.runningSince) / 1000) : 0); const session = { id: ended, taskId: focus.taskId, plannedMinutes: focus.plannedMinutes, activeSeconds, status: 'completed', startedAt: focus.sessionStartedAt, endedAt: ended, rewardApplied: true }; const progress = applySessionReward(current.progress, activeSeconds); return { ...current, progress, sessions: [...current.sessions, session], activeFocus: { ...focus, status: 'break', activeSeconds, runningSince: null, breakEndsAt: ended + focus.breakMinutes * 60000 } }; }, 'Sesi selesai. Reward XP masuk.'); requestAnimationFrame(() => { playRewardSequence(rewardRef.current, reduced); playNumberSequence(rewardRef.current, reduced); }); };
  const abandonFocus = () => commit((current) => { const focus = current.activeFocus; if (!focus) return current; const ended = Date.now(); const activeSeconds = focus.activeSeconds + (focus.runningSince ? Math.floor((ended - focus.runningSince) / 1000) : 0); return { ...current, sessions: [...current.sessions, { id: ended, taskId: focus.taskId, plannedMinutes: focus.plannedMinutes, activeSeconds, status: 'abandoned', startedAt: focus.sessionStartedAt, endedAt: ended, rewardApplied: false }], activeFocus: null }; });
  const clearBreak = () => commit((current) => ({ ...current, activeFocus: null }));
  const completion = plannedSeconds ? Math.min(100, Math.round((liveSeconds / plannedSeconds) * 100)) : 0;
  return <div className="focus-page"><div className="focus-topbar"><a className="focus-back" href="index.html"><ArrowLeft size={17} />Kembali ke Beranda</a><span className="focus-brand"><span className="brand-mark brand-mark-small" aria-hidden="true"><span /></span>TaskFlow Focus Run</span><span className="focus-date">{formatFocusDate(new Date())}</span></div>{task ? <motion.section className={`focus-stage ${isFocusing ? 'focus-stage-active' : ''}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42 }}><div className="focus-stage-copy"><p className="eyebrow">{isBreak ? 'Sesi selesai' : isPaused ? 'Sesi dijeda' : isFocusing ? 'Sedang fokus' : 'Misi terpilih'}</p><h1>{isBreak ? 'Tarik napas. Kamu baru saja bergerak maju.' : task.text}</h1><div className="focus-task-meta"><span className={`priority-badge priority-${task.priority}`}>{task.priority === 'high' ? 'Tinggi' : task.priority === 'medium' ? 'Sedang' : 'Rendah'}</span><span>{task.category || 'Tanpa kategori'}</span><span>{getDueInfo(task).label}</span></div></div><Illustration type={isBreak ? 'milestone' : 'focus-run'} alt="Ilustrasi Focus Run" className="focus-illustration"/><div className="focus-timer-wrap"><div className={`focus-timer ${isPaused ? 'is-paused' : ''} ${isBreak ? 'is-break' : ''}`}><span className="timer-status">{isBreak ? 'Waktu istirahat' : isPaused ? 'Dijeda' : isFocusing ? 'Fokus sekarang' : 'Siap dimulai'}</span><strong>{isBreak ? formatTimer(Math.max(0, Math.ceil((data.activeFocus.breakEndsAt - now) / 1000))) : formatTimer(isReady ? plannedSeconds : remainingSeconds)}</strong><span className="timer-subtitle">{isBreak ? 'Kamu bisa kembali kapan saja.' : `${data.activeFocus?.plannedMinutes || data.preferences.focusPreset || 25} menit sesi fokus`}</span></div><div className="focus-progress"><span style={{ width: `${isBreak ? 100 : completion}%` }} /></div></div><div className="focus-controls">{isReady && <><button className="btn btn-dark btn-large" type="button" onClick={() => startFocus(data.preferences.focusPreset)}><CirclePlay size={19} fill="currentColor" />Mulai {data.preferences.focusPreset} menit</button><button className="btn btn-ghost" type="button" onClick={() => startFocus(50)}>Mulai 50 menit</button></>}{isFocusing && <><button className="btn btn-dark btn-large" type="button" onClick={pauseFocus}><Clock3 size={19} />Jeda sesi</button><button className="btn btn-ghost" type="button" onClick={finishFocus}>Selesaikan sesi</button></>}{isPaused && <><button className="btn btn-dark btn-large" type="button" onClick={resumeFocus}><Play size={18} fill="currentColor" />Lanjutkan</button><button className="btn btn-ghost" type="button" onClick={abandonFocus}>Akhiri sesi</button></>}{isBreak && <><button className="btn btn-dark btn-large" type="button" onClick={clearBreak}><Check size={18} />Selesai istirahat</button><span className="break-note">Sesi memberi +{getSessionXp(liveSeconds)} XP</span></>}{isFinished && <span className="break-note">Reward sudah masuk ke progresmu.</span>}</div><div ref={rewardRef} className="focus-reward"><span><Zap size={15} />+{isBreak ? getSessionXp(liveSeconds) : 0} XP sesi</span><span><Trophy size={15} />{data.progress.totalXp} XP total</span></div><div className="focus-task-action">{!task.completed ? <button className="text-link" type="button" onClick={() => toggleTask(task.id)}><Check size={15} />Tandai tugas selesai</button> : <span className="completed-note"><Check size={15} />Tugas ini sudah selesai</span>}<a className="text-link" href="tasks.html">Pilih misi lain <ArrowRight size={15} /></a></div></motion.section> : <EmptyState type="empty-task" title="Belum ada misi untuk difokuskan" message="Tambahkan tugas terlebih dahulu, lalu kembali untuk menjalankan Focus Run." action="Buka Tugas" onAction={() => { window.location.href = 'tasks.html'; }} />}</div>;
}

function AnalyticsPage({ data }) {
  const analytics = getAnalytics(data.tasks, data.sessions);
  const hasData = data.tasks.length || data.sessions.length;
  return <>{hasData ? <><section className="stats-grid analytics-stats"><StatCard label="Completion rate" value={`${analytics.completionRate}%`} hint={`${analytics.completed} tugas selesai`} icon={Check} accent="stat-accent-mint" /><StatCard label="Tugas aktif" value={analytics.active} hint="Belum selesai" icon={ListChecks} /><StatCard label="Terlambat" value={analytics.overdue} hint="Perlu perhatian" icon={CalendarClock} accent="stat-accent-coral" /><StatCard label="Fokus" value={`${analytics.focusMinutes} m`} hint={`${analytics.sessionsCompleted} sesi selesai`} icon={Clock3} /></section><section className="analytics-layout"><article className="card journey-card"><div className="card-header"><div><p className="section-kicker">Tujuh hari terakhir</p><h2>Perjalanan yang bisa kamu baca</h2></div><span className="analytics-highlight"><Flame size={15} />{data.progress.currentStreak} hari</span></div><div className="journey-chart">{analytics.days.map((day) => <div className="journey-day" key={day.key}><div className="journey-bar" title={`${day.completed} tugas, ${day.focus} menit fokus`}><span style={{ height: `${Math.max(8, Math.min(100, day.completed * 25 + day.focus))}%` }} /></div><strong>{day.completed + day.focus ? day.completed + day.focus : 0}</strong><small>{day.label}</small></div>)}</div><div className="journey-legend"><span><i className="legend-dot legend-dot-mint" />Aktivitas selesai</span><span><i className="legend-dot legend-dot-cobalt" />Sesi fokus</span></div></article><article className="card progress-summary"><div className="card-header"><div><p className="section-kicker">Tepat waktu</p><h2>Deadline yang tertangani</h2></div><span className="big-percent">{analytics.onTimeRate}%</span></div><ProgressMeter value={analytics.onTimeRate} label="Penyelesaian tepat waktu" tone="cobalt" /><div className="summary-lines"><div><span>Selesai tepat waktu</span><strong>{analytics.onTimeCount}</strong></div><div><span>Memiliki deadline</span><strong>{analytics.withDeadline}</strong></div></div></article></section><section className="analytics-columns"><MetricList title="Distribusi kategori" kicker="Konteks" items={analytics.category} empty="Belum ada kategori." /><MetricList title="Distribusi prioritas" kicker="Energi" items={analytics.priority.map((item) => ({ ...item, label: item.label }))} empty="Belum ada tugas." /><article className="card analytics-note"><div className="card-header"><div><p className="section-kicker">Baca pelan-pelan</p><h2>Insight dari data nyata</h2></div><CircleHelp size={20} className="muted" /></div><p>{analytics.overdue ? `Ada ${analytics.overdue} tugas yang melewati deadline. Pilih satu untuk Focus Run berikutnya.` : analytics.completed ? 'Ritmemu sedang terbentuk. Pertahankan satu sesi fokus yang realistis setiap kali membuka TaskFlow.' : 'Mulai dari satu tugas dan satu sesi. Data akan terbentuk dari kebiasaan nyata, bukan skor buatan.'}</p><a className="btn btn-secondary" href="tasks.html">Buka quest board <ArrowRight size={15} /></a></article></section></> : <EmptyState type="empty-task" title="Belum ada data analitik" message="Tambahkan tugas atau jalankan satu Focus Run untuk mulai membaca perjalananmu." action="Buka Tugas" onAction={() => { window.location.href = 'tasks.html'; }} />}</>;
}

function MetricList({ title, kicker, items, empty }) { const max = Math.max(...items.map((item) => item.count), 1); return <article className="card metric-card"><div className="card-header"><div><p className="section-kicker">{kicker}</p><h2>{title}</h2></div></div>{items.length ? <ul className="metric-list metric-bars">{items.map((item) => <li key={item.label}><div><span>{item.label}</span><div className="metric-bar"><i style={{ width: `${Math.round((item.count / max) * 100)}%` }} /></div></div><strong>{item.count}</strong></li>)}</ul> : <p className="muted">{empty}</p>}</article>; }

function SettingsPage({ data, commit, updatePreferences, onStartTutorial }) {
  const [profile, setProfile] = useState(data.profile);
  const [status, setStatus] = useState({ text: '', error: false });
  const [confirm, setConfirm] = useState(null);
  const fileRef = useRef(null);
  useEffect(() => setProfile(data.profile), [data.profile]);
  const saveProfile = (event) => { event.preventDefault(); const validation = validateProfileInput(profile); if (validation) { setStatus({ text: validation.message, error: true }); return; } commit((current) => ({ ...current, profile: { ...current.profile, name: profile.name.trim(), role: profile.role, goal: profile.goal.trim(), tagline: profile.tagline.trim() || DEFAULT_PROFILE.tagline }, onboarding: { ...current.onboarding, profileCompleted: true } })); setStatus({ text: 'Profil tersimpan.', error: false }); };
  const exportData = () => { const blob = new Blob([JSON.stringify(createBackup(data), null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'taskflow-backup.json'; anchor.click(); URL.revokeObjectURL(url); setStatus({ text: 'Backup berhasil dibuat.', error: false }); };
  const importData = async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const parsed = parseBackupPayload(JSON.parse(await file.text())); setConfirm({ type: 'import', data: parsed, title: 'Pulihkan backup ini?', message: `Backup berisi ${parsed.tasks.length} tugas dan akan menggantikan data lokal saat ini.` }); } catch (error) { setStatus({ text: error.message || 'File JSON tidak bisa dibaca.', error: true }); } event.target.value = ''; };
  const resetAll = () => setConfirm({ type: 'reset', title: 'Hapus semua data?', message: 'Semua tugas, profil, sesi fokus, XP, streak, dan status tutorial di perangkat ini akan dihapus.' });
  const confirmAction = () => { if (confirm?.type === 'import') { commit(() => confirm.data); setStatus({ text: 'Data berhasil dipulihkan.', error: false }); } if (confirm?.type === 'reset') { commit((current) => ({ ...current, tasks: [], sessions: [], activeFocus: null, progress: normalizeProgress({}), profile: { ...DEFAULT_PROFILE }, onboarding: { ...DEFAULT_ONBOARDING }, preferences: current.preferences })); setStatus({ text: 'Workspace direset. Profil perlu diisi lagi.', error: false }); } setConfirm(null); };
  return <section className="settings-layout"><div className="settings-main"><article className="card settings-card"><div className="card-header"><div><p className="section-kicker">Profil</p><h2>Ruang kerja yang terasa milikmu</h2></div><span className="card-icon"><Sparkles size={18} /></span></div><form className="form-stack" onSubmit={saveProfile}><div className="field-group"><label htmlFor="profile-name">Nama panggilan</label><input id="profile-name" className="input" maxLength={40} value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} /></div><div className="field-group"><label htmlFor="profile-role">Peran</label><select id="profile-role" className="input" value={profile.role} onChange={(event) => setProfile((current) => ({ ...current, role: event.target.value }))}><option value="">Pilih peran</option>{PROFILE_ROLES.map((role) => <option key={role} value={role}>{PROFILE_ROLE_LABELS[role]}</option>)}</select></div><div className="field-group"><label htmlFor="profile-goal">Tujuan utama</label><textarea id="profile-goal" className="input" maxLength={120} value={profile.goal} onChange={(event) => setProfile((current) => ({ ...current, goal: event.target.value }))} placeholder="Contoh: Menyelesaikan proyek akhir dengan lebih teratur" /></div><div className="field-group"><label htmlFor="profile-tagline">Tagline <span className="label-hint">opsional</span></label><input id="profile-tagline" className="input" maxLength={80} value={profile.tagline} onChange={(event) => setProfile((current) => ({ ...current, tagline: event.target.value }))} placeholder="Pelan-pelan tapi selesai" /></div><div className="action-row"><button className="btn btn-primary" type="submit"><Check size={16} />Simpan profil</button>{status.text && <span className={status.error ? 'form-status form-status-error' : 'form-status'} role="status">{status.text}</span>}</div></form></article><article className="card settings-card"><div className="card-header"><div><p className="section-kicker">Fokus dan motion</p><h2>Atur rasa interaksinya</h2></div><span className="card-icon"><Zap size={18} /></span></div><div className="settings-options"><label className="setting-row"><span><strong>Motion</strong><small>Kurangi gerak jika kamu ingin layar lebih tenang.</small></span><select className="input setting-select" value={data.preferences.motion} onChange={(event) => updatePreferences({ motion: event.target.value })}><option value="full">Penuh</option><option value="compact">Ringkas</option><option value="system">Ikuti perangkat</option></select></label><label className="setting-row"><span><strong>Preset Focus Run</strong><small>Durasi awal untuk tombol mulai di Beranda.</small></span><select className="input setting-select" value={data.preferences.focusPreset} onChange={(event) => updatePreferences({ focusPreset: Number(event.target.value) })}><option value="25">25 menit</option><option value="50">50 menit</option></select></label></div></article><article className="card settings-card"><div className="card-header"><div><p className="section-kicker">Bantuan</p><h2>Kenali TaskFlow lagi</h2></div><span className="card-icon"><CircleHelp size={18} /></span></div><p className="muted">Jalankan kembali tutorial visual tanpa mengubah data tugasmu.</p><button className="btn btn-secondary" type="button" onClick={onStartTutorial}><CircleHelp size={16} />Mulai tutorial lagi</button></article><article className="card settings-card"><div className="card-header"><div><p className="section-kicker">Backup dan pemulihan</p><h2>Data tetap di perangkat ini</h2></div><span className="card-icon"><Download size={18} /></span></div><p className="muted">Backup menyimpan tugas, profil, XP, sesi fokus, dan preferensi dalam satu file JSON.</p><div className="action-row"><button className="btn btn-secondary" type="button" onClick={exportData}><Download size={16} />Export JSON</button><button className="btn btn-secondary" type="button" onClick={() => fileRef.current?.click()}><Upload size={16} />Import JSON</button><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importData} /></div></article><article className="card danger-card"><div className="card-header"><div><p className="section-kicker danger-text">Zona berbahaya</p><h2>Mulai ulang ruang kerja</h2></div><span className="card-icon card-icon-danger"><Trash2 size={18} /></span></div><p className="muted">Tindakan ini menghapus semua tugas, progres, profil, dan status tutorial lokal. Backup dulu jika datanya masih dibutuhkan.</p><button className="btn btn-danger" type="button" onClick={resetAll}><Trash2 size={16} />Hapus semua data</button></article></div><aside className="settings-aside"><div className="settings-profile"><span className="profile-orbit"><span>{(data.profile.name || 'V').slice(0, 1).toUpperCase()}</span></span><p className="eyebrow">Level {data.progress.level}</p><h2>{data.profile.name || 'Pengguna baru'}</h2><p>{data.profile.goal || data.profile.tagline}</p><div className="aside-stats"><span><strong>{data.progress.totalXp}</strong> XP</span><span><strong>{data.progress.currentStreak}</strong> hari streak</span></div></div><div className="help-note"><CircleHelp size={18} /><div><strong>Ruang yang tenang</strong><p>TaskFlow menyimpan data secara lokal dan tidak membutuhkan koneksi untuk dipakai.</p></div></div></aside><ConfirmDialog open={Boolean(confirm)} title={confirm?.title} message={confirm?.message} confirmLabel={confirm?.type === 'import' ? 'Pulihkan data' : 'Hapus semua'} danger={confirm?.type === 'reset'} onClose={() => setConfirm(null)} onConfirm={confirmAction} /></section>;
}
