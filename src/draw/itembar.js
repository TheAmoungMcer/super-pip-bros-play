import { blit, fillNES } from '../engine/render.js';
import { drawText } from './text.js';

// Item id -> [sprite, palette]
export const ITEM_ART = {
  berry: ['berry', 'berry'], blossom: ['blossom.1', 'blossom'], leaf: ['leaf', 'leaf'], star: ['star.1', 'star'],
};

// Overlays the status bar with 7 slots centred on the selection.
export function drawItemBar(ctx, inv, sel, who) {
  fillNES(ctx, 0x0F, 0, 200, 256, 40);
  drawText(ctx, who ? "PEP'S ITEMS" : "PIP'S ITEMS", 8, 204);
  const first = Math.max(0, Math.min(sel - 3, inv.length - 7));
  for (let i = 0; i < 7; i++) {
    const idx = first + i, x = 72 + i * 24;
    blit(ctx, 'itembox', 'hud', x, 214);
    if (inv[idx]) { const [name, pal] = ITEM_ART[inv[idx]]; blit(ctx, name, pal, x, 214); }
    if (idx === sel) blit(ctx, 'cursor', 'text', x + 4, 231);
  }
  if (!inv.length) drawText(ctx, 'NO ITEMS', 8, 222);
}
