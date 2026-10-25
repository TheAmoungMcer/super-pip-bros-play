import { LEVELS } from './content/levels/w1.js';
import { validateLevels } from '../tools/validate-levels.js';
import { createLevelSim, stepLevel } from './game/sim.js';
import { createSession, stepSession, enterNode, WORLDS } from './game/session.js';
import { drawSession } from './draw/scenes.js';
import { createHost } from './net/host.js';
import { createGuest } from './net/guest.js';
import { createLoopback } from './net/transport.js';
import { BTN } from './game/consts.js';

export async function runSelfTest() {
  const fails = []; let n = 0;
  const ok = (c, m) => { n++; if (!c) fails.push(m); };
  ok(validateLevels(LEVELS).length === 0, 'W1 levels valid');
  for (const id of Object.keys(LEVELS).filter(k => !LEVELS[k].sub)) {
    try {
      const route = await (await fetch(`tools/routes/${id}.json`)).json();
      const s = createLevelSim(LEVELS[id], { defs: LEVELS, seed: 1 });
      for (const [b, c] of route.inputs) for (let i = 0; i < c; i++) stepLevel(s, [b]);
      for (let i = 0; i < 1200 && s.mode !== 'done' && s.mode !== 'fail'; i++) stepLevel(s, [0]);
      ok(s.mode === 'done', `${id} route beats the level`);
    } catch (e) { ok(false, `${id} route: ${e.message}`); }
  }
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 240;
  const ctx = canvas.getContext('2d');
  const sess = createSession();
  const draw = (label) => { try { drawSession(ctx, sess, 0); ok(true); } catch (e) { ok(false, `draw ${label}: ${e.message}`); } };
  draw('map');
  enterNode(sess, { kind: 'level', level: '1-1', key: '3,1' }); for (let i = 0; i < 30; i++) stepSession(sess, [BTN.RIGHT]); draw('level');
  sess.level.mode = 'done'; sess.level.clear = { by: 0, card: 0 }; stepSession(sess, [0]); ok(sess.scene === 'map', 'level returns to map');
  enterNode(sess, { kind: 'hut', key: '7,1' }); draw('hut');
  for (let i = 0; i < 200 && sess.scene === 'hut'; i++) stepSession(sess, [i % 2 ? BTN.A : 0]);
  enterNode(sess, { kind: 'slots', key: '5,3' }); draw('slots');
  for (let i = 0; i < 400 && sess.scene === 'slots'; i++) stepSession(sess, [i % 20 === 0 ? BTN.A : 0]);
  ok(sess.scene === 'map', 'minigames return to map');
  // Co-op loopback
  const hs = createSession({ seed: 3 });
  enterNode(hs, { kind: 'level', level: '1-1', key: '3,1' });
  const host = createHost(hs), link = createLoopback({ latency: 5, jitter: 2 });
  host.attach(link.a);
  const guest = createGuest(link.b, WORLDS);
  for (let i = 0; i < 90; i++) { host.step(0); guest.step(i > 40 ? BTN.RIGHT : 0); link.tick(); }
  ok(guest.status === 'playing' && hs.players === 2, 'co-op loopback connects');
  ok(guest.view()?.level?.lv.id === '1-1', 'guest sees the level');
  return fails.length ? `${fails.length} of ${n} checks failed:\n${fails.join('\n')}` : `All ${n} checks passed.`;
}
