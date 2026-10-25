import { T, INFO } from '../game/tiles.js';
import { tileAt } from '../game/level.js';
import { SUB } from '../game/consts.js';

export const THEMES = {
  overworld: { bg: 0x31, ground: 'ground_ow' },
  underground: { bg: 0x0F, ground: 'ground_ug' },
  fortress: { bg: 0x0F, ground: 'ground_fort' },
  sky: { bg: 0x21, ground: 'ground_sky' },
  airship: { bg: 0x01, ground: 'wood' },
};

const L = (name, pal, dx = 0, dy = 0, extra = {}) => ({ name, pal, dx, dy, ...extra });
const isGroundish = (id) => id === T.GROUND || INFO[id].slope;

export function tileArt(lv, tx, ty, frame, pswitchOn) {
  const id = tileAt(lv, tx, ty);
  const g = THEMES[lv.theme]?.ground || 'ground_ow';
  const q = `q${(frame >> 3) & 3}`;
  switch (id) {
    case T.EMPTY: case T.HIDDEN_1UP: case T.GOAL: return [];
    case T.GROUND: return [L(isGroundish(tileAt(lv, tx, ty - 1)) ? 'ground.fill' : 'ground.top', g)];
    case T.BRICK: case T.BRICK_COINS: case T.BRICK_PSWITCH: case T.PSWITCH_BRICK: return [L('brick', 'brick')];
    case T.Q_COIN: case T.Q_POWER: case T.Q_LEAF: case T.Q_1UP: case T.Q_STAR: return [L('qblock', q)];
    case T.USED: case T.HARD: return [L('used', 'used')];
    case T.WOOD: return [L('wood', 'wood')];
    case T.SEMI: return [L(tileAt(lv, tx, ty - 1) === T.SEMI ? 'semi.fill' : 'semi.top', 'semi')];
    case T.CLOUD: return [L('cloud', 'cloud')];
    case T.COIN: case T.PSWITCH_COIN: return [L(`coin.${1 + ((frame >> 3) & 3)}`, 'coin')];
    case T.NOTE: return [L('note', 'note')];
    case T.PIPE_TL: return [L('pipe.tl', 'pipe')];
    case T.PIPE_TR: return [L('pipe.tr', 'pipe')];
    case T.PIPE_L: return [L('pipe.l', 'pipe')];
    case T.PIPE_R: return [L('pipe.r', 'pipe')];
    case T.SLOPE45_UP: return [L('slope45up', g)];
    case T.SLOPE45_DN: return [L('slope45dn', g)];
    case T.GENTLE_UP_LO: return [L('gentle.up.lo', g)];
    case T.GENTLE_UP_HI: return [L('gentle.up.hi', g)];
    case T.GENTLE_DN_HI: return [L('gentle.dn.hi', g)];
    case T.GENTLE_DN_LO: return [L('gentle.dn.lo', g)];
    case T.LAVA: return [L(`lava.${1 + ((frame >> 4) & 1)}`, 'lava')];
    case T.CANNON: return [L(tileAt(lv, tx, ty - 1) === T.CANNON ? 'cannon.base' : 'cannon.top', 'cannon')];
    case T.DOOR: return [L(tileAt(lv, tx, ty - 1) === T.DOOR ? 'door.bottom' : 'door.top', 'door')];
    default: return [];
  }
}

const walkFrame = (e, frame) => ((frame >> 3) & 1) === 0;
const shellPal = (type) => (type === 'shellback_red' ? 'shellRed' : type === 'bumblebeetle' ? 'beetle' : 'shellGreen');

export function entityArt(e, frame) {
  const flipX = e.dir > 0;
  const flipY = e.state === 'flipped';
  const f2 = (a, b) => (((frame >> 3) & 1) ? b : a);
  switch (e.type) {
    case 'chompkin':
    case 'parachompkin': {
      if (e.state === 'squished') return [L('chompkin.squish', 'chompkin', -1, 8)];
      const body = L('chompkin.walk', 'chompkin', -1, -2, { flipX: walkFrame(e, frame), flipY });
      if (e.type !== 'parachompkin') return [body];
      const w = f2('wing.up', 'wing.down');
      return [L(w, 'wing', -6, -4), L(w, 'wing', 12, -4, { flipX: true }), body];
    }
    case 'shellback_green': case 'shellback_red': case 'shellback_winged': case 'bumblebeetle': {
      const pal = shellPal(e.type);
      if (e.state === 'walk' || e.state === 'fly') {
        const name = e.type === 'bumblebeetle' ? f2('beetle.walk1', 'beetle.walk2') : f2('shellback.walk1', 'shellback.walk2');
        const body = L(name, pal, -1, e.type === 'bumblebeetle' ? -2 : 0, { flipX, flipY });
        return e.state === 'fly' ? [L(f2('wing.up', 'wing.down'), 'wing', flipX ? -4 : 10, 2, { flipX: !flipX }), body] : [body];
      }
      if (e.state === 'slide') return [L(`shell.spin${1 + ((frame >> 2) % 3)}`, pal, -1, -2, { flipY })];
      const peek = e.state === 'shell' && e.wake > 420;
      return [L(peek ? 'shell.peek' : 'shell.idle', pal, -1, -2, { flipY })];
    }
    case 'spikebug': return [L(f2('spikebug.walk1', 'spikebug.walk2'), 'spike', -1, -2, { flipX, flipY })];
    case 'snapvine': case 'firesnapvine':
      return [L(e.type === 'snapvine' ? f2('snap.open', 'snap.closed') : 'snap.open', 'snap', 0, 0, { flipX }), L('snap.stem', 'snapStem', 0, 16)];
    case 'enemyfire': return [L(f2('enemyfire.1', 'enemyfire.2'), 'ember', 0, 0)];
    case 'boombolt': return [L('boombolt', 'bolt', 0, 0, { flipX: e.vx > 0, flipY })];
    case 'ember': return [L(f2('ember.1', 'ember.2'), 'ember', -2, -1, { flipY: e.vy > 0 })];
    case 'rotodisc': return [L(f2('disc.1', 'disc.2'), 'disc', 0, 0)];
    case 'boneshell':
      if (e.state === 'collapsed') return [L('bone.pile', 'bone', -1, 8)];
      return [L(f2('bone.walk1', 'bone.walk2'), 'bone', -1, 0, { flipX, flipY })];
    case 'berry': return [L('berry', 'berry', -1, 0)];
    case 'oneup': return [L('berry', 'oneup', -1, 0)];
    case 'blossom': return [L(f2('blossom.1', 'blossom.2'), 'blossom', -1, 0)];
    case 'leaf': return [L('leaf', 'leaf', -1, -1, { flipX: e.vx > 0 })];
    case 'star': return [L(f2('star.1', 'star.2'), 'star', -1, 0)];
    case 'coinpop': return [L(`coin.${1 + ((frame >> 2) & 3)}`, 'coin', -4, 0)];
    case 'brickbit': return [L('brickbit', 'brick', 0, 0, { flipX: ((frame >> 2) & 1) === 1 })];
    case 'fireball': return [L(f2('fireball.1', 'fireball.2'), 'fire', 0, 0, { flipX: ((frame >> 2) & 1) === 1 })];
    case 'puff': return [L(e.t < 6 ? 'puff.1' : 'puff.2', 'puff', -4, -4)];
    case 'pswitch': return [L(e.state === 'pressed' ? 'pswitch.pressed' : 'pswitch', 'pswitch', 0, e.state === 'pressed' ? 8 : 0)];
    case 'lift_h': case 'lift_v': return [0, 16, 32].map(dx => L('wood', 'wood', dx, -8));
    case 'bonebrute': return [L(e.state === 'spin' ? 'brute.spin' : f2('brute.run1', 'brute.run2'), 'brute', 0, 0, { flipX, flipY })];
    case 'orb': return [L(e.wand ? 'wand' : 'orb', 'orb', -2, -2)];
    case 'grimling': return [L(e.state === 'spin' ? 'grim.shell' : e.onGround ? 'grim.stand' : 'grim.hop', 'grim', 0, 0, { flipX, flipY })];
    case 'wandring': return [L(f2('wandring.1', 'wandring.2'), 'ring', -2, -2)];
    case 'popup': return [];          // drawn as text by drawLevel
    default: return [];
  }
}

export function playerArt(p, frame) {
  const pal = p.starTimer > 0 ? `star${(frame >> 1) & 3}`
    : (p.form === 'fire' ? (p.idx ? 'pepFire' : 'pipFire') : (p.idx ? 'pep' : 'pip'));
  if (p.hurtTimer > 0 && (frame & 2)) return [];             // flicker while invulnerable
  const big = p.form !== 'small';
  const size = big ? 'big' : 'small';
  const flipX = p.dir < 0;
  let pose;
  if (p.dead) pose = 'small.die';
  else if (p.growTimer > 0) pose = (frame >> 2) & 1 ? 'big.grow' : 'small.stand';
  else if (p.pipe) pose = `${size}.front`;
  else if (p.kickTimer > 0) pose = `${size}.kick`;
  else if (p.carry >= 0) pose = `${size}.hold`;
  else if (big && p.fireCooldown > 6) pose = 'big.throw';
  else {
    const cyc = (p.animT >> 3) % 3;
    const a = p.anim;
    pose = a === 'walk' ? `${size}.${['stand', 'walk1', 'walk2'][cyc]}`
      : a === 'run' ? `${size}.${(p.animT >> 2) & 1 ? 'run1' : 'run2'}`
      : a === 'jump' || a === 'runjump' ? `${size}.jump`
      : a === 'skid' ? `${size}.skid`
      : a === 'crouch' && big ? 'big.crouch'
      : a === 'slide' && big ? 'big.slide'
      : `${size}.stand`;
  }
  const dy = (p.h - (pose.startsWith('big') ? 32 : 16));
  const out = [];
  if (p.form === 'leaf' && !p.dead && p.growTimer === 0) {
    const tail = p.tailTimer > 6 ? 'tail.out' : p.flyTimer > 0 || p.floatTimer > 0 ? ((frame >> 2) & 1 ? 'tail.up' : 'tail.mid') : 'tail.down';
    out.push(L(tail, 'tail', flipX ? 8 : -10, dy + 14, { flipX }));
  }
  out.push(L(pose, pal, -2, dy, { flipX }));
  if (p.form === 'leaf' && !p.dead && p.growTimer === 0) out.push(L('ears', 'tail', -2, dy - 2, { flipX }));
  return out;
}

export const popupText = (e) => e.label || String(e.pts);
export const px = (sub) => Math.floor(sub / SUB);
