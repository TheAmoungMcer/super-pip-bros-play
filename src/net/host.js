import { stepSession, addPlayer, dropPlayer } from '../game/session.js';
import { PROTOCOL_VERSION, SNAP_EVERY, SILENCE_FRAMES, STARVED_FRAMES, liteSession, levelSnapshot, forGuest } from './protocol.js';

export function createHost(sess) {
  const h = {
    sess, conn: null, connected: false, queue: [], lastB: 0, silent: 0, starved: 0, ack: -1, frame: 0, sent: { lv: null, n: 0 }, evBuf: [], localB: 0,
    attach(conn) {
      conn.onMessage((m) => {
        if (h.conn === conn) h.silent = 0;
        if (m.t === 'hello') {
          if (m.v !== PROTOCOL_VERSION) { conn.send({ t: 'reject', reason: 'version' }); return; }
          h.conn = conn; h.connected = true; h.silent = 0; h.queue = []; h.lastB = 0; h.ack = -1; h.sent = { lv: null, n: 0 };
          addPlayer(h.sess);
          conn.send({ t: 'welcome', idx: 1 });
        } else if (m.t === 'in' && h.conn === conn) {
          h.queue.push(m);
        } else if (m.t === 'bye' && h.conn === conn) {
          conn.close();
        }
      });
      conn.onClose(() => { if (h.conn === conn) h.drop(); });
    },
    drop() {
      const c = h.conn;
      h.conn = null; h.connected = false;
      dropPlayer(h.sess);
      if (c) c.close();
    },
    step(localB) {
      h.localB = localB;
      if (h.connected && ++h.silent > SILENCE_FRAMES) h.drop();
      let gb = h.lastB;
      if (h.queue.length > 6) {
        // Collapse a backlog but keep every press that happened in it.
        const extra = h.queue.splice(0, h.queue.length - 6);
        const ored = extra.reduce((a, m) => a | m.b, 0);
        h.queue[0] = { ...h.queue[0], b: h.queue[0].b | ored };
      }
      if (h.queue.length) { const m = h.queue.shift(); gb = m.b; h.ack = m.f; h.lastB = m.b; h.starved = 0; }
      else if (++h.starved > STARVED_FRAMES) gb = 0;   // the guest's tab stalled: let go of their buttons
      stepSession(h.sess, h.connected ? [localB, gb] : [localB]);
      const events = h.sess.events;
      if (h.connected) {
        h.evBuf.push(...forGuest(events));
        if (++h.frame % SNAP_EVERY === 0) {
          h.conn.send({
            t: 'snap', f: h.frame, ack: h.ack, hb: localB,
            sess: liteSession(h.sess),
            level: h.sess.level ? levelSnapshot(h.sess.level, h.sent) : null,
            ev: h.evBuf.splice(0),
          });
          if (!h.sess.level) h.sent = { lv: null, n: 0 };
        }
      }
      return events;
    },
  };
  return h;
}
