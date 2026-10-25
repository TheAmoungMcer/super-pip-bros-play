import { stepLevel } from '../game/sim.js';
import { parseLevel } from '../game/level.js';
import { PROTOCOL_VERSION, SILENCE_FRAMES, unb64 } from './protocol.js';

export function createGuest(conn, worlds) {
  const g = {
    status: 'connecting', reason: '', sess: null, level: null, baseLv: null,
    pending: [], f: 0, hostB: 0, inbound: [], silent: 0,
    step(localB) {
      if (g.status !== 'playing' && g.status !== 'connecting') return [];
      if (++g.silent > SILENCE_FRAMES) { g.status = 'closed'; g.reason = 'timeout'; conn.close(); return []; }
      conn.send({ t: 'in', f: g.f, b: localB });
      g.pending.push({ f: g.f, b: localB });
      g.f++;
      const events = g.inbound.splice(0).filter(e => !(e.id === 'jump' && e.who === 1));
      if (g.sess && g.sess.scene === 'level' && g.level && g.level.mode === 'play') {
        stepLevel(g.level, [g.hostB, localB]);
        for (const e of g.level.events) if (e.e === 'sfx' && e.id === 'jump' && e.who === 1) events.push(e);
      }
      return events;
    },
    view() { return g.sess ? { ...g.sess, level: g.level } : null; },
    leave() { conn.send({ t: 'bye' }); conn.close(); },
  };

  const defsFor = (area) => worlds[g.sess.world].levels;

  function applySnapshot(m) {
    g.sess = m.sess;
    g.hostB = m.hb;
    g.inbound.push(...m.ev);
    g.pending = g.pending.filter(p => p.f > m.ack);
    if (!m.level) { g.level = null; g.baseLv = null; return; }
    const L = m.level, T = L.tiles, defs = defsFor(T.area);
    if (T.full) {
      g.baseLv = parseLevel(defs[T.area]);
      g.baseLv.tiles.set(unb64(T.full));
    } else if (g.baseLv && g.baseLv.id === T.area) {
      for (const op of T.ops) g.baseLv.tiles[op.ty * g.baseLv.w + op.tx] = op.id;
    } else return;
    const { tiles, ...rest } = L;
    const s = {
      ...rest,
      lv: { ...g.baseLv, tiles: g.baseLv.tiles.slice(), tileLog: [] },
      spawned: Uint8Array.from(L.spawned), defs, areaStore: {}, events: [],
    };
    for (const p of g.pending) stepLevel(s, [g.hostB, p.b]);   // replay unacknowledged inputs
    g.level = s;
  }

  conn.onMessage((m) => {
    g.silent = 0;
    if (m.t === 'welcome') g.status = 'playing';
    else if (m.t === 'reject') { g.status = 'rejected'; g.reason = m.reason; }
    else if (m.t === 'snap') applySnapshot(m);
  });
  conn.onClose(() => { if (g.status !== 'rejected') g.status = 'closed'; });
  conn.send({ t: 'hello', v: PROTOCOL_VERSION });
  return g;
}
