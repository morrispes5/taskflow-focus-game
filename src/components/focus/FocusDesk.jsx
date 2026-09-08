import { ExternalLink, FolderOpen, ListTodo, Volume2, VolumeX } from 'lucide-react';
import { getMeetingLabel } from '../../lib/domain.js';
import { FOCUS_SOUNDSCAPES, FOCUS_SOUNDSCAPE_LABELS } from '../../lib/storage.js';

export function FocusDesk({ task, course, meeting, terms, preferences, soundEnabled, onSelectSoundscape }) {
  return (
    <section className="focus-desk" aria-label="Meja kerja tugas">
      <div className="focus-brief">
        <div className="focus-desk-heading">
          <ListTodo size={18} />
          <div><p className="section-kicker">Brief tugas</p><h2>Semua yang kamu butuhkan, tetap dekat.</h2></div>
        </div>
        {task.notes
          ? <p>{task.notes}</p>
          : <p className="muted-light">Belum ada catatan. Tambahkan instruksi atau rubrik dari halaman Tugas bila diperlukan.</p>}
        <div className="focus-resource-links">
          {meeting?.driveUrl && <a className="focus-resource" href={meeting.driveUrl} target="_blank" rel="noreferrer"><FolderOpen size={16} />Materi {getMeetingLabel(meeting.number, terms)} <ExternalLink size={13} /></a>}
          {course?.driveUrl && <a className="focus-resource" href={course.driveUrl} target="_blank" rel="noreferrer"><FolderOpen size={16} />Folder utama {course.name} <ExternalLink size={13} /></a>}
          {task.url && <a className="focus-resource" href={task.url} target="_blank" rel="noreferrer"><ExternalLink size={16} />Buka link tugas <ExternalLink size={13} /></a>}
        </div>
      </div>
      <div className="focus-sound-panel">
        <div className="focus-desk-heading">
          <Volume2 size={18} />
          <div><p className="section-kicker">Soundscape lokal</p><h2>{soundEnabled ? FOCUS_SOUNDSCAPE_LABELS[preferences.focusSoundscape] : 'Hening'}</h2></div>
        </div>
        <div className="soundscape-options" role="group" aria-label="Pilih soundscape">
          {FOCUS_SOUNDSCAPES.map((soundscape) => (
            <button key={soundscape} className={preferences.focusSoundscape === soundscape ? 'active' : ''} type="button" onClick={() => onSelectSoundscape(soundscape)} aria-pressed={preferences.focusSoundscape === soundscape}>
              {soundscape === 'none' ? <VolumeX size={14} /> : <Volume2 size={14} />}{FOCUS_SOUNDSCAPE_LABELS[soundscape]}
            </button>
          ))}
        </div>
        <p>{preferences.sound ? `Volume ${preferences.focusSoundVolume}%. Suara hanya mulai setelah tombol Mulai ditekan.` : 'Bunyi dinonaktifkan dari Pengaturan.'}</p>
      </div>
    </section>
  );
}
