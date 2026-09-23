export type Notation = 'latin' | 'international';
export type ScaleMode = 'major' | 'minor' | 'harmonic' | 'melodic' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'locrian';
export type ChordQuality = 'major' | 'minor' | 'diminished' | 'augmented';
export const SCALE_MODES: readonly ScaleMode[] = ['major', 'minor', 'harmonic', 'melodic', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian'];

export const PIANO_START_MIDI = 48;
export const PIANO_KEY_COUNT = 37;
export const NATURAL_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]);

export interface FifthsPath {
  major: string;
  added: string | null;
  signature: string;
  accidentalType: 'natural' | 'sharp' | 'flat';
}

export interface FifthsEntry {
  majorPitchClass: number;
  minorPitchClass: number;
  major: string;
  minor: string;
  paths: readonly FifthsPath[];
  accidentalType: 'natural' | 'sharp' | 'flat' | 'enharmonic';
}

export const CIRCLE_OF_FIFTHS: readonly FifthsEntry[] = [
  { majorPitchClass: 0, minorPitchClass: 9, major: 'C', minor: 'A', paths: [{ major: 'C', added: null, signature: '0', accidentalType: 'natural' }], accidentalType: 'natural' },
  { majorPitchClass: 7, minorPitchClass: 4, major: 'G', minor: 'E', paths: [{ major: 'G', added: 'F#', signature: '1♯', accidentalType: 'sharp' }], accidentalType: 'sharp' },
  { majorPitchClass: 2, minorPitchClass: 11, major: 'D', minor: 'B', paths: [{ major: 'D', added: 'C#', signature: '2♯', accidentalType: 'sharp' }], accidentalType: 'sharp' },
  { majorPitchClass: 9, minorPitchClass: 6, major: 'A', minor: 'F#', paths: [{ major: 'A', added: 'G#', signature: '3♯', accidentalType: 'sharp' }], accidentalType: 'sharp' },
  { majorPitchClass: 4, minorPitchClass: 1, major: 'E', minor: 'C#', paths: [{ major: 'E', added: 'D#', signature: '4♯', accidentalType: 'sharp' }], accidentalType: 'sharp' },
  { majorPitchClass: 11, minorPitchClass: 8, major: 'B', minor: 'G#', paths: [{ major: 'B', added: 'A#', signature: '5♯', accidentalType: 'sharp' }], accidentalType: 'sharp' },
  { majorPitchClass: 6, minorPitchClass: 3, major: 'F#/Gb', minor: 'D#/Eb', paths: [
    { major: 'F#', added: 'E#', signature: '6♯', accidentalType: 'sharp' },
    { major: 'Gb', added: 'Cb', signature: '6♭', accidentalType: 'flat' },
  ], accidentalType: 'enharmonic' },
  { majorPitchClass: 1, minorPitchClass: 10, major: 'Db', minor: 'Bb', paths: [{ major: 'Db', added: 'Gb', signature: '5♭', accidentalType: 'flat' }], accidentalType: 'flat' },
  { majorPitchClass: 8, minorPitchClass: 5, major: 'Ab', minor: 'F', paths: [{ major: 'Ab', added: 'Db', signature: '4♭', accidentalType: 'flat' }], accidentalType: 'flat' },
  { majorPitchClass: 3, minorPitchClass: 0, major: 'Eb', minor: 'C', paths: [{ major: 'Eb', added: 'Ab', signature: '3♭', accidentalType: 'flat' }], accidentalType: 'flat' },
  { majorPitchClass: 10, minorPitchClass: 7, major: 'Bb', minor: 'G', paths: [{ major: 'Bb', added: 'Eb', signature: '2♭', accidentalType: 'flat' }], accidentalType: 'flat' },
  { majorPitchClass: 5, minorPitchClass: 2, major: 'F', minor: 'D', paths: [{ major: 'F', added: 'Bb', signature: '1♭', accidentalType: 'flat' }], accidentalType: 'flat' },
];

const LATIN_NAMES = ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
const INTERNATIONAL_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const NATURAL_PITCHES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as const;
const LATIN_LETTERS = { C: 'Do', D: 'Ré', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' } as const;
const ROOT_CHOICES = [['C'], ['C#', 'Db'], ['D'], ['D#', 'Eb'], ['E'], ['F'], ['F#', 'Gb'], ['G'], ['G#', 'Ab'], ['A'], ['A#', 'Bb'], ['B']] as const;
const SCALE_ROOTS = {
  major: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
  minor: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'],
} as const;

export const SCALE_PROFILES = {
  major: {
    label: 'Majeure',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    steps: ['T', 'T', 'S', 'T', 'T', 'T', 'S'],
    romans: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
    qualities: ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'],
  },
  minor: {
    label: 'Mineure naturelle',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    steps: ['T', 'S', 'T', 'T', 'S', 'T', 'T'],
    romans: ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'],
    qualities: ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'],
  },
  harmonic: {
    label: 'Mineure harmonique', intervals: [0, 2, 3, 5, 7, 8, 11],
    steps: ['T', 'S', 'T', 'T', 'S', 'T + S', 'S'],
    romans: ['i', 'ii°', 'III+', 'iv', 'V', 'VI', 'vii°'],
    qualities: ['minor', 'diminished', 'augmented', 'minor', 'major', 'major', 'diminished'],
  },
  melodic: {
    label: 'Mineure mélodique', intervals: [0, 2, 3, 5, 7, 9, 11],
    steps: ['T', 'S', 'T', 'T', 'T', 'T', 'S'],
    romans: ['i', 'ii', 'III+', 'IV', 'V', 'vi°', 'vii°'],
    qualities: ['minor', 'minor', 'augmented', 'major', 'major', 'diminished', 'diminished'],
  },
  dorian: {
    label: 'Dorien', intervals: [0, 2, 3, 5, 7, 9, 10],
    steps: ['T', 'S', 'T', 'T', 'T', 'S', 'T'],
    romans: ['i', 'ii', 'III', 'IV', 'v', 'vi°', 'VII'],
    qualities: ['minor', 'minor', 'major', 'major', 'minor', 'diminished', 'major'],
  },
  phrygian: {
    label: 'Phrygien', intervals: [0, 1, 3, 5, 7, 8, 10],
    steps: ['S', 'T', 'T', 'T', 'S', 'T', 'T'],
    romans: ['i', 'II', 'III', 'iv', 'v°', 'VI', 'vii'],
    qualities: ['minor', 'major', 'major', 'minor', 'diminished', 'major', 'minor'],
  },
  lydian: {
    label: 'Lydien', intervals: [0, 2, 4, 6, 7, 9, 11],
    steps: ['T', 'T', 'T', 'S', 'T', 'T', 'S'],
    romans: ['I', 'II', 'iii', 'iv°', 'V', 'vi', 'vii'],
    qualities: ['major', 'major', 'minor', 'diminished', 'major', 'minor', 'minor'],
  },
  mixolydian: {
    label: 'Mixolydien', intervals: [0, 2, 4, 5, 7, 9, 10],
    steps: ['T', 'T', 'S', 'T', 'T', 'S', 'T'],
    romans: ['I', 'ii', 'iii°', 'IV', 'v', 'vi', 'VII'],
    qualities: ['major', 'minor', 'diminished', 'major', 'minor', 'minor', 'major'],
  },
  locrian: {
    label: 'Locrien', intervals: [0, 1, 3, 5, 6, 8, 10],
    steps: ['S', 'T', 'T', 'S', 'T', 'T', 'T'],
    romans: ['i°', 'II', 'iii', 'iv', 'V', 'VI', 'vii'],
    qualities: ['diminished', 'major', 'minor', 'minor', 'major', 'major', 'minor'],
  },
} as const;

export const MODE_EXPLANATIONS: Record<ScaleMode, string> = {
  major: 'La gamme majeure (mode ionien) : le point de départ pour comprendre les degrés.',
  minor: 'La mineure naturelle (mode éolien) : tierce, sixte et septième abaissées par rapport au majeur.',
  harmonic: 'Pars de la mineure naturelle et élève le 7e degré d’un demi-ton. Il devient une sensible, et le Ve degré devient majeur. Entre les degrés 6 et 7 : trois demi-tons.',
  melodic: 'Forme ascendante : élève les degrés 6 et 7 de la mineure naturelle. En classique, la descente revient à la mineure naturelle ; en jazz, on conserve souvent la forme ascendante dans les deux sens.',
  dorian: 'Une mineure naturelle avec un 6e degré élevé d’un demi-ton.',
  phrygian: 'Une mineure naturelle avec un 2e degré abaissé d’un demi-ton.',
  lydian: 'Une majeure avec un 4e degré élevé d’un demi-ton.',
  mixolydian: 'Une majeure avec un 7e degré abaissé d’un demi-ton.',
  locrian: 'Une mineure naturelle avec les degrés 2 et 5 abaissés d’un demi-ton.',
};

interface ChordDefinition {
  id: string;
  intervals: readonly number[];
  label: string;
  formula: string;
}

const CHORDS: readonly ChordDefinition[] = [
  { id: 'major', intervals: [0, 4, 7], label: 'majeur', formula: '1 · 3 · 5' },
  { id: 'minor', intervals: [0, 3, 7], label: 'mineur', formula: '1 · ♭3 · 5' },
  { id: 'diminished', intervals: [0, 3, 6], label: 'diminué', formula: '1 · ♭3 · ♭5' },
  { id: 'augmented', intervals: [0, 4, 8], label: 'augmenté', formula: '1 · 3 · ♯5' },
  { id: 'sus2', intervals: [0, 2, 7], label: 'sus2', formula: '1 · 2 · 5' },
  { id: 'sus4', intervals: [0, 5, 7], label: 'sus4', formula: '1 · 4 · 5' },
  { id: 'sixth', intervals: [0, 4, 7, 9], label: '6', formula: '1 · 3 · 5 · 6' },
  { id: 'minor-sixth', intervals: [0, 3, 7, 9], label: 'mineur 6', formula: '1 · ♭3 · 5 · 6' },
  { id: 'major-seventh', intervals: [0, 4, 7, 11], label: 'majeur 7', formula: '1 · 3 · 5 · 7' },
  { id: 'dominant-seventh', intervals: [0, 4, 7, 10], label: '7', formula: '1 · 3 · 5 · ♭7' },
  { id: 'minor-seventh', intervals: [0, 3, 7, 10], label: 'mineur 7', formula: '1 · ♭3 · 5 · ♭7' },
  { id: 'minor-major-seventh', intervals: [0, 3, 7, 11], label: 'mineur majeur 7', formula: '1 · ♭3 · 5 · 7' },
  { id: 'half-diminished', intervals: [0, 3, 6, 10], label: 'demi-diminué 7', formula: '1 · ♭3 · ♭5 · ♭7' },
  { id: 'diminished-seventh', intervals: [0, 3, 6, 9], label: 'diminué 7', formula: '1 · ♭3 · ♭5 · 𝄫7' },
  { id: 'augmented-major-seventh', intervals: [0, 4, 8, 11], label: 'augmenté majeur 7', formula: '1 · 3 · ♯5 · 7' },
  { id: 'seventh-sus4', intervals: [0, 5, 7, 10], label: '7 sus4', formula: '1 · 4 · 5 · ♭7' },
  { id: 'add-nine', intervals: [0, 2, 4, 7], label: 'ajouté 9', formula: '1 · 3 · 5 · 9' },
  { id: 'minor-add-nine', intervals: [0, 2, 3, 7], label: 'mineur ajouté 9', formula: '1 · ♭3 · 5 · 9' },
  { id: 'six-nine', intervals: [0, 2, 4, 7, 9], label: '6/9', formula: '1 · 3 · 5 · 6 · 9' },
  { id: 'minor-six-nine', intervals: [0, 2, 3, 7, 9], label: 'mineur 6/9', formula: '1 · ♭3 · 5 · 6 · 9' },
  { id: 'major-nine', intervals: [0, 2, 4, 7, 11], label: 'majeur 9', formula: '1 · 3 · 5 · 7 · 9' },
  { id: 'dominant-nine', intervals: [0, 2, 4, 7, 10], label: '9', formula: '1 · 3 · 5 · ♭7 · 9' },
  { id: 'minor-nine', intervals: [0, 2, 3, 7, 10], label: 'mineur 9', formula: '1 · ♭3 · 5 · ♭7 · 9' },
  { id: 'dominant-flat-nine', intervals: [0, 1, 4, 7, 10], label: '7 ♭9', formula: '1 · 3 · 5 · ♭7 · ♭9' },
  { id: 'dominant-sharp-nine', intervals: [0, 3, 4, 7, 10], label: '7 ♯9', formula: '1 · 3 · 5 · ♭7 · ♯9' },
  { id: 'dominant-flat-five', intervals: [0, 4, 6, 10], label: '7 ♭5', formula: '1 · 3 · ♭5 · ♭7' },
  { id: 'dominant-sharp-five', intervals: [0, 4, 8, 10], label: '7 ♯5', formula: '1 · 3 · ♯5 · ♭7' },
  { id: 'eleven', intervals: [0, 2, 4, 5, 7, 10], label: '11', formula: '1 · 3 · 5 · ♭7 · 9 · 11' },
  { id: 'minor-eleven', intervals: [0, 2, 3, 5, 7, 10], label: 'mineur 11', formula: '1 · ♭3 · 5 · ♭7 · 9 · 11' },
  { id: 'thirteen', intervals: [0, 2, 4, 5, 7, 9, 10], label: '13', formula: '1 · 3 · 5 · ♭7 · 9 · 11 · 13' },
  { id: 'major-thirteen', intervals: [0, 2, 4, 5, 7, 9, 11], label: 'majeur 13', formula: '1 · 3 · 5 · 7 · 9 · 11 · 13' },
  { id: 'minor-thirteen', intervals: [0, 2, 3, 5, 7, 9, 10], label: 'mineur 13', formula: '1 · ♭3 · 5 · ♭7 · 9 · 11 · 13' },
];

const INTERVAL_NAMES = [
  'unisson ou octave', 'seconde mineure', 'seconde majeure', 'tierce mineure',
  'tierce majeure', 'quarte juste', 'triton', 'quinte juste',
  'sixte mineure', 'sixte majeure', 'septième mineure', 'septième majeure',
];

export interface DiatonicChord {
  degree: number;
  roman: string;
  root: number;
  quality: ChordQuality;
  pitchClasses: number[];
}

export interface RecognizedChord {
  id: string;
  root: number;
  bass: number;
  name: string;
  formula: string;
}

export interface CompatibleScale {
  root: number;
  mode: ScaleMode;
  pitchClasses: number[];
  signaturePitchClasses: number[];
  exactSignature: boolean;
}

export interface SpelledPitch {
  letter: keyof typeof NATURAL_PITCHES;
  accidental: string;
  pitchClass: number;
}

export function mod12(value: number): number {
  return ((value % 12) + 12) % 12;
}

export function noteName(pitchClass: number, notation: Notation): string {
  return (notation === 'latin' ? LATIN_NAMES : INTERNATIONAL_NAMES)[mod12(pitchClass)];
}

function parseSpelling(value: string): { letter: keyof typeof NATURAL_PITCHES; accidental: string } {
  return { letter: value[0] as keyof typeof NATURAL_PITCHES, accidental: value.slice(1) };
}

function accidentalForDifference(difference: number): string {
  if (difference === 1) return '♯';
  if (difference === 11) return '♭';
  if (difference === 2) return '𝄪';
  if (difference === 10) return '𝄫';
  return '';
}

export function formatSpelledPitch(note: SpelledPitch, notation: Notation): string {
  return `${notation === 'latin' ? LATIN_LETTERS[note.letter] : note.letter}${note.accidental}`;
}

export function spellScale(root: number, mode: ScaleMode): SpelledPitch[] {
  const spellingFamily = ['major', 'lydian', 'mixolydian'].includes(mode) ? 'major' : 'minor';
  const rootSpelling = parseSpelling(SCALE_ROOTS[spellingFamily][mod12(root)]);
  const rootLetterIndex = LETTERS.indexOf(rootSpelling.letter);
  return buildScale(root, mode).map((pitchClass, degree) => {
    const letter = LETTERS[(rootLetterIndex + degree) % LETTERS.length];
    return { letter, accidental: accidentalForDifference(mod12(pitchClass - NATURAL_PITCHES[letter])), pitchClass };
  });
}

export function rootChoiceName(pitchClass: number, notation: Notation): string {
  return ROOT_CHOICES[mod12(pitchClass)].map((choice) => {
    const parsed = parseSpelling(choice);
    return formatSpelledPitch({ ...parsed, accidental: parsed.accidental === '#' ? '♯' : parsed.accidental === 'b' ? '♭' : '', pitchClass }, notation);
  }).join('/');
}

export function formatTheoryToken(value: string, notation: Notation): string {
  return value.split('/').map((choice) => {
    const parsed = parseSpelling(choice);
    return formatSpelledPitch({
      ...parsed,
      accidental: parsed.accidental === '#' ? '♯' : parsed.accidental === 'b' ? '♭' : '',
      pitchClass: NATURAL_PITCHES[parsed.letter],
    }, notation);
  }).join('/');
}

export function midiNoteName(midi: number, notation: Notation): string {
  return `${noteName(midi, notation)}${Math.floor(midi / 12) - 1}`;
}

export function buildScale(root: number, mode: ScaleMode): number[] {
  return SCALE_PROFILES[mode].intervals.map((interval) => mod12(root + interval));
}

export function findCompatibleScales(midiNotes: readonly number[]): CompatibleScale[] {
  const selectedPitchClasses = [...new Set(midiNotes.map(mod12))].sort((a, b) => a - b);
  if (!selectedPitchClasses.length || selectedPitchClasses.length > 7) return [];

  const selectedAccidentals = selectedPitchClasses.filter((pitchClass) => !NATURAL_PITCH_CLASSES.has(pitchClass));
  const sameSet = (left: readonly number[], right: readonly number[]) => (
    left.length === right.length && left.every((pitchClass) => right.includes(pitchClass))
  );
  const matches: CompatibleScale[] = [];

  for (const mode of SCALE_MODES) {
    for (let root = 0; root < 12; root += 1) {
      const pitchClasses = buildScale(root, mode);
      if (!selectedPitchClasses.every((pitchClass) => pitchClasses.includes(pitchClass))) continue;
      const signaturePitchClasses = spellScale(root, mode)
        .filter((note) => note.accidental)
        .map((note) => note.pitchClass)
        .sort((a, b) => a - b);
      matches.push({
        root,
        mode,
        pitchClasses,
        signaturePitchClasses,
        // Raised minor-scale degrees are accidentals, not a new key signature.
        exactSignature: (mode === 'major' || mode === 'minor') && selectedAccidentals.length > 0 && sameSet(selectedAccidentals, signaturePitchClasses),
      });
    }
  }

  return matches.sort((left, right) => (
    Number(right.exactSignature) - Number(left.exactSignature)
    || left.signaturePitchClasses.length - right.signaturePitchClasses.length
    || SCALE_MODES.indexOf(left.mode) - SCALE_MODES.indexOf(right.mode)
    || left.root - right.root
  ));
}

export function buildDiatonicChords(root: number, mode: ScaleMode): DiatonicChord[] {
  const profile = SCALE_PROFILES[mode];
  const scale = buildScale(root, mode);
  return scale.map((chordRoot, degree) => ({
    degree,
    roman: profile.romans[degree],
    root: chordRoot,
    quality: profile.qualities[degree],
    pitchClasses: [scale[degree], scale[(degree + 2) % 7], scale[(degree + 4) % 7]],
  }));
}

export function qualityLabel(quality: ChordQuality): string {
  return { major: 'majeur', minor: 'mineur', diminished: 'diminué', augmented: 'augmenté' }[quality];
}

export function scaleName(root: number, mode: ScaleMode, notation: Notation): string {
  return `${formatSpelledPitch(spellScale(root, mode)[0], notation)} ${SCALE_PROFILES[mode].label.toLowerCase()}`;
}

export function degreeChord(root: number, mode: ScaleMode, degree: number, size: 3 | 4 = 3, notation: Notation = 'latin') {
  const notes = spellScale(root, mode);
  const chord = buildDiatonicChords(root, mode)[degree];
  const chordNotes = Array.from({ length: size }, (_, index) => notes[(degree + index * 2) % 7]);
  const intervals = chordNotes.map((note) => mod12(note.pitchClass - chord.root)).sort((a, b) => a - b);
  const definition = CHORDS.find((item) => samePitchSet(intervals, item.intervals));
  return {
    ...chord,
    pitchClasses: chordNotes.map((note) => note.pitchClass),
    noteNames: chordNotes.map((note) => formatSpelledPitch(note, notation)),
    name: `${formatSpelledPitch(chordNotes[0], notation)} ${definition?.label ?? qualityLabel(chord.quality)}`,
    roman: size === 3 ? chord.roman : `${chord.roman.replace(/[°+]$/, '')}${definition?.id === 'half-diminished' ? 'ø7' : definition?.id === 'diminished-seventh' ? '°7' : definition?.id === 'major-seventh' ? 'maj7' : definition?.id === 'minor-major-seventh' ? '(maj7)' : definition?.id === 'augmented-major-seventh' ? '+maj7' : '7'}`,
  };
}

export function chordMidis(root: number, mode: ScaleMode, degree: number, size: 3 | 4 = 3, inversion = 0): number[] {
  const pitches = degreeChord(root, mode, degree, size).pitchClasses;
  const notes = [48 + pitches[0]];
  for (const pitch of pitches.slice(1)) notes.push(notes[notes.length - 1] + mod12(pitch - notes[notes.length - 1]));
  for (let index = 0; index < inversion % size; index += 1) notes.push(notes.shift()! + 12);
  while (notes[notes.length - 1] > 84) for (let index = 0; index < notes.length; index += 1) notes[index] -= 12;
  return notes;
}

export function scaleMidiSequence(root: number, mode: ScaleMode, classicalDescent = false): number[] {
  const tonic = 60 + mod12(root);
  const ascending = SCALE_PROFILES[mode].intervals.map((interval) => tonic + interval);
  const descendingMode = classicalDescent && mode === 'melodic' ? 'minor' : mode;
  return [...ascending, tonic + 12, ...SCALE_PROFILES[descendingMode].intervals.map((interval) => tonic + interval).reverse()];
}

function samePitchSet(left: readonly number[], right: readonly number[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

export function recognizeChords(midiNotes: readonly number[], notation: Notation): RecognizedChord[] {
  if (midiNotes.length < 3) return [];
  const bass = mod12(Math.min(...midiNotes));
  const selected = [...new Set(midiNotes.map(mod12))].sort((a, b) => a - b);
  const candidates: RecognizedChord[] = [];

  for (const root of selected) {
    const intervals = selected.map((pitch) => mod12(pitch - root)).sort((a, b) => a - b);
    for (const definition of CHORDS) {
      if (!samePitchSet(intervals, definition.intervals)) continue;
      const inversion = bass === root ? '' : ` / ${noteName(bass, notation)}`;
      candidates.push({
        id: `${root}-${definition.id}`,
        root,
        bass,
        name: `${noteName(root, notation)} ${definition.label}${inversion}`,
        formula: definition.formula,
      });
    }
  }

  return candidates.sort((a, b) => Number(b.root === bass) - Number(a.root === bass));
}

export function describeInterval(midiNotes: readonly number[]): string | null {
  if (midiNotes.length !== 2) return null;
  const sorted = [...midiNotes].sort((a, b) => a - b);
  return INTERVAL_NAMES[mod12(sorted[1] - sorted[0])];
}
