import { afterEach, describe, expect, it, vi } from 'vitest';
import { playFeedbackTone, startFocusSoundscape, stopFocusSoundscape } from './audio.js';

function installAudioMock() {
  const instances = [];
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
  globalThis.AudioContext = AudioContextMock;
  return instances;
}

afterEach(() => {
  stopFocusSoundscape({ fade: false });
  delete globalThis.AudioContext;
  delete globalThis.webkitAudioContext;
});

describe('audio lokal', () => {
  it('tidak membuat AudioContext untuk hening atau volume nol', () => {
    const instances = installAudioMock();
    expect(startFocusSoundscape('none', 55)).toBe(false);
    expect(playFeedbackTone('complete', 0)).toBe(false);
    expect(instances).toHaveLength(0);
  });

  it('baru membuat dan menghentikan soundscape setelah dipanggil dari aksi pengguna', () => {
    const instances = installAudioMock();
    expect(startFocusSoundscape('lofi', 55)).toBe(true);
    expect(instances).toHaveLength(1);
    stopFocusSoundscape({ fade: false });
    expect(instances[0].suspend).not.toHaveBeenCalled();
  });
});
