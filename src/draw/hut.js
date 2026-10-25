import { blit, fillNES } from '../engine/render.js';
import { drawText } from './text.js';
import { ITEM_ART } from './itembar.js';

const CHEST_X = [72, 120, 168];

export function drawHut(ctx, h, frame) {
  fillNES(ctx, 0x0F, 0, 0, 256, 200);
  for (let y = 152; y < 200; y += 8) fillNES(ctx, (y >> 3) & 1 ? 0x17 : 0x07, 0, y, 256, 8);   // wood floor
  fillNES(ctx, 0x07, 0, 0, 256, 8);
  blit(ctx, 'keeper', 'keeper', 24, 135);
  drawText(ctx, 'PICK A CHEST!', 72, 48);
  h.chests.forEach((item, i) => {
    const open = h.opened === i;
    blit(ctx, open ? 'chest.open' : 'chest', 'chest', CHEST_X[i], 136);
    if (open) {
      const [name, pal] = ITEM_ART[item];
      blit(ctx, name, pal, CHEST_X[i], 120 - Math.min(h.t, 30));
    }
  });
  if (h.opened < 0 && (frame >> 3) & 1) blit(ctx, 'cursor', 'text', CHEST_X[h.cursor] + 4, 124);
}
