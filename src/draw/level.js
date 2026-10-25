import { blit, fillNES } from '../engine/render.js';
import { tileArt, entityArt, playerArt, THEMES, popupText } from './art.js';
import { drawText } from './text.js';
import { SUB, SCREEN_W, PLAY_H } from '../game/consts.js';
import { T } from '../game/tiles.js';
import { tileAt } from '../game/level.js';

const BEHIND = new Set(['snapvine', 'firesnapvine']);

const drawLayers = (ctx, layers, x, y) => {
  for (const l of layers) blit(ctx, l.name, l.pal, x + l.dx, y + l.dy, { flipX: l.flipX, flipY: l.flipY });
};

function drawScenery(ctx, lv, cam) {
  if (lv.theme !== 'overworld' && lv.theme !== 'sky') return;
  // Deterministic scenery: a hill or bush every 7-13 tiles on the lowest ground surface, clouds above.
  const groundRow = lv.h - 2;
  for (let tx = Math.floor(cam.x / 16) - 4; tx < (cam.x + SCREEN_W) / 16 + 1; tx++) {
    const h = (tx * 2654435761) >>> 0;
    const sx = tx * 16 - cam.x;
    if (h % 11 === 0) blit(ctx, 'bgcloud', 'cloud', sx, 24 + ((h >> 8) % 48) - cam.y);
    if (lv.theme === 'overworld' && h % 13 === 0) blit(ctx, 'hill', 'hill', sx, groundRow * 16 - 16 - cam.y);
    else if (lv.theme === 'overworld' && h % 7 === 0) blit(ctx, 'bush', 'bush', sx, groundRow * 16 - cam.y);
  }
}

export function drawLevel(ctx, s, camIdx) {
  const cam = s.cams[camIdx], lv = s.lv, frame = s.frame;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, SCREEN_W, PLAY_H); ctx.clip();
  fillNES(ctx, THEMES[lv.theme]?.bg ?? 0x31, 0, 0, SCREEN_W, PLAY_H);
  drawScenery(ctx, lv, cam);

  // Pipe plants and players inside pipes are drawn behind tiles, so the pipe hides them.
  for (const e of s.entities) if (BEHIND.has(e.type)) drawLayers(ctx, entityArt(e, frame), e.x / SUB - cam.x, e.y / SUB - cam.y);
  for (const p of s.players) if (p.pipe) drawLayers(ctx, playerArt(p, frame), p.x / SUB - cam.x, p.y / SUB - cam.y);

  const tx0 = Math.floor(cam.x / 16), ty0 = Math.floor(cam.y / 16);
  for (let ty = ty0; ty <= ty0 + 13; ty++) for (let tx = tx0; tx <= tx0 + 16; tx++) {
    const bump = s.bumps.find(b => b.tx === tx && b.ty === ty);
    const lift = bump ? Math.min(bump.t, 8 - bump.t) : 0;
    drawLayers(ctx, tileArt(lv, tx, ty, frame, s.pswitch > 0), tx * 16 - cam.x, ty * 16 - cam.y - lift);
  }
  // Goal box: first GOAL tile column draws the frame and a cycling card.
  for (let ty = ty0; ty <= ty0 + 13; ty++) for (let tx = tx0; tx <= tx0 + 16; tx++) {
    if (tileAt(lv, tx, ty) !== T.GOAL) continue;
    if (tileAt(lv, tx, ty - 1) === T.GOAL || tileAt(lv, tx - 1, ty) === T.GOAL) continue;
    const x = tx * 16 - cam.x, y = ty * 16 - cam.y;
    blit(ctx, 'goal.frame', 'goal', x, y);
    const card = s.clear ? s.clear.card : Math.floor(frame / 8) % 3;
    blit(ctx, ['card.berry', 'card.blossom', 'card.star'][card], 'card', x + 4, y + 4);
  }

  for (const e of s.entities) {
    if (BEHIND.has(e.type)) continue;
    const x = e.x / SUB - cam.x, y = e.y / SUB - cam.y;
    if (x < -48 || x > SCREEN_W + 48) continue;
    if (e.type === 'popup') { drawText(ctx, popupText(e), x, y, 'text'); continue; }
    drawLayers(ctx, entityArt(e, frame), x, y);
  }
  for (const p of s.players) if (!p.pipe) drawLayers(ctx, playerArt(p, frame), p.x / SUB - cam.x, p.y / SUB - cam.y);
  ctx.restore();
}
