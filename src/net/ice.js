// STUN lets two players find a direct route; TURN relays the game when there isn't one
// (strict home routers, mobile data, school networks). PeerJS's built-in TURN hosts were
// shut down, so the relay has to come from our own account. Paste its entry into TURN, e.g.
//   { urls: 'turn:relay1.expressturn.com:3478', username: '...', credential: '...' }
export const TURN = [];

export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  ...TURN,
];
