import { PALETTE, hexToRgb } from './palette.js';

const RGB = PALETTE.map(hexToRgb);

export function parseGrid(rows, name = '?') {
  const h = rows.length, w = rows[0].length;
  const px = new Uint8Array(w * h);
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`sprite ${name}: row ${y} has ${row.length} chars, expected ${w}`);
    for (let x = 0; x < w; x++) {
      const c = row[x];
      if (c === '.') continue;
      if (c < '1' || c > '3') throw new Error(`sprite ${name}: bad char '${c}' at ${x},${y}`);
      px[y * w + x] = c.charCodeAt(0) - 48;
    }
  });
  return { w, h, px };
}

export function bakeRGBA(sprite, pal, flipX = false) {
  const { w, h, px } = sprite;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = px[y * w + (flipX ? w - 1 - x : x)];
      if (!v) continue;
      const [r, g, b] = RGB[pal[v - 1]];
      const o = (y * w + x) * 4;
      out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = 255;
    }
  }
  return out;
}
