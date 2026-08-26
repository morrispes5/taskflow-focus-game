import { dueTimestamp, todayString, visibleTasks } from './domain.js';

export function reminderKey(task, dateKey) {
  return `${dateKey}:${task.id}`;
}

export function getDueReminders(tasks, progress, reference = new Date()) {
  const dateKey = todayString(reference);
  const notified = new Set(progress.notifiedKeys || []);
  return visibleTasks(tasks)
    .filter((task) => !task.completed && task.dueDate)
    .map((task) => {
      const due = dueTimestamp(task, reference);
      if (due === null) return null;
      const hoursBefore = task.reminderOffsetHours;
      const windowStart = hoursBefore === null || hoursBefore === undefined ? due - 24 * 3600000 : due - hoursBefore * 3600000;
      const urgent = due < reference.getTime() || (reference.getTime() >= windowStart && reference.getTime() <= due + 60 * 1000);
      if (!urgent) return null;
      const key = reminderKey(task, dateKey);
      return { task, key, overdue: due < reference.getTime(), alreadyNotified: notified.has(key) };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.task.text.localeCompare(b.task.text, 'id'));
}

export function markRemindersNotified(progress, keys) {
  const next = new Set(progress.notifiedKeys || []);
  keys.forEach((key) => next.add(key));
  return { ...progress, notifiedKeys: [...next].slice(-200) };
}

export function playFocusChime() {
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 784;
  gain.gain.value = 0.07;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.55);
  oscillator.stop(context.currentTime + 0.55);
}

export function canNotify() {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

export async function requestNotifyPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.requestPermission();
}

export function sendNotification(title, body) {
  if (!canNotify()) return false;
  try {
    new Notification(title, { body, silent: false });
    return true;
  } catch {
    return false;
  }
}
