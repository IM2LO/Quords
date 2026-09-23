import { describe, expect, it } from 'vitest';
import { Midi } from '@tonejs/midi';
import { exportMidi } from './midi';
import { activeClips, activeSection, applyPattern, createProject, createSection, duplicateClip, timeline } from './model';

describe('Export MIDI réel et relisible', () => {
  it('écrit un SMF multipiste avec tempo, mesure, hauteurs et durées exacts', () => {
    const p = createProject(); p.bpm = 126; p.meter = '6/8';
    const bytes = exportMidi(p), parsed = new Midi(bytes);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe('MThd');
    expect(parsed.header.tempos[0].bpm).toBeCloseTo(126, 2);
    expect(parsed.header.timeSignatures[0].timeSignature).toEqual([6, 8]);
    expect(parsed.tracks).toHaveLength(2);
    const events = timeline(activeClips(p), p);
    for (const [index, name] of ['chords', 'bass'].entries()) {
      const expected = events.filter(n => n.track === name);
      expect(parsed.tracks[index].notes).toHaveLength(expected.length);
      expect(parsed.tracks[index].channel).toBe(index);
      for (const [i, n] of parsed.tracks[index].notes.entries()) {
        expect(n.midi).toBe(expected[i].midi);
        expect(n.ticks).toBe(Math.round(expected[i].at * parsed.header.ppq));
        expect(n.durationTicks).toBe(Math.round(expected[i].duration * parsed.header.ppq));
      }
    }
  });
  it('exporte les attaques simultanément et garde les silences', () => {
    const p = createProject(); applyPattern(activeClips(p)[0], 'chords', 'breathe');
    const midi = new Midi(exportMidi(p, 'section', 'chords'));
    expect(midi.tracks).toHaveLength(1);
    expect(midi.tracks[0].notes.filter(n => n.ticks === 0)).toHaveLength(4);
    expect(midi.tracks[0].notes[0].durationTicks).toBe(midi.header.ppq);
  });
  it('exporte seulement la variante active de chaque section', () => {
    const p = createProject(), s = activeSection(p);
    s.variants.B = [duplicateClip(s.variants.A[0])]; s.variant = 'B';
    p.sections.push(createSection('Refrain', [duplicateClip(s.variants.A[1])]));
    expect(new Midi(exportMidi(p, 'song', 'bass')).tracks[0].notes).toHaveLength(2);
    expect(new Midi(exportMidi(p, 'section', 'bass')).tracks[0].notes).toHaveLength(1);
  });
  it('inclut une piste demandée même si l’écoute est coupée', () => {
    const p = createProject(); p.bassMuted = true;
    expect(new Midi(exportMidi(p, 'song', 'bass')).tracks[0].notes).toHaveLength(4);
  });
  it('arrondit proprement les triolets et humanisations au tick près', () => {
    const p = createProject(); p.humanize = .5; p.swing = .3;
    const c = activeClips(p)[0]; c.notes[0].at = 1 / 3; c.notes[0].duration = 1 / 3;
    const parsed = new Midi(exportMidi(p));
    expect(parsed.tracks[0].notes.every(n => n.durationTicks > 0 && n.ticks >= 0)).toBe(true);
  });
});
