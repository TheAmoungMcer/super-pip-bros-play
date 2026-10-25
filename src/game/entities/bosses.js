import { register, spawnEntity, flipKill, updateFlipped } from './index.js';
import { walk, face, nearestPlayer } from './common.js';
import { moveBody } from '../physics.js';
import { clearLevel } from '../sim.js';
import { SUB } from '../consts.js';

export function damageBoss(s, e) {
  if (e.state === 'spin' || e.state === 'intro' || e.state === 'flipped') return;
  e.hp--;
  s.events.push({ e: 'sfx', id: 'bossHit' });
  if (e.hp <= 0) {
    flipKill(s, e, 5000);
    spawnEntity(s, 'orb', e.x + 6 * SUB, e.y, { persistent: true, vy: -48, wand: e.type === 'grimling' });
    s.events.push({ e: 'boss-defeated' });
    return;
  }
  e.state = 'spin'; e.timer = 60; e.stompable = false; e.harmful = true;
}

function bossHit(e, s, kind) {
  if (kind === 'bump') return;
  if (kind === 'fire') { if (++e.fireHits % 4 === 0) damageBoss(s, e); return; }
  damageBoss(s, e);
}

register('bonebrute', {
  init(e, s) {
    e.w = 24; e.h = 24; e.enemy = true; e.harmful = true; e.stompable = true; e.walker = false;
    e.boss = true; e.hp = 3; e.maxHp = 3; e.persistent = true; e.fireHits = 0;
    e.state = 'intro'; e.timer = 60;
    face(e, s);
  },
  update(e, s) {
    if (updateFlipped(e, s)) return;
    if (e.state === 'intro') {
      e.vy = Math.min(e.vy + 5, 64); moveBody(e, s.lv);
      if (--e.timer <= 0) e.state = 'run';
      return;
    }
    if (e.state === 'spin') {
      e.vx = e.dir * 24; e.vy = Math.min(e.vy + 5, 64);
      const r = moveBody(e, s.lv);
      if (r.wall) e.dir = -r.wall;
      if (--e.timer <= 0) { e.state = 'run'; e.stompable = true; face(e, s); }
      return;
    }
    if (e.t % 30 === 0) face(e, s);
    if (e.onGround && e.t % 90 === 0) { e.vy = -64; e.onGround = false; }
    walk(e, s, 16 + (e.maxHp - e.hp) * 8);
  },
  stomp(e, s) { damageBoss(s, e); },
  hit: bossHit,
});

register('orb', {
  init(e) { e.w = 12; e.h = 12; },
  update(e, s) { e.vy = Math.min(e.vy + 3, 48); moveBody(e, s.lv); },
  touch(e, s, p) { if (e.t < 20) return; e.dead = true; clearLevel(s, p.idx, -1); },   // pops up before it can be grabbed
});
register('grimling', {
  init(e, s) {
    e.w = 24; e.h = 24; e.enemy = true; e.harmful = true; e.stompable = true;
    e.boss = true; e.hp = 3; e.maxHp = 3; e.persistent = true; e.fireHits = 0;
    e.state = 'intro'; e.timer = 60;
    face(e, s);
  },
  update(e, s) {
    if (updateFlipped(e, s)) return;
    e.vy = Math.min(e.vy + 4, 64);
    if (e.state === 'intro') { moveBody(e, s.lv); if (--e.timer <= 0) e.state = 'hop'; return; }
    if (e.state === 'spin') {
      e.vx = e.dir * 32;
      const r = moveBody(e, s.lv);
      if (r.wall) e.dir = -r.wall;
      if (--e.timer <= 0) { e.state = 'hop'; e.stompable = true; e.vx = 0; }
      return;
    }
    face(e, s);
    e.vx = e.onGround ? 0 : e.dir * 12;
    if (e.onGround && e.t % 70 === 0) { e.vy = -56; e.onGround = false; }
    if (e.t % 120 === 60) {
      const p = nearestPlayer(s, e);
      if (p) {
        const dx = p.x - e.x, dy = p.y - e.y, len = Math.max(1, Math.hypot(dx, dy));
        spawnEntity(s, 'wandring', e.x + 6 * SUB, e.y + 4 * SUB, { vx: Math.round((dx / len) * 20), vy: Math.round((dy / len) * 20) });
        s.events.push({ e: 'sfx', id: 'fire' });
      }
    }
    e.state = e.t % 120 > 40 && e.t % 120 < 70 ? 'aim' : 'hop';
    moveBody(e, s.lv);
  },
  stomp(e, s) { damageBoss(s, e); },
  hit: bossHit,
});

register('wandring', {
  init(e) { e.w = 12; e.h = 12; e.harmful = true; },
  update(e) { e.x += e.vx; e.y += e.vy; if (e.t > 240) e.dead = true; },
});
