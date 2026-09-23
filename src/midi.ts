import { Midi } from '@tonejs/midi';
import { activeClips, sectionBeats, timeline, type Clip, type Project, type Track } from './model';

export type ExportScope = 'section' | 'song';
export function arrangement(project: Project, scope: ExportScope): Clip[] {
  return scope === 'section' ? activeClips(project) : project.sections.flatMap(s => s.variants[s.variant]);
}
export function exportMidi(project: Project, scope: ExportScope = 'song', tracks: 'all' | Track = 'all'): Uint8Array {
  const midi = new Midi();
  midi.name = project.name;
  midi.header.setTempo(project.bpm);
  const [numerator, denominator] = project.meter.split('/').map(Number);
  midi.header.timeSignatures = [{ ticks: 0, timeSignature: [numerator, denominator], measures: 0 }];
  midi.header.update();
  const clips = arrangement(project, scope);
  // Export explicitly chosen tracks, even if monitoring is muted.
  const notes = timeline(clips, { ...project, chordsMuted: false, bassMuted: false });
  const ppq = midi.header.ppq;
  for (const name of ['chords', 'bass'] as const) {
    if (tracks !== 'all' && tracks !== name) continue;
    const track = midi.addTrack();
    track.name = name === 'chords' ? 'Quords · Accords' : 'Quords · Basse';
    track.channel = name === 'chords' ? 0 : 1;
    track.instrument.number = name === 'chords' ? 80 : 38;
    for (const note of notes.filter(n => n.track === name)) track.addNote({
      midi: note.midi, ticks: Math.round(note.at * ppq), durationTicks: Math.max(1, Math.round(note.duration * ppq)), velocity: note.velocity,
    });
    track.endOfTrackTicks = Math.round(sectionBeats(clips) * ppq);
  }
  return midi.toArray();
}

export function download(data: Uint8Array | string, filename: string, type: string): void {
  const bytes = typeof data === 'string' ? data : new Uint8Array(data);
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export function safeFilename(value: string): string { return value.replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 80) || 'Quords'; }
