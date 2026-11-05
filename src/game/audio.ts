// Original plaza and meadow themes. Same job as a capital-town tune and a field tune,
// written for this game — not a commercial soundtrack.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let musicLevel = 0.2;
let sfxEnabled = true;
let track: "town" | "field" | null = null;
let pending: "town" | "field" | null = null;
let beat = 0;
let nextAt = 0;
let noise: AudioBuffer | null = null;

const TOWN_MELODY = [
  76, 74, 71, 0, 74, 76, 79, 0, 78, 76, 74, 71, 69, 0, 67, 0, 74, 71, 69, 67, 0, 69, 71, 0, 74, 76, 74, 71,
  69, 67, 64, 0, 76, 79, 81, 79, 76, 74, 0, 71, 74, 76, 79, 0, 78, 76, 74, 0, 71, 74, 76, 74, 71, 69, 67, 0,
  69, 67, 64, 67, 0, 62, 64, 67,
];
const TOWN_BASS = [55, 50, 52, 48, 55, 53, 50, 55];
const TOWN_PAD = [
  [67, 71, 74],
  [62, 65, 69],
  [64, 67, 71],
  [60, 64, 67],
  [67, 71, 74],
  [65, 69, 72],
  [62, 66, 69],
  [55, 59, 62],
];
const FIELD_MELODY = [
  76, 0, 74, 72, 71, 0, 69, 67, 64, 0, 67, 69, 71, 0, 72, 0, 74, 72, 71, 69, 67, 0, 64, 0, 76, 74, 72, 71,
  69, 67, 64, 0, 79, 0, 76, 74, 72, 71, 0, 69, 71, 72, 0, 74, 72, 71, 69, 67, 0, 64, 62, 64, 67, 69, 0, 67, 0,
  64, 0, 62, 64, 67, 0,
];
const FIELD_BASS = [52, 47, 45, 50, 52, 45, 47, 40];

function midi(m: number) {
  return 440 * 2 ** ((m - 69) / 12);
}

export function trackTitle(kind: "town" | "field") {
  return kind === "town" ? "Plaza Theme" : "South Field";
}

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    musicGain = ctx.createGain();
    sfxGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2800;
    musicGain.connect(filter);
    filter.connect(master);
    sfxGain.connect(master);
    master.connect(ctx.destination);
    master.gain.value = 0.9;
    musicGain.gain.value = musicLevel;
    sfxGain.gain.value = 0.8;
    const len = Math.floor(ctx.sampleRate * 0.2);
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    document.addEventListener("visibilitychange", () => {
      if (!ctx || !musicGain) return;
      if (document.hidden) musicGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
      else {
        void ctx.resume();
        musicGain.gain.setTargetAtTime(musicLevel, ctx.currentTime, 0.08);
      }
    });
  }
  if (ctx.state === "suspended") void ctx.resume();
  if (pending) {
    const k = pending;
    pending = null;
    setTrack(k);
  }
}

export function setMusicOn(on: boolean) {
  musicLevel = on ? 0.2 : 0;
  if (ctx && musicGain) musicGain.gain.setTargetAtTime(musicLevel, ctx.currentTime, 0.05);
}

export function setSfxOn(on: boolean) {
  sfxEnabled = on;
}

export function setTrack(kind: "town" | "field") {
  if (!ctx) {
    pending = kind;
    return;
  }
  if (track === kind) return;
  track = kind;
  beat = 0;
  nextAt = ctx.currentTime + 0.06;
}

function tone(when: number, dur: number, freq: number, type: OscillatorType, gainVal: number, dest: AudioNode) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainVal), when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.05, dur));
  o.connect(g);
  g.connect(dest);
  o.start(when);
  o.stop(when + dur + 0.02);
}

function schedule(kind: "town" | "field", index: number, when: number, eighth: number) {
  if (!musicGain) return;
  const melody = kind === "town" ? TOWN_MELODY : FIELD_MELODY;
  const note = melody[index] ?? 0;
  if (note > 0) {
    tone(when, eighth * (kind === "town" ? 1.35 : 1.15), midi(note), "triangle", kind === "town" ? 0.055 : 0.05, musicGain);
    tone(when + 0.01, eighth, midi(note), "sine", 0.02, musicGain);
  }
  if (index % 2 === 1) {
    const bar = (index / 8) | 0;
    const chord = (kind === "town" ? TOWN_PAD : [[64, 67, 71], [59, 62, 66], [57, 60, 64], [62, 66, 69], [64, 67, 71], [57, 60, 64], [59, 62, 66], [52, 55, 59]])[bar];
    const plucked = chord?.[index % chord.length];
    if (plucked) tone(when, 0.22, midi(plucked), "sine", 0.03, musicGain);
  }
  if (index % 8 === 0) {
    const bar = (index / 8) | 0;
    const bass = (kind === "town" ? TOWN_BASS : FIELD_BASS)[bar] ?? 48;
    tone(when, eighth * 7.2, midi(bass), "triangle", 0.05, musicGain);
    if (kind === "town") {
      for (const p of TOWN_PAD[bar] ?? []) tone(when, eighth * 7.2, midi(p), "sine", 0.011, musicGain);
    } else {
      tone(when, 0.06, midi(bass + 24), "triangle", 0.02, musicGain);
    }
  }
}

export function tick() {
  if (!ctx || !track || !musicGain) return;
  const bpm = track === "town" ? 92 : 104;
  const eighth = 60 / bpm / 2;
  let guard = 0;
  while (nextAt < ctx.currentTime + 0.35 && guard < 16) {
    schedule(track, beat, nextAt, eighth);
    beat = (beat + 1) % 64;
    nextAt += eighth;
    guard++;
  }
}

function blip(freq: number, dur: number, type: OscillatorType, gain: number) {
  if (!ctx || !sfxGain || !sfxEnabled) return;
  tone(ctx.currentTime, dur, freq, type, gain, sfxGain);
}

export function sfxCast() {
  if (!ctx || !sfxGain || !sfxEnabled) return;
  [72, 76, 79, 84].forEach((m, i) => tone(ctx!.currentTime + i * 0.045, 0.12, midi(m), "sine", 0.045, sfxGain!));
}
export function sfxPickup() {
  blip(680, 0.05, "sine", 0.045);
  if (ctx && sfxGain && sfxEnabled) tone(ctx.currentTime + 0.05, 0.09, 920, "sine", 0.04, sfxGain);
}
export function sfxDown() {
  if (!ctx || !sfxGain || !sfxEnabled) return;
  [65, 60, 55, 50].forEach((m, i) => tone(ctx!.currentTime + i * 0.07, 0.16, midi(m), "triangle", 0.06, sfxGain!));
}
export function sfxSwing() {
  blip(210, 0.05, "square", 0.04);
  if (ctx && sfxGain && sfxEnabled) tone(ctx.currentTime, 0.09, 140, "triangle", 0.03, sfxGain);
}
export function sfxBow() {
  if (!ctx || !sfxGain || !sfxEnabled) return;
  tone(ctx.currentTime, 0.07, 540, "triangle", 0.04, sfxGain);
  tone(ctx.currentTime + 0.04, 0.12, 220, "sine", 0.03, sfxGain);
}
export function sfxClick() {
  blip(620, 0.05, "sine", 0.04);
}
export function sfxHit() {
  if (!ctx || !sfxGain || !sfxEnabled || !noise) return;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.85 + Math.random() * 0.3;
  const g = ctx.createGain();
  g.gain.value = 0.18;
  src.connect(g);
  g.connect(sfxGain);
  src.start();
  blip(180 + Math.random() * 40, 0.08, "square", 0.05);
}
export function sfxMiss() {
  blip(140, 0.08, "sine", 0.04);
}
export function sfxHeal() {
  if (!ctx || !sfxGain || !sfxEnabled) return;
  tone(ctx.currentTime, 0.18, 520, "sine", 0.06, sfxGain);
  tone(ctx.currentTime + 0.08, 0.2, 780, "sine", 0.05, sfxGain);
}
export function sfxLevel() {
  if (!ctx || !sfxGain || !sfxEnabled) return;
  [60, 64, 67, 72].forEach((m, i) => tone(ctx!.currentTime + i * 0.09, 0.18, midi(m + 12), "triangle", 0.07, sfxGain!));
}
export function sfxCoin() {
  blip(880, 0.07, "square", 0.04);
  if (ctx && sfxGain && sfxEnabled) tone(ctx.currentTime + 0.07, 0.1, 1320, "square", 0.04, sfxGain);
}
export function sfxEquip() {
  blip(440, 0.07, "triangle", 0.05);
  if (ctx && sfxGain && sfxEnabled) tone(ctx.currentTime + 0.06, 0.1, 660, "triangle", 0.05, sfxGain);
}
export function sfxPortal() {
  if (!ctx || !sfxGain || !sfxEnabled) return;
  tone(ctx.currentTime, 0.28, 320, "sine", 0.05, sfxGain);
  tone(ctx.currentTime + 0.08, 0.3, 640, "sine", 0.04, sfxGain);
}
export function sfxFoot() {
  blip(180 + Math.random() * 30, 0.04, "sine", 0.02);
}
