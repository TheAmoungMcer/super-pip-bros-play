import * as player from './player.js';
import * as enemies from './enemies.js';
import * as items from './items.js';
import * as tiles from './tiles.js';
import * as ui from './ui.js';
import * as map from './map.js';

const groups = [player, enemies, items, tiles, ui, map];
export const SPRITES = Object.assign({}, ...groups.map(g => g.sprites));
export const PALS = Object.assign({}, ...groups.map(g => g.pals));
// Palette used to show each sprite in the gallery: the group's `palOf[name]`, else its `defaultPal`.
export const GALLERY_PAL = Object.fromEntries(groups.flatMap(g =>
  Object.keys(g.sprites).map(n => [n, (g.palOf && g.palOf[n]) || g.defaultPal])));
