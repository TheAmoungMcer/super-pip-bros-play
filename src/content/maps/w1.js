export const MAP_W1 = {
  world: 1, name: 'MEADOW VALE', music: 'map1',
  grid: String.raw`
................
.S-1-2-H......t.
t......|........
...4-P-3....tt..
...|..........t.
...F-L-5-6......
t........|...t..
t........J-A....
................`,
  nodes: {
    S: { kind: 'start' },
    1: { kind: 'level', level: '1-1' }, 2: { kind: 'level', level: '1-2' }, 3: { kind: 'level', level: '1-3' },
    4: { kind: 'level', level: '1-4' }, 5: { kind: 'level', level: '1-5' }, 6: { kind: 'level', level: '1-6' },
    H: { kind: 'hut' }, J: { kind: 'hut' }, P: { kind: 'slots' },
    F: { kind: 'fortress', level: '1-F', opens: 'L' }, L: { kind: 'lock' },
    A: { kind: 'airship', level: '1-A' },
  },
};
