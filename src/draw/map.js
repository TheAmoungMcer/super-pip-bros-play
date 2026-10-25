import { blit, fillNES } from '../engine/render.js';
import { drawText } from './text.js';
import { cell, nodeAt } from '../game/worldmap.js';

const OX = 0, OY = 40;   // map grid drawn from y=40 so the title sits above it

export function drawMap(ctx, def, m, players, frame) {
  fillNES(ctx, 0x37, 0, 0, 256, 200);
  drawText(ctx, `WORLD ${def.world}  ${def.name}`, 8, 16, 'textDark');
  const lines = def.grid.split('\n').filter(l => l.trim() !== '');
  lines.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x], X = OX + x * 16, Y = OY + y * 16;
      blit(ctx, 'map.grass', 'map', X, Y);
      if (ch === 't') blit(ctx, 'map.tree', 'mapGreen', X, Y);
      else if (ch === '-') blit(ctx, 'map.path.h', 'map', X, Y);
      else if (ch === '|') blit(ctx, 'map.path.v', 'map', X, Y);
      else {
        const n = def.nodes[ch];
        if (!n) continue;
        const k = `${x},${y}`;
        if (n.kind === 'level') {
          if (m.cleared[k]) blit(ctx, 'node.cleared', 'panelDone', X, Y);
          else { blit(ctx, 'node.level', 'panel', X, Y); drawText(ctx, ch, X + 4, Y + 4, 'textDark'); }
        } else if (n.kind === 'start') blit(ctx, 'node.start', 'panel', X, Y);
        else if (n.kind === 'hut') { if (!m.used[k]) blit(ctx, 'node.hut', 'panel', X, Y); else blit(ctx, 'map.path.x', 'map', X, Y); }
        else if (n.kind === 'slots') { if (!m.used[k]) blit(ctx, 'node.slots', 'panel', X, Y); else blit(ctx, 'map.path.x', 'map', X, Y); }
        else if (n.kind === 'fortress') blit(ctx, m.cleared[k] ? 'node.cleared' : 'node.fort', m.cleared[k] ? 'panelDone' : 'map', X, Y);
        else if (n.kind === 'lock') blit(ctx, m.opened[k] ? 'node.lock.open' : 'node.lock', 'map', X, Y);
        else if (n.kind === 'airship') blit(ctx, 'node.airship', 'map', X, Y);
      }
    }
  });
  const bob = (frame >> 4) & 1;
  players.forEach((p, i) => blit(ctx, 'small.front', i ? 'pep' : 'pip', OX + m.px + i * 6 - (players.length > 1 ? 3 : 0), OY + m.py - 4 - bob));
}
