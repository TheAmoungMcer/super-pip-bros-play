import { register, flipKill, updateFlipped, TYPES } from './index.js';
import { walk, face, comboScore, COMBO } from './common.js';
import { moveBody, overlaps } from '../physics.js';
import { hitBlock } from '../sim.js';
import { hurtPlayer } from '../powerups.js';
import { SUB, TS, BTN } from '../consts.js';

export const SHELL_SPEED = 48, WAKE_FRAMES = 480;
const SHELL_H = 14;

const VARIANTS = {
  shellback_green: { h: 24, ledges: false, wings: false, fireproof: false },
  shellback_red: { h: 24, ledges: true, wings: false, fireproof: false },
  shellback_winged: { h: 24, ledges: false, wings: true, fireproof: false },
  bumblebeetle: { h: 14, ledges: false, wings: false, fireproof: true },
};

const setHeight = (e, h) => { e.y += (e.h - h) * SUB; e.h = h; };

function toShell(e) {
  setHeight(e, SHELL_H);
  e.state = 'shell'; e.vx = 0; e.wake = 0;
  e.harmful = false; e.stompable = true; e.walker = false;
}

function kick(e, s, p, dir) {
  e.state = 'slide'; e.dir = dir; e.harmful = true; e.stompable = true;
  e.kickGrace = 8; e.combo = 0;
  if (p) p.kickTimer = 10;
  s.events.push({ e: 'sfx', id: 'kick' });
}

const awayFrom = (p, e) => (p.x + (p.w * SUB >> 1) < e.x + (e.w * SUB >> 1) ? 1 : -1);

function shellHits(e, s, carrier) {
  for (const o of s.entities) {
    if (o === e || o.dead || !o.enemy || o.state === 'flipped' || !overlaps(e, o)) continue;
    const pts = COMBO[Math.min(e.combo++, COMBO.length - 1)];
    TYPES[o.type].hit?.(o, s, 'shell', e);
    if (o.state === 'flipped' || o.dead) s.events.push({ e: 'score', pts, x: o.x, y: o.y });
    if (carrier) { carrier.carry = -1; flipKill(s, e, 0); return; }
  }
}

function makeShellback(name) {
  const V = VARIANTS[name];
  return {
    init(e, s) {
      e.w = 14; e.h = V.h; e.enemy = true; e.harmful = true; e.stompable = true; e.walker = true;
      e.state = V.wings ? 'fly' : 'walk';
      face(e, s);
    },
    update(e, s) {
      if (updateFlipped(e, s)) return;
      switch (e.state) {
        case 'fly':
          if (e.onGround) { e.vy = -56; e.onGround = false; }
          walk(e, s, 8, { grav: 3 });
          break;
        case 'walk':
          walk(e, s, 8, { turnAtLedges: V.ledges });
          break;
        case 'shell':
          e.vx = 0; e.vy = Math.min(e.vy + 5, 64); moveBody(e, s.lv);
          if (++e.wake > WAKE_FRAMES) {
            setHeight(e, V.h);
            e.state = 'walk'; e.harmful = true; e.walker = true;
            face(e, s);
          }
          break;
        case 'slide': {
          if (e.kickGrace > 0) e.kickGrace--;
          e.vx = e.dir * SHELL_SPEED; e.vy = Math.min(e.vy + 5, 64);
          const r = moveBody(e, s.lv);
          if (r.wall) {
            const tx = Math.floor((r.wall > 0 ? e.x + e.w * SUB : e.x - 1) / TS);
            const ty = Math.floor((e.y + (e.h * SUB >> 1)) / TS);
            hitBlock(s, { tx, ty, by: -1, big: true });
            e.dir = -r.wall;
            s.events.push({ e: 'sfx', id: 'bump' });
          }
          shellHits(e, s, null);
          break;
        }
        case 'carried': {
          const p = s.players.find(q => q.carry === e.id);
          if (!p || p.dead || p.growTimer > 0) { if (p) p.carry = -1; toShell(e); break; }
          e.x = p.dir > 0 ? p.x + (p.w - 4) * SUB : p.x - (e.w - 4) * SUB;
          e.y = p.y + (p.h - e.h) * SUB - (p.h > 16 ? 6 * SUB : 0);
          if (!(p.prev & BTN.B)) { p.carry = -1; kick(e, s, p, p.dir); break; }
          shellHits(e, s, p);
          break;
        }
      }
    },
    stomp(e, s, p) {
      s.events.push({ e: 'sfx', id: 'stomp' });
      if (e.state === 'fly') { e.state = 'walk'; e.vy = 0; }
      else if (e.state === 'walk') toShell(e);
      else if (e.state === 'slide') { e.state = 'shell'; e.vx = 0; e.wake = 0; e.harmful = false; }
      else if (e.state === 'shell') kick(e, s, p, awayFrom(p, e));
    },
    touch(e, s, p) {
      if (e.state === 'carried') return;
      if (e.state === 'shell') {
        if ((p.prev & BTN.B) && p.carry < 0) {
          p.carry = e.id; e.state = 'carried'; e.harmful = false; e.stompable = false;
        } else kick(e, s, p, awayFrom(p, e));
        return;
      }
      if (e.state === 'slide' && e.kickGrace > 0) return;
      hurtPlayer(s, p);
    },
    hit(e, s, kind) {
      if (kind === 'fire' && V.fireproof) return;
      if (e.state === 'carried') { const p = s.players.find(q => q.carry === e.id); if (p) p.carry = -1; }
      flipKill(s, e, 100);
    },
  };
}

for (const name of Object.keys(VARIANTS)) register(name, makeShellback(name));

register('spikebug', {
  init(e, s) { e.w = 14; e.h = 14; e.enemy = true; e.harmful = true; e.walker = true; face(e, s); },
  update(e, s) { if (!updateFlipped(e, s)) walk(e, s, 8); },
  hit(e, s) { flipKill(s, e, 100); },
});
