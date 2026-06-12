/**
 * Synthesized sound effects — pure WebAudio oscillators and noise,
 * no audio files. The context is created lazily on first user input
 * (browsers block autoplay before a gesture).
 */

let ctx = null;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq = 440, to = null, dur = 0.12, type = 'square', vol = 0.15, delay = 0 }) {
  const a = ac();
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.3, vol = 0.25, delay = 0 }) {
  const a = ac();
  const t0 = a.currentTime + delay;
  const buffer = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const src = a.createBufferSource();
  src.buffer = buffer;
  const gain = a.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(gain).connect(a.destination);
  src.start(t0);
}

export const sfx = {
  unlock() { ac(); }, // call on first keypress so everything after can play

  peck() {
    tone({ freq: 880, to: 220, dur: 0.08, type: 'square', vol: 0.18 });
  },

  collect() {
    tone({ freq: 660, dur: 0.07, type: 'triangle', vol: 0.2 });
    tone({ freq: 990, dur: 0.1, type: 'triangle', vol: 0.2, delay: 0.06 });
  },

  angry() {
    tone({ freq: 140, to: 70, dur: 0.35, type: 'sawtooth', vol: 0.18 });
  },

  push() {
    tone({ freq: 200, to: 320, dur: 0.12, type: 'square', vol: 0.12 });
  },

  explosion() {
    noise({ dur: 0.45, vol: 0.3 });
    tone({ freq: 90, to: 30, dur: 0.4, type: 'sine', vol: 0.3 });
  },

  power() {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, dur: 0.1, type: 'triangle', vol: 0.18, delay: i * 0.07 }));
  },

  death() {
    tone({ freq: 440, to: 55, dur: 0.6, type: 'sawtooth', vol: 0.22 });
  },

  buy() {
    tone({ freq: 784, dur: 0.08, type: 'triangle', vol: 0.2 });
    tone({ freq: 1175, dur: 0.12, type: 'triangle', vol: 0.2, delay: 0.07 });
  },

  deny() {
    tone({ freq: 160, to: 110, dur: 0.15, type: 'square', vol: 0.12 });
  },

  clear() {
    [523, 659, 784].forEach((f, i) =>
      tone({ freq: f, dur: 0.12, type: 'square', vol: 0.16, delay: i * 0.1 }));
  },

  victory() {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) =>
      tone({ freq: f, dur: 0.16, type: 'square', vol: 0.16, delay: i * 0.14 }));
  },
};
