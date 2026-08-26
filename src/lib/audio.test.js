import { afterEach, describe, expect, it, vi } from 'vitest';
import { playFeedbackTone, startFocusSoundscape, stopFocusSoundscape } from './audio.js';

function installAudioMock() {
  const instances = [];
  const mediaInstances = [];
  class AudioContextMock {
    constructor() {
      this.currentTime = 0;
      this.sampleRate = 24;
      this.destination = {};
      this.resume = vi.fn(() => Promise.resolve());
      this.suspend = vi.fn();
      instances.push(this);
    }
    createGain() { return { gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() }, connect: vi.fn() }; }
    createOscillator() { return { frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() }; }
    createBuffer() { return { getChannelData: () => new Float32Array(48) }; }
    createBufferSource() { return { connect: vi.fn(), start: vi.fn(), stop: vi.fn(), loop: false, buffer: null }; }
    createBiquadFilter() { return { type: '', frequency: { value: 0 }, Q: { value: 0 }, connect: vi.fn() }; }
  }
  class AudioMock {
    constructor(src) {
      this.src = src;
      this.volume = 0;
      this.preload = '';
      this.loop = false;
      this.currentTime = 0;
      this.play = vi.fn(() => Promise.resolve());
      this.pause = vi.fn();
      this.addEventListener = vi.fn();
      this.removeEventListener = vi.fn();
      mediaInstances.push(this);
    }
  }
  globalThis.AudioContext = AudioContextMock;
  globalThis.Audio = AudioMock;
  return { instances, mediaInstances };
}

afterEach(() => {
  stopFocusSoundscape({ fade: false });
  delete globalThis.AudioContext;
  delete globalThis.webkitAudioContext;
  delete globalThis.Audio;
});

describe('audio lokal', () => {
  it('tidak membuat AudioContext untuk hening atau volume nol', () => {
    const { instances } = installAudioMock();
    expect(startFocusSoundscape('none', 55)).toBe(false);
    expect(playFeedbackTone('complete', 0)).toBe(false);
    expect(instances).toHaveLength(0);
  });

  it('baru membuat dan menghentikan soundscape setelah dipanggil dari aksi pengguna', () => {
    const { instances, mediaInstances } = installAudioMock();
    expect(startFocusSoundscape('lofi', 55)).toBe(true);
    expect(instances).toHaveLength(0);
    expect(mediaInstances).toHaveLength(1);
    expect(mediaInstances[0].src).toContain('/assets/audio/lofi-01.mp3');
    expect(mediaInstances[0].play).toHaveBeenCalledTimes(1);
    stopFocusSoundscape({ fade: false });
    expect(mediaInstances[0].pause).toHaveBeenCalledTimes(1);
  });

  it('tetap memakai noise sintetis tanpa asset tambahan', () => {
    const { instances } = installAudioMock();
    expect(startFocusSoundscape('noise', 55)).toBe(true);
    expect(instances).toHaveLength(1);
  });
});
