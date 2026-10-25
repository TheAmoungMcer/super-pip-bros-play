import { SUB, TS, BTN } from '../consts.js';
import { moveBody, overlaps } from '../physics.js';
import { tileAt } from '../level.js';
import { INFO } from '../tiles.js';
import { TYPES } from './index.js';
import { hurtPlayer } from '../powerups.js';

export const COMBO = [100, 200, 400, 800, 1000, 2000, 4000, 8000];

export function markKilled(s, e) {
  if (e.spawn >= 0) s.spawned[e.spawn] = 2;
  e.spawn = -1;
}

export function nearestPlayer(s, e) {
  let best = null, bd = Infinity;
  for (const p of s.players) {
    if (p.dead) continue;
    const d = Math.abs(p.x - e.x);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

export function face(e, s) {
  const p = nearestPlayer(s, e);
  if (p) e.dir = p.x < e.x ? -1 : 1;
}

// Ground walker: gravity, wall turn, optional ledge turn, turn when bumping another walker.
export function walk(e, s, speed, { turnAtLedges = false, grav = 5 } = {}) {
  e.vx = e.dir * speed;
  e.vy = Math.min(e.vy + grav, 64);
  const r = moveBody(e, s.lv);
  if (r.wall) e.dir = -r.wall;
  if (turnAtLedges && e.onGround) {
    const aheadX = e.dir > 0 ? e.x + e.w * SUB : e.x - 1;
    const id = tileAt(s.lv, Math.floor(aheadX / TS), Math.floor((e.y + e.h * SUB) / TS));
    if (!INFO[id].solid && !INFO[id].semi && !INFO[id].slope) e.dir = -e.dir;
  }
  for (const o of s.entities) {
    if (o === e || !o.walker || o.dead || o.state === 'flipped' || !overlaps(e, o)) continue;
    if ((o.x - e.x) * e.dir > 0) e.dir = -e.dir;
  }
  return r;
}

export function bounce(p) {
  p.vy = p.prev & BTN.A ? -64 : -40;
  p.onGround = false;
}

export function comboScore(s, p, e) {
  if (p.combo >= COMBO.length) {
    s.shared.lives++;
    s.events.push({ e: 'sfx', id: '1up' }, { e: 'score', pts: 0, label: '1UP', x: e.x, y: e.y });
  } else {
    s.events.push({ e: 'score', pts: COMBO[p.combo], x: e.x, y: e.y });
  }
  p.combo++;
}

export function playerContacts(s) {
  for (const p of s.players) {
    if (p.dead || p.growTimer > 0) continue;
    if (p.onGround) p.combo = 0;
    for (const e of s.entities) {
      if (e.dead || e.state === 'flipped') continue;
      const def = TYPES[e.type];
      if (!(e.harmful || e.stompable || def.touch) || !overlaps(p, e)) continue;
      if (p.starTimer > 0 && e.harmful && def.hit) { def.hit(e, s, 'star', p); continue; }  // hit() scores via flipKill
      const stomp = p.vy > 0 && p.y + p.h * SUB <= e.y + 10 * SUB;
      if (stomp && e.stompable && def.stomp) { def.stomp(e, s, p); bounce(p); comboScore(s, p, e); }
      else if (def.touch) def.touch(e, s, p);
      else if (e.harmful) hurtPlayer(s, p);
    }
  }
}
