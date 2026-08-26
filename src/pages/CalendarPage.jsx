import { useMemo, useState } from 'react';
import { addMonths, format } from 'date-fns';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getAgendaForDay, getCalendarDays, getCalendarMarks, todayString } from '../lib/domain.js';
import { CourseDot } from '../components/ui.jsx';

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export function CalendarPage({ data }) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => todayString());
  const days = useMemo(() => getCalendarDays(cursor), [cursor]);
  const agenda = getAgendaForDay(data.tasks, data.courses, selected);
  const monthLabel = format(cursor, 'MMMM yyyy');
  return <section className="calendar-layout">
    <article className="card calendar-board">
      <div className="calendar-toolbar">
        <button className="icon-button" type="button" onClick={() => setCursor((current) => addMonths(current, -1))} aria-label="Bulan sebelumnya"><ArrowLeft size={18} /></button>
        <h2>{monthLabel}</h2>
        <button className="icon-button" type="button" onClick={() => setCursor((current) => addMonths(current, 1))} aria-label="Bulan berikutnya"><ArrowRight size={18} /></button>
      </div>
      {data.semester?.name && <p className="muted calendar-semester">{data.semester.name}{data.semester.startDate && data.semester.endDate ? ` · ${data.semester.startDate} – ${data.semester.endDate}` : ''}</p>}
      <div className="calendar-weekdays">{WEEKDAYS.map((label) => <span key={label}>{label}</span>)}</div>
      <div className="calendar-month">
        {days.map((day) => {
          const marks = getCalendarMarks(data.tasks, data.courses, day.key);
          const hasMarks = marks.deadlineCount || marks.classCount;
          return <button key={day.key} type="button" className={`calendar-day ${day.inMonth ? '' : 'is-outside'} ${day.isToday ? 'is-today' : ''} ${selected === day.key ? 'is-selected' : ''}`} onClick={() => setSelected(day.key)}>
            <span>{day.date.getDate()}</span>
            {hasMarks && <i className="calendar-marks">{marks.examCount ? <b className="mark-exam" /> : marks.deadlineCount ? <b className="mark-task" /> : null}{marks.classCount ? <b className="mark-class" /> : null}</i>}
          </button>;
        })}
      </div>
    </article>
    <article className="card calendar-agenda">
      <div className="card-header"><div><p className="section-kicker">Agenda</p><h2>{selected}</h2></div></div>
      {agenda.length ? <ul className="agenda-list">{agenda.map((item, index) => <li key={`${item.kind}-${item.title}-${index}`}>{item.color && <CourseDot color={item.color} />}<span>{item.kind === 'class' ? 'Kuliah' : 'Deadline'}</span><strong className={item.completed ? 'is-done' : ''}>{item.title}</strong><em>{item.meta}</em>{item.task && <a className="text-link" href={`focus.html?taskId=${item.task.id}`}>Fokus</a>}</li>)}</ul> : <p className="muted">Tidak ada kuliah atau deadline pada tanggal ini.</p>}
    </article>
  </section>;
}
