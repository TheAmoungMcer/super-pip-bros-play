import { register, flipKill, updateFlipped } from './index.js';
import { walk, face, markKilled } from './common.js';

const base = (e, s) => {
  e.w = 14; e.h = 14; e.harmful = true; e.stompable = true; e.walker = true; e.enemy = true;
  face(e, s);
};

register('chompkin', {
  init: base,
  update(e, s) {
    if (updateFlipped(e, s)) return;
    if (e.state === 'squished') { if (++e.squish > 30) e.dead = true; return; }
    walk(e, s, 8);
  },
  stomp(e, s) {
    e.state = 'squished'; e.squish = 0;
    e.harmful = false; e.stompable = false; e.walker = false;
    markKilled(s, e);
    s.events.push({ e: 'sfx', id: 'stomp' });
  },
  hit(e, s) { flipKill(s, e, 100); },
});

// Small, small, small, big hop, always toward the nearest player.
register('parachompkin', {
  init(e, s) { base(e, s); e.hop = 0; e.hopWait = 20; },
  update(e, s) {
    if (updateFlipped(e, s)) return;
    if (e.onGround && --e.hopWait <= 0) {
      face(e, s);
      e.vy = e.hop < 3 ? -24 : -60;
      e.hop = (e.hop + 1) % 4;
      e.hopWait = e.hop === 0 ? 50 : 1;
      e.onGround = false;
    }
    walk(e, s, 8, { grav: 3 });
  },
  stomp(e, s) { e.type = 'chompkin'; e.vy = 0; s.events.push({ e: 'sfx', id: 'stomp' }); },
  hit(e, s) { flipKill(s, e, 100); },
});
