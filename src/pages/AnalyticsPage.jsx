import { useState } from 'react';
import { ArrowRight, CalendarClock, Check, CircleHelp, Clock3, EyeOff, Flame, ListChecks } from 'lucide-react';
import { formatDate, getAnalytics, getDisplayStreak, hasSemesterRange } from '../lib/domain.js';
import { EmptyState, ProgressMeter, StatCard } from '../components/ui.jsx';

function MetricList({ title, kicker, items, empty, extra }) {
  const max = Math.max(...items.map((item) => item.count), 1);
  return <article className="card metric-card"><div className="card-header"><div><p className="section-kicker">{kicker}</p><h2>{title}</h2></div></div>{items.length ? <ul className="metric-list metric-bars">{items.map((item) => <li key={item.label}><div><span>{item.label}{typeof extra === 'function' ? extra(item) : ''}</span><div className="metric-bar"><i style={{ width: `${Math.round((item.count / max) * 100)}%` }} /></div></div><strong>{item.count}</strong></li>)}</ul> : <p className="muted">{empty}</p>}</article>;
}

function analyticsNote(analytics) {
  if (analytics.overdue) return `Ada ${analytics.overdue} tugas yang melewati deadline. Pilih satu untuk Focus Run berikutnya.`;
  if (analytics.completed) return 'Ritmemu sedang terbentuk. Pertahankan satu sesi fokus yang realistis setiap kali membuka TaskFlow.';
  return 'Mulai dari satu tugas dan satu sesi. Data akan terbentuk dari kebiasaan nyata, bukan skor buatan.';
}

function semesterRangeLabel(semester) {
  if (!semester) return '';
  const start = semester.startDate ? formatDate(semester.startDate) : 'awal';
  const end = semester.endDate ? formatDate(semester.endDate) : 'sekarang';
  return `${start} – ${end}`;
}

export function AnalyticsPage({ data }) {
  const canFilterSemester = hasSemesterRange(data.semester);
  const [scope, setScope] = useState(canFilterSemester ? 'semester' : 'all');
  const analytics = getAnalytics(data.tasks, data.sessions, data.courses, new Date(), { semester: data.semester, scope: canFilterSemester ? scope : 'all' });
  const hasAnyData = data.tasks.length || data.sessions.length;
  const streak = getDisplayStreak(data.progress);
  const hasScopedData = analytics.completed + analytics.active + analytics.sessionsCompleted > 0;
  return <>
    {canFilterSemester && (
      <section className="toolbar-section analytics-scope">
        <div className="filter-tabs" role="group" aria-label="Filter rentang analitik">
          <button className={`chip ${scope === 'semester' ? 'active' : ''}`} type="button" onClick={() => setScope('semester')}>{data.semester.name || 'Semester ini'}</button>
          <button className={`chip ${scope === 'all' ? 'active' : ''}`} type="button" onClick={() => setScope('all')}>Semua waktu</button>
        </div>
        <p className="muted analytics-scope-hint">{scope === 'semester' ? `Menampilkan tugas dan sesi ${semesterRangeLabel(data.semester)}.` : 'Menampilkan seluruh riwayat di perangkat ini.'}</p>
      </section>
    )}
    {!hasAnyData ? <EmptyState type="empty-task" title="Belum ada data analitik" message="Tambahkan tugas atau jalankan satu Focus Run untuk mulai membaca perjalananmu." action="Buka Tugas" onAction={() => { window.location.href = 'tasks.html'; }} /> : !hasScopedData ? <EmptyState type="empty-task" title="Tidak ada data di semester ini" message="Tidak ada tugas atau sesi fokus yang masuk rentang semester. Ubah filter ke Semua waktu atau perbarui tanggal semester di Pengaturan." action="Lihat semua waktu" onAction={() => setScope('all')} /> : <>
      <section className="stats-grid analytics-stats">
        <StatCard label="Completion rate" value={`${analytics.completionRate}%`} hint={`${analytics.completed} tugas selesai`} icon={Check} accent="stat-accent-mint" />
        <StatCard label="Tugas aktif" value={analytics.active} hint="Belum selesai" icon={ListChecks} />
        <StatCard label="Terlambat" value={analytics.overdue} hint="Perlu perhatian" icon={CalendarClock} accent="stat-accent-coral" />
        <StatCard label="Fokus" value={`${analytics.focusMinutes} m`} hint={`${analytics.sessionsCompleted} sesi selesai`} icon={Clock3} />
        <StatCard label="Distraksi" value={analytics.distractions} hint={`${analytics.distractionMinutes} m di luar fokus`} icon={EyeOff} accent="stat-accent-amber" />
      </section>
      <section className="analytics-layout">
        <article className="card journey-card">
          <div className="card-header">
            <div><p className="section-kicker">Tujuh hari terakhir</p><h2>Perjalanan yang bisa kamu baca</h2></div>
            <span className="analytics-highlight" title={streak.broken ? `Streak putus. Terbaik ${streak.bestStreak} hari.` : undefined}><Flame size={15} />{streak.value} hari</span>
          </div>
          <div className="journey-chart">
            {analytics.days.map((day) => (
              <div className="journey-day" key={day.key}>
                <div className="journey-bar" title={`${day.completed} tugas, ${day.focus} menit fokus`}>
                  <span style={{ height: `${Math.max(8, Math.min(100, day.completed * 25 + day.focus))}%` }} />
                </div>
                <strong>{day.completed + day.focus ? day.completed + day.focus : 0}</strong>
                <small>{day.label}</small>
              </div>
            ))}
          </div>
          <div className="journey-legend">
            <span><i className="legend-dot legend-dot-mint" />Aktivitas selesai</span>
            <span><i className="legend-dot legend-dot-cobalt" />Sesi fokus</span>
          </div>
        </article>
        <article className="card progress-summary">
          <div className="card-header">
            <div><p className="section-kicker">Tepat waktu</p><h2>Deadline yang tertangani</h2></div>
            <span className="big-percent">{analytics.onTimeRate}%</span>
          </div>
          <ProgressMeter value={analytics.onTimeRate} label="Penyelesaian tepat waktu" tone="cobalt" />
          <div className="summary-lines">
            <div><span>Selesai tepat waktu</span><strong>{analytics.onTimeCount}</strong></div>
            <div><span>Memiliki deadline</span><strong>{analytics.withDeadline}</strong></div>
          </div>
        </article>
      </section>
      <section className="analytics-columns">
        <MetricList title="Per mata kuliah" kicker="Semester" items={analytics.courses} empty="Belum ada tugas yang menempel ke mata kuliah." extra={(item) => item.completed != null ? ` · ${item.completed} selesai` : ''} />
        <MetricList title="Jenis tugas" kicker="Tipe" items={analytics.types} empty="Belum ada jenis tugas." />
        <MetricList title="Distribusi kategori" kicker="Konteks" items={analytics.category} empty="Belum ada kategori." />
        <article className="card analytics-note">
          <div className="card-header">
            <div><p className="section-kicker">Baca pelan-pelan</p><h2>Insight dari data nyata</h2></div>
            <CircleHelp size={20} className="muted" />
          </div>
          <p>{analyticsNote(analytics)}</p>
          <a className="btn btn-secondary" href="tasks.html">Buka quest board <ArrowRight size={15} /></a>
        </article>
      </section>
    </>}
  </>;
}
