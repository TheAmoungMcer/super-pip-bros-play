import { SONGS, SFX } from '../content/music.js';

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function noteFreq(name) {
  const m = /^([A-G]#?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  const midi = (Number(m[2]) + 1) * 12 + NAMES.indexOf(m[1]);
  return 440 * 2 ** ((midi - 69) / 12);
}

export function parseTrack(str) {
  const out = [];
  let beat = 0;
  for (const tok of str.split(/\s+/)) {
    if (!tok || tok === '|') continue;
    const [name, d] = tok.split('/');
    const dotted = d.endsWith('.');
    const dur = (4 / Number(dotted ? d.slice(0, -1) : d)) * (dotted ? 1.5 : 1);
    out.push({ beat, dur, note: name === 'r' ? null : name });
    beat += dur;
  }
  return out;
}

export const trackBeats = (str) => parseTrack(str).reduce((a, e) => a + e.dur, 0);

function pulseWave(ctx, duty) {
  const N = 256, H = 48, real = new Float32Array(H), imag = new Float32Array(H);
  for (let n = 1; n < H; n++) {
    let re = 0, im = 0;
    for (let k = 0; k < N; k++) {
      const x = k / N < duty ? 1 : -1;
      re += x * Math.cos((2 * Math.PI * n * k) / N);
      im += x * Math.sin((2 * Math.PI * n * k) / N);
    }
    real[n] = (2 * re) / N; imag[n] = (2 * im) / N;
  }
  return ctx.createPeriodicWave(real, imag);
}

function noiseBuffer(ctx) {
  const len = ctx.sampleRate, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let lfsr = 1;
  for (let i = 0; i < len; i++) {
    if (i % 8 === 0) { const bit = (lfsr ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 14); }
    d[i] = lfsr & 1 ? 0.6 : -0.6;
  }
  return buf;
}

const DRUM = { k: { rate: 0.25, dur: 0.15 }, s: { rate: 1, dur: 0.12 }, h: { rate: 2, dur: 0.04 } };

export function createAudio() {
  let ctx = null, master = null, waves = {}, noise = null;
  let song = null, songId = null, songStart = 0, tempoScale = 1, muted = false;

  function voice(kind, freq, t, dur, vol, duty = 0.5) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.setValueAtTime(vol, t + Math.max(0.01, dur - 0.02));
    g.gain.linearRampToValueAtTime(0, t + dur);
    g.connect(master);
    if (kind === 'noise') {
      const src = ctx.createBufferSource();
      src.buffer = noise; src.loop = true; src.playbackRate.value = freq;
      src.connect(g); src.start(t); src.stop(t + dur);
      return src;
    }
    const o = ctx.createOscillator();
    if (kind === 'triangle') o.type = 'triangle';
    else o.setPeriodicWave(waves[duty] || (waves[duty] = pulseWave(ctx, duty)));
    o.frequency.setValueAtTime(freq, t);
    o.connect(g); o.start(t); o.stop(t + dur);
    return o;
  }

  function schedule() {
    if (!song) return;
    const spb = 60 / (song.bpm * tempoScale);
    const horizon = ctx.currentTime + 0.15;
    for (const ch of ['p1', 'p2', 'tri', 'noise']) {
      const ev = song.parsed[ch], pos = song.pos[ch];
      if (!ev.length) continue;
      for (;;) {
        if (pos.i >= ev.length) {
          if (!song.loop) break;
          pos.i = 0; pos.loop++;
        }
        const e = ev[pos.i];
        const t = songStart + (pos.loop * song.beats + e.beat) * spb;
        if (t > horizon) break;
        pos.i++;
        if (!e.note || t < ctx.currentTime - 0.05) continue;
        const dur = e.dur * spb * (ch === 'noise' ? 1 : 0.9);
        if (ch === 'noise') { const d = DRUM[e.note]; voice('noise', d.rate, t, Math.min(d.dur, dur), 0.12); }
        else if (ch === 'tri') voice('triangle', noteFreq(e.note), t, dur, 0.22);
        else voice('pulse', noteFreq(e.note), t, dur, ch === 'p1' ? 0.1 : 0.07, ch === 'p1' ? 0.5 : 0.25);
      }
    }
  }

  return {
    unlock() {
      if (ctx) { ctx.resume(); return; }
      ctx = new AudioContext();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
      noise = noiseBuffer(ctx);
      setInterval(schedule, 25);
      if (songId) this.playSong(songId);
    },
    playSong(id) {
      songId = id;
      if (!ctx) return;
      const def = SONGS[id];
      if (!def) return;
      const parsed = { p1: [], p2: [], tri: [], noise: [] };
      for (const ch of Object.keys(parsed)) if (def[ch]) parsed[ch] = parseTrack(def[ch]);
      const lead = Object.keys(parsed).find(ch => parsed[ch].length);
      const pos = Object.fromEntries(Object.keys(parsed).map(ch => [ch, { i: 0, loop: 0 }]));
      song = { ...def, parsed, pos, beats: trackBeats(def[lead]) };
      songStart = ctx.currentTime + 0.05;
    },
    stopSong() { song = null; songId = null; },
    sfx(id) {
      const d = SFX[id];
      if (!ctx || !d) return;
      const t = ctx.currentTime + 0.01;
      if (d.sweep) {
        const o = voice(d.sweep.wave === 'triangle' ? 'triangle' : 'pulse', d.sweep.from, t, d.sweep.dur, 0.12, d.sweep.duty || 0.5);
        o.frequency.exponentialRampToValueAtTime(d.sweep.to, t + d.sweep.dur);
      }
      if (d.noise) voice('noise', d.noise.rate, t, d.noise.dur, 0.15);
      if (d.notes) {
        const spb = 60 / (d.bpm || 150);
        for (const e of parseTrack(d.notes)) if (e.note) voice('pulse', noteFreq(e.note), t + e.beat * spb, e.dur * spb, 0.12, 0.5);
      }
    },
    // Like SMB3's "hurry up": the current song restarts at the new tempo.
    setTempoScale(x) { tempoScale = x; if (songId) this.playSong(songId); },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.8; },
    get muted() { return muted; },
  };
}
