import { blit, fillNES } from '../engine/render.js';
import { drawText } from './text.js';

// SMB3-style status bar in the bottom 40 px.
export function drawHud(ctx, h) {
  fillNES(ctx, 0x0F, 0, 200, 256, 40);
  fillNES(ctx, 0x27, 8, 206, 168, 28);
  fillNES(ctx, 0x0F, 10, 208, 164, 24);
  drawText(ctx, `WORLD ${h.world}`, 14, 211);
  for (let i = 0; i < 6; i++) blit(ctx, h.pmeter > i ? 'hud.arrowOn' : 'hud.arrow', 'hud', 82 + i * 8, 211);
  const pOn = h.pmeter >= 7 && (h.flying ? true : (Date.now() >> 7) & 1);
  blit(ctx, pOn ? 'hud.pOn' : 'hud.p', 'hud', 130, 211);
  drawText(ctx, `$${String(h.coins).padStart(2, ' ')}`, 146, 211);
  blit(ctx, h.who ? 'face.pep' : 'face.pip', h.who ? 'pep' : 'pip', 14, 222);
  drawText(ctx, `x${String(h.lives).padStart(2, ' ')}`, 32, 222);
  drawText(ctx, String(h.score).padStart(7, '0'), 64, 222);
  if (h.time !== null && h.time !== undefined) drawText(ctx, String(h.time).padStart(3, '0'), 146, 222);
  for (let i = 0; i < 3; i++) {
    const c = h.cards[i];
    blit(ctx, c < 0 ? 'card.empty' : ['card.berry', 'card.blossom', 'card.star'][c], 'card', 180 + i * 24, 208);
  }
}
