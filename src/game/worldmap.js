import { BTN } from './consts.js';

const rows = (def) => {
  if (!def._rows) {
    const r = def.grid.split('\n');
    if (r[0].trim() === '') r.shift();
    if (r[r.length - 1].trim() === '') r.pop();
    Object.defineProperty(def, '_rows', { value: r, enumerable: false });
  }
  return def._rows;
};
export const cell = (def, x, y) => (rows(def)[y] || '')[x] || '.';
export const nodeAt = (def, x, y) => def.nodes[cell(def, x, y)] || null;
const key = (x, y) => `${x},${y}`;
const BLOCKING = new Set(['level', 'fortress', 'airship']);

export function createMap(def) {
  const r = rows(def);
  let sx = 0, sy = 0;
  r.forEach((row, y) => { const x = row.indexOf('S'); if (x >= 0) { sx = x; sy = y; } });
  return { x: sx, y: sy, px: sx * 16, py: sy * 16, moving: null, from: null, cleared: {}, opened: {}, used: {}, prev: [0, 0] };
}

export function canEnter(m, def, x, y) {
  const n = nodeAt(def, x, y);
  if (!n) return false;
  const k = key(x, y);
  if (BLOCKING.has(n.kind)) return !m.cleared[k];
  if (n.kind === 'hut' || n.kind === 'slots') return !m.used[k];
  return false;
}

function findTarget(m, def, dx, dy) {
  let x = m.x + dx, y = m.y + dy;
  for (let guard = 0; guard < 64; guard++) {
    const ch = cell(def, x, y);
    if ((ch === '-' && dx) || (ch === '|' && dy)) { x += dx; y += dy; continue; }
    const n = def.nodes[ch];
    if (!n) return null;
    if (n.kind === 'lock') {
      if (!m.opened[key(x, y)]) return null;
      x += dx; y += dy; continue;
    }
    return { x, y };
  }
  return null;
}

export function stepMap(m, def, inputs) {
  let pressed = 0;
  inputs.forEach((b, i) => { pressed |= b & ~(m.prev[i] | 0); m.prev[i] = b; });
  if (m.moving) {
    const mv = m.moving;
    m.px += mv.dx * 2; m.py += mv.dy * 2;
    if (m.px === mv.tx * 16 && m.py === mv.ty * 16) { m.x = mv.tx; m.y = mv.ty; m.moving = null; }
    return null;
  }
  if (pressed & BTN.A) {
    if (!canEnter(m, def, m.x, m.y)) return null;
    const n = nodeAt(def, m.x, m.y);
    return { kind: n.kind, ...(n.level ? { level: n.level } : {}), key: key(m.x, m.y) };
  }
  const dir = pressed & BTN.LEFT ? [-1, 0] : pressed & BTN.RIGHT ? [1, 0] : pressed & BTN.UP ? [0, -1] : pressed & BTN.DOWN ? [0, 1] : null;
  if (!dir) return null;
  const here = nodeAt(def, m.x, m.y);
  const stuck = here && BLOCKING.has(here.kind) && !m.cleared[key(m.x, m.y)];
  if (stuck && !(m.from && m.from[0] === -dir[0] && m.from[1] === -dir[1])) return null;
  const t = findTarget(m, def, dir[0], dir[1]);
  if (!t) return null;
  m.moving = { tx: t.x, ty: t.y, dx: dir[0], dy: dir[1] };
  m.from = dir;
  return null;
}

export function markCleared(m, def, k) {
  m.cleared[k] = true;
  const [x, y] = k.split(',').map(Number);
  const n = nodeAt(def, x, y);
  if (n && n.opens) {
    rows(def).forEach((row, ly) => { for (let lx = 0; lx < row.length; lx++) if (row[lx] === n.opens) m.opened[key(lx, ly)] = true; });
  }
}

export function markUsed(m, k) { m.used[k] = true; }
