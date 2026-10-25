import { WORLDS } from '../game/session.js';

export function songFor(sess) {
  switch (sess.scene) {
    case 'map': return WORLDS[sess.world].map.music;
    case 'hut': case 'slots': return 'hut';
    case 'letter': return 'worldclear';
    case 'gameover': return 'gameover';
    case 'level': {
      const s = sess.level;
      if (s.mode === 'clear' || s.mode === 'done') return s.clear && s.clear.card < 0 ? 'fortressclear' : 'clear';
      if (s.players.every(p => p.dead)) return 'death';
      if (s.entities.some(e => e.boss && e.state !== 'flipped')) return 'boss';
      if (s.players.some(p => p.starTimer > 0)) return 'star';
      if (s.pswitch > 0) return 'pswitch';
      return s.lv.music;
    }
    default: return '';
  }
}

export function hudFor(sess, local) {
  const p = sess.level ? sess.level.players[local] : null;
  return {
    world: sess.world, pmeter: p ? p.pmeter : 0, flying: !!(p && p.flyTimer > 0),
    coins: sess.shared.coins, lives: Math.max(0, sess.shared.lives), score: sess.shared.score,
    time: sess.level ? sess.level.time : null,
    cards: [0, 1, 2].map(i => (sess.cards[local] && sess.cards[local][i] !== undefined ? sess.cards[local][i] : -1)),
    who: local,
  };
}
