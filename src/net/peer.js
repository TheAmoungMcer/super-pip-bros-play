import { peerTransport } from './transport.js';

export const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const makeCode = (rand = Math.random) => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)]).join('');
export const normalizeCode = (str) => str.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
export const peerId = (code) => `superpip-${code}`;

const describe = (err) => (err && err.type === 'peer-unavailable' ? 'ROOM NOT FOUND' : "CAN'T REACH SERVER");
// The PeerJS script comes from a CDN; if it was blocked, online play is off but solo still works.
const peerMissing = (onError) => {
  if (typeof Peer !== 'undefined') return false;
  onError('ONLINE PLAY UNAVAILABLE');
  return true;
};

export function hostRoom({ onCode, onGuest, onError }) {
  if (peerMissing(onError)) return { close() {} };
  let peer = null, closed = false;
  const open = (tries) => {
    const code = makeCode();
    peer = new Peer(peerId(code));
    peer.on('open', () => onCode(code));
    peer.on('connection', (conn) => conn.on('open', () => onGuest(peerTransport(conn))));
    // Losing the signalling socket doesn't drop open games; reconnect so the code keeps working.
    peer.on('disconnected', () => { if (!closed) peer.reconnect(); });
    peer.on('error', (err) => {
      if (closed) return;
      if (err.type === 'unavailable-id' && tries < 5) { peer.destroy(); open(tries + 1); }
      else onError(describe(err));
    });
  };
  open(0);
  return { close() { closed = true; peer && peer.destroy(); } };
}

export function joinRoom(code, { onConnected, onError }) {
  if (peerMissing(onError)) return { close() {} };
  let closed = false, connected = false;
  const peer = new Peer();
  peer.on('open', () => {
    const conn = peer.connect(peerId(code), { serialization: 'json', reliable: true });
    conn.on('open', () => { connected = true; onConnected(peerTransport(conn)); });
  });
  // Once the data channel is up, server-side errors don't matter; the guest's own timeout covers a real drop.
  peer.on('error', (err) => { if (!closed && !connected) onError(describe(err)); });
  return { close() { closed = true; peer.destroy(); } };
}
