import { motion } from 'motion/react';
import { ArrowRight, CirclePlay } from 'lucide-react';
import { getDueInfo } from '../../lib/domain.js';
import { PRIORITY_LABELS } from '../../lib/storage.js';
import { Illustration } from '../ui.jsx';

function MissionBody({ mission, reviewTask, focusTargetHref, onCreateTask }) {
  if (mission) {
    return (
      <>
        <h2>{mission.text}</h2>
        <div className="mission-meta">
          <span className={`priority-badge priority-${mission.priority}`}>Prioritas {PRIORITY_LABELS[mission.priority].toLowerCase()}</span>
          <span>{getDueInfo(mission).label}</span>
          {mission.category && <span>{mission.category}</span>}
        </div>
        <a className="btn btn-dark" href={`focus.html?intent=start&taskId=${mission.id}`}><CirclePlay size={18} fill="currentColor" />Mulai Focus Run<ArrowRight size={16} /></a>
      </>
    );
  }
  if (reviewTask) {
    return (
      <>
        <h2>Semua tugas aktif sudah selesai.</h2>
        <p className="muted">Tinjau kembali tugas terakhir, catatan, checklist, atau tautannya tanpa mengubah XP.</p>
        <a className="btn btn-dark" href={focusTargetHref}><CirclePlay size={18} fill="currentColor" />Tinjau “{reviewTask.text}”<ArrowRight size={16} /></a>
      </>
    );
  }
  return (
    <>
      <h2>Belum ada misi yang menunggu.</h2>
      <p className="muted">Tambahkan tugas, lalu biarkan TaskFlow membantumu memilih langkah berikutnya.</p>
      <button className="btn btn-dark" type="button" onClick={onCreateTask}>Buat misi pertama <ArrowRight size={16} /></button>
    </>
  );
}

export function MissionCard({ mission, reviewTask, isReviewTarget, focusTargetHref, onCreateTask }) {
  return (
    <motion.article className={`mission-card ${mission ? '' : 'mission-card-empty'} ${isReviewTarget ? 'mission-card-review' : ''}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36 }}>
      <div className="mission-copy">
        <div className="card-topline">
          <span className="eyebrow">{isReviewTarget ? 'Review tugas' : 'Focus Run'}</span>
          <span className="quiet-status"><span className="status-dot" />{isReviewTarget ? 'Tugas sudah selesai' : 'Siap dimulai'}</span>
        </div>
        <MissionBody mission={mission} reviewTask={reviewTask} focusTargetHref={focusTargetHref} onCreateTask={onCreateTask} />
      </div>
      <Illustration type="focus-run" alt="Ilustrasi sesi fokus" className="mission-illustration" />
    </motion.article>
  );
}
