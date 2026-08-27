import { motion } from 'motion/react';
import { Archive, CalendarClock, Check, Clock3, Copy, MoreHorizontal, Paperclip, Pencil, Pin, Play, Trash2, Zap } from 'lucide-react';
import { getDueInfo, getSubtaskProgress, getTaskLabel, getTaskXp } from '../lib/domain.js';
import { TASK_TYPE_LABELS } from '../lib/storage.js';
import { CourseDot } from './ui.jsx';

export function TaskRow({ task, courses = [], onToggle, onEdit, onDelete, onPin, onArchive, onDuplicate, compact = false }) {
  const due = getDueInfo(task);
  const sub = getSubtaskProgress(task);
  const label = getTaskLabel(task, courses);
  const course = courses.find((item) => item.id === task.courseId);
  return (
    <motion.li className={`task-row ${task.completed ? 'is-completed' : ''} ${task.pinned ? 'is-pinned' : ''} ${task.archived ? 'is-archived' : ''}`} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
      <label className="task-check" title={task.completed ? 'Buka kembali tugas' : 'Tandai selesai'}>
        <input type="checkbox" checked={task.completed} onChange={() => onToggle(task.id)} aria-label={`${task.completed ? 'Buka kembali' : 'Tandai selesai'}: ${task.text}`} />
        <span aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
      </label>
      <div className="task-details">
        <div className="task-title-line">
          {task.pinned && <Pin size={13} className="pin-mark" aria-label="Disematkan" />}
          <span className="task-text">{task.text}</span>
          <span className={`type-badge type-${task.type}`}>{TASK_TYPE_LABELS[task.type] || 'Tugas'}</span>
          <span className={`priority-badge priority-${task.priority}`}>{task.priority === 'high' ? 'Tinggi' : task.priority === 'medium' ? 'Sedang' : 'Rendah'}</span>
        </div>
        <div className="task-meta">
          <span className={`task-due task-due-${due.tone}`}><CalendarClock size={13} aria-hidden="true" />{due.label}</span>
          {label && <span className="category-badge">{course && <CourseDot color={course.color} />}{label}</span>}
          {task.meetingNumber && (
            <span className="category-badge meeting-tag-badge" title={`Pertemuan / Milestone ${task.meetingNumber}`}>
              {task.meetingNumber === 8 ? 'UTS' : task.meetingNumber === 16 ? 'UAS' : `P${task.meetingNumber}`}
            </span>
          )}
          <span className="task-estimate"><Clock3 size={12} aria-hidden="true" />{task.estimateMinutes} m fokus</span>
          {sub.total > 0 && <span className="task-subtasks">{sub.done}/{sub.total} langkah</span>}
          {task.url && <span className="task-link"><Paperclip size={12} />tautan</span>}
          {task.recurrence !== 'none' && <span className="task-repeat">{task.recurrence === 'daily' ? 'Harian' : 'Mingguan'}</span>}
          <span className="task-reward"><Zap size={12} aria-hidden="true" />+{getTaskXp(task)} XP</span>
        </div>
        {sub.total > 0 && <div className="subtask-meter" aria-hidden="true"><span style={{ width: `${Math.round(sub.ratio * 100)}%` }} /></div>}
      </div>
      {!compact && <div className="task-actions">
        <a className="icon-button" href={`focus.html?intent=start&taskId=${task.id}`} aria-label={`Mulai fokus: ${task.text}`} title="Mulai Focus Run"><Play size={16} fill="currentColor" /></a>
        <button className="icon-button" type="button" onClick={() => onEdit(task)} aria-label={`Edit tugas: ${task.text}`} title="Edit tugas"><Pencil size={16} /></button>
        <details className="task-more">
          <summary className="icon-button" aria-label={`Lainnya: ${task.text}`} title="Lainnya"><MoreHorizontal size={16} /></summary>
          <div className="task-more-menu">
            {onPin && <button type="button" onClick={() => onPin(task)}><Pin size={14} />{task.pinned ? 'Lepas sematan' : 'Sematkan'}</button>}
            {onDuplicate && <button type="button" onClick={() => onDuplicate(task)}><Copy size={14} />Duplikat</button>}
            {onArchive && <button type="button" onClick={() => onArchive(task)}><Archive size={14} />{task.archived ? 'Keluarkan arsip' : 'Arsipkan'}</button>}
            {onDelete && <button type="button" onClick={() => onDelete(task)}><Trash2 size={14} />Hapus</button>}
          </div>
        </details>
      </div>}
    </motion.li>
  );
}
