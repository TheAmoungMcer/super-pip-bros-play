import { register, spawnEntity, flipKill, updateFlipped } from './index.js';
import { walk, face, nearestPlayer, markKilled } from './common.js';
import { SUB, TS } from '../consts.js';

const PIPE_CLEAR = 24 * SUB;
const SIN = Array.from({ length: 64 }, (_, i) => Math.round(Math.sin((i * Math.PI) / 32) * 256));

function playerNear(s, cx, dist) {
  return s.players.some(p => !p.dead && Math.abs(p.x + (p.w * SUB >> 1) - cx) < dist);
}

function poof(s, e) {
  markKilled(s, e);
  e.dead = true;
  spawnEntity(s, 'puff', e.x, e.y);
  s.events.push({ e: 'sfx', id: 'kick' }, { e: 'score', pts: 100, x: e.x, y: e.y });
}

// Pipe plant. Cycle: hidden(wait) -> rising -> up -> sinking.
function snap(fires) {
  return {
    init(e) {
      e.w = 16; e.h = 24; e.enemy = true;
      e.x = Math.floor(e.x / TS) * TS + TS - 8 * SUB;    // centred on the 2-wide pipe
      e.state = 'wait'; e.timer = 60; e.persistent = false;
    },
    update(e, s) {
      if (e.baseY === undefined) { e.baseY = e.y; e.y = e.baseY + e.h * SUB; }
      const hiddenY = e.baseY + e.h * SUB;
      e.timer--;
      switch (e.state) {
        case 'wait':
          if (e.timer <= 0 && !playerNear(s, e.x + 8 * SUB, PIPE_CLEAR)) { e.state = 'rise'; }
          break;
        case 'rise':
          e.y = Math.max(e.baseY, e.y - e.h * SUB / 24);
          if (e.y === e.baseY) { e.state = 'up'; e.timer = 60; }
          break;
        case 'up':
          if (fires && e.timer === 30) {
            const p = nearestPlayer(s, e);
            if (p) {
              const dir = p.x < e.x ? -1 : 1;
              const vy = p.y < e.y ? -12 : 12;
              spawnEntity(s, 'enemyfire', e.x + 4 * SUB, e.y + 2 * SUB, { vx: dir * 24, vy });
            }
          }
          if (e.timer <= 0) e.state = 'sink';
          break;
        case 'sink':
          e.y = Math.min(hiddenY, e.y + e.h * SUB / 24);
          if (e.y === hiddenY) { e.state = 'wait'; e.timer = 90; }
          break;
      }
      e.harmful = e.y < hiddenY;
    },
    hit(e, s) { poof(s, e); },
  };
}
register('snapvine', snap(false));
register('firesnapvine', snap(true));

register('enemyfire', {
  init(e) { e.w = 8; e.h = 8; e.harmful = true; },
  update(e) { e.x += e.vx; e.y += e.vy; if (e.t > 300) e.dead = true; },
});

register('boombolt', {
  init(e) { e.w = 16; e.h = 14; e.harmful = true; e.stompable = true; e.enemy = true; },
  update(e, s) { if (updateFlipped(e, s)) return; e.x += e.vx; if (e.t > 600) e.dead = true; },
  stomp(e, s) { flipKill(s, e, 0); s.events.push({ e: 'sfx', id: 'stomp' }); },
  hit(e, s, kind) { if (kind !== 'fire') flipKill(s, e, 100); },
});

export function fireCannons(s) {
  for (const c of s.cannons) {
    if ((s.frame + c.tx * 37) % 180 !== 0) continue;
    const cx = c.tx * TS + 8 * SUB;
    const seen = s.cams.some(cam => c.tx * 16 + 16 > cam.x && c.tx * 16 < cam.x + 256);
    if (!seen || playerNear(s, cx, PIPE_CLEAR)) continue;
    const p = nearestPlayer(s, { x: cx });
    if (!p) continue;
    const dir = p.x < cx ? -1 : 1;
    spawnEntity(s, 'boombolt', dir < 0 ? c.tx * TS - 16 * SUB : (c.tx + 1) * TS, c.ty * TS + SUB, { vx: dir * 24, dir });
    s.events.push({ e: 'sfx', id: 'cannon' });
  }
}

register('ember', {
  init(e) { e.w = 12; e.h = 14; e.harmful = true; e.state = 'wait'; e.timer = 40; },
  update(e, s) {
    if (e.home === undefined) e.home = e.y;
    if (e.state === 'wait') {
      if (--e.timer <= 0) { e.state = 'leap'; e.vy = -88; }
      return;
    }
    e.vy = Math.min(e.vy + 3, 64);
    e.y += e.vy;
    if (e.vy > 0 && e.y >= e.home) { e.y = e.home; e.state = 'wait'; e.timer = 120; }
  },
});

register('rotodisc', {
  init(e) {
    e.w = 12; e.h = 12; e.harmful = true; e.persistent = false;
    e.cx = Math.floor(e.x / TS) * TS + 8 * SUB;
    e.phase = 0;
  },
  update(e, s) {
    if (e.cy === undefined) e.cy = Math.floor(e.y / TS) * TS + 8 * SUB;
    e.phase = (e.phase + 1) & 127;
    const i = e.phase >> 1;
    e.x = e.cx + Math.round((SIN[(i + 16) & 63] * 40 * SUB) / 256) - 6 * SUB;
    e.y = e.cy + Math.round((SIN[i] * 40 * SUB) / 256) - 6 * SUB;
  },
});

register('boneshell', {
  init(e, s) { e.w = 14; e.h = 24; e.enemy = true; e.harmful = true; e.stompable = true; e.walker = true; e.state = 'walk'; face(e, s); },
  update(e, s) {
    if (updateFlipped(e, s)) return;
    if (e.state === 'collapsed') {
      if (--e.timer <= 0) { e.state = 'walk'; e.harmful = true; e.stompable = true; face(e, s); }
      e.vy = Math.min(e.vy + 5, 64);
      return;
    }
    walk(e, s, 8, { turnAtLedges: true });
  },
  stomp(e, s) { collapse(e, s); },
  hit(e, s, kind) {
    if (kind === 'fire') return;
    if (kind === 'tail' || kind === 'bump') { collapse(e, s); return; }
    flipKill(s, e, 100);
  },
});

function collapse(e, s) {
  e.state = 'collapsed'; e.timer = 240; e.harmful = false; e.stompable = false;
  s.events.push({ e: 'sfx', id: 'stomp' });
}
