// Alert audio. Every alert type has a built-in sound synthesised with Web Audio (no files, no licensing),
// and can be swapped for your own clip from the dashboard (a URL, or a file you add to /sounds/).
//
//   playAlertSound('raid', { volume: 0.6, src: '' })   src: '' = built-in · 'none' = silent · URL/path = custom clip
//   speak('Rossonero22 says Forza Milan', { volume })  text-to-speech (works in browsers; OBS support varies)

let ctx = null;
const ac = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());

function out(volume) {
  const c = ac();
  if (c.state === 'suspended') c.resume();
  const g = c.createGain(); g.gain.value = volume;
  const comp = c.createDynamicsCompressor();
  g.connect(comp).connect(c.destination);
  return { c, bus: g, t: c.currentTime + 0.02 };
}

// one enveloped oscillator note
function tone({ c, bus }, t, freq, dur, { type = 'triangle', gain = 0.5, attack = 0.01, glideTo = null } = {}) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.05);
}

// filtered noise burst (crowd roar, drum hits)
function noise({ c, bus }, t, dur, { freq = 1000, q = 0.7, gain = 0.4, attack = 0.02, type = 'bandpass' } = {}) {
  const len = Math.ceil(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = buf; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(bus); s.start(t); s.stop(t + dur);
}
const kick = (o, t, gain = 0.9) => tone(o, t, 150, 0.35, { type: 'sine', gain, attack: 0.003, glideTo: 45 });
const N = { C5: 523.25, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, E6: 1318.5, G6: 1568, D5: 587.33, G4: 392, C4: 261.63, Bb3: 233.08, F4: 349.23 };

// Built-in kit — short, punchy, on-brand (stadium / matchday feel)
export const SYNTH = {
  follow(o) { const { t } = o; tone(o, t, N.E5, 0.35, { gain: 0.6 }); tone(o, t + 0.12, N.B5, 0.6, { gain: 0.6 }); },
  sub(o) {
    const { t } = o;
    [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(o, t + i * 0.09, f, 0.5, { gain: 0.4 }));
    tone(o, t + 0.36, N.E6, 0.9, { type: 'sine', gain: 0.25 }); kick(o, t, 0.6);
  },
  resub(o) { SYNTH.sub(o); tone(o, o.t + 0.5, N.G6, 0.7, { type: 'sine', gain: 0.18 }); },
  gift(o, amount = 1) {
    const reps = Math.min(Math.max(1, amount), 5);
    for (let r = 0; r < reps; r++) [N.G5, N.C6, N.E6].forEach((f, i) => tone(o, o.t + r * 0.22 + i * 0.06, f, 0.3, { gain: 0.32 }));
    kick(o, o.t, 0.6);
  },
  cheer(o, amount = 100) {
    const n = Math.min(3 + Math.floor(Math.log10(Math.max(amount, 1)) * 2), 9);
    for (let i = 0; i < n; i++) tone(o, o.t + i * 0.07, N.B5 * (1 + (i % 3) * 0.26), 0.12, { type: 'square', gain: 0.2, attack: 0.002 });
    tone(o, o.t + n * 0.07, N.E6, 0.5, { type: 'triangle', gain: 0.55 });
  },
  raid(o) {
    const { t } = o;
    // drum roll into a two-chord stadium horn
    for (let i = 0; i < 8; i++) noise(o, t + i * 0.08, 0.12, { freq: 1800, gain: 0.25 + i * 0.03, attack: 0.003 });
    [[N.C4, N.E5 / 2, N.G4], [N.F4, N.C5 / 1, N.Bb3 * 2]].forEach((chord, ci) =>
      chord.forEach(f => tone(o, t + 0.7 + ci * 0.55, f, 0.6, { type: 'sawtooth', gain: 0.14, attack: 0.04 })));
    kick(o, t + 0.7); kick(o, t + 1.25);
    noise(o, t + 0.7, 2.2, { freq: 900, q: 0.4, gain: 0.18, attack: 0.4 });
  },
  redeem(o) { tone(o, o.t, N.G5, 0.18, { type: 'sine', gain: 0.6, glideTo: N.C6 }); tone(o, o.t + 0.12, N.E6, 0.35, { type: 'sine', gain: 0.45 }); },
  goal(o) {
    const { t } = o;
    // horn blast + crowd roar swell
    [N.C4, N.G4, N.C5].forEach(f => tone(o, t, f, 1.1, { type: 'sawtooth', gain: 0.13, attack: 0.03 }));
    [N.C4, N.G4, N.E5].forEach(f => tone(o, t + 1.2, f, 1.4, { type: 'sawtooth', gain: 0.13, attack: 0.03 }));
    kick(o, t); kick(o, t + 1.2);
    noise(o, t, 3.6, { freq: 700, q: 0.3, gain: 0.35, attack: 0.6 });
    noise(o, t + 0.2, 3.2, { freq: 2200, q: 0.5, gain: 0.12, attack: 0.8 });
  },
};

const resolveSrc = src => /^(https?:|data:|blob:)/.test(src) ? src : new URL(src.replace(/^\//, ''), new URL('../', import.meta.url)).href;

export function playAlertSound(type, { volume = 0.6, src = '', amount } = {}) {
  if (src === 'none' || volume <= 0) return Promise.resolve();
  if (src) {
    const a = new Audio(resolveSrc(src)); a.volume = Math.min(1, volume);
    return a.play().catch(e => console.warn('[sounds]', e.message));
  }
  const fn = SYNTH[type]; if (!fn) return Promise.resolve();
  try { fn(out(volume), amount); } catch (e) { console.warn('[sounds]', e.message); }
  return Promise.resolve();
}

export function speak(text, { volume = 0.8, rate = 1.02, delay = 1200 } = {}) {
  if (!('speechSynthesis' in window) || !text) return;
  setTimeout(() => {
    const u = new SpeechSynthesisUtterance(String(text).slice(0, 200));
    u.volume = volume; u.rate = rate; u.lang = 'en-US';
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }, delay);
}
