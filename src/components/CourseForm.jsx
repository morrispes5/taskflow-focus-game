import { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { validateCourseInput } from '../lib/domain.js';
import { COURSE_COLORS, WEEKDAY_LABELS } from '../lib/storage.js';
import { CourseDot } from './ui.jsx';

const emptyCourse = { name: '', code: '', color: COURSE_COLORS[0], lecturer: '', sks: '', schedule: [] };

export function CourseManager({ courses, onSave, onDelete }) {
  const [form, setForm] = useState(emptyCourse);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [slot, setSlot] = useState({ day: 1, start: '08:00', end: '10:00', room: '' });
  const submit = (event) => {
    event.preventDefault();
    const payload = { ...form, id: editingId, sks: form.sks ? Number(form.sks) : null };
    const validation = validateCourseInput(payload, courses);
    if (validation) { setError(validation); return; }
    onSave(payload, editingId);
    setForm(emptyCourse);
    setEditingId(null);
    setError(null);
  };
  const edit = (course) => {
    setEditingId(course.id);
    setForm({ name: course.name, code: course.code || '', color: course.color, lecturer: course.lecturer || '', sks: course.sks || '', schedule: course.schedule.map((item) => ({ ...item })) });
    setError(null);
  };
  return <div className="course-manager" data-tour="courses">
    <ul className="course-list">
      {courses.length === 0 && <li className="muted">Belum ada mata kuliah. Tambahkan yang sedang kamu ambil semester ini.</li>}
      {courses.map((course) => (
        <li key={course.id} className="course-row">
          <CourseDot color={course.color} size={12} />
          <div>
            <strong>{course.name}</strong>
            <small>{[course.code, course.lecturer, course.sks ? `${course.sks} SKS` : null, course.schedule.length ? `${course.schedule.length} jadwal` : null].filter(Boolean).join(' · ') || 'Tanpa detail'}</small>
          </div>
          <button className="text-link" type="button" onClick={() => edit(course)}>Edit</button>
          <button className="icon-button danger-hover" type="button" onClick={() => onDelete(course)} aria-label={`Hapus ${course.name}`}><Trash2 size={15} /></button>
        </li>
      ))}
    </ul>
    <form className="form-stack course-form" onSubmit={submit}>
      <div className="form-grid-two">
        <div className="field-group"><label htmlFor="course-name">{editingId ? 'Edit mata kuliah' : 'Mata kuliah baru'}</label><input id="course-name" className="input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={48} placeholder="Pemrograman Berorientasi Objek" /></div>
        <div className="field-group"><label htmlFor="course-code">Kode</label><input id="course-code" className="input" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} maxLength={16} placeholder="IF201" /></div>
      </div>
      <div className="form-grid-two">
        <div className="field-group"><label htmlFor="course-lecturer">Dosen</label><input id="course-lecturer" className="input" value={form.lecturer} onChange={(event) => setForm((current) => ({ ...current, lecturer: event.target.value }))} maxLength={48} /></div>
        <div className="field-group"><label htmlFor="course-sks">SKS</label><input id="course-sks" className="input" type="number" min="1" max="8" value={form.sks} onChange={(event) => setForm((current) => ({ ...current, sks: event.target.value }))} /></div>
      </div>
      <fieldset className="color-field"><legend>Warna</legend><div className="color-row">{COURSE_COLORS.map((color) => <label key={color} className={form.color === color ? 'active' : ''}><input type="radio" name="course-color" checked={form.color === color} onChange={() => setForm((current) => ({ ...current, color }))} /><i style={{ background: color }} /></label>)}</div></fieldset>
      <div className="schedule-editor">
        <p className="section-kicker">Jadwal kuliah</p>
        {form.schedule.map((item, index) => (
          <div className="schedule-line" key={`${item.day}-${item.start}-${index}`}>
            <span>{WEEKDAY_LABELS[item.day]} {item.start}–{item.end}{item.room ? ` · ${item.room}` : ''}</span>
            <button className="icon-button" type="button" onClick={() => setForm((current) => ({ ...current, schedule: current.schedule.filter((_, entryIndex) => entryIndex !== index) }))} aria-label="Hapus jadwal"><Trash2 size={14} /></button>
          </div>
        ))}
        <div className="schedule-add">
          <select className="input" value={slot.day} onChange={(event) => setSlot((current) => ({ ...current, day: Number(event.target.value) }))}>{WEEKDAY_LABELS.map((label, day) => <option key={label} value={day}>{label}</option>)}</select>
          <input className="input" type="time" value={slot.start} onChange={(event) => setSlot((current) => ({ ...current, start: event.target.value }))} />
          <input className="input" type="time" value={slot.end} onChange={(event) => setSlot((current) => ({ ...current, end: event.target.value }))} />
          <input className="input" value={slot.room} onChange={(event) => setSlot((current) => ({ ...current, room: event.target.value }))} placeholder="Ruang" />
          <button className="btn btn-secondary" type="button" onClick={() => { if (!slot.start || !slot.end) return; setForm((current) => ({ ...current, schedule: [...current.schedule, { ...slot, room: slot.room.trim() || null }] })); }}><Plus size={14} />Jadwal</button>
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error.message}</p>}
      <div className="action-row">
        <button className="btn btn-primary" type="submit"><Check size={16} />{editingId ? 'Simpan perubahan' : 'Tambah mata kuliah'}</button>
        {editingId && <button className="btn btn-ghost" type="button" onClick={() => { setEditingId(null); setForm(emptyCourse); }}>Batal edit</button>}
      </div>
    </form>
  </div>;
}
