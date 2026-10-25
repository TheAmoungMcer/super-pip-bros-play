import { drawLevel } from './level.js';
import { drawHud } from './hud.js';
import { drawMap } from './map.js';
import { drawHut } from './hut.js';
import { drawSlots } from './slots.js';
import { drawItemBar } from './itembar.js';
import { drawText } from './text.js';
import { fillNES } from '../engine/render.js';
import { hudFor } from './present.js';
import { WORLDS } from '../game/session.js';

const LETTER = [
  'DEAR PIP AND PEP,', '', 'THANK YOU FOR SAVING', "THE MEADOW KING'S WAND!", '',
  "GRIMJAW'S KIDS HAVE FLOWN", 'ON TO THE DUNE SEA.', '', "I'M SENDING YOU A STAR.", '',
  '      - PRINCESS LUMI', '', '(WORLD 2 IS COMING SOON)',
];

export function drawSession(ctx, sess, local) {
  const f = sess.t;
  switch (sess.scene) {
    case 'map':
      drawMap(ctx, WORLDS[sess.world].map, sess.map, Array(sess.players).fill(0), f);
      drawHud(ctx, hudFor(sess, local));
      if (sess.menus[local]) drawItemBar(ctx, sess.items[local], sess.menus[local].sel, local);
      return;
    case 'level':
      drawLevel(ctx, sess.level, local);
      drawHud(ctx, hudFor(sess, local));
      if (sess.paused) { fillNES(ctx, 0x0F, 88, 88, 80, 24); drawText(ctx, 'PAUSED', 104, 96); }
      return;
    case 'hut': drawHut(ctx, sess.hut, f); drawHud(ctx, hudFor(sess, local)); return;
    case 'slots': drawSlots(ctx, sess.slots, f); drawHud(ctx, hudFor(sess, local)); return;
    case 'letter':
      fillNES(ctx, 0x0F, 0, 0, 256, 240);
      fillNES(ctx, 0x37, 16, 16, 224, 208);
      LETTER.forEach((line, i) => { if (f > i * 12) drawText(ctx, line, 24, 28 + i * 14, 'textDark'); });
      if (f > 240 && (f >> 4) & 1) drawText(ctx, 'PRESS A', 100, 214, 'textDark');
      return;
    case 'gameover':
      fillNES(ctx, 0x0F, 0, 0, 256, 240);
      drawText(ctx, 'GAME OVER', 92, 80);
      drawText(ctx, `${sess.gameover.sel === 0 ? '>' : ' '} CONTINUE`, 84, 112);
      drawText(ctx, `${sess.gameover.sel === 1 ? '>' : ' '} END`, 84, 128);
  }
}
