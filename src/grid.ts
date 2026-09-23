import { chordInfo, chordPitches } from './harmony';
import { midiNoteName, mod12, NATURAL_PITCH_CLASSES, type Notation } from './music';
import { sectionBeats, type Clip, type Track } from './model';
import { trackNotes } from './editor';

export interface GridOptions {
  track: Track; zoom: number; snap: number; selectedClip: string; selectedNotes: Set<string>;
  notation: Notation; bar: number; advanced: boolean; editable: boolean;
}
export function gridMarkup(clips: Clip[], options: GridOptions): string {
  const { track, zoom, selectedClip, selectedNotes, notation, bar } = options;
  const allPitches = clips.flatMap(c => {
    const pitches = track === 'bass' ? [12 * (c.chord.bassOctave + 1) + chordInfo(c.chord).root] : chordPitches(c.chord);
    return [...pitches, ...trackNotes(c, track).map(n => pitches[n.voice] + n.offset)];
  });
  const min = Math.max(0, (allPitches.length ? Math.min(...allPitches) : track === 'bass' ? 36 : 48) - 2);
  const max = Math.min(127, Math.max(min + 11, (allPitches.length ? Math.max(...allPitches) : track === 'bass' ? 48 : 60) + 2));
  const rows = max - min + 1, rowHeight = 21, header = 42;
  const beats = Math.max(4, sectionBeats(clips)), width = beats * zoom, height = rows * rowHeight;
  const lines = Array.from({ length: rows }, (_, i) => {
    const midi = max - i, black = !NATURAL_PITCH_CLASSES.has(mod12(midi));
    return '<div class="pitch-row ' + (black ? 'black-row' : '') + '" style="top:' + (i * rowHeight + header) + 'px"></div>';
  }).join('');
  const keys = Array.from({ length: rows }, (_, i) => {
    const midi = max - i, black = !NATURAL_PITCH_CLASSES.has(mod12(midi));
    return '<button class="rail-key ' + (black ? 'black' : '') + '" data-key="' + midi + '" style="top:' + (i * rowHeight + header) + 'px" aria-label="Jouer ' + midiNoteName(midi, notation) + '"><span>' + (mod12(midi) === 0 ? midiNoteName(midi, notation) : '') + '</span></button>';
  }).join('');
  let cursor = 0;
  const blocks = clips.map((clip, index) => {
    const info = chordInfo(clip.chord, notation), pitches = track === 'bass' ? [12 * (clip.chord.bassOctave + 1) + info.root] : chordPitches(clip.chord);
    const offset = cursor; cursor += clip.beats;
    const notes = trackNotes(clip, track).map(n => {
      const pitch = pitches[n.voice] + n.offset;
      const noteWidth = Math.max(5, n.duration * zoom - 1);
      return '<button class="midi-note ' + (selectedNotes.has(n.id) ? 'chosen' : '') + (clip.id !== selectedClip ? ' other-clip' : '') + '" data-note="' + n.id + '" data-clip="' + clip.id + '" style="left:' + ((offset + n.at) * zoom) + 'px;top:' + ((max - pitch) * rowHeight + header + 2) + 'px;width:' + noteWidth + 'px;--velocity:' + n.velocity + '" aria-label="' + midiNoteName(pitch, notation) + ', départ ' + (Math.round(n.at * 100) / 100) + ', durée ' + (Math.round(n.duration * 100) / 100) + ' temps" aria-pressed="' + selectedNotes.has(n.id) + '">' + (noteWidth > 40 ? '<span>' + midiNoteName(pitch, notation) + '</span>' : '') + '<i class="resize-handle" data-resize="true"></i></button>';
    }).join('');
    return '<button class="grid-chord ' + (clip.id === selectedClip ? 'active' : '') + '" data-action="select-clip" data-id="' + clip.id + '" style="left:' + (offset * zoom) + 'px;width:' + (clip.beats * zoom) + 'px">' + '<small>' + (index + 1) + '</small> ' + info.name + '</button>' + notes;
  }).join('');
  const beatsMarkup = Array.from({ length: Math.ceil(beats) + 1 }, (_, i) => '<div class="beat-line ' + (i % bar === 0 ? 'bar-line' : '') + '" style="left:' + i * zoom + 'px;top:' + header + 'px;height:' + height + 'px"><span>' + (i % bar === 0 ? Math.floor(i / bar) + 1 : '·') + '</span></div>').join('');
  return '<div class="roll-scroll" id="roll-scroll" role="region" aria-label="Grille MIDI défilante" tabindex="0"><div class="roll" style="width:' + (width + 54) + 'px;height:' + (height + header) + 'px"><div class="piano-rail" style="height:' + (height + header) + 'px"><div class="rail-title">MIDI</div>' + keys + '</div><div class="roll-area ' + (track === 'bass' ? 'bass-roll' : '') + '" id="roll-area" data-max="' + max + '" data-min="' + min + '" data-header="' + header + '" data-row="' + rowHeight + '" style="width:' + width + 'px;height:' + (height + header) + 'px;--beat-size:' + zoom + 'px;--snap-size:' + zoom * options.snap + 'px">' + lines + beatsMarkup + blocks + '<div id="playhead" class="playhead" hidden></div></div></div></div>';
}
