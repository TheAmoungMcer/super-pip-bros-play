import { blit, fillNES } from '../engine/render.js';
import { drawText } from './text.js';
import { slotPicture } from '../game/minigames.js';

const PICS = ['berry', 'blossom', 'star'];

export function drawSlots(ctx, sl, frame) {
  fillNES(ctx, 0x0F, 0, 0, 256, 200);
  drawText(ctx, 'MATCH THE PICTURE!', 56, 40);
  fillNES(ctx, 0x30, 100, 76, 56, 56);
  for (let i = 0; i < 3; i++) blit(ctx, `slot.${PICS[slotPicture(sl.reels[i])]}.${i}`, 'slot', 104, 80 + i * 16);
  if (sl.result >= 0) drawText(ctx, sl.lives ? `x${sl.lives} LIVES!` : 'SORRY!', sl.lives ? 88 : 104, 152, sl.lives ? 'text' : 'textRed');
  else if ((frame >> 4) & 1) drawText(ctx, 'PRESS A', 100, 152);
}
