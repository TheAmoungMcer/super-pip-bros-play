const NAMES = [
  'EMPTY', 'GROUND', 'BRICK', 'BRICK_COINS', 'BRICK_PSWITCH', 'Q_COIN', 'Q_POWER', 'Q_LEAF',
  'Q_1UP', 'Q_STAR', 'HIDDEN_1UP', 'COIN', 'NOTE', 'USED', 'WOOD', 'SEMI', 'CLOUD',
  'PIPE_TL', 'PIPE_TR', 'PIPE_L', 'PIPE_R', 'SLOPE45_UP', 'SLOPE45_DN',
  'GENTLE_UP_LO', 'GENTLE_UP_HI', 'GENTLE_DN_HI', 'GENTLE_DN_LO', 'LAVA', 'CANNON',
  'GOAL', 'DOOR', 'HARD', 'PSWITCH_COIN', 'PSWITCH_BRICK',
];
export const T = Object.fromEntries(NAMES.map((n, i) => [n, i]));

export const LEGEND = {
  '.': T.EMPTY, '#': T.GROUND, 'B': T.BRICK, 'V': T.BRICK_COINS, 'P': T.BRICK_PSWITCH,
  '?': T.Q_COIN, 'M': T.Q_POWER, 'L': T.Q_LEAF, 'U': T.Q_1UP, 'S': T.Q_STAR,
  'H': T.HIDDEN_1UP, 'C': T.COIN, 'N': T.NOTE, 'X': T.USED, 'W': T.WOOD,
  '=': T.SEMI, 'O': T.CLOUD, '[': T.PIPE_TL, ']': T.PIPE_TR, '{': T.PIPE_L, '}': T.PIPE_R,
  '/': T.SLOPE45_UP, '\\': T.SLOPE45_DN, '1': T.GENTLE_UP_LO, '2': T.GENTLE_UP_HI,
  '3': T.GENTLE_DN_HI, '4': T.GENTLE_DN_LO, '~': T.LAVA, 'K': T.CANNON, 'G': T.GOAL, 'D': T.DOOR,
};

export const ENTITY_CHARS = {
  c: 'chompkin', p: 'parachompkin', g: 'shellback_green', r: 'shellback_red',
  f: 'shellback_winged', s: 'snapvine', v: 'firesnapvine', y: 'spikebug',
  b: 'bumblebeetle', d: 'boneshell', e: 'ember', o: 'rotodisc', m: 'lift_h', n: 'lift_v',
  z: 'bonebrute', q: 'grimling',
};

const base = { solid: false, semi: false, slope: false, hidden: false, bump: null, breakable: false, coin: false, deadly: false, note: false, pipe: false };
const solid = (extra = {}) => ({ ...base, solid: true, ...extra });
export const INFO = NAMES.map(() => base);
Object.assign(INFO, {
  [T.GROUND]: solid(), [T.USED]: solid(), [T.WOOD]: solid(), [T.HARD]: solid(), [T.CANNON]: solid(),
  [T.BRICK]: solid({ breakable: true }),
  [T.BRICK_COINS]: solid({ bump: 'multicoin' }),
  [T.BRICK_PSWITCH]: solid({ bump: 'pswitch' }),
  [T.Q_COIN]: solid({ bump: 'coin' }), [T.Q_POWER]: solid({ bump: 'power' }),
  [T.Q_LEAF]: solid({ bump: 'leaf' }), [T.Q_1UP]: solid({ bump: '1up' }), [T.Q_STAR]: solid({ bump: 'star' }),
  [T.HIDDEN_1UP]: { ...base, hidden: true, bump: '1up' },
  [T.COIN]: { ...base, coin: true }, [T.PSWITCH_COIN]: { ...base, coin: true },
  [T.NOTE]: solid({ note: true }),
  [T.SEMI]: { ...base, semi: true }, [T.CLOUD]: { ...base, semi: true },
  [T.PIPE_TL]: solid({ pipe: true }), [T.PIPE_TR]: solid({ pipe: true }),
  [T.PIPE_L]: solid({ pipe: true }), [T.PIPE_R]: solid({ pipe: true }),
  [T.SLOPE45_UP]: { ...base, slope: true }, [T.SLOPE45_DN]: { ...base, slope: true },
  [T.GENTLE_UP_LO]: { ...base, slope: true }, [T.GENTLE_UP_HI]: { ...base, slope: true },
  [T.GENTLE_DN_HI]: { ...base, slope: true }, [T.GENTLE_DN_LO]: { ...base, slope: true },
  [T.LAVA]: { ...base, deadly: true },
  [T.PSWITCH_BRICK]: solid({ breakable: true }),
});

// Pixels from the tile's top edge down to the walkable surface at local x (0..15).
export function slopeTop(id, lx) {
  switch (id) {
    case T.SLOPE45_UP: return 15 - lx;
    case T.SLOPE45_DN: return lx;
    case T.GENTLE_UP_LO: return 15 - (lx >> 1);
    case T.GENTLE_UP_HI: return 7 - (lx >> 1);
    case T.GENTLE_DN_HI: return lx >> 1;
    case T.GENTLE_DN_LO: return 8 + (lx >> 1);
    default: return 0;
  }
}

// -1 if the slope goes down to the left, +1 if down to the right.
export function slopeDownDir(id) {
  if (id === T.SLOPE45_UP || id === T.GENTLE_UP_LO || id === T.GENTLE_UP_HI) return -1;
  if (id === T.SLOPE45_DN || id === T.GENTLE_DN_HI || id === T.GENTLE_DN_LO) return 1;
  return 0;
}

// Tile placed underneath an entity char (default EMPTY).
export const ENTITY_TILE = { o: T.USED };
