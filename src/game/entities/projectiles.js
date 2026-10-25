import { register, TYPES, spawnEntity } from './index.js';
import { moveBody, overlaps } from '../physics.js';

register('puff', { init(e) { e.w = 8; e.h = 8; }, update(e) { if (e.t > 12) e.dead = true; } });

register('fireball', {
  init(e) { e.w = 8; e.h = 8; e.vx = e.dir * 64; e.vy = 32; },
  update(e, s) {
    e.vx = e.dir * 64;
    e.vy = Math.min(e.vy + 6, 64);
    const r = moveBody(e, s.lv);
    if (r.wall || e.t > 180) {
      e.dead = true;
      spawnEntity(s, 'puff', e.x, e.y);
      s.events.push({ e: 'sfx', id: 'bump' });
      return;
    }
    if (e.onGround) { e.vy = -40; e.onGround = false; }
    for (const o of s.entities) {
      if (!o.enemy || o.dead || o.state === 'flipped' || !overlaps(e, o)) continue;
      TYPES[o.type].hit?.(o, s, 'fire', e);
      e.dead = true;
      spawnEntity(s, 'puff', e.x, e.y);
      break;
    }
  },
});
