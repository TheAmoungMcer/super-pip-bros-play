import { blit } from '../engine/render.js';
import { SPRITES } from '../content/sprites/index.js';

const NAMES = { 'x': 'font.x', '$': 'font.$', ':': 'font.:', '/': 'font./', '.': 'font..', ',': 'font.,', "'": 'font.\'', '!': 'font.!', '?': 'font.?', '-': 'font.-', '♥': 'font.heart', '>': 'font.>', '=': 'font.=', '(': 'font.(', ')': 'font.)' };

export function drawText(ctx, str, x, y, pal = 'text') {
  for (const ch of String(str)) {
    const name = NAMES[ch] || `font.${ch.toUpperCase()}`;
    if (ch !== ' ' && SPRITES[name]) blit(ctx, name, pal, x, y);
    x += 8;
  }
}
