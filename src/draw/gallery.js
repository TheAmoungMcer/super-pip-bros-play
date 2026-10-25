import { SPRITES, GALLERY_PAL } from '../content/sprites/index.js';
import { blit, fillNES } from '../engine/render.js';
import { drawText } from './text.js';

// Draws every sprite in a grid, 24 per page, for screenshot review.
export function drawGallery(ctx, page) {
  fillNES(ctx, 0x2D, 0, 0, 256, 240);
  const names = Object.keys(SPRITES), per = 24;
  names.slice(page * per, page * per + per).forEach((n, i) => {
    const x = (i % 6) * 42 + 4, y = Math.floor(i / 6) * 58 + 4;
    blit(ctx, n, GALLERY_PAL[n], x, y);
    drawText(ctx, n.slice(0, 5), x, y + 34);
  });
  drawText(ctx, `PAGE ${page + 1}/${Math.ceil(names.length / per)}`, 4, 228);
}
