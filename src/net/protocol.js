export const PROTOCOL_VERSION = 1;
export const SNAP_EVERY = 3;
// WebRTC doesn't always report a vanished peer, so 5 s of silence counts as a disconnect.
export const SILENCE_FRAMES = 300;
// After this many frames with no guest input, stop replaying their last buttons.
export const STARVED_FRAMES = 6;

export function b64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}
export function unb64(str) {
  const s = atob(str), u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return u8;
}

export function liteSession(sess) {
  const { level, events, rng, prev, dirty, quit, ...rest } = sess;
  return rest;
}

// `sent` remembers what this guest already has: { lv, n } (the level instance and tileLog length sent so far).
// Keyed on the instance, not the id: re-entering the same level must resend every tile.
export function levelSnapshot(s, sent) {
  const lv = s.lv;
  let tiles;
  if (sent.lv !== lv) {
    tiles = { area: lv.id, full: b64(lv.tiles) };
  } else {
    tiles = { area: lv.id, ops: lv.tileLog.slice(sent.n) };
  }
  sent.lv = lv; sent.n = lv.tileLog.length;
  const { lv: _lv, defs, areaStore, spawned, events, ...rest } = s;
  return { ...rest, spawned: Array.from(spawned), tiles };
}

const LOUD = new Set(['sfx', 'clear', 'music']);
export const forGuest = (events) => events.filter(e => LOUD.has(e.e));
