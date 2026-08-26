let activeSoundscape = null;

function clampVolume(volume) {
  const numeric = Number(volume);
  return Number.isFinite(numeric) ? Math.min(100, Math.max(0, numeric)) : 55;
}

function getContext() {
  const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContext) return null;
  try { return new AudioContext(); } catch { return null; }
}

function addTone(context, destination, at, frequency, duration, gain = 0.08, type = 'sine') {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, at);
  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), at + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  oscillator.connect(envelope);
  envelope.connect(destination);
  oscillator.start(at);
  oscillator.stop(at + duration + 0.03);
  return oscillator;
}

function createNoise(context, destination, volume, filterFrequency = null) {
  const length = context.sampleRate * 2;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  const gain = context.createGain();
  gain.gain.value = volume;
  source.buffer = buffer;
  source.loop = true;
  source.connect(filterFrequency ? (() => {
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFrequency;
    filter.Q.value = 0.4;
    filter.connect(gain);
    return filter;
  })() : gain);
  gain.connect(destination);
  source.start();
  return source;
}

export function stopFocusSoundscape({ fade = true } = {}) {
  const current = activeSoundscape;
  if (!current) return;
  activeSoundscape = null;
  const release = fade ? 0.18 : 0;
  try {
    current.master.gain.cancelScheduledValues(current.context.currentTime);
    current.master.gain.setValueAtTime(current.master.gain.value || 0.0001, current.context.currentTime);
    current.master.gain.linearRampToValueAtTime(0.0001, current.context.currentTime + release);
  } catch { /* Browser audio cleanup is best effort. */ }
  globalThis.setTimeout(() => {
    current.sources.forEach((source) => { try { source.stop(); } catch { /* already stopped */ } });
    current.timers.forEach((timer) => globalThis.clearInterval(timer));
    try { current.context.suspend(); } catch { /* unsupported context */ }
  }, release * 1000 + 40);
}

export function startFocusSoundscape(kind, volume = 55) {
  stopFocusSoundscape({ fade: false });
  if (!['lofi', 'rain', 'noise'].includes(kind) || clampVolume(volume) === 0) return false;
  const context = getContext();
  if (!context) return false;
  const master = context.createGain();
  const sources = [];
  const timers = [];
  master.gain.value = (clampVolume(volume) / 100) * 0.18;
  master.connect(context.destination);
  context.resume?.().catch(() => undefined);
  if (kind === 'rain') {
    sources.push(createNoise(context, master, 0.5, 1700));
  } else if (kind === 'noise') {
    sources.push(createNoise(context, master, 0.32));
  } else {
    const now = context.currentTime;
    sources.push(addTone(context, master, now, 110, 7200, 0.16, 'triangle'));
    sources.push(addTone(context, master, now, 220, 7200, 0.035, 'sine'));
    const notes = [220, 261.63, 329.63, 293.66];
    let index = 0;
    const playNote = () => { addTone(context, master, context.currentTime, notes[index++ % notes.length], 0.8, 0.05, 'triangle'); };
    playNote();
    timers.push(globalThis.setInterval(playNote, 2600));
  }
  activeSoundscape = { context, master, sources, timers };
  return true;
}

export function playFeedbackTone(kind, volume = 55) {
  if (clampVolume(volume) === 0) return false;
  const context = getContext();
  if (!context) return false;
  const master = context.createGain();
  master.gain.value = (clampVolume(volume) / 100) * 0.32;
  master.connect(context.destination);
  context.resume?.().catch(() => undefined);
  const now = context.currentTime;
  const sequences = {
    taskAdded: [[659.25, 0, 0.13, 'triangle']],
    focusStart: [[440, 0, 0.13, 'sine'], [554.37, 0.14, 0.18, 'sine']],
    pause: [[246.94, 0, 0.08, 'square']],
    resume: [[523.25, 0, 0.11, 'sine']],
    complete: [[523.25, 0, 0.12, 'triangle'], [659.25, 0.12, 0.12, 'triangle'], [783.99, 0.24, 0.24, 'triangle']]
  };
  (sequences[kind] || []).forEach(([frequency, offset, duration, type]) => addTone(context, master, now + offset, frequency, duration, 0.14, type));
  globalThis.setTimeout(() => { try { context.suspend(); } catch { /* unsupported context */ } }, 700);
  return true;
}
