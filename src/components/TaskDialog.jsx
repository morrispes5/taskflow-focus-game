import { useEffect, useRef, useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { getSemesterWeek, validateTaskInput } from '../lib/domain.js';
import { ESTIMATE_OPTIONS, RECURRENCE_LABELS, RECURRENCE_OPTIONS, REMINDER_OFFSETS, TASK_TYPE_LABELS, TASK_TYPES } from '../lib/storage.js';
import { Modal } from './ui.jsx';

const emptyForm = {
  text: '', dueDate: '', dueTime: '', priority: 'medium', category: '', estimateMinutes: 25,
  courseId: '', type: 'tugas', notes: '', url: '', recurrence: 'none', reminderOffsetHours: '', subtasks: []
};

export function TaskDialog({ open, task, courses = [], semester, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [subtaskDraft, setSubtaskDraft] = useState('');
  const inputRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    setForm({
      text: task?.text || '',
      dueDate: task?.dueDate || '',
      dueTime: task?.dueTime || '',
      priority: task?.priority || 'medium',
      category: task?.category || '',
      estimateMinutes: task?.estimateMinutes || 25,
      courseId: task?.courseId || '',
      type: task?.type || 'tugas',
      notes: task?.notes || '',
      url: task?.url || '',
      recurrence: task?.recurrence || 'none',
      reminderOffsetHours: task?.reminderOffsetHours ?? '',
      subtasks: task?.subtasks ? task.subtasks.map((item) => ({ ...item })) : []
    });
    setSubtaskDraft('');
    setError(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open, task]);
  const setField = (field, value) => { setForm((current) => ({ ...current, [field]: value })); if (error?.field === field) setError(null); };
  const addSubtask = () => {
    const text = subtaskDraft.trim();
    if (!text) return;
    setForm((current) => ({ ...current, subtasks: [...current.subtasks, { id: Date.now(), text, completed: false }] }));
    setSubtaskDraft('');
  };
  const submit = (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      courseId: form.courseId ? Number(form.courseId) : null,
      reminderOffsetHours: form.reminderOffsetHours === '' ? null : Number(form.reminderOffsetHours)
    };
    const validation = validateTaskInput(payload);
    if (validation) { setError(validation); return; }
    onSave(payload, task?.id);
    onClose();
  };
  return <Modal open={open} onClose={onClose} title={task ? 'Edit tugas' : 'Tambah tugas'} eyebrow="Atur misi">
    <form className="form-stack" onSubmit={submit}>
      <div className="field-group"><label htmlFor="task-title">Judul tugas <span aria-hidden="true">*</span></label><input ref={inputRef} id="task-title" className="input" value={form.text} onChange={(event) => setField('text', event.target.value)} maxLength={120} aria-invalid={error?.field === 'text'} aria-describedby="task-title-error" autoComplete="off" /><p id="task-title-error" className="field-error" role="alert">{error?.field === 'text' ? error.message : ''}</p></div>
      <div className="form-grid-two">
        <div className="field-group"><label htmlFor="task-type">Jenis</label><select id="task-type" className="input" value={form.type} onChange={(event) => setField('type', event.target.value)}>{TASK_TYPES.map((type) => <option key={type} value={type}>{TASK_TYPE_LABELS[type]}</option>)}</select></div>
        <div className="field-group"><label htmlFor="task-course">Mata kuliah</label><select id="task-course" className="input" value={form.courseId} onChange={(event) => setField('courseId', event.target.value)}><option value="">Tanpa mata kuliah</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.code ? `${course.code} · ` : ''}{course.name}</option>)}</select></div>
      </div>
      <div className="form-grid-two">
        <div className="field-group"><label htmlFor="task-due">Deadline <span className="label-hint">opsional</span></label><input id="task-due" className="input" type="date" value={form.dueDate} onChange={(event) => setField('dueDate', event.target.value)} aria-invalid={error?.field === 'dueDate'} />{getSemesterWeek(form.dueDate, semester) && <p className="field-hint">Minggu ke-{getSemesterWeek(form.dueDate, semester)}</p>}<p className="field-error">{error?.field === 'dueDate' ? error.message : ''}</p></div>
        <div className="field-group"><label htmlFor="task-time">Jam</label><input id="task-time" className="input" type="time" value={form.dueTime} onChange={(event) => setField('dueTime', event.target.value)} aria-invalid={error?.field === 'dueTime'} /><p className="field-error">{error?.field === 'dueTime' ? error.message : ''}</p></div>
      </div>
      <div className="form-grid-two">
        <div className="field-group"><label htmlFor="task-priority">Prioritas</label><select id="task-priority" className="input" value={form.priority} onChange={(event) => setField('priority', event.target.value)}><option value="high">Tinggi</option><option value="medium">Sedang</option><option value="low">Rendah</option></select></div>
        <div className="field-group"><label htmlFor="task-estimate">Estimasi fokus</label><select id="task-estimate" className="input" value={form.estimateMinutes} onChange={(event) => setField('estimateMinutes', Number(event.target.value))}>{ESTIMATE_OPTIONS.map((minutes) => <option key={minutes} value={minutes}>{minutes} menit</option>)}</select></div>
      </div>
      <div className="form-grid-two">
        <div className="field-group"><label htmlFor="task-repeat">Pengulangan</label><select id="task-repeat" className="input" value={form.recurrence} onChange={(event) => setField('recurrence', event.target.value)}>{RECURRENCE_OPTIONS.map((option) => <option key={option} value={option}>{RECURRENCE_LABELS[option]}</option>)}</select></div>
        <div className="field-group"><label htmlFor="task-remind">Pengingat</label><select id="task-remind" className="input" value={form.reminderOffsetHours} onChange={(event) => setField('reminderOffsetHours', event.target.value)}><option value="">Tidak diingatkan</option>{REMINDER_OFFSETS.map((hours) => <option key={hours} value={hours}>{hours === 0 ? 'Saat deadline' : hours < 24 ? `${hours} jam sebelumnya` : `${hours / 24} hari sebelumnya`}</option>)}</select></div>
      </div>
      {!form.courseId && <div className="field-group"><label htmlFor="task-category">Kategori <span className="label-hint">opsional</span></label><input id="task-category" className="input" value={form.category} onChange={(event) => setField('category', event.target.value)} maxLength={32} placeholder="Contoh: Organisasi" /><p className="field-error" role="alert">{error?.field === 'category' ? error.message : ''}</p></div>}
      <div className="field-group"><label htmlFor="task-url">Link tugas / Drive <span className="label-hint">opsional</span></label><input id="task-url" className="input" value={form.url} onChange={(event) => setField('url', event.target.value)} placeholder="https://" aria-invalid={error?.field === 'url'} /><p className="field-error">{error?.field === 'url' ? error.message : ''}</p></div>
      <div className="field-group"><label htmlFor="task-notes">Catatan</label><textarea id="task-notes" className="input" rows={3} value={form.notes} onChange={(event) => setField('notes', event.target.value)} maxLength={2000} placeholder="Instruksi, bab, atau rubrik singkat" /></div>
      <div className="field-group">
        <label htmlFor="task-subtask">Subtask / langkah</label>
        <div className="subtask-editor">
          {form.subtasks.map((item, index) => (
            <label key={item.id || index} className="subtask-line">
              <input type="checkbox" checked={item.completed} onChange={() => setForm((current) => ({ ...current, subtasks: current.subtasks.map((entry, entryIndex) => entryIndex === index ? { ...entry, completed: !entry.completed } : entry) }))} />
              <input className="input" value={item.text} onChange={(event) => setForm((current) => ({ ...current, subtasks: current.subtasks.map((entry, entryIndex) => entryIndex === index ? { ...entry, text: event.target.value } : entry) }))} />
              <button className="icon-button" type="button" onClick={() => setForm((current) => ({ ...current, subtasks: current.subtasks.filter((_, entryIndex) => entryIndex !== index) }))} aria-label="Hapus subtask"><Trash2 size={14} /></button>
            </label>
          ))}
          <div className="subtask-add">
            <input id="task-subtask" className="input" value={subtaskDraft} onChange={(event) => setSubtaskDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addSubtask(); } }} placeholder="Tambah langkah kecil" maxLength={120} />
            <button className="btn btn-secondary" type="button" onClick={addSubtask}><Plus size={15} />Tambah</button>
          </div>
        </div>
      </div>
      <div className="dialog-footer"><button className="btn btn-secondary" type="button" onClick={onClose}>Batal</button><button className="btn btn-primary" type="submit"><Check size={16} />Simpan tugas</button></div>
    </form>
  </Modal>;
}
