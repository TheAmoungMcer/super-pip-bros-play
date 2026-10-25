import { rand } from '../game/rng.js';

export function createLoopback({ latency = 0, jitter = 0, seed = 1 } = {}) {
  const rng = { seed };
  let now = 0;
  const mk = () => ({ inbox: [], handlers: [], closers: [], lastAt: 0, closed: false });
  const A = mk(), B = mk();
  const end = (me, other) => ({
    send(msg) {
      if (me.closed || other.closed) return;
      const at = Math.max(other.lastAt, now + latency + Math.floor(rand(rng) * (jitter + 1)));
      other.lastAt = at;
      other.inbox.push({ at, msg: JSON.parse(JSON.stringify(msg)) });
    },
    onMessage(fn) { me.handlers.push(fn); },
    onClose(fn) { me.closers.push(fn); },
    close() {
      if (me.closed) return;
      me.closed = true; other.closed = true;
      for (const f of [...me.closers, ...other.closers]) f();
    },
  });
  const a = end(A, B), b = end(B, A);
  return {
    a, b,
    tick() {
      now++;
      for (const side of [A, B]) {
        while (side.inbox.length && side.inbox[0].at <= now) {
          const { msg } = side.inbox.shift();
          for (const h of side.handlers) h(msg);
        }
      }
    },
  };
}

// Wrap a PeerJS DataConnection (serialization: 'json').
export function peerTransport(conn) {
  return {
    send(msg) { if (conn.open) conn.send(msg); },
    onMessage(fn) { conn.on('data', fn); },
    onClose(fn) { conn.on('close', fn); conn.on('error', fn); },
    close() { conn.close(); },
  };
}
