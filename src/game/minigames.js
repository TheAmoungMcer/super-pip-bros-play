import { BTN } from './consts.js';
import { randInt } from './rng.js';

const pressedOf = (state, inputs) => {
  let any = 0, who = -1;
  inputs.forEach((b, i) => {
    const p = b & ~(state.prev?.[i] | 0);
    if (p && who < 0) who = i;
    any |= p;
  });
  state.prev = [...inputs];
  return { any, who };
};

export function createHut(rng) {
  const pool = ['berry', 'blossom', 'leaf'];
  for (let i = pool.length - 1; i > 0; i--) { const j = randInt(rng, i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return { chests: pool, cursor: 1, opened: -1, t: 0, done: false, winner: -1, prev: [0, 0] };
}

export function stepHut(h, inputs) {
  const { any, who } = pressedOf(h, inputs);
  if (h.opened >= 0) { if (++h.t >= 90) h.done = true; return null; }
  if (any & BTN.LEFT) h.cursor = Math.max(0, h.cursor - 1);
  if (any & BTN.RIGHT) h.cursor = Math.min(2, h.cursor + 1);
  if (any & BTN.A) {
    h.opened = h.cursor; h.winner = who;
    return { give: h.chests[h.cursor], to: who };
  }
  return null;
}

export const SLOT_STRIDE = 32;
const PAY = [2, 3, 5];

export function createSlots(seed) {
  return { reels: [seed * 7 % 96, seed * 13 % 96, seed * 29 % 96], speeds: [3, 4, 5], stopped: 0, t: 0, done: false, result: -1, lives: 0, prev: [0, 0] };
}

export const slotPicture = (pos) => Math.floor(pos / SLOT_STRIDE) % 3;

export function stepSlots(sl, inputs) {
  const { any } = pressedOf(sl, inputs);
  if (sl.result >= 0) { if (++sl.t >= 120) sl.done = true; return null; }
  for (let i = sl.stopped; i < 3; i++) sl.reels[i] = (sl.reels[i] + sl.speeds[i]) % (SLOT_STRIDE * 3);
  if (!(any & BTN.A)) return null;
  // Snap the stopped reel to the picture it is showing.
  const i = sl.stopped;
  sl.reels[i] = slotPicture(sl.reels[i]) * SLOT_STRIDE;
  sl.stopped++;
  if (sl.stopped < 3) return null;
  const pics = sl.reels.map(slotPicture);
  sl.result = pics.every(p => p === pics[0]) ? pics[0] : 3;
  sl.lives = sl.result < 3 ? PAY[sl.result] : 0;
  return { lives: sl.lives };
}
