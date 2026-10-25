import { register } from './index.js';
import { walk } from './common.js';
import { moveBody } from '../physics.js';
import { givePower } from '../powerups.js';

// Rise 16 px out of the block over 32 frames.
function emerging(e) {
  if (e.state !== 'emerge') return false;
  e.y -= 8;
  if (e.t >= 32) e.state = 'move';
  return true;
}

const collect = (item) => (e, s, p) => {
  if (e.state === 'emerge' && e.t < 8) return;
  e.dead = true;
  givePower(s, p, item, e);
};

const size = (e) => { e.w = 14; e.h = 16; e.dir = 1; };

register('berry', { init: size, update(e, s) { if (!emerging(e)) walk(e, s, 16); }, touch: collect('berry') });
register('oneup', { init: size, update(e, s) { if (!emerging(e)) walk(e, s, 16); }, touch: collect('oneup') });
register('blossom', { init: size, update(e) { emerging(e); }, touch: collect('blossom') });

register('star', {
  init: size,
  update(e, s) {
    if (emerging(e)) return;
    e.vx = e.dir * 16;
    e.vy = Math.min(e.vy + 3, 64);
    const r = moveBody(e, s.lv);
    if (r.wall) e.dir = -e.dir;
    if (e.onGround) { e.vy = -56; e.onGround = false; }
  },
  touch: collect('star'),
});

// Leaf pops up out of the block, then sways down side to side.
register('leaf', {
  init(e) { e.w = 14; e.h = 14; },
  update(e, s) {
    if (e.state === 'emerge') { e.vy = -64; e.state = 'rise'; }
    if (e.state === 'rise') {
      e.vy += 4; e.y += e.vy;
      if (e.vy >= 0) { e.state = 'fall'; e.t = 0; }
      return;
    }
    e.vx = (e.t & 63) < 32 ? 16 : -16;
    e.x += e.vx; e.y += 8;
    if (e.y > s.lv.h * 256 + 512) e.dead = true;
  },
  touch: collect('leaf'),
});
