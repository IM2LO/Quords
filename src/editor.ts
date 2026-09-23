import { uid, type Clip, type RhythmNote, type Track } from './model';
import { chordInfo, chordPitches } from './harmony';

export const SNAP_OPTIONS = [
  { value: 1, label: '1/4' }, { value: .5, label: '1/8' }, { value: .25, label: '1/16' },
  { value: .125, label: '1/32' }, { value: 1 / 3, label: '1/8 triolet' }, { value: 2 / 3, label: '1/4 triolet' },
];
export function snapBeat(value: number, step: number): number { return Math.round(value / step) * step; }
export function trackNotes(clip: Clip, track: Track): RhythmNote[] { return track === 'bass' ? clip.bass : clip.notes; }
export function noteBase(clip: Clip, track: Track, voice: number): number {
  return track === 'bass' ? 12 * (clip.chord.bassOctave + 1) + chordInfo(clip.chord).root : chordPitches(clip.chord)[voice];
}
export function safeOffset(clip: Clip, track: Track, voice: number, offset: number): number {
  const base = noteBase(clip, track, voice);
  return Math.max(-48, -base, Math.min(48, 127 - base, offset));
}
export function moveNotes(clip: Clip, track: Track, ids: Set<string>, delta: number, pitchDelta = 0): void {
  const selected = trackNotes(clip, track).filter(n => ids.has(n.id));
  if (!selected.length) return;
  const min = Math.min(...selected.map(n => n.at)), max = Math.max(...selected.map(n => n.at + n.duration));
  const safeDelta = Math.max(-min, Math.min(clip.beats - max, delta));
  const minOffset = Math.min(...selected.map(n => n.offset)), maxOffset = Math.max(...selected.map(n => n.offset));
  const midis = selected.map(n => noteBase(clip, track, n.voice) + n.offset);
  const safePitch = Math.max(-48 - minOffset, -Math.min(...midis), Math.min(48 - maxOffset, 127 - Math.max(...midis), pitchDelta));
  for (const n of selected) { n.at = Math.max(0, n.at + safeDelta); n.offset += safePitch; }
}
export function resizeNotes(clip: Clip, track: Track, ids: Set<string>, delta: number, minimum: number): void {
  const selected = trackNotes(clip, track).filter(n => ids.has(n.id));
  if (!selected.length) return;
  const lo = Math.max(...selected.map(n => Math.min(minimum, n.duration) - n.duration));
  const hi = Math.min(...selected.map(n => clip.beats - n.at - n.duration));
  const shift = Math.max(lo, Math.min(hi, delta));
  for (const n of selected) n.duration = Math.max(.01, n.duration + shift);
}
export function splitNotes(clip: Clip, track: Track, ids: Set<string>): void {
  const notes = trackNotes(clip, track);
  for (const n of [...notes]) if (ids.has(n.id) && n.duration >= .08) {
    n.duration /= 2;
    notes.push({ ...n, id: uid(), at: n.at + n.duration });
  }
}
export function repeatNotes(clip: Clip, track: Track, ids: Set<string>): string[] {
  const notes = trackNotes(clip, track), selected = notes.filter(n => ids.has(n.id));
  if (!selected.length) return [];
  const start = Math.min(...selected.map(n => n.at));
  const end = Math.max(...selected.map(n => n.at + n.duration));
  const length = end - start;
  const copies = selected.filter(n => n.at + length < clip.beats - .01).map(n => ({
    ...n, id: uid(), at: n.at + length, duration: Math.min(n.duration, clip.beats - n.at - length),
  }));
  notes.push(...copies);
  return copies.map(n => n.id);
}
