import { SUB } from '../consts.js';

export const TYPES = {};

export function register(name, def) { TYPES[name] = def; }

export function spawnEntity(s, type, x, y, props = {}) {
  if (!TYPES[type]) throw new Error(`unknown entity type ${type}`);
  const e = {
    id: s.nextId++, type, x, y, w: 14, h: 14, vx: 0, vy: 0, dir: -1, onGround: false,
    state: '', t: 0, spawn: -1, dead: false, harmful: false, stompable: false, solidTop: false,
    ...props,
  };
  TYPES[type].init?.(e, s);
  s.entities.push(e);
  return e;
}

export function updateEntities(s) {
  // Index loop: entities spawned this frame (e.g. fireballs) update next frame.
  const n = s.entities.length;
  for (let i = 0; i < n; i++) {
    const e = s.entities[i];
    if (!e.dead) { e.t++; TYPES[e.type].update(e, s); }
  }
  s.entities = s.entities.filter(e => !e.dead);
}

export function killEntity(s, e) {
  e.dead = true;
  if (e.spawn >= 0) s.spawned[e.spawn] = 2;
}

// Classic "flip and fall off the screen" death. The entity stays alive as scenery until it leaves.
export function flipKill(s, e, pts = 100) {
  if (e.spawn >= 0) s.spawned[e.spawn] = 2;
  e.spawn = -1;
  e.state = 'flipped'; e.harmful = false; e.stompable = false; e.solidTop = false;
  e.vy = -48; e.vx = (e.vx >= 0 ? 1 : -1) * 8;
  s.events.push({ e: 'sfx', id: 'kick' });
  if (pts) s.events.push({ e: 'score', pts, x: e.x, y: e.y });
}

// Move a flipped entity; returns true if it handled the update.
export function updateFlipped(e, s) {
  if (e.state !== 'flipped') return false;
  e.vy = Math.min(e.vy + 4, 64);
  e.x += e.vx; e.y += e.vy;
  if (e.y > s.lv.h * 16 * SUB + 64 * SUB) e.dead = true;
  return true;
}
