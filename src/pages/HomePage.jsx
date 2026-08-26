import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, CalendarClock, Check, CirclePlay, Clock3, Flame, Gauge, ListChecks, Sparkles, Trophy, Zap } from 'lucide-react';
import { playHeroSequence } from '../motion/anime.js';
import { getCountdownLabel, getCourseProgress, getDashboardStats, getDueInfo, getNextLevelXp, getProfileRecommendations, getTaskXp, getTodayAgenda, getUpcomingDeadlines, makeTask, selectDailyMission, sortTasks } from '../lib/domain.js';
import { CourseDot, EmptyState, Illustration, PageActions, ProgressMeter, StatCard } from '../components/ui.jsx';
import { TaskRow } from '../components/TaskRow.jsx';
import { TaskDialog } from '../components/TaskDialog.jsx';

function RecommendationPanel({ data, commit, onCreateTask }) {
  const recommendationSource = useMemo(() => getProfileRecommendations(data.profile).filter((item) => !data.tasks.some((task) => task.text.toLowerCase() === item.text.toLowerCase())), [data.profile.role, data.profile.goal, data.tasks]);
  const recommendationKey = recommendationSource.map((item) => item.id).join('|');
  const [drafts, setDrafts] = useState(recommendationSource);
  const [selectedIds, setSelectedIds] = useState(recommendationSource.map((item) => item.id));
  const [status, setStatus] = useState('');
  useEffect(() => { setDrafts(recommendationSource); setSelectedIds(recommendationSource.map((item) => item.id)); }, [recommendationKey]);
  if (!recommendationSource.length) return null;
  const toggle = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const updateDraft = (id, text) => setDrafts((current) => current.map((item) => item.id === id ? { ...item, text } : item));
  const addSelected = () => {
    const selected = drafts.filter((item) => selectedIds.includes(item.id) && item.text.trim());
    if (!selected.length) { setStatus('Pilih setidaknya satu langkah yang ingin ditambahkan.'); return; }
    const stamp = Date.now();
    commit((current) => ({ ...current, tasks: [...selected.map((item, index) => makeTask({ text: item.text.trim(), priority: 'medium', category: item.category, estimateMinutes: 25, type: item.type || 'tugas' }, stamp + index)), ...current.tasks] }), `${selected.length} rekomendasi ditambahkan.`);
    setStatus('Langkah pilihanmu sudah masuk ke Tugas.');
  };
  return <section className="recommendation-panel card" data-tour="recommendations"><div className="recommendation-header"><div><p className="section-kicker">Dari tujuanmu</p><h2>Mulai dengan langkah yang terasa masuk akal.</h2><p className="muted">Saran ini dibuat lokal dari tujuan “{data.profile.goal}”. Edit atau pilih yang paling cocok.</p></div><span className="card-icon"><Sparkles size={18} /></span></div><div className="recommendation-list">{drafts.map((item) => <label className="recommendation-item" key={item.id}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggle(item.id)} /><span className="recommendation-check" aria-hidden="true"><Check size={13} /></span><input className="input" value={item.text} onChange={(event) => updateDraft(item.id, event.target.value)} aria-label={`Edit rekomendasi: ${item.text}`} /><span className="category-badge">{item.category}</span></label>)}</div><div className="recommendation-footer"><button className="text-link" type="button" onClick={onCreateTask}>Buat tugas sendiri <ArrowRight size={15} /></button><div className="recommendation-actions"><span className="form-status" role="status">{status}</span><button className="btn btn-primary" type="button" onClick={addSelected}><ListChecks size={16} />Tambahkan pilihan</button></div></div></section>;
}

export function HomePage({ data, commit, toggleTask }) {
  const [dialogTask, setDialogTask] = useState(null);
  const heroRef = useRef(null);
  const reduced = data.preferences.motion === 'compact';
  const stats = getDashboardStats(data.tasks, data.progress, data.sessions);
  const mission = selectDailyMission(data.tasks);
  const focusTasks = sortTasks(data.tasks.filter((task) => !task.completed && !task.archived), 'dueSoon').slice(0, 5);
  const levelProgress = data.progress.totalXp % 100;
  const upcoming = getUpcomingDeadlines(data.tasks);
  const agenda = getTodayAgenda(data.tasks, data.courses);
  const courseProgress = getCourseProgress(data.courses, data.tasks).filter((item) => item.total);
  const saveTask = (input, id) => commit((current) => id ? ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, ...input, category: input.category?.trim() || null, dueDate: input.dueDate || null, dueTime: input.dueTime || null, estimateMinutes: Number(input.estimateMinutes) || 25, courseId: input.courseId || null, updatedAt: Date.now() } : task) }) : ({ ...current, tasks: [makeTask(input), ...current.tasks] }), id ? 'Tugas diperbarui.' : 'Tugas ditambahkan.', id ? null : 'taskAdded');
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
          {mission ? <a className="btn btn-primary" data-hero-item href={`focus.html?intent=start&taskId=${mission.id}`}><CirclePlay size={17} fill="currentColor" />Mulai misi berikutnya</a> : <button className="btn btn-primary" data-hero-item type="button" onClick={() => setDialogTask({})}><Sparkles size={17} />Buat misi pertama</button>}
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
    {!data.courses.length && !data.onboarding.coursesIntroDismissed && (
      <section className="course-intro card" data-tour="courses">
        <div><p className="section-kicker">Semester ini</p><h2>Daftarkan mata kuliah supaya tugas tidak bercampur.</h2><p className="muted">Opsional, tapi ini yang membuat kalender, filter, dan analitik terasa milik mahasiswa.</p></div>
        <div className="page-actions">
          <a className="btn btn-primary" href="settings.html#courses">Tambah mata kuliah</a>
          <button className="btn btn-ghost" type="button" onClick={() => commit((current) => ({ ...current, onboarding: { ...current.onboarding, coursesIntroDismissed: true } }))}>Nanti saja</button>
        </div>
      </section>
    )}
    <section className="home-academic">
      <article className="card home-agenda">
        <div className="card-header"><div><p className="section-kicker">Hari ini</p><h2>Agenda</h2></div><a className="text-link" href="calendar.html">Kalender <ArrowRight size={15} /></a></div>
        {agenda.classes.length + agenda.due.length + agenda.overdue.length ? (
          <ul className="agenda-list">
            {agenda.overdue.map((item) => <li key={`o-${item.id}`} className="agenda-overdue"><span>Terlambat</span><strong>{item.title}</strong></li>)}
            {agenda.classes.map((item) => <li key={item.id}><CourseDot color={item.color} /><span>{item.time}</span><strong>{item.title}</strong>{item.room && <em>{item.room}</em>}</li>)}
            {agenda.due.map((item) => <li key={`t-${item.id}`}><span>{item.time}</span><strong>{item.title}</strong></li>)}
          </ul>
        ) : <p className="muted">Tidak ada kuliah atau deadline hari ini. Buka misi berikutnya dari daftar di bawah.</p>}
      </article>
      <article className="card home-countdown">
        <div className="card-header"><div><p className="section-kicker">Mendekat</p><h2>Countdown</h2></div><CalendarClock size={18} className="muted" /></div>
        {upcoming.length ? <ul className="countdown-list">{upcoming.map((task) => <li key={task.id}><strong>{task.text}</strong><span>{getCountdownLabel(task)}</span></li>)}</ul> : <p className="muted">Belum ada deadline yang menunggu.</p>}
      </article>
    </section>
    <RecommendationPanel data={data} commit={commit} onCreateTask={() => setDialogTask({})} />
    <section className="stats-grid" aria-label="Ringkasan progres"><StatCard label="Tugas aktif" value={stats.active} hint={`${stats.total} total tugas`} icon={ListChecks} accent="stat-accent-cobalt" /><StatCard label="Jatuh tempo hari ini" value={stats.dueToday} hint="Yang perlu dilihat" icon={CalendarClock} /><StatCard label="Menit fokus" value={stats.focusMinutes} hint="Sesi selesai" icon={Clock3} /><StatCard label="Streak" value={`${stats.streak} hari`} hint={`${stats.xp} XP terkumpul`} icon={Flame} accent="stat-accent-mint" /></section>
    <section className="home-grid">
       <motion.article className={`mission-card ${mission ? '' : 'mission-card-empty'}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36 }}>
        <div className="mission-copy"><div className="card-topline"><span className="eyebrow">Focus Run</span><span className="quiet-status"><span className="status-dot" />Siap dimulai</span></div>{mission ? <><h2>{mission.text}</h2><div className="mission-meta"><span className={`priority-badge priority-${mission.priority}`}>{mission.priority === 'high' ? 'Prioritas tinggi' : mission.priority === 'medium' ? 'Prioritas sedang' : 'Prioritas rendah'}</span><span>{getDueInfo(mission).label}</span>{mission.category && <span>{mission.category}</span>}</div><a className="btn btn-dark" href={`focus.html?intent=start&taskId=${mission.id}`}><CirclePlay size={18} fill="currentColor" />Mulai Focus Run<ArrowRight size={16} /></a></> : <><h2>Belum ada misi yang menunggu.</h2><p className="muted">Tambahkan tugas, lalu biarkan TaskFlow membantumu memilih langkah berikutnya.</p><button className="btn btn-dark" type="button" onClick={() => setDialogTask({})}>Buat misi pertama <ArrowRight size={16} /></button></>}</div><Illustration type="focus-run" alt="Ilustrasi sesi fokus" className="mission-illustration" />
      </motion.article>
      <motion.aside className="progress-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, delay: 0.06 }}><div className="card-topline"><span className="section-kicker">Perjalanan level</span><span className="level-label"><Zap size={14} />Lv {data.progress.level}</span></div><div className="level-number">{data.progress.totalXp}<small>/ {getNextLevelXp(data.progress.totalXp)} XP</small></div><ProgressMeter value={levelProgress} label="Menuju level berikutnya" /><div className="progress-foot"><span><Trophy size={15} />{data.progress.milestones.length} milestone</span><span><Flame size={15} />{data.progress.bestStreak} best streak</span></div></motion.aside>
    </section>
    {courseProgress.length > 0 && (
      <section className="course-progress-grid">
        {courseProgress.map(({ course, total, completed, active }) => (
          <article className="card course-progress-card" key={course.id}>
            <div className="card-topline"><span className="category-badge"><CourseDot color={course.color} />{course.name}</span><strong>{completed}/{total}</strong></div>
            <ProgressMeter value={completed} max={total || 1} label={`${active} masih aktif`} tone="cobalt" />
          </article>
        ))}
      </section>
    )}
    <section className="section-heading-row"><div><p className="section-kicker">Hari ini</p><h2>Daftar yang layak mendapat perhatian</h2></div><a className="text-link" href="tasks.html">Lihat semua <ArrowRight size={15} /></a></section>
    <section className="content-grid home-lower"><article className="card task-card"><div className="card-header"><div><h3>Quest aktif</h3><p className="muted">Maksimal lima misi agar fokus tetap tajam.</p></div><span className="counter-badge"><strong>{focusTasks.length}</strong> terlihat</span></div>{focusTasks.length ? <ul className="task-list"><AnimatePresence>{focusTasks.map((task) => <TaskRow key={task.id} task={task} courses={data.courses} onToggle={toggleTask} onEdit={setDialogTask} compact />)}</AnimatePresence></ul> : <EmptyState title="Semua misi selesai" message="Momentum bagus. Tambah satu misi baru atau istirahat sebentar." action="Tambah tugas" onAction={() => setDialogTask({})} />}</article><article className="card summary-card"><div className="card-header"><div><p className="section-kicker">Ringkasan hari</p><h3>Progres yang terlihat</h3></div><Gauge size={20} className="muted" /></div><div className="summary-big"><strong>{stats.completedWeek}</strong><span>tugas selesai minggu ini</span></div><div className="summary-lines"><div><span>Jatuh tempo hari ini</span><strong>{stats.dueToday}</strong></div><div><span>Terlambat</span><strong className={stats.overdue ? 'danger-text' : ''}>{stats.overdue}</strong></div><div><span>Sesi fokus selesai</span><strong>{data.sessions.filter((session) => session.status === 'completed').length}</strong></div></div><a className="text-link" href="analytics.html">Baca perjalananmu <ArrowRight size={15} /></a></article></section>
    <TaskDialog open={dialogTask !== null} task={dialogTask?.id ? dialogTask : null} courses={data.courses} semester={data.semester} onClose={() => setDialogTask(null)} onSave={saveTask} />
  </>;
}
