import { S, gen, mirror, transpose } from './util.js';

export const defaultPal = 'ground_ow';
export const palOf = {
  qblock: 'q0', brick: 'brick', used: 'used', wood: 'wood', 'semi.top': 'semi', 'semi.fill': 'semi', cloud: 'cloud',
  'pipe.tl': 'pipe', 'pipe.tr': 'pipe', 'pipe.l': 'pipe', 'pipe.r': 'pipe',
  'pipe.side.t': 'pipe', 'pipe.side.b': 'pipe', 'pipe.sidebody.t': 'pipe', 'pipe.sidebody.b': 'pipe',
  note: 'note', 'lava.1': 'lava', 'lava.2': 'lava', 'cannon.top': 'cannon', 'cannon.base': 'cannon',
  'door.top': 'door', 'door.bottom': 'door', 'coin.tile': 'coin', 'goal.frame': 'goal', bush: 'bush', hill: 'hill', bgcloud: 'cloud',
};

export const pals = {
  q0: [0x0F, 0x27, 0x30], q1: [0x0F, 0x27, 0x37], q2: [0x0F, 0x27, 0x28], q3: [0x0F, 0x27, 0x37],
  used: [0x0F, 0x17, 0x27], brick: [0x0F, 0x17, 0x27], ground_ow: [0x0F, 0x17, 0x2A],
  ground_ug: [0x0F, 0x12, 0x21], ground_fort: [0x0F, 0x00, 0x10], ground_sky: [0x0F, 0x17, 0x27],
  pipe: [0x0F, 0x1A, 0x2A], wood: [0x0F, 0x17, 0x27], semi: [0x0F, 0x26, 0x30], cloud: [0x0F, 0x30, 0x31],
  note: [0x0F, 0x30, 0x10], lava: [0x16, 0x27, 0x37], cannon: [0x0F, 0x00, 0x10], goal: [0x0F, 0x30, 0x27],
  coin: [0x0F, 0x28, 0x30], door: [0x0F, 0x17, 0x27], bush: [0x0F, 0x1A, 0x2A], hill: [0x0F, 0x1A, 0x39],
};

// Ground texture: brown earth with a speckle pattern that tiles seamlessly.
const speck = (x, y) => ((x * 5 + y * 3) % 11 === 0 || (x * 3 + y * 7) % 13 === 0);
const earth = (x, y) => (speck(x, y) ? '1' : '2');

// Slope tile: surface(x) is the first opaque row; a 1px outline then 3px of grass, earth below.
const slope = (surface) => gen(16, 16, (x, y) => {
  const s = surface(x);
  if (y < s) return '.';
  if (y === s) return '1';
  if (y <= s + 3) return '3';
  return earth(x, y);
});

const ellipse = (w, h, stripes) => gen(w, h, (x, y) => {
  const rx = w / 2, cx = rx - 0.5, ry = h, dx = (x - cx) / rx, dy = (y - h) / ry;
  const d = dx * dx + dy * dy;
  if (d > 1) return '.';
  const inner = ((x - cx) / (rx - 1.5)) ** 2 + ((y - h) / (ry - 1.5)) ** 2;
  if (inner > 1) return '1';
  return stripes && (x >> 1) % 3 === 0 ? '3' : '2';
});

export const sprites = {
  qblock: [
    '.11111111111111.',
    '1222222222222221',
    '1232222222222321',
    '1222223333222221',
    '1222233223322221',
    '1222222223322221',
    '1222222233222221',
    '1222222332222221',
    '1222222332222221',
    '1222222222222221',
    '1222222332222221',
    '1222222222222221',
    '1222222222222221',
    '1232222222222321',
    '1222222222222221',
    '.11111111111111.',
  ],
  'ground.top': gen(16, 16, (x, y) => {
    if (y === 0) return '1';
    if (y <= 3) return '3';
    if (y === 4) return (x % 4 === 1 || x % 4 === 2) ? '3' : '1';
    return earth(x, y);
  }),
  'ground.fill': gen(16, 16, earth),
  brick: gen(16, 16, (x, y) => {
    if (y % 8 === 7) return '1';
    if (x === (y < 8 ? 15 : 7)) return '1';
    if (y % 8 === 0) return '3';
    return '2';
  }),
  used: gen(16, 16, (x, y) => {
    if (x === 0 || x === 15 || y === 0 || y === 15) return '1';
    if ((x === 2 || x === 13) && (y === 2 || y === 13)) return '3';
    if (x === 1 || y === 1) return '3';
    return '2';
  }),
  // Wooden planks: horizontal boards with staggered seams and nail heads.
  wood: gen(16, 16, (x, y) => {
    if (y % 8 === 7) return '1';
    if (x === (y < 8 ? 3 : 11)) return '1';
    if (y % 8 === 0) return '3';
    if ((y % 8 === 3) && (x === (y < 8 ? 6 : 14) || x === (y < 8 ? 0 : 8))) return '1';
    return '2';
  }),
  'semi.top': gen(16, 16, (x, y) => {
    if (y === 0) return '1';
    if (y <= 2) return '3';
    if (y === 4 && (x === 2 || x === 13)) return '1';
    return '2';
  }),
  'semi.fill': gen(16, 16, (x, y) => ((x * 7 + y * 5) % 23 === 0 ? '3' : '2')),
  cloud: S(16,
    '..111....111....',
    '.12221..12221...',
    '1222221122222111',
    '1222222222222221',
    '1222222222222221',
    '1222222222222221',
    '1223222222232221',
    '.13331111133311.',
    '..111....111....',
  ),
  'pipe.tl': gen(16, 16, (x, y) => (x === 0 || y === 0 || y === 15 ? '1' : x >= 2 && x <= 4 ? '3' : '2')),
  'pipe.tr': gen(16, 16, (x, y) => (x === 15 || y === 0 || y === 15 ? '1' : x === 12 ? '1' : '2')),
  'pipe.l': gen(16, 16, (x) => (x < 2 ? '.' : x === 2 ? '1' : x >= 4 && x <= 6 ? '3' : '2')),
  'pipe.r': gen(16, 16, (x) => (x > 13 ? '.' : x === 13 ? '1' : x === 10 ? '1' : '2')),
  note: S(16,
    '.11111111111111.',
    '1222222222222221',
    '1222222222112221',
    '1222222221312221',
    '1222222221222221',
    '1222222221222221',
    '1222222221222221',
    '1222222221222221',
    '1222221111222221',
    '1222213331222221',
    '1222213331222221',
    '1222221111222221',
    '1222222222222221',
    '1233333333333321',
    '1222222222222221',
    '.11111111111111.',
  ),
  'lava.1': gen(16, 16, (x, y) => {
    const s = (x % 8) < 4 ? 2 : 3;
    if (y < s) return '.';
    if (y === s) return '3';
    return ((x + y) % 6 === 0) ? '1' : '2';
  }),
  'lava.2': gen(16, 16, (x, y) => {
    const s = ((x + 4) % 8) < 4 ? 2 : 3;
    if (y < s) return '.';
    if (y === s) return '3';
    return ((x + y + 3) % 6 === 0) ? '1' : '2';
  }),
  'cannon.top': S(16,
    '1111111111111111',
    '1222222222222221',
    '1211111111111121',
    '1213333333333121',
    '1213113333113121',
    '1213113333113121',
    '1213333113333121',
    '1213331111333121',
    '1211333333331121',
    '1211111111111121',
    '1222222222222221',
    '1111111111111111',
    '..122222222221..',
    '..121111111121..',
    '..122222222221..',
    '..111111111111..',
  ),
  'cannon.base': gen(16, 16, (x, y) => (x < 2 || x > 13 ? '.' : x === 2 || x === 13 ? '1' : y % 6 === 0 ? '3' : '2')),
  'door.top': S(16,
    '....11111111....',
    '..112222222211..',
    '.12222222222221.',
    '.12211111111221.',
    '1221222222221221',
    '1212222222222121',
    '1212222222222121',
    '1212222222222121',
    '1212222222222121',
    '1212222222222121',
    '1212222222222121',
    '1212222222222121',
    '1212222222222121',
    '1212222222222121',
    '1212222222222121',
    '1212222222222121',
  ),
  'door.bottom': gen(16, 16, (x, y) => {
    if (x === 0 || x === 15) return '1';
    if (x === 2 || x === 13) return '1';
    if (y === 15) return '1';
    if (x >= 10 && x <= 11 && y >= 4 && y <= 5) return '3';
    return '2';
  }),
  'goal.frame': gen(32, 32, (x, y) => {
    if (x < 2 || y < 2 || x > 29 || y > 29) return '2';
    if (x < 3 || y < 3 || x > 28 || y > 28) return '3';
    return '1';
  }),
  bush: ellipse(32, 16, true),
  hill: (() => {
    const g = ellipse(48, 32, true);
    // Two dark eyes like SMB3's hills.
    return g.map((r, y) => (y === 14 || y === 15 ? [...r].map((c, x) => ((x === 18 || x === 29) && c !== '.' ? '1' : c)).join('') : r));
  })(),
  bgcloud: gen(32, 24, (x, y) => {
    const blobs = [[9, 13, 8], [17, 9, 9], [24, 14, 7]];
    let d = Infinity;
    for (const [cx, cy, r] of blobs) d = Math.min(d, Math.hypot(x - cx, y - cy) - r);
    if (y > 20) return '.';
    if (d > 0) return '.';
    if (d > -1.2 || y === 20) return '1';
    return y > 16 ? '3' : '2';
  }),
};

// Slopes on the ground palette.
sprites.slope45up = slope((x) => 15 - x);
sprites.slope45dn = slope((x) => x);
sprites['gentle.up.lo'] = slope((x) => 15 - (x >> 1));
sprites['gentle.up.hi'] = slope((x) => 7 - (x >> 1));
sprites['gentle.dn.hi'] = slope((x) => x >> 1);
sprites['gentle.dn.lo'] = slope((x) => 8 + (x >> 1));

// Horizontal pipes are the vertical pieces turned on their side.
sprites['pipe.side.t'] = transpose(sprites['pipe.tl']);
sprites['pipe.side.b'] = transpose(sprites['pipe.tr']);
sprites['pipe.sidebody.t'] = transpose(sprites['pipe.l']);
sprites['pipe.sidebody.b'] = transpose(sprites['pipe.r']);
sprites['coin.tile'] = [
  '.....111111.....',
  '....12222221....',
  '...1223333221...',
  '...1232222321...',
  '...1232112321...',
  '...1232112321...',
  '...1232112321...',
  '...1232112321...',
  '...1232112321...',
  '...1232112321...',
  '...1232112321...',
  '...1232222321...',
  '...1223333221...',
  '....12222221....',
  '.....111111.....',
  '................',
];
