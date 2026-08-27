import { useState } from 'react';
import { BookOpen, Check, FolderOpen, Plus, Sparkles, Trash2 } from 'lucide-react';
import { getCourseMeetingsProgress, getRoleTerminology, getSemesterSksSummary, validateCourseInput } from '../lib/domain.js';
import { COURSE_COLORS, WEEKDAY_LABELS } from '../lib/storage.js';
import { CourseMeetingModal } from './CourseMeetingModal.jsx';
import { CourseDot } from './ui.jsx';

const emptyCourse = { name: '', code: '', color: COURSE_COLORS[0], lecturer: '', sks: '', driveUrl: '', schedule: [], meetings: [] };

export function CourseManager({ courses, role = 'mahasiswa', onSave, onDelete, onSaveMeetings, onCreateTaskForMeeting }) {
  const [form, setForm] = useState(emptyCourse);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [slot, setSlot] = useState({ day: 1, start: '08:00', end: '10:00', room: '' });
  const [meetingCourse, setMeetingCourse] = useState(null);
  const terms = getRoleTerminology(role);
  const sksSummary = getSemesterSksSummary(courses);

  const submit = (event) => {
    event.preventDefault();
    const existing = courses.find((c) => c.id === editingId);
    const payload = {
      ...form,
      id: editingId,
      sks: form.sks ? Number(form.sks) : null,
      meetings: existing?.meetings || form.meetings || []
    };
    const validation = validateCourseInput(payload, courses);
    if (validation) { setError(validation); return; }
    onSave(payload, editingId);
    setForm(emptyCourse);
    setEditingId(null);
    setError(null);
  };

  const edit = (course) => {
    setEditingId(course.id);
    setForm({
      name: course.name,
      code: course.code || '',
      color: course.color,
      lecturer: course.lecturer || '',
      sks: course.sks || '',
      driveUrl: course.driveUrl || '',
      schedule: course.schedule.map((item) => ({ ...item })),
      meetings: course.meetings ? course.meetings.map((item) => ({ ...item })) : []
    });
    setError(null);
  };

  const handleSaveMeetingsLocal = (courseId, meetings) => {
    if (onSaveMeetings) {
      onSaveMeetings(courseId, meetings);
    } else {
      const target = courses.find((c) => c.id === courseId);
      if (target) onSave({ ...target, meetings }, courseId);
    }
  };

  return (
    <div className="course-manager" data-tour="courses">
      {courses.length > 0 && (
        <div className="course-summary-bar">
          <span>{courses.length} {terms.courseListLabel} terdaftar</span>
          {sksSummary.totalSks > 0 && (
            <span className="course-sks-badge">
              <strong>{sksSummary.totalSks}</strong> {terms.sksLabel} {terms.isAcademic ? 'Semester Ini' : 'Total'}
            </span>
          )}
        </div>
      )}

      <ul className="course-list">
        {courses.length === 0 && <li className="muted">Belum ada {terms.courseListLabel}. Tambahkan yang sedang kamu kerjakan saat ini.</li>}
        {courses.map((course) => {
          const progress = getCourseMeetingsProgress(course);
          return (
            <li key={course.id} className="course-row">
              <CourseDot color={course.color} size={12} />
              <div className="course-info">
                <strong>{course.name}</strong>
                <small>{[course.code, course.lecturer, course.sks ? `${course.sks} ${terms.sksLabel}` : null, course.schedule.length ? `${course.schedule.length} jadwal` : null].filter(Boolean).join(' · ') || 'Tanpa detail'}</small>
                {course.meetings?.length > 0 && (
                  <span className="course-meeting-pill">
                    <BookOpen size={11} />{progress.completedMeetings}/{progress.totalMeetings} {terms.meetingLabel.toLowerCase()}
                  </span>
                )}
              </div>
              <div className="course-row-actions">
                <button
                  className="btn btn-secondary btn-tiny"
                  type="button"
                  onClick={() => setMeetingCourse(course)}
                  title={`Kelola daftar materi & ${terms.meetingLabel.toLowerCase()}`}
                >
                  <BookOpen size={13} />{terms.meetingLabel}
                </button>
                {course.driveUrl && (
                  <a className="icon-button" href={course.driveUrl} target="_blank" rel="noreferrer" aria-label={`Buka folder materi ${course.name}`} title="Buka folder materi">
                    <FolderOpen size={16} />
                  </a>
                )}
                <button className="text-link" type="button" onClick={() => edit(course)}>Edit</button>
                <button className="icon-button danger-hover" type="button" onClick={() => onDelete(course)} aria-label={`Hapus ${course.name}`}><Trash2 size={15} /></button>
              </div>
            </li>
          );
        })}
      </ul>

      <form className="form-stack course-form" onSubmit={submit}>
        <div className="form-grid-two">
          <div className="field-group"><label htmlFor="course-name">{editingId ? `Edit ${terms.courseListLabel}` : `${terms.courseLabel} baru`}</label><input id="course-name" className="input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={48} placeholder={terms.isAcademic ? 'Pemrograman Berorientasi Objek' : 'Pengembangan Web App'} /></div>
          <div className="field-group"><label htmlFor="course-code">Kode / Singkatan</label><input id="course-code" className="input" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} maxLength={16} placeholder={terms.isAcademic ? 'IF201' : 'DEV-01'} /></div>
        </div>
        <div className="form-grid-two">
          <div className="field-group"><label htmlFor="course-lecturer">{terms.isAcademic ? 'Dosen / Pengajar' : 'Penanggung Jawab / Klien'}</label><input id="course-lecturer" className="input" value={form.lecturer} onChange={(event) => setForm((current) => ({ ...current, lecturer: event.target.value }))} maxLength={48} /></div>
          <div className="field-group"><label htmlFor="course-sks">{terms.sksLabel} <span className="label-hint">opsional (1–8)</span></label><input id="course-sks" className="input" type="number" min="1" max="8" value={form.sks} onChange={(event) => setForm((current) => ({ ...current, sks: event.target.value }))} /></div>
        </div>
        <div className="field-group"><label htmlFor="course-drive">{terms.driveHint} <span className="label-hint">opsional</span></label><div className="input-with-icon"><FolderOpen size={16} aria-hidden="true" /><input id="course-drive" className="input" type="url" value={form.driveUrl} onChange={(event) => { setForm((current) => ({ ...current, driveUrl: event.target.value })); if (error?.field === 'driveUrl') setError(null); }} placeholder="https://drive.google.com/..." aria-invalid={error?.field === 'driveUrl'} /></div><p className="field-error" role="alert">{error?.field === 'driveUrl' ? error.message : ''}</p></div>
        <fieldset className="color-field"><legend>Warna</legend><div className="color-row">{COURSE_COLORS.map((color) => <label key={color} className={form.color === color ? 'active' : ''}><input type="radio" name="course-color" checked={form.color === color} onChange={() => setForm((current) => ({ ...current, color }))} /><i style={{ background: color }} /></label>)}</div></fieldset>
        <div className="schedule-editor">
          <p className="section-kicker">{terms.isAcademic ? 'Jadwal kuliah' : 'Jadwal rutin'}</p>
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
          <button className="btn btn-primary" type="submit"><Check size={16} />{editingId ? 'Simpan perubahan' : `Tambah ${terms.courseListLabel}`}</button>
          {editingId && <button className="btn btn-ghost" type="button" onClick={() => { setEditingId(null); setForm(emptyCourse); }}>Batal edit</button>}
        </div>
      </form>

      {meetingCourse && (
        <CourseMeetingModal
          open={Boolean(meetingCourse)}
          course={courses.find((c) => c.id === meetingCourse.id) || meetingCourse}
          role={role}
          onClose={() => setMeetingCourse(null)}
          onSaveMeetings={handleSaveMeetingsLocal}
          onCreateTaskForMeeting={onCreateTaskForMeeting}
        />
      )}
    </div>
  );
}

