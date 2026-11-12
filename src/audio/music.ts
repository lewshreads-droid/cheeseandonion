// Original chiptune score. Notation: "NOTE:len" in sixteenth notes, R = rest.
// Drums: one char per sixteenth — k kick, s snare, h hat, . rest.
// Every tune here was written for this game; none are transcriptions.

export interface Song {
  bpm: number;
  lead: string;
  bass: string;
  drums?: string;
  leadDuty?: number;   // pulse width for the lead (0.125, 0.25, 0.5)
  loop?: boolean;
  leadVol?: number;
}

export const SONGS: Record<string, Song> = {
  // "Gower Greens" — bouncy G major
  overworld: {
    bpm: 150,
    leadDuty: 0.25,
    lead: `G4:2 B4:2 D5:2 G5:2 F#5:2 D5:2 E5:4
           C5:2 E5:2 G5:2 E5:2 D5:4 B4:4
           G4:2 B4:2 D5:2 G5:2 A5:2 G5:2 E5:2 F#5:2
           G5:4 D5:2 B4:2 G4:4 R:4
           E5:3 D5:1 C5:2 E5:2 D5:3 C5:1 B4:4
           A4:2 C5:2 E5:2 A5:2 G5:4 F#5:4
           E5:3 D5:1 C5:2 E5:2 D5:2 B4:2 G4:2 B4:2
           A4:2 D5:2 F#5:2 A5:2 G5:6 R:2`,
    bass: `G2:2 D3:2 G3:2 D3:2 G2:2 D3:2 G3:2 D3:2
           C3:2 G3:2 C3:2 G3:2 D3:2 A3:2 G2:2 D3:2
           G2:2 D3:2 G3:2 D3:2 G2:2 D3:2 G3:2 D3:2
           G2:2 D3:2 G2:2 D3:2 G2:4 R:4
           C3:2 G3:2 C3:2 G3:2 G2:2 D3:2 G2:2 D3:2
           A2:2 E3:2 A2:2 E3:2 D3:2 A3:2 D3:2 A3:2
           C3:2 G3:2 C3:2 G3:2 G2:2 D3:2 G2:2 D3:2
           D3:2 A3:2 D3:2 A3:2 G2:4 G2:2 R:2`,
    drums: 'k.h.s.h.k.k.s.h.',
  },
  // "Mumbles Mines" — sparse, minor, plucky
  underground: {
    bpm: 118,
    leadDuty: 0.125,
    lead: `E4:1 R:1 E4:1 R:1 G4:2 R:2 A4:1 R:1 B4:2 R:4
           D5:2 B4:2 A4:2 G4:2 F#4:4 R:4
           E4:1 R:1 E4:1 R:1 G4:2 R:2 A4:1 R:1 B4:2 R:2 C5:2
           B4:2 A4:2 G4:2 F#4:2 E4:6 R:2`,
    bass: `E2:2 R:2 E2:2 B2:2 E2:2 R:2 G2:2 B2:2
           D2:2 R:2 D2:2 A2:2 D2:2 R:2 F#2:2 A2:2
           E2:2 R:2 E2:2 B2:2 E2:2 R:2 G2:2 B2:2
           B1:2 R:2 B1:2 F#2:2 E2:4 R:4`,
    drums: 'k.......s...h.h.',
  },
  // "Treetop Towers" — airy F lydian
  sky: {
    bpm: 160,
    leadDuty: 0.125,
    lead: `F5:2 A5:2 C6:4 A5:2 F5:2 G5:4
           E5:2 G5:2 C6:4 B5:2 G5:2 A5:4
           D5:2 F5:2 A5:4 G5:2 F5:2 E5:2 D5:2
           C5:2 E5:2 G5:2 A#5:2 A5:8`,
    bass: `F2:4 C3:4 F2:4 C3:4
           C3:4 G2:4 C3:4 G2:4
           A#2:4 F2:4 A#2:4 F2:4
           C3:4 G2:4 F2:8`,
    drums: 'k.h.s.h.k.h.s.hh',
  },
  // "The Lizard Lair" — tense D minor ostinato
  castle: {
    bpm: 132,
    leadDuty: 0.5,
    leadVol: 0.7,
    lead: `D5:1 R:1 D5:1 R:1 C#5:1 R:1 D5:1 R:1 F5:2 E5:2 D5:2 C#5:2
           A#4:1 R:1 A#4:1 R:1 A4:1 R:1 A#4:1 R:1 D5:2 C#5:2 A#4:2 A4:2
           D5:1 R:1 D5:1 R:1 C#5:1 R:1 D5:1 R:1 G5:2 F5:2 E5:2 F5:2
           A5:4 G#5:4 A5:6 R:2`,
    bass: `D2:2 D3:2 D2:2 D3:2 D2:2 D3:2 D2:2 D3:2
           A#1:2 A#2:2 A#1:2 A#2:2 A#1:2 A#2:2 A#1:2 A#2:2
           G1:2 G2:2 G1:2 G2:2 G1:2 G2:2 G1:2 G2:2
           A1:2 A2:2 A1:2 A2:2 A1:2 A2:2 A1:2 A2:2`,
    drums: 'k.k.s.k.k.k.s.ks',
  },
  // "Overlord" — phrygian stomp
  boss: {
    bpm: 150,
    leadDuty: 0.25,
    lead: `E4:2 F4:2 E4:2 R:2 E4:2 F4:2 G4:2 F4:2
           E4:2 F4:2 E4:2 R:2 B4:2 A4:2 G4:2 F4:2
           E5:2 F5:2 E5:2 R:2 E5:2 F5:2 G5:2 F5:2
           E5:2 D5:2 C5:2 B4:2 C5:2 B4:2 A4:2 F4:2`,
    bass: `E2:1 R:1 E2:1 R:1 E2:1 R:1 E2:1 R:1 E2:1 R:1 E2:1 R:1 F2:1 R:1 F2:1 R:1`,
    drums: 'kskskskskskskkss',
  },
  // Golden Crisp invincibility — fast and bright
  star: {
    bpm: 184,
    leadDuty: 0.25,
    lead: `C5:1 C5:1 E5:1 G5:1 C6:2 G5:2 E5:1 E5:1 G5:1 C6:1 E6:2 C6:2
           D5:1 D5:1 F5:1 A5:1 D6:2 A5:2 B5:1 B5:1 G5:1 D5:1 G5:2 B5:2`,
    bass: `C3:2 G3:2 C3:2 G3:2 C3:2 G3:2 C3:2 G3:2
           D3:2 A3:2 D3:2 A3:2 G2:2 D3:2 G2:2 D3:2`,
    drums: 'k.s.k.s.k.s.kss.',
  },
  title: {
    bpm: 112,
    leadDuty: 0.125,
    leadVol: 0.6,
    lead: `G4:4 B4:4 D5:4 G5:4 F#5:4 E5:4 D5:8
           C5:4 E5:4 G5:4 E5:4 D5:8 R:8`,
    bass: `G2:8 D3:8 E2:8 B2:8 C3:8 A2:8 D3:8 D2:8`,
    drums: 'k.......s.......',
  },
  victory: {
    bpm: 140,
    leadDuty: 0.25,
    lead: `C5:2 E5:2 G5:2 C6:4 B5:2 A5:2 G5:2
           F5:2 A5:2 C6:2 F6:4 E6:2 D6:2 C6:2
           D6:2 B5:2 G5:2 D5:2 E5:2 G5:2 C6:4
           A5:2 B5:2 C6:2 D6:2 C6:8`,
    bass: `C3:2 G3:2 C3:2 G3:2 C3:2 G3:2 C3:2 G3:2
           F2:2 C3:2 F2:2 C3:2 F2:2 C3:2 F2:2 C3:2
           G2:2 D3:2 G2:2 D3:2 C3:2 G3:2 C3:2 G3:2
           F2:2 C3:2 G2:2 D3:2 C3:8`,
    drums: 'k.h.s.h.k.h.s.h.',
  },
  // One-shot jingles
  clear: { bpm: 168, loop: false, leadDuty: 0.25,
    lead: 'G4:1 C5:1 E5:1 G5:3 E5:1 G5:6 R:2 A5:2 B5:2 C6:9', bass: 'C3:6 C3:6 R:4 G2:4 C3:8' },
  gameover: { bpm: 100, loop: false, leadDuty: 0.5,
    lead: 'E5:2 D5:2 C5:2 B4:2 A4:6 G4:2 E4:4 C4:12', bass: 'A2:8 F2:8 G2:4 C2:12' },
  death: { bpm: 120, loop: false, leadDuty: 0.5,
    lead: 'G4:3 F#4:3 F4:3 E4:9', bass: 'C3:3 B2:3 A#2:3 A2:9' },
  win: { bpm: 150, loop: false, leadDuty: 0.25,
    lead: 'C5:2 G4:2 C5:2 E5:2 G5:4 E5:2 G5:2 C6:12', bass: 'C3:4 G2:4 C3:4 G2:4 C2:12' },
};

const NOTE_INDEX: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

export function noteFreq(name: string): number {
  const m = /^([A-G]#?)(-?\d)$/.exec(name);
  if (!m) return 0;
  const midi = 12 * (parseInt(m[2], 10) + 1) + NOTE_INDEX[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export interface NoteEvent { freq: number; len: number }

export function parseTrack(src: string): NoteEvent[] {
  return src
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const [n, l] = tok.split(':');
      return { freq: n === 'R' ? 0 : noteFreq(n), len: parseInt(l ?? '1', 10) };
    });
}
