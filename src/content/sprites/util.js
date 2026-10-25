// Authoring helpers for pixel-grid sprites. Rows use '.', '1', '2', '3'.

// Pad every row to width w with '.'; a row longer than w is an authoring error.
export function S(w, ...rows) {
  return rows.map((r, i) => {
    if (r.length > w) throw new Error(`sprite row ${i} longer than ${w}: "${r}"`);
    return r.padEnd(w, '.');
  });
}

// Pad a sprite at the top to height h (feet stay on the bottom row).
export const padTop = (rows, h) => [...Array(Math.max(0, h - rows.length)).fill('.'.repeat(rows[0].length)), ...rows];

export const mirror = (rows) => rows.map(r => [...r].reverse().join(''));

export const transpose = (rows) => [...rows[0]].map((_, x) => rows.map(r => r[x]).join(''));

// Build a w x h grid from a function (x, y) => '.'|'1'|'2'|'3'.
export function gen(w, h, fn) {
  return Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => fn(x, y)).join(''));
}

// Replace one digit with another (e.g. recolour a slot for a variant frame).
export const swap = (rows, from, to) => rows.map(r => r.split(from).join(to));
