import { useEffect, useState } from 'react';
import { BookOpen, Check, ExternalLink, FolderOpen, Plus, Sparkles, Trash2 } from 'lucide-react';
import { generateDefaultMeetings, getCourseMeetingsProgress, getMeetingBadge, getMeetingLabel, getRoleTerminology, validateMeetingInput } from '../lib/domain.js';
import { MAX_MEETINGS } from '../lib/storage.js';
import { CourseDot, Modal, ProgressMeter } from './ui.jsx';

export function CourseMeetingModal({ open, course, role = 'mahasiswa', onClose, onSaveMeetings, onCreateTaskForMeeting }) {
  const [meetings, setMeetings] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [error, setError] = useState(null);
  const terms = getRoleTerminology(role);

  useEffect(() => {
    if (!open || !course) return;
    setMeetings(Array.isArray(course.meetings) ? course.meetings.map((item) => ({ ...item })) : []);
    setEditingIndex(null);
    setError(null);
  }, [open, course]);

  if (!course) return null;

  const progress = getCourseMeetingsProgress({ meetings });

  const handleToggleCompleted = (meetingId) => {
    setMeetings((current) => current.map((item) => item.id === meetingId ? { ...item, completed: !item.completed } : item));
  };

  const handleUpdateMeeting = (index, field, value) => {
    setMeetings((current) => current.map((item, i) => i === index ? { ...item, [field]: value } : item));
    if (error?.index === index && error?.field === field) setError(null);
  };

  const handleAddMeeting = () => {
    if (meetings.length >= MAX_MEETINGS) {
      setError({ message: `Maksimal ${MAX_MEETINGS} ${terms.meetingLabel.toLowerCase()}.` });
      return;
    }
    const nextNumber = meetings.length ? Math.max(...meetings.map((m) => m.number || 0)) + 1 : 1;
    const newMeeting = {
      id: Date.now(),
      number: nextNumber,
      title: `${terms.meetingLabel} ${nextNumber}: Topik Materi`,
      driveUrl: '',
      completed: false,
      notes: ''
    };
    setMeetings((current) => [...current, newMeeting]);
    setEditingIndex(meetings.length);
    setError(null);
  };

  const handleGenerateDefault = () => {
    const defaultList = generateDefaultMeetings(course.name, role);
    setMeetings(defaultList);
    setEditingIndex(null);
    setError(null);
  };

  const handleDeleteMeeting = (meetingId) => {
    setMeetings((current) => current.filter((item) => item.id !== meetingId));
    setEditingIndex(null);
  };

  const handleSave = () => {
    // Validate each meeting
    for (let i = 0; i < meetings.length; i++) {
      const otherMeetings = meetings.filter((_, idx) => idx !== i);
      const validation = validateMeetingInput(meetings[i], otherMeetings);
      if (validation) {
        setError({ index: i, ...validation });
        setEditingIndex(i);
        return;
      }
    }
    onSaveMeetings(course.id, meetings);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={`${terms.meetingsHeading}: ${course.name}`} eyebrow={terms.courseLabel}>
      <div className="course-meeting-modal-content">
        <div className="course-meeting-header">
          <div className="course-meeting-meta">
            <CourseDot color={course.color} size={14} />
            <strong>{course.name}</strong>
            {course.code && <span className="category-badge">{course.code}</span>}
            {course.sks && <span className="category-badge">{course.sks} {terms.sksLabel}</span>}
            {course.driveUrl && (
              <a className="text-link" href={course.driveUrl} target="_blank" rel="noreferrer" title="Buka folder utama mata kuliah">
                <FolderOpen size={14} />Folder Utama <ExternalLink size={12} />
              </a>
            )}
          </div>
          <ProgressMeter value={progress.completedMeetings} max={progress.totalMeetings || 1} label={`Kesiapan materi (${progress.completedMeetings}/${progress.totalMeetings} selesai)`} tone="mint" />
        </div>

        <div className="meeting-toolbar action-row">
          {meetings.length === 0 ? (
            <button className="btn btn-primary" type="button" onClick={handleGenerateDefault}>
              <Sparkles size={15} />{terms.generateButtonLabel}
            </button>
          ) : (
            <button className="btn btn-secondary btn-small" type="button" onClick={handleGenerateDefault} title="Reset dan buat struktur standar">
              <Sparkles size={14} />Reset Struktur Standar
            </button>
          )}
          <button className="btn btn-secondary btn-small" type="button" onClick={handleAddMeeting} disabled={meetings.length >= MAX_MEETINGS}>
            <Plus size={14} />Tambah {terms.meetingLabel}
          </button>
        </div>

        {error && !Number.isInteger(error.index) && <p className="form-error" role="alert">{error.message}</p>}

        <div className="meeting-list-container">
          {meetings.length === 0 ? (
            <div className="meeting-empty">
              <BookOpen size={28} className="muted" />
              <p>Belum ada daftar {terms.meetingLabel.toLowerCase()} untuk {terms.courseLabel.toLowerCase()} ini.</p>
              <p className="muted">Klik tombol <strong>"{terms.generateButtonLabel}"</strong> untuk mengisi otomatis.</p>
            </div>
          ) : (
            <ul className="meeting-list">
              {meetings.map((meeting, index) => {
                const isEditing = editingIndex === index;
                const isExam = terms.isAcademic && (meeting.number === 8 || meeting.number === 16);
                const hasError = error?.index === index;
                return (
                  <li key={meeting.id || index} className={`meeting-row ${meeting.completed ? 'is-completed' : ''} ${isExam ? 'is-exam-row' : ''} ${isEditing ? 'is-editing' : ''}`}>
                    <div className="meeting-row-main">
                      <label className="meeting-checkbox-label" title={meeting.completed ? 'Tandai belum selesai' : 'Tandai selesai dipelajari'}>
                        <input type="checkbox" checked={Boolean(meeting.completed)} onChange={() => handleToggleCompleted(meeting.id)} />
                        <span className="meeting-check" aria-hidden="true"><Check size={13} /></span>
                      </label>
                      <span className={`meeting-badge ${isExam ? 'meeting-badge-exam' : ''}`}>
                        {getMeetingBadge(meeting.number, terms)}
                      </span>

                      {!isEditing ? (
                        <div className="meeting-info" onClick={() => setEditingIndex(index)}>
                          <span className={`meeting-title ${meeting.completed ? 'is-done-text' : ''}`}>{meeting.title || `(Tanpa judul ${terms.meetingLabel.toLowerCase()})`}</span>
                          {meeting.notes && <small className="meeting-notes-preview">{meeting.notes}</small>}
                        </div>
                      ) : (
                        <div className="meeting-edit-fields">
                          <div className="meeting-edit-topline">
                            <input
                              className="input input-small"
                              type="number"
                              min="1"
                              max={MAX_MEETINGS}
                              value={meeting.number}
                              onChange={(e) => handleUpdateMeeting(index, 'number', Number(e.target.value))}
                              aria-label="Nomor pertemuan"
                              title="Nomor pertemuan"
                            />
                            <input
                              className="input input-small"
                              type="text"
                              value={meeting.title}
                              onChange={(e) => handleUpdateMeeting(index, 'title', e.target.value)}
                              placeholder={`Judul / Topik materi ${terms.meetingLabel.toLowerCase()}`}
                              maxLength={100}
                              aria-label="Judul materi"
                            />
                          </div>
                          <div className="input-with-icon">
                            <FolderOpen size={14} aria-hidden="true" />
                            <input
                              className="input input-small"
                              type="url"
                              value={meeting.driveUrl || ''}
                              onChange={(e) => handleUpdateMeeting(index, 'driveUrl', e.target.value)}
                              placeholder="Link Google Drive slide / materi spesifik (https://...)"
                              aria-label="Link Google Drive materi"
                            />
                          </div>
                          <input
                            className="input input-small"
                            type="text"
                            value={meeting.notes || ''}
                            onChange={(e) => handleUpdateMeeting(index, 'notes', e.target.value)}
                            placeholder="Catatan singkat materi / kisi-kisi (opsional)"
                            maxLength={300}
                            aria-label="Catatan materi"
                          />
                          {hasError && <p className="field-error" role="alert">{error.message}</p>}
                        </div>
                      )}

                      <div className="meeting-actions">
                        {meeting.driveUrl && (
                          <a className="icon-button" href={meeting.driveUrl} target="_blank" rel="noreferrer" title="Buka link materi Google Drive" aria-label="Buka materi Google Drive">
                            <FolderOpen size={15} />
                          </a>
                        )}
                        {onCreateTaskForMeeting && (
                          <button
                            className="btn btn-secondary btn-tiny"
                            type="button"
                            onClick={() => onCreateTaskForMeeting(course, meeting)}
                            title={`Buat tugas baru untuk ${getMeetingLabel(meeting.number, terms)}`}
                          >
                            <Plus size={13} />Tugas
                          </button>
                        )}
                        <button
                          className="text-link text-tiny"
                          type="button"
                          onClick={() => setEditingIndex(isEditing ? null : index)}
                        >
                          {isEditing ? 'Tutup' : 'Edit'}
                        </button>
                        <button
                          className="icon-button danger-hover"
                          type="button"
                          onClick={() => handleDeleteMeeting(meeting.id)}
                          aria-label={`Hapus ${getMeetingLabel(meeting.number, terms)}`}
                          title="Hapus pertemuan"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="dialog-footer">
          <button className="btn btn-secondary" type="button" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" type="button" onClick={handleSave}><Check size={16} />Simpan Perubahan</button>
        </div>
      </div>
    </Modal>
  );
}
