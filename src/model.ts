import * as z from 'zod';
import { chordInfo, chordPitches, DEFAULT_SPEC, type ChordSpec } from './harmony';
import { SCALE_MODES, type Notation, type ScaleMode } from './music';

export type Track = 'chords' | 'bass';
export interface RhythmNote { id: string; voice: number; at: number; duration: number; velocity: number; offset: number }
export interface Clip { id: string; chord: ChordSpec; beats: number; notes: RhythmNote[]; bass: RhythmNote[] }
export interface Section { id: string; name: string; variant: 'A' | 'B'; variants: { A: Clip[]; B: Clip[] } }
export interface SavedPattern { id: string; name: string; notes: RhythmNote[]; beats: number }
export interface Project {
  version: 1; name: string; tonic: number; mode: ScaleMode; notation: Notation; bpm: number;
  meter: '4/4' | '3/4' | '6/8'; tone: 'soft' | 'bright' | 'organ'; volume: number;
  swing: number; humanize: number; chordsMuted: boolean; bassMuted: boolean;
  sections: Section[]; activeSection: string; patterns: SavedPattern[];
}
export interface TimelineNote { id: string; clipId: string; track: Track; midi: number; at: number; duration: number; velocity: number }
export const uid = () => crypto.randomUUID();
export const clone = <T>(value: T): T => structuredClone(value);
export const STORAGE_KEY = 'quords.project.v1';
export const BUILTIN_PATTERNS = [
  { id: 'held', name: 'Nappe', detail: 'Un accord tenu' },
  { id: 'pulse', name: 'Pulsation', detail: 'Une frappe par temps' },
  { id: 'offbeat', name: 'Contretemps', detail: 'Entre les pulsations' },
  { id: 'eighth', name: 'Croches', detail: 'Deux frappes par temps' },
  { id: 'arp', name: 'Arpège ↑', detail: 'Une voix après l’autre' },
  { id: 'breathe', name: 'Respiration', detail: 'Deux attaques, puis du silence' },
] as const;

export function makePattern(pattern: string, beats: number, voices: number): RhythmNote[] {
  const notes: RhythmNote[] = [];
  const add = (voice: number, at: number, duration: number, velocity = .78) => {
    if (at < beats) notes.push({ id: uid(), voice, at, duration: Math.max(.04, Math.min(duration, beats - at)), velocity, offset: 0 });
  };
  if (pattern === 'arp') {
    for (let i = 0; i < Math.ceil(beats * 2); i++) add(i % voices, i / 2, .45, i % voices === 0 ? .85 : .7);
  } else for (let voice = 0; voice < voices; voice++) {
    if (pattern === 'held') add(voice, 0, beats * .94);
    if (pattern === 'breathe') { add(voice, 0, beats / 4); add(voice, beats / 2, beats / 4); }
    if (pattern === 'pulse' || pattern === 'eighth' || pattern === 'offbeat') {
      const step = pattern === 'eighth' ? .5 : 1;
      for (let at = pattern === 'offbeat' ? .5 : 0; at < beats; at += step) add(voice, at, step * .65, at % 1 === 0 ? .8 : .68);
    }
  }
  return notes;
}

export function createClip(chord: ChordSpec = DEFAULT_SPEC, beats = 4): Clip {
  return { id: uid(), chord: clone(chord), beats, notes: makePattern('held', beats, chordInfo(chord).intervals.length), bass: makePattern('held', beats, 1) };
}
export function createSection(name: string, clips: Clip[] = []): Section {
  return { id: uid(), name, variant: 'A', variants: { A: clips, B: [] } };
}
export function createProject(): Project {
  const section = createSection('Première idée', [0, 5, 3, 4].map(degree => createClip({ ...DEFAULT_SPEC, degree })));
  return { version: 1, name: 'Une nouvelle couleur', tonic: 0, mode: 'major', notation: 'latin', bpm: 100, meter: '4/4', tone: 'soft', volume: .7, swing: 0, humanize: 0, chordsMuted: false, bassMuted: false, sections: [section], activeSection: section.id, patterns: [] };
}
export function activeSection(project: Project): Section { return project.sections.find(s => s.id === project.activeSection) ?? project.sections[0]; }
export function activeClips(project: Project): Clip[] { const section = activeSection(project); return section.variants[section.variant]; }
export function sectionBeats(clips: Clip[]): number { return clips.reduce((sum, clip) => sum + clip.beats, 0); }
export function barBeats(meter: Project['meter']): number { return meter === '3/4' || meter === '6/8' ? 3 : 4; }
export function duplicateClip(clip: Clip): Clip {
  return { ...clone(clip), id: uid(), notes: clip.notes.map(n => ({ ...n, id: uid() })), bass: clip.bass.map(n => ({ ...n, id: uid() })) };
}
export function setChord(clip: Clip, chord: ChordSpec): void {
  const voices = chordInfo(chord).intervals.length;
  const oldVoices = chordInfo(clip.chord).intervals.length;
  clip.notes = clip.notes.filter(n => n.voice < voices);
  for (let voice = oldVoices; voice < voices; voice++) {
    clip.notes.push(...clip.notes.filter(n => n.voice === 0).map(n => ({ ...n, id: uid(), voice })));
  }
  clip.chord = clone(chord);
  // Preserve advanced offsets when possible, within the MIDI pitch range.
  const pitches = chordPitches(chord), bass = 12 * (chord.bassOctave + 1) + chordInfo(chord).root;
  for (const n of clip.notes) n.offset = Math.max(-pitches[n.voice], Math.min(127 - pitches[n.voice], n.offset));
  for (const n of clip.bass) n.offset = Math.max(-bass, Math.min(127 - bass, n.offset));
}
export function resizeClip(clip: Clip, beats: number): void {
  const ratio = beats / clip.beats;
  for (const n of [...clip.notes, ...clip.bass]) { n.at *= ratio; n.duration *= ratio; }
  clip.beats = beats;
}
export function applyPattern(clip: Clip, track: Track, pattern: string, saved?: SavedPattern): void {
  const voices = track === 'bass' ? 1 : chordInfo(clip.chord).intervals.length;
  let notes = makePattern(pattern, clip.beats, voices);
  if (saved) {
    // Store timing independently of harmony: re-map each source voice to the new chord.
    const sourceVoices = Math.max(1, ...saved.notes.map(n => n.voice + 1));
    notes = Array.from({ length: voices }, (_, voice) => saved.notes.filter(n => n.voice === voice % sourceVoices).map(n => ({
      ...n, id: uid(), voice, at: n.at * clip.beats / saved.beats, duration: n.duration * clip.beats / saved.beats, offset: 0,
    }))).flat();
  }
  if (track === 'bass') clip.bass = notes; else clip.notes = notes;
}

function hash(value: string): number {
  let number = 2166136261;
  for (const char of value) number = Math.imul(number ^ char.charCodeAt(0), 16777619);
  return (number >>> 0) / 4294967295;
}
export function timeline(clips: Clip[], project: Pick<Project, 'swing' | 'humanize' | 'chordsMuted' | 'bassMuted'>): TimelineNote[] {
  let cursor = 0;
  const result: TimelineNote[] = [];
  for (const clip of clips) {
    const pitches = chordPitches(clip.chord), root = chordInfo(clip.chord).root;
    for (const track of ['chords', 'bass'] as const) {
      if ((track === 'chords' && project.chordsMuted) || (track === 'bass' && project.bassMuted)) continue;
      for (const note of track === 'bass' ? clip.bass : clip.notes) {
        const midi = (track === 'bass' ? 12 * (clip.chord.bassOctave + 1) + root : pitches[note.voice]) + note.offset;
        if (!Number.isFinite(midi) || midi < 0 || midi > 127) continue;
        const offbeat = Math.abs(note.at % 1 - .5) < .001;
        const delay = (offbeat ? project.swing * .33 : 0) + hash(note.id) * project.humanize * .05;
        const at = Math.min(clip.beats - .01, note.at + delay);
        const duration = Math.max(.01, Math.min(note.duration, clip.beats - at));
        result.push({ id: note.id, clipId: clip.id, track, midi, at: cursor + at, duration, velocity: Math.max(.05, Math.min(1, note.velocity * (1 - project.humanize * hash(note.id + 'v') * .15))) });
      }
    }
    cursor += clip.beats;
  }
  // Merge overlapping same-pitch notes on the same MIDI channel to avoid premature note-offs.
  const clean: TimelineNote[] = [];
  const lastPitch = new Map<string, TimelineNote>();
  for (const track of ['chords', 'bass'] as const) {
    for (const n of result.filter(n => n.track === track).sort((a, b) => a.at - b.at)) {
      const key = track + ':' + n.midi;
      const previous = lastPitch.get(key);
      if (previous && previous.at + previous.duration > n.at + .00001) previous.duration = Math.max(previous.at + previous.duration, n.at + n.duration) - previous.at;
      else { const copy = { ...n }; clean.push(copy); lastPitch.set(key, copy); }
    }
  }
  return clean.sort((a, b) => a.at - b.at || a.midi - b.midi);
}

const finite = z.number().finite();
const idSchema = z.string().min(1).max(100);
const chordSchema = z.object({
  tonic: finite.int().min(0).max(11), mode: z.enum(SCALE_MODES), degree: finite.int().min(0).max(6),
  color: z.enum(['triad', '7', '9', '11', '13', 'sus2', 'sus4', 'add9', '6']),
  octave: finite.int().min(1).max(5), inversion: finite.int().min(0).max(6), spread: z.boolean(),
  bassOctave: finite.int().min(0).max(4), source: z.enum(['scale', 'borrowed', 'secondary']),
});
const noteSchema = z.object({ id: idSchema, voice: finite.int().min(0).max(6), at: finite.min(0), duration: finite.positive(), velocity: finite.min(.01).max(1), offset: finite.int().min(-48).max(48) });
const clipSchema = z.object({ id: idSchema, chord: chordSchema, beats: finite.min(.25).max(64), notes: z.array(noteSchema), bass: z.array(noteSchema) }).superRefine((clip, ctx) => {
  for (const note of [...clip.notes, ...clip.bass]) if (note.at >= clip.beats || note.at + note.duration > clip.beats + .001) ctx.addIssue({ code: 'custom', message: 'Une note dépasse la durée de son accord.' });
  if (clip.notes.some(n => n.voice >= chordInfo(clip.chord).intervals.length) || clip.bass.some(n => n.voice !== 0)) ctx.addIssue({ code: 'custom', message: 'Voix hors de l’accord.' });
  const pitches = chordPitches(clip.chord), bass = 12 * (clip.chord.bassOctave + 1) + chordInfo(clip.chord).root;
  if (clip.notes.some(n => pitches[n.voice] + n.offset < 0 || pitches[n.voice] + n.offset > 127) || clip.bass.some(n => bass + n.offset < 0 || bass + n.offset > 127)) ctx.addIssue({ code: 'custom', message: 'Note hors de la plage MIDI.' });
});
export const projectSchema = z.object({
  version: z.literal(1), name: z.string().min(1).max(100), tonic: finite.int().min(0).max(11), mode: z.enum(SCALE_MODES),
  notation: z.enum(['latin', 'international']), bpm: finite.min(30).max(250), meter: z.enum(['4/4', '3/4', '6/8']),
  tone: z.enum(['soft', 'bright', 'organ']), volume: finite.min(0).max(1), swing: finite.min(0).max(1), humanize: finite.min(0).max(1),
  chordsMuted: z.boolean(), bassMuted: z.boolean(), activeSection: idSchema,
  sections: z.array(z.object({ id: idSchema, name: z.string().min(1).max(60), variant: z.enum(['A', 'B']), variants: z.object({ A: z.array(clipSchema), B: z.array(clipSchema) }) })).min(1),
  patterns: z.array(z.object({ id: idSchema, name: z.string().min(1).max(40), notes: z.array(noteSchema), beats: finite.min(.25).max(64) })),
}).superRefine((project, ctx) => {
  if (!project.sections.some(s => s.id === project.activeSection)) ctx.addIssue({ code: 'custom', message: 'Section active introuvable.' });
  const ids = project.sections.flatMap(s => [s.id, ...[...s.variants.A, ...s.variants.B].flatMap(c => [c.id, ...c.notes.map(n => n.id), ...c.bass.map(n => n.id)])]);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'Identifiants dupliqués.' });
  for (const p of project.patterns) if (p.notes.some(n => n.at >= p.beats || n.at + n.duration > p.beats + .001)) ctx.addIssue({ code: 'custom', message: 'Motif hors limites.' });
});
export function parseProject(value: string): Project {
  return projectSchema.parse(JSON.parse(value)) as Project;
}
export function loadProject(storage: Pick<Storage, 'getItem'>): { project: Project; error?: string } {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return { project: raw ? parseProject(raw) : createProject() };
  } catch { return { project: createProject(), error: 'La sauvegarde locale ne peut pas être lue. Elle est conservée : exporte-la avant de la remplacer.' }; }
}
export class History {
  private undoStack: Project[] = [];
  private redoStack: Project[] = [];
  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }
  push(project: Project) { this.undoStack.push(clone(project)); if (this.undoStack.length > 80) this.undoStack.shift(); this.redoStack = []; }
  undo(project: Project): Project { const previous = this.undoStack.pop(); if (!previous) return project; this.redoStack.push(clone(project)); return previous; }
  redo(project: Project): Project { const next = this.redoStack.pop(); if (!next) return project; this.undoStack.push(clone(project)); return next; }
}
