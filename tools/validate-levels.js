import { parseLevel, tileAt } from '../src/game/level.js';
import { T, INFO } from '../src/game/tiles.js';

export function validateLevels(defs) {
  const errs = [];
  for (const [key, def] of Object.entries(defs)) {
    const where = `level ${key}`;
    let lv;
    try { lv = parseLevel(def); } catch (e) { errs.push(`${where}: ${e.message}`); continue; }
    if (def.id !== key) errs.push(`${where}: id '${def.id}' does not match key`);
    if (!(def.time > 0)) errs.push(`${where}: time must be > 0`);
    if (lv.h > 27) errs.push(`${where}: taller than 27 rows`);
    const hasGoal = lv.tiles.includes(T.GOAL);
    const routeHasGoal = (def.route || []).some(r => defs[r] && parseLevel(defs[r]).tiles.includes(T.GOAL));
    if (!def.sub && !def.boss && !hasGoal && !routeHasGoal) errs.push(`${where}: no goal (G) and not a boss level`);
    const { tx, ty } = lv.start;
    const under = tileAt(lv, tx, ty + 1);
    if (!(INFO[under].solid || INFO[under].semi) || INFO[tileAt(lv, tx, ty)].solid) errs.push(`${where}: start ${tx},${ty} must be an empty tile on top of solid ground`);
    for (const p of lv.pipes) {
      const id = tileAt(lv, p.at[0], p.at[1]);
      if (!INFO[id].pipe) errs.push(`${where}: pipe at ${p.at} is not a pipe tile`);
      if (p.to.level && !defs[p.to.level]) errs.push(`${where}: pipe target level '${p.to.level}' missing`);
    }
    for (const d of lv.doors) {
      if (tileAt(lv, d.at[0], d.at[1]) !== T.DOOR) errs.push(`${where}: door at ${d.at} is not a door tile`);
      if (d.to.level && !defs[d.to.level]) errs.push(`${where}: door target level '${d.to.level}' missing`);
    }
    for (const r of def.route || []) if (!defs[r]) errs.push(`${where}: route area '${r}' missing`);
  }
  return errs;
}

if (import.meta.main) {
  const { LEVELS } = await import(`../src/content/levels/${process.argv[2] || 'w1'}.js`);
  const errs = validateLevels(LEVELS);
  console.log(errs.length ? errs.join('\n') : 'all levels valid');
  process.exit(errs.length ? 1 : 0);
}
