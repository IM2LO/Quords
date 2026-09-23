import { buildScale, formatSpelledPitch, mod12, noteName, SCALE_PROFILES, spellScale, type Notation, type ScaleMode } from './music';

export const COLORS = ['triad', '7', '9', '11', '13', 'sus2', 'sus4', 'add9', '6'] as const;
export type Color = typeof COLORS[number];
export const COLOR_NAMES: Record<Color, string> = { triad: 'Triade', '7': '7e', '9': '9e', '11': '11e', '13': '13e', sus2: 'Sus2', sus4: 'Sus4', add9: 'Add9', '6': '6e' };
export interface ChordSpec {
  tonic: number; mode: ScaleMode; degree: number; color: Color;
  octave: number; inversion: number; spread: boolean; bassOctave: number;
  source: 'scale' | 'borrowed' | 'secondary';
}
export const DEFAULT_SPEC: ChordSpec = { tonic: 0, mode: 'major', degree: 0, color: '7', octave: 3, inversion: 0, spread: false, bassOctave: 2, source: 'scale' };

export function chordInfo(spec: ChordSpec, notation: Notation = 'latin') {
  const profile = SCALE_PROFILES[spec.mode];
  const degree = ((spec.degree % 7) + 7) % 7;
  const scaleStep = (index: number) => profile.intervals[index % 7] + 12 * Math.floor(index / 7);
  const fromRoot = (offset: number) => scaleStep(degree + offset) - scaleStep(degree);
  const root = mod12(spec.tonic + scaleStep(degree));
  let intervals = [0, fromRoot(2), fromRoot(4)];
  const count = ({ '7': 4, '9': 5, '11': 6, '13': 7 } as Partial<Record<Color, number>>)[spec.color];
  if (count) intervals = Array.from({ length: count }, (_, i) => fromRoot(i * 2));
  if (spec.color === 'sus2') intervals = [0, 2, 7];
  if (spec.color === 'sus4') intervals = [0, 5, 7];
  if (spec.color === 'add9') intervals.push(14);
  if (spec.color === '6') intervals.push(9);
  const third = intervals[1], fifth = intervals[2], seventh = intervals[3];
  let suffix = third === 3 ? (fifth === 6 ? '°' : 'm') : fifth === 8 ? '+' : '';
  if (count) {
    if (third === 3 && fifth === 6) suffix = seventh === 9 ? '°7' : 'ø7';
    else suffix += seventh === 11 ? (third === 3 ? '(maj7)' : 'maj7') : '7';
    if (count > 4) suffix += '(' + intervals.slice(4).map((value, i) => {
      const reference = [14, 17, 21][i], number = [9, 11, 13][i];
      return (value < reference ? '♭' : value > reference ? '♯' : '') + number;
    }).join(',') + ')';
  } else if (spec.color === 'sus2' || spec.color === 'sus4') suffix = spec.color;
  else if (spec.color === 'add9') suffix += 'add9';
  else if (spec.color === '6') suffix += '6';
  const rootName = formatSpelledPitch(spellScale(spec.tonic, spec.mode)[degree], notation);
  const pitchClasses = intervals.map(n => mod12(root + n));
  const formulaNames: Record<number, string> = { 0: '1', 1: '♭2', 2: '2', 3: '♭3', 4: '3', 5: '4', 6: '♭5', 7: '5', 8: '♯5', 9: '6', 10: '♭7', 11: '7', 13: '♭9', 14: '9', 15: '♯9', 16: '♭11', 17: '11', 18: '♯11', 20: '♭13', 21: '13', 22: '♯13' };
  const formula = intervals.map((n, i) => i === 3 && count && n === 9 ? '𝄫7' : formulaNames[n] ?? String(n)).join(' · ');
  const scaleNotes = spellScale(spec.tonic, spec.mode);
  const names = pitchClasses.map(pc => {
    const spelled = scaleNotes.find(n => n.pitchClass === pc);
    return spelled ? formatSpelledPitch(spelled, notation) : noteName(pc, notation);
  });
  return { root, intervals, pitchClasses, names, name: rootName + suffix, formula, roman: profile.romans[degree], rootName };
}

export function chordPitches(spec: ChordSpec): number[] {
  const chord = chordInfo(spec);
  const pitches = chord.intervals.map(n => 12 * (spec.octave + 1) + chord.root + n);
  for (let i = 0; i < spec.inversion % pitches.length; i++) pitches.push(pitches.shift()! + 12);
  if (spec.spread && pitches.length > 2) pitches[pitches.length - 2] -= 12;
  pitches.sort((a, b) => a - b);
  while (pitches[pitches.length - 1] > 119) for (let i = 0; i < pitches.length; i++) pitches[i] -= 12;
  return pitches;
}

export function voiceDistance(a: number[], b: number[]): number {
  return b.reduce((sum, pitch, index) => sum + Math.abs(pitch - a[Math.min(index, a.length - 1)]), 0);
}

export function smoothVoicing(previous: number[], spec: ChordSpec): ChordSpec {
  let best = { ...spec }, bestScore = Infinity;
  for (let octave = Math.max(1, spec.octave - 1); octave <= Math.min(5, spec.octave + 1); octave++) {
    for (let inversion = 0; inversion < chordInfo(spec).intervals.length; inversion++) {
      const candidate = { ...spec, octave, inversion };
      const score = voiceDistance(previous, chordPitches(candidate));
      if (score < bestScore) { best = candidate; bestScore = score; }
    }
  }
  return best;
}

export function transitionInfo(previous: ChordSpec, next: ChordSpec, notation: Notation) {
  const a = chordInfo(previous, notation), b = chordInfo(next, notation);
  const common = a.pitchClasses.filter(pc => b.pitchClasses.includes(pc));
  const fifth = mod12(a.root - b.root) === 7;
  return {
    common: common.map(pc => noteName(pc, notation)),
    distance: voiceDistance(chordPitches(previous), chordPitches(next)),
    description: fifth ? 'Les fondamentales descendent d’une quinte : une direction forte, souvent ressentie comme une résolution.' : common.length ? 'Les notes communes servent de points d’ancrage entre les deux accords.' : 'Aucune note commune : un contraste plus marqué. Des renversements rapprochés peuvent adoucir le passage.',
  };
}

export function borrowedSpec(base: ChordSpec, degree: number): ChordSpec {
  return { ...base, degree, mode: base.mode === 'major' ? 'minor' : 'major', source: 'borrowed', inversion: 0 };
}
export function secondarySpec(base: ChordSpec, target: number): ChordSpec {
  return { ...base, tonic: mod12(buildScale(base.tonic, base.mode)[target] + 7), mode: 'mixolydian', degree: 0, color: '7', inversion: 0, source: 'secondary' };
}
