import { register } from './index.js';
import { SUB } from '../consts.js';

// Coin that pops out of a block, spins up and vanishes.
register('coinpop', {
  init(e) { e.vy = -64; e.w = 8; e.h = 14; },
  update(e) { e.vy += 4; e.y += e.vy; if (e.t > 28) e.dead = true; },
});

// Brick fragments: four pieces flying apart.
register('brickbit', {
  init(e) { e.w = 8; e.h = 8; },
  update(e, s) { e.vy = Math.min(e.vy + 4, 64); e.x += e.vx; e.y += e.vy; if (e.y > s.lv.h * 16 * SUB) e.dead = true; },
});

// Floating score number.
register('popup', {
  init(e) { e.vy = -16; },
  update(e) { e.y += e.vy; if (e.t > 40) e.dead = true; },
});
