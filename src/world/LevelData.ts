import { LEVEL_ROWS } from '../config';
import { Theme, THEMES } from './tiles';

export interface WarpDef {
  fromSection: string;
  fromCol: number;
  toSection: string;
  toX: number;
  toY: number;
}

export interface SectionDef {
  name: string;
  theme: Theme;
  rows: string[];
  width: number;
}

export interface LevelDef {
  id: string;         // e.g. "1-1" (from the file name)
  name: string;       // display name on the intro card
  theme: Theme;
  music: string;
  time: number;
  boss: boolean;
  checkpoint: { x: number; y: number } | null;
  warps: WarpDef[];
  sections: Record<string, SectionDef>;
}

/**
 * Level file format (see any file in src/levels for a commented example):
 *   ; comment            — ignored (legend lives here)
 *   @key value           — metadata (name, theme, music, time, checkpoint, warp, boss)
 *   [section theme?]     — starts a grid section; "main" is where the level begins
 *   ....#####....        — grid rows, one character per 16x16 tile, 15 rows per section
 */
export function parseLevel(id: string, text: string): LevelDef {
  const level: LevelDef = {
    id, name: id, theme: 'overworld', music: '', time: 400, boss: false,
    checkpoint: null, warps: [], sections: {},
  };
  let current: SectionDef | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    if (!line || line.startsWith(';')) continue;
    if (line.startsWith('@')) {
      const [key, ...rest] = line.slice(1).split(/\s+/);
      const val = rest.join(' ');
      switch (key) {
        case 'name': level.name = val; break;
        case 'theme': level.theme = asTheme(val, id); break;
        case 'music': level.music = val; break;
        case 'time': level.time = parseInt(val, 10); break;
        case 'boss': level.boss = val !== 'false'; break;
        case 'checkpoint': {
          const [x, y] = val.split(',').map((n) => parseInt(n, 10));
          level.checkpoint = { x, y };
          break;
        }
        case 'warp': {
          // @warp main:57 -> bonus:2,1
          const m = /^(\w+):(\d+)\s*->\s*(\w+):(\d+),(\d+)$/.exec(val);
          if (!m) throw new Error(`Level ${id}: bad warp "${val}"`);
          level.warps.push({ fromSection: m[1], fromCol: +m[2], toSection: m[3], toX: +m[4], toY: +m[5] });
          break;
        }
        default: console.warn(`Level ${id}: unknown key @${key}`);
      }
      continue;
    }
    const sec = /^\[(\w+)(?:\s+(\w+))?\]$/.exec(line);
    if (sec) {
      current = { name: sec[1], theme: sec[2] ? asTheme(sec[2], id) : level.theme, rows: [], width: 0 };
      level.sections[current.name] = current;
      continue;
    }
    if (!current) {
      current = { name: 'main', theme: level.theme, rows: [], width: 0 };
      level.sections.main = current;
    }
    current.rows.push(line);
  }
  for (const s of Object.values(level.sections)) {
    if (s.rows.length !== LEVEL_ROWS) console.warn(`Level ${id} [${s.name}]: ${s.rows.length} rows (expected ${LEVEL_ROWS})`);
    while (s.rows.length < LEVEL_ROWS) s.rows.unshift('');
    s.rows = s.rows.slice(-LEVEL_ROWS);
    s.width = Math.max(...s.rows.map((r) => r.length));
    s.rows = s.rows.map((r) => r.padEnd(s.width, '.'));
  }
  if (!level.sections.main) throw new Error(`Level ${id}: no [main] section`);
  if (!level.music) level.music = level.boss ? 'castle' : level.theme;
  return level;
}

function asTheme(v: string, id: string): Theme {
  if ((THEMES as string[]).includes(v)) return v as Theme;
  console.warn(`Level ${id}: unknown theme "${v}", using overworld`);
  return 'overworld';
}

// Every .txt in src/levels is a level, played in filename order. Add "1-5.txt" and it's in.
const files = import.meta.glob('../levels/*.txt', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const LEVELS: LevelDef[] = Object.keys(files)
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  .map((path) => parseLevel(path.replace(/^.*\/(.*)\.txt$/, '$1'), files[path]));
