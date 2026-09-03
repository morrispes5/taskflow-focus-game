import { getDueInfo, getMeetingBadge, getMeetingLabel } from '../../lib/domain.js';
import { PRIORITY_LABELS } from '../../lib/storage.js';

function stageEyebrow({ isBreak, isReviewSession, isReview, isDistracted, isPaused, isFocusing }) {
  if (isBreak) return isReviewSession ? 'Recap review' : 'Recap sesi';
  if (isReview) return 'Mode review';
  if (isDistracted) return 'Distraksi aktif';
  if (isPaused) return 'Sesi dijeda';
  if (isFocusing) return 'Sedang fokus';
  return 'Meja kerja tugas';
}

function stageHeading(status, task) {
  if (!status.isBreak) return task.text;
  return status.isReviewSession
    ? 'Review selesai. Catat hal penting yang kamu temukan.'
    : 'Satu langkah selesai. Ambil jeda yang layak.';
}

export function FocusStageCopy({ status, task, course, meeting, terms, semesterWeek }) {
  return (
    <div className="focus-stage-copy">
      <p className="eyebrow">{stageEyebrow(status)}</p>
      <h1>{stageHeading(status, task)}</h1>
      <div className="focus-task-meta">
        <span className={`priority-badge priority-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
        <span>{course?.name || task.category || 'Tanpa kategori'}</span>
        {meeting && <span className="category-badge meeting-tag-badge" title={getMeetingLabel(meeting.number, terms)}>{getMeetingBadge(meeting.number, terms)}</span>}
        <span>{getDueInfo(task).label}</span>
        {semesterWeek && <span>Minggu ke-{semesterWeek}</span>}
      </div>
    </div>
  );
}
