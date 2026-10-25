import { peerTransport } from './transport.js';
import { ICE_SERVERS } from './ice.js';

export const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const makeCode = (rand = Math.random) => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)]).join('');
export const normalizeCode = (str) => str.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
export const peerId = (code) => `superpip-${code}`;

const describe = (err) => (err && err.type === 'peer-unavailable' ? 'ROOM NOT FOUND' : "CAN'T REACH SERVER");
// The PeerJS script comes from a CDN; if it was blocked, online play is off but solo still works.
// Tests pass a stand-in Peer (and a short linkMs) through `deps`.
const withDefaults = (deps = {}) => ({
  Peer: globalThis.Peer,
  linkMs: 15000,   // a join that hasn't linked up by now never will (no route between the two networks)
  ...deps,
});
const options = () => ({ config: { iceServers: ICE_SERVERS } });

export function hostRoom({ onCode, onGuest, onError, deps }) {
  const d = withDefaults(deps);
  if (!d.Peer) { onError('ONLINE PLAY UNAVAILABLE'); return { close() {} }; }
  let peer = null, closed = false;
  const open = (tries) => {
    const code = makeCode();
    const p = peer = new d.Peer(peerId(code), options());
    p.on('open', () => onCode(code));
    p.on('connection', (conn) => conn.on('open', () => onGuest(peerTransport(conn))));
    // Losing the signalling socket doesn't drop open games; reconnect so the code keeps working.
    p.on('disconnected', () => { if (!closed && !p.destroyed) p.reconnect(); });
    p.on('error', (err) => {
      if (closed) return;
      if (err.type === 'unavailable-id' && tries < 5) { p.destroy(); open(tries + 1); }
      else onError(describe(err));
    });
  };
  open(0);
  return { close() { closed = true; peer && peer.destroy(); } };
}

export function joinRoom(code, { onConnected, onError, deps }) {
  const d = withDefaults(deps);
  if (!d.Peer) { onError('ONLINE PLAY UNAVAILABLE'); return { close() {} }; }
  let closed = false, settled = false;
  const peer = new d.Peer(options());
  const fail = (msg) => {
    if (closed || settled) return;
    settled = true;
    clearTimeout(timer);
    peer.destroy();
    onError(msg);
  };
  // Without this the guest would sit on "CONNECTING..." forever when no route exists.
  const timer = setTimeout(() => fail("CAN'T LINK TO HOST"), d.linkMs);
  peer.on('open', () => {
    const conn = peer.connect(peerId(code), { serialization: 'json', reliable: true });
    conn.on('open', () => {
      if (closed || settled) { conn.close(); return; }
      settled = true;
      clearTimeout(timer);
      onConnected(peerTransport(conn));
    });
  });
  // Once the data channel is up, server-side errors don't matter; the guest's own timeout covers a real drop.
  peer.on('error', (err) => fail(describe(err)));
  return { close() { closed = true; clearTimeout(timer); peer.destroy(); } };
}
