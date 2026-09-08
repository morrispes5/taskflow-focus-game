import { AnimatePresence } from 'motion/react';
import { ArrowRight, Gauge } from 'lucide-react';
import { EmptyState } from '../ui.jsx';
import { TaskRow } from '../TaskRow.jsx';

function QuestCard({ tasks, courses, role, onToggle, onEdit, onCreateTask }) {
  return (
    <article className="card task-card">
      <div className="card-header">
        <div><h3>Quest aktif</h3><p className="muted">Maksimal lima misi agar fokus tetap tajam.</p></div>
        <span className="counter-badge"><strong>{tasks.length}</strong> terlihat</span>
      </div>
      {tasks.length ? (
        <ul className="task-list">
          <AnimatePresence>
            {tasks.map((task) => <TaskRow key={task.id} task={task} courses={courses} role={role} onToggle={onToggle} onEdit={onEdit} compact />)}
          </AnimatePresence>
        </ul>
      ) : (
        <EmptyState title="Semua misi selesai" message="Momentum bagus. Tambah satu misi baru atau istirahat sebentar." action="Tambah tugas" onAction={onCreateTask} />
      )}
    </article>
  );
}

function SummaryCard({ stats, completedFocusSessions }) {
  return (
    <article className="card summary-card">
      <div className="card-header">
        <div><p className="section-kicker">Ringkasan hari</p><h3>Progres yang terlihat</h3></div>
        <Gauge size={20} className="muted" />
      </div>
      <div className="summary-big"><strong>{stats.completedWeek}</strong><span>tugas selesai minggu ini</span></div>
      <div className="summary-lines">
        <div><span>Jatuh tempo hari ini</span><strong>{stats.dueToday}</strong></div>
        <div><span>Terlambat</span><strong className={stats.overdue ? 'danger-text' : ''}>{stats.overdue}</strong></div>
        <div><span>Sesi fokus selesai</span><strong>{completedFocusSessions}</strong></div>
      </div>
      <a className="text-link" href="analytics.html">Baca perjalananmu <ArrowRight size={15} /></a>
    </article>
  );
}

export function HomeLower({ tasks, courses, role, stats, completedFocusSessions, onToggle, onEdit, onCreateTask }) {
  return (
    <section className="content-grid home-lower">
      <QuestCard tasks={tasks} courses={courses} role={role} onToggle={onToggle} onEdit={onEdit} onCreateTask={onCreateTask} />
      <SummaryCard stats={stats} completedFocusSessions={completedFocusSessions} />
    </section>
  );
}
