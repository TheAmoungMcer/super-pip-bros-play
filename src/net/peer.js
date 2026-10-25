import { peerTransport } from './transport.js';
import { ICE_SERVERS } from './ice.js';
import { PROTOCOL_VERSION } from './protocol.js';

// There is one online game: whoever holds this PeerJS id hosts it, everyone else joins it.
// The protocol version is part of the id, so old and new builds never meet.
export const LOBBY_ID = `superpip-online-v${PROTOCOL_VERSION}`;

const describe = (err) => (err && err.type === 'peer-unavailable' ? 'HOST LEFT - TRY AGAIN' : "CAN'T REACH SERVER");
// The PeerJS script comes from a CDN; if it was blocked, online play is off but solo still works.
// Tests pass a stand-in Peer (and a short linkMs) through `deps`.
const withDefaults = (deps = {}) => ({
  Peer: globalThis.Peer,
  linkMs: 15000,   // a join that hasn't linked up by now never will (no route between the two networks)
  ...deps,
});
const options = () => ({ config: { iceServers: ICE_SERVERS } });

export function playOnline({ onHosting, onGuest, onJoined, onError, deps }) {
  const d = withDefaults(deps);
  if (!d.Peer) { onError('ONLINE PLAY UNAVAILABLE'); return { close() {} }; }
  let peer = null, role = null, closed = false, timer = null;
  const fail = (msg) => {
    if (closed || role) return;
    role = 'failed';
    clearTimeout(timer);
    peer.destroy();
    onError(msg);
  };
  // Try to become the host by taking the lobby id; if it's taken, someone is hosting, so join them.
  const claim = (tries) => {
    const p = peer = new d.Peer(LOBBY_ID, options());
    p.on('open', () => { if (closed || role) return; role = 'host'; onHosting(); });
    p.on('connection', (conn) => conn.on('open', () => onGuest(peerTransport(conn))));
    // Losing the signalling socket doesn't drop open games; reconnect so the game stays findable.
    p.on('disconnected', () => { if (!closed && !p.destroyed) p.reconnect(); });
    p.on('error', (err) => {
      if (closed || p !== peer) return;
      if (role === 'host') onError(describe(err));
      else if (err.type === 'unavailable-id') { p.destroy(); join(tries); }
      else fail(describe(err));
    });
  };
  const join = (tries) => {
    const p = peer = new d.Peer(options());
    // Without this the guest would sit on "GOING ONLINE..." forever when no route exists.
    timer = setTimeout(() => fail("CAN'T LINK TO HOST"), d.linkMs);
    p.on('open', () => {
      const conn = p.connect(LOBBY_ID, { serialization: 'json', reliable: true });
      conn.on('open', () => {
        if (closed || role || p !== peer) { conn.close(); return; }
        role = 'guest';
        clearTimeout(timer);
        onJoined(peerTransport(conn));
      });
    });
    // Once the data channel is up, server-side errors don't matter; the guest's own timeout covers a real drop.
    p.on('error', (err) => {
      if (closed || role || p !== peer) return;
      // The host left between our claim and our join: the lobby is free again, so take it.
      if (err.type === 'peer-unavailable' && tries < 3) { clearTimeout(timer); p.destroy(); claim(tries + 1); }
      else fail(describe(err));
    });
  };
  claim(0);
  return { close() { closed = true; clearTimeout(timer); peer && peer.destroy(); } };
}
