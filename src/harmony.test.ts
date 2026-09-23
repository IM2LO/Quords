import { describe, expect, it } from 'vitest';
import { chordInfo, chordPitches, COLORS, DEFAULT_SPEC, borrowedSpec, secondarySpec, smoothVoicing, voiceDistance } from './harmony';
import { buildScale, SCALE_MODES, spellScale, formatSpelledPitch } from './music';

describe('Harmonie et modes', () => {
  it('construit toutes les triades et septièmes à partir des degrés des 108 gammes', () => {
    for (const mode of SCALE_MODES) for (let tonic = 0; tonic < 12; tonic++) for (let degree = 0; degree < 7; degree++) {
      for (const color of ['triad', '7', '9', '11', '13'] as const) {
        const info = chordInfo({ ...DEFAULT_SPEC, tonic, mode, degree, color });
        expect(info.pitchClasses.every(pc => buildScale(tonic, mode).includes(pc))).toBe(true);
        expect(new Set(info.pitchClasses).size).toBe(info.pitchClasses.length);
      }
    }
  });
  it('respecte les degrés de la mineure harmonique et mélodique ascendante', () => {
    const harmonic = Array.from({ length: 7 }, (_, degree) => chordInfo({ ...DEFAULT_SPEC, tonic: 9, mode: 'harmonic', degree }));
    expect(harmonic.map(c => c.name)).toEqual(['Lam(maj7)', 'Siø7', 'Do+maj7', 'Rém7', 'Mi7', 'Famaj7', 'Sol♯°7']);
    expect(chordInfo({ ...DEFAULT_SPEC, tonic: 9, mode: 'melodic', degree: 3 }).name).toBe('Ré7');
    expect(chordInfo({ ...DEFAULT_SPEC, tonic: 9, mode: 'melodic', degree: 5 }).name).toBe('Fa♯ø7');
  });
  it('signale précisément une neuvième abaissée diatonique', () => {
    const info = chordInfo({ ...DEFAULT_SPEC, tonic: 9, mode: 'harmonic', degree: 4, color: '9' });
    expect(info.name).toBe('Mi7(♭9)');
    expect(info.formula).toBe('1 · 3 · 5 · ♭7 · ♭9');
  });
  it('épelle la sensible de Fa dièse majeur Mi dièse', () => {
    expect(spellScale(6, 'major').map(n => formatSpelledPitch(n, 'latin'))).toContain('Mi♯');
  });
  it('garde toutes les notes MIDI valides pour toutes les couleurs et registres', () => {
    for (const color of COLORS) for (let octave = 1; octave <= 5; octave++) for (let inversion = 0; inversion < 7; inversion++) {
      const notes = chordPitches({ ...DEFAULT_SPEC, tonic: 11, color, octave, inversion, spread: true });
      expect(notes.every(n => Number.isInteger(n) && n >= 0 && n <= 127)).toBe(true);
      expect(notes).toEqual([...notes].sort((a, b) => a - b));
    }
  });
  it('déduit la dominante secondaire de Ré mineur en Do majeur : La7', () => {
    expect(chordInfo(secondarySpec(DEFAULT_SPEC, 1)).name).toBe('La7');
  });
  it('emprunte au mode parallèle sans changer la tonique', () => {
    expect(chordInfo(borrowedSpec({ ...DEFAULT_SPEC, color: 'triad' }, 3)).name).toBe('Fam');
  });
  it('rapproche les voix sans changer les classes de hauteur', () => {
    const previous = chordPitches(DEFAULT_SPEC), next = { ...DEFAULT_SPEC, degree: 5 };
    const smoothed = smoothVoicing(previous, next);
    expect(voiceDistance(previous, chordPitches(smoothed))).toBeLessThanOrEqual(voiceDistance(previous, chordPitches(next)));
    expect(chordInfo(smoothed).pitchClasses).toEqual(chordInfo(next).pitchClasses);
    expect(smoothed.bassOctave).toBe(next.bassOctave);
  });
});
