import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { addMonths, format } from 'date-fns';
import { ArrowLeft, ArrowRight, FolderOpen } from 'lucide-react';
import { getAgendaForDay, getCalendarDays, getCalendarMarks, getMeetingBadge, getMeetingLabel, getRoleTerminology, getSemesterSksSummary, todayString } from '../lib/domain.js';
import { CourseDot } from '../components/ui.jsx';

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export function CalendarPage({ data }) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => todayString());
  const days = useMemo(() => getCalendarDays(cursor), [cursor]);
  const agenda = getAgendaForDay(data.tasks, data.courses, selected);
  const monthLabel = format(cursor, 'MMMM yyyy');
  const terms = getRoleTerminology(data.profile.role);
  const sksSummary = getSemesterSksSummary(data.courses);

  return <section className="calendar-layout">
    <article className="card calendar-board">
      <div className="calendar-toolbar">
        <button className="icon-button" type="button" onClick={() => setCursor((current) => addMonths(current, -1))} aria-label="Bulan sebelumnya"><ArrowLeft size={18} /></button>
        <h2>{monthLabel}</h2>
        <button className="icon-button" type="button" onClick={() => setCursor((current) => addMonths(current, 1))} aria-label="Bulan berikutnya"><ArrowRight size={18} /></button>
      </div>
      <div className="calendar-semester-bar">
        {data.semester?.name && <p className="muted calendar-semester">{data.semester.name}{data.semester.startDate && data.semester.endDate ? ` · ${data.semester.startDate} – ${data.semester.endDate}` : ''}</p>}
        {sksSummary.totalSks > 0 && <span className="category-badge">{sksSummary.totalSks} {terms.sksLabel} {terms.isAcademic ? 'Semester' : 'Total'}</span>}
      </div>
      <div className="calendar-weekdays">{WEEKDAYS.map((label) => <span key={label}>{label}</span>)}</div>
      <div className="calendar-month">
        {days.map((day) => {
          const marks = getCalendarMarks(data.tasks, data.courses, day.key);
          const hasMarks = Boolean(marks.deadlineCount || marks.classCount);
          return <button key={day.key} type="button" className={`calendar-day ${day.inMonth ? '' : 'is-outside'} ${day.isToday ? 'is-today' : ''} ${selected === day.key ? 'is-selected' : ''}`} onClick={() => setSelected(day.key)}>
            <span>{day.date.getDate()}</span>
            {hasMarks && <i className="calendar-marks">{marks.examCount ? <b className="mark-exam" /> : marks.deadlineCount ? <b className="mark-task" /> : null}{marks.classCount ? <b className="mark-class" /> : null}</i>}
          </button>;
        })}
      </div>
    </article>
    <article className="card calendar-agenda">
      <div className="card-header"><div><p className="section-kicker">Agenda</p><h2>{selected}</h2></div></div>
      <AnimatePresence mode="wait">{agenda.length ? <motion.ul key={selected} className="agenda-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>{agenda.map((item, index) => {
        const meetingNum = item.task?.meetingNumber;
        return <li key={`${item.kind}-${item.title}-${index}`}>
          {item.color && <CourseDot color={item.color} />}
          <span>{item.kind === 'class' ? (terms.isAcademic ? 'Kuliah' : 'Rutin') : 'Deadline'}</span>
          <div className="agenda-title-wrap">
            <strong className={item.completed ? 'is-done' : ''}>{item.title}</strong>
            {meetingNum && (
              <span className="category-badge meeting-tag-badge" title={getMeetingLabel(meetingNum, terms)}>
                {getMeetingBadge(meetingNum, terms)}
              </span>
            )}
          </div>
          <em>{item.meta}</em>
          {item.task && <a className="text-link" href={`focus.html?intent=start&taskId=${item.task.id}`}>Fokus</a>}
          {item.course?.driveUrl && <a className="icon-button agenda-drive" href={item.course.driveUrl} target="_blank" rel="noreferrer" aria-label={`Buka folder materi ${item.course.name}`} title="Buka folder materi"><FolderOpen size={15} /></a>}
        </li>;
      })}</motion.ul> : <motion.p key="empty" className="muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Tidak ada {terms.isAcademic ? 'kuliah' : 'agenda'} atau deadline pada tanggal ini.</motion.p>}</AnimatePresence>
    </article>
  </section>;
}
