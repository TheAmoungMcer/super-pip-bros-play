import { register } from './index.js';
import { SUB, TS } from '../consts.js';
import { swapPSwitch } from '../sim.js';

register('pswitch', {
  init(e) { e.w = 16; e.h = 16; e.stompable = true; e.persistent = true; },
  update(e) { if (e.state === 'pressed' && e.t > 600) e.dead = true; },
  stomp(e, s) {
    if (e.state === 'pressed') return;
    e.state = 'pressed'; e.stompable = false; e.t = 0;
    s.pswitch = 600;
    swapPSwitch(s, true);
    s.events.push({ e: 'sfx', id: 'stomp' }, { e: 'music', id: 'pswitch' });
  },
  touch() {},
});

const liftBase = (e) => { e.w = 48; e.h = 8; e.solidTop = true; };

register('lift_h', {
  init: liftBase,
  update(e, s) {
    e.prevX = e.x; e.prevY = e.y;
    if (s.players.some(p => p.ride === e.id)) e.falling = true;
    if (e.falling) e.vy = Math.min(e.vy + 2, 32);
    e.x -= 8; e.y += e.vy;
    if (e.y > s.lv.h * TS + 64 * SUB) e.dead = true;
  },
});

register('lift_v', {
  init: liftBase,
  update(e) {
    e.prevX = e.x; e.prevY = e.y;
    if (e.home === undefined) e.home = e.y;
    const phase = e.t % 192;                        // 96 frames up, 96 down, 0.5 px/frame
    e.y = e.home - (phase < 96 ? phase : 192 - phase) * 8;
  },
});
