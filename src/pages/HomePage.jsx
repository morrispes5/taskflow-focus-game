import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, CalendarClock, CirclePlay, Clock3, Flame, ListChecks, Sparkles, Zap } from 'lucide-react';
import { playHeroSequence } from '../motion/anime.js';
import { applySnooze, applyTaskSave, formatDate, getCountdownLabel, getSnoozeDate, getCourseProgress, getDashboardStats, getDueInfo, getTaskFocusMinutes, getTaskXp, getTodayAgenda, getUpcomingDeadlines, selectDailyMission, selectReviewTask, sortTasks } from '../lib/domain.js';
import { CourseDot, Illustration, PageActions, ProgressMeter, StatCard } from '../components/ui.jsx';
import { TaskDialog } from '../components/TaskDialog.jsx';
import { MissionCard } from '../components/home/MissionCard.jsx';
import { ProgressCard } from '../components/home/ProgressCard.jsx';
import { HomeLower } from '../components/home/HomeLower.jsx';
import { RecommendationPanel } from '../components/home/RecommendationPanel.jsx';


export function HomePage({ data, commit, toggleTask }) {
  const [dialogTask, setDialogTask] = useState(null);
  const heroRef = useRef(null);
  const reduced = data.preferences.motion === 'compact';
  const stats = getDashboardStats(data.tasks, data.progress, data.sessions);
  const mission = selectDailyMission(data.tasks);
  const reviewTask = selectReviewTask(data.tasks);
  const focusTarget = mission || reviewTask;
  const isReviewTarget = !mission && Boolean(reviewTask);
  const focusTargetHref = focusTarget ? `focus.html?intent=${isReviewTarget ? 'review' : 'start'}&taskId=${focusTarget.id}` : null;
  const focusTasks = sortTasks(data.tasks.filter((task) => !task.completed && !task.archived), 'dueSoon').slice(0, 5);
  const upcoming = getUpcomingDeadlines(data.tasks);
  const agenda = getTodayAgenda(data.tasks, data.courses);
  const courseProgress = getCourseProgress(data.courses, data.tasks).filter((item) => item.total);
  const saveTask = (input, id) => commit((current) => applyTaskSave(current, input, id), id ? 'Tugas diperbarui.' : 'Tugas ditambahkan.', id ? null : 'taskAdded');
  const snoozeTask = (task, target) => commit((current) => applySnooze(current, task.id, target), `Deadline dipindah ke ${formatDate(getSnoozeDate(target))}.`);
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
          {focusTarget ? <a className="btn btn-primary" data-hero-item href={focusTargetHref}><CirclePlay size={17} fill="currentColor" />{isReviewTarget ? 'Tinjau tugas terakhir' : 'Mulai misi berikutnya'}</a> : <button className="btn btn-primary" data-hero-item type="button" onClick={() => setDialogTask({})}><Sparkles size={17} />Buat misi pertama</button>}
          <a className="btn btn-secondary" data-hero-item data-tour="tasks" href="tasks.html"><ListChecks size={16} />Lihat task board</a>
        </PageActions>
        <div className="home-loop" data-hero-item aria-label="Alur TaskFlow"><span><strong>01</strong>Pilih misi</span><span><strong>02</strong>Jalankan fokus</span><span><strong>03</strong>Baca progres</span></div>
      </div>
      {focusTarget ? <motion.a className="home-hero-preview home-hero-preview-link" data-hero-item href={focusTargetHref} aria-label={`${isReviewTarget ? 'Buka review tugas' : 'Mulai Focus Run'}: ${focusTarget.text}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.12 }}>
        <div className="preview-topline"><span className="eyebrow">{isReviewTarget ? 'Review tugas' : 'Focus Run'}</span><span className="quiet-status"><span className="status-dot" />{isReviewTarget ? 'Tugas sudah selesai' : 'Siap dimulai'}</span></div>
        <p className="preview-label">{isReviewTarget ? 'Tugas terakhir yang bisa kamu tinjau' : 'Misi yang sedang kamu pilih'}</p>
        <h2>{focusTarget.text}</h2>
        <div className="preview-meta"><span>{isReviewTarget ? 'Review opsional' : getDueInfo(focusTarget).label}</span>{focusTarget.category && <span>{focusTarget.category}</span>}</div>
        <div className="preview-focus-row"><div className="preview-timer"><strong>{getTaskFocusMinutes(focusTarget, data.preferences.focusPreset)}:00</strong><span>{isReviewTarget ? 'timer review opsional' : 'durasi awal'}</span></div><Illustration type="focus-run" alt={isReviewTarget ? 'Ilustrasi review tugas' : 'Ilustrasi Focus Run'} className="preview-illustration" loading="eager" /></div>
        <div className="preview-footer"><span><Zap size={14} />{isReviewTarget ? 'Tinjau tanpa mengubah XP' : `+${getTaskXp(focusTarget)} XP saat selesai`}</span><span className="preview-arrow"><ArrowRight size={16} /></span></div>
      </motion.a> : <motion.button className="home-hero-preview home-hero-preview-button" data-hero-item type="button" onClick={() => setDialogTask({})} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.12 }}>
        <div className="preview-topline"><span className="eyebrow">Focus Run</span><span className="quiet-status"><span className="status-dot" />Siap diisi</span></div>
        <p className="preview-label">Misi yang sedang kamu pilih</p>
        <h2>Ruang fokusmu siap diisi.</h2>
        <div className="preview-meta"><span>Tambahkan tugas</span></div>
        <div className="preview-focus-row"><div className="preview-timer"><strong>{data.preferences.focusPreset}:00</strong><span>durasi awal</span></div><Illustration type="focus-run" alt="Ilustrasi Focus Run" className="preview-illustration" loading="eager" /></div>
        <div className="preview-footer"><span><Zap size={14} />Buat misi pertama</span><span className="preview-arrow"><ArrowRight size={16} /></span></div>
      </motion.button>}
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
            {agenda.overdue.map((item) => (
              <li key={`o-${item.id}`} className="agenda-overdue">
                <span>Terlambat</span>
                <strong>{item.title}</strong>
                <button className="text-link" type="button" onClick={() => snoozeTask(item.task, 'tomorrow')}>Tunda ke besok</button>
              </li>
            ))}
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
    <section className="stats-grid" aria-label="Ringkasan progres">
      <StatCard label="Tugas aktif" value={stats.active} hint={`${stats.total} total tugas`} icon={ListChecks} accent="stat-accent-cobalt" />
      <StatCard label="Jatuh tempo hari ini" value={stats.dueToday} hint="Yang perlu dilihat" icon={CalendarClock} />
      <StatCard label="Menit fokus" value={stats.focusMinutes} hint="Sesi selesai" icon={Clock3} />
      <StatCard label="Streak" value={`${stats.streak} hari`} hint={stats.streakBroken ? `Streak putus · terbaik ${stats.bestStreak} hari` : `${stats.xp} XP terkumpul`} icon={Flame} accent="stat-accent-mint" />
    </section>
    <section className="home-grid">
      <MissionCard mission={mission} reviewTask={reviewTask} isReviewTarget={isReviewTarget} focusTargetHref={focusTargetHref} onCreateTask={() => setDialogTask({})} />
      <ProgressCard progress={data.progress} />
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
    <HomeLower tasks={focusTasks} courses={data.courses} role={data.profile.role} stats={stats} completedFocusSessions={data.sessions.filter((session) => session.status === 'completed' && session.mode !== 'review').length} onToggle={toggleTask} onEdit={setDialogTask} onCreateTask={() => setDialogTask({})} />
    <TaskDialog open={dialogTask !== null} task={dialogTask?.id ? dialogTask : null} courses={data.courses} semester={data.semester} role={data.profile.role} onClose={() => setDialogTask(null)} onSave={saveTask} />
  </>;
}
