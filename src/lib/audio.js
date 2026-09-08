let activeSoundscape = null;

const SOUNDSCAPE_ASSETS = {
  lofi: ['./assets/audio/lofi-01.mp3', './assets/audio/lofi-02.mp3'],
  rain: ['./assets/audio/rain-01.mp3', './assets/audio/rain-02.mp3']
};

const MEDIA_FADE_IN_MS = 280;
const MEDIA_FADE_OUT_MS = 220;

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

function clearMediaTimers(state) {
  state?.fadeTimers?.forEach((timer) => globalThis.clearInterval(timer));
  state?.fadeTimers?.clear();
}

function resolveAsset(path) {
  const base = globalThis.document?.baseURI || globalThis.location?.href;
  try { return base ? new URL(path, base).href : path; } catch { return path; }
}

function createMediaElement(path) {
  const Audio = globalThis.Audio;
  let player = null;
  try {
    if (typeof Audio === 'function') player = new Audio(resolveAsset(path));
    else if (globalThis.document?.createElement) {
      player = globalThis.document.createElement('audio');
      player.src = resolveAsset(path);
    }
  } catch {
    return null;
  }
  if (!player) return null;
  player.preload = 'auto';
  player.loop = false;
  player.volume = 0;
  return player;
}

function fadeMedia(state, target, duration, onComplete) {
  const player = state?.player;
  if (!player) return;
  const from = Number.isFinite(player.volume) ? player.volume : 0;
  const to = Math.min(1, Math.max(0, target));
  clearMediaTimers(state);
  if (duration <= 0) {
    player.volume = to;
    onComplete?.();
    return;
  }
  const startedAt = Date.now();
  const timer = globalThis.setInterval(() => {
    const progress = Math.min(1, (Date.now() - startedAt) / duration);
    player.volume = from + ((to - from) * progress);
    if (progress >= 1) {
      globalThis.clearInterval(timer);
      state.fadeTimers.delete(timer);
      onComplete?.();
    }
  }, 20);
  state.fadeTimers.add(timer);
}

function playMediaPlayer(player) {
  try {
    const result = player.play?.();
    result?.catch?.(() => undefined);
    return true;
  } catch {
    return false;
  }
}

function disposeMediaState(state, { reset = true } = {}) {
  if (!state?.player) return;
  clearMediaTimers(state);
  try { state.player.pause?.(); } catch { /* Browser audio cleanup is best effort. */ }
  if (reset) {
    try { state.player.currentTime = 0; } catch { /* Some mocks do not expose currentTime. */ }
  }
  state.player.removeEventListener?.('ended', state.onEnded);
}

function fadeOutMedia(state, immediate = false) {
  if (!state?.player) return;
  if (immediate) {
    disposeMediaState(state);
    return;
  }
  fadeMedia(state, 0, MEDIA_FADE_OUT_MS, () => disposeMediaState(state));
}

function createMediaState(kind, assets, assetIndex) {
  const player = createMediaElement(assets[assetIndex]);
  if (!player) return null;
  const state = { kind, assets, assetIndex, player, fadeTimers: new Set(), onEnded: null, volume: 55 };
  state.onEnded = () => {
    if (activeSoundscape !== state) return;
    const nextIndex = (state.assetIndex + 1) % state.assets.length;
    const next = createMediaState(state.kind, state.assets, nextIndex);
    if (!next || !playMediaPlayer(next.player)) {
      disposeMediaState(next);
      return;
    }
    activeSoundscape = next;
    next.volume = state.volume;
    fadeMedia(next, (next.volume / 100) * 0.72, MEDIA_FADE_IN_MS);
    fadeOutMedia(state);
  };
  player.addEventListener?.('ended', state.onEnded);
  return state;
}

function startMediaSoundscape(kind, volume) {
  const assets = SOUNDSCAPE_ASSETS[kind];
  if (!assets) return false;
  const state = createMediaState(kind, assets, 0);
  if (!state || !playMediaPlayer(state.player)) {
    disposeMediaState(state);
    return false;
  }
  state.volume = clampVolume(volume);
  activeSoundscape = state;
  fadeMedia(state, (state.volume / 100) * 0.72, MEDIA_FADE_IN_MS);
  return true;
}

function startSyntheticSoundscape(kind, volume) {
  const context = getContext();
  if (!context) return false;
  const master = context.createGain();
  const sources = [];
  const timers = [];
  master.gain.value = (clampVolume(volume) / 100) * 0.18;
  master.connect(context.destination);
  context.resume?.().catch(() => undefined);
  if (kind === 'noise') {
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

export function stopFocusSoundscape({ fade = true } = {}) {
  const current = activeSoundscape;
  if (!current) return;
  activeSoundscape = null;
  if (current.player) {
    fadeOutMedia(current, !fade);
    return;
  }
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
  stopFocusSoundscape({ fade: true });
  if (!['lofi', 'rain', 'noise'].includes(kind) || clampVolume(volume) === 0) return false;
  if (kind !== 'noise' && startMediaSoundscape(kind, volume)) return true;
  return startSyntheticSoundscape(kind, volume);
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
