import { describe, expect, it } from 'vitest';
import { activeClips, activeSection, applyPattern, clone, createClip, createProject, createSection, duplicateClip, History, loadProject, makePattern, parseProject, projectSchema, resizeClip, setChord, timeline } from './model';
import { DEFAULT_SPEC } from './harmony';
import { moveNotes, repeatNotes, resizeNotes, snapBeat, splitNotes } from './editor';

describe('Projet, rythme et sauvegarde', () => {
  it('sauvegarde et restaure intégralement un projet', () => {
    const p = createProject(); expect(parseProject(JSON.stringify(p))).toEqual(p);
    expect(loadProject({ getItem: () => JSON.stringify(p) }).project).toEqual(p);
  });
  it('préserve une sauvegarde invalide sans tentative d’écriture', () => {
    expect(loadProject({ getItem: () => '{bad' }).error).toBeTruthy();
    expect(loadProject({ getItem: () => { throw new Error('blocked'); } }).error).toBeTruthy();
  });
  it('rejette les données incohérentes, notes hors limites et identifiants réutilisés', () => {
    const p = createProject(); p.bpm = -4; expect(projectSchema.safeParse(p).success).toBe(false);
    p.bpm = 120; activeClips(p)[0].notes[0].duration = 20; expect(projectSchema.safeParse(p).success).toBe(false);
    activeClips(p)[0].notes[0].duration = 1; activeClips(p).push(clone(activeClips(p)[0]));
    expect(projectSchema.safeParse(p).success).toBe(false);
  });
  it('isole les variantes et sections dupliquées', () => {
    const p = createProject(), section = activeSection(p);
    section.variants.B = section.variants.A.map(duplicateClip);
    section.variants.B[0].notes[0].duration = .1;
    expect(section.variants.A[0].notes[0].duration).not.toBe(.1);
    p.sections.push(createSection('Refrain', section.variants.A.map(duplicateClip)));
    expect(projectSchema.safeParse(p).success).toBe(true);
  });
  it('conserve le rythme lors du changement d’harmonie et étend les nouvelles voix', () => {
    const c = createClip({ ...DEFAULT_SPEC, color: 'triad' });
    applyPattern(c, 'chords', 'offbeat');
    const before = c.notes.filter(n => n.voice === 0).map(n => [n.at, n.duration]);
    setChord(c, { ...DEFAULT_SPEC, tonic: 2, color: '9' });
    expect(c.notes.filter(n => n.voice === 4).map(n => [n.at, n.duration])).toEqual(before);
    expect(c.notes.filter(n => n.voice === 0).map(n => [n.at, n.duration])).toEqual(before);
    setChord(c, { ...DEFAULT_SPEC, color: 'triad' }); expect(c.notes.every(n => n.voice < 3)).toBe(true);
  });
  it('redimensionne le temps sans modifier les hauteurs ni vélocités', () => {
    const c = createClip(); resizeClip(c, 2);
    expect(c.beats).toBe(2); expect(c.notes[0].duration).toBe(1.88); expect(c.notes[0].offset).toBe(0);
  });
  it('génère des motifs bornés pour les mesures courtes et fractionnaires', () => {
    for (const beats of [.25, .5, 1.5, 3, 4, 16]) for (const pattern of ['held', 'pulse', 'offbeat', 'eighth', 'arp', 'breathe']) {
      expect(makePattern(pattern, beats, 7).every(n => n.at >= 0 && n.duration > 0 && n.at + n.duration <= beats + .001)).toBe(true);
    }
  });
  it('transpose le motif de basse indépendamment de celui des accords', () => {
    const c = createClip(); const before = clone(c.notes); applyPattern(c, 'bass', 'pulse');
    expect(c.notes).toEqual(before); expect(c.bass).toHaveLength(4);
  });
  it('applique un motif personnel à une autre durée et un autre nombre de voix', () => {
    const c = createClip(DEFAULT_SPEC, 2);
    applyPattern(c, 'chords', 'custom', { id: 'test', name: 'Test', beats: 4, notes: makePattern('pulse', 4, 3) });
    expect(c.notes).toHaveLength(16); expect(c.notes.every(n => n.at + n.duration <= 2)).toBe(true);
  });
  it('annule et rétablit sans partager les objets', () => {
    const history = new History(), p = createProject(); history.push(p); p.name = 'Changed';
    const old = history.undo(p); expect(old.name).not.toBe('Changed');
    expect(history.redo(old).name).toBe('Changed');
  });
  it('ne plafonne pas le nombre d’accords', () => {
    const p = createProject(); activeSection(p).variants.A = Array.from({ length: 300 }, () => createClip());
    expect(projectSchema.safeParse(p).success).toBe(true);
    expect(timeline(activeClips(p), p)).toHaveLength(1500);
  });
});

describe('Éditeur de notes', () => {
  it('déplace en groupe sans dépasser les bords, en préservant les hauteurs verrouillées', () => {
    const c = createClip(); const ids = new Set(c.notes.map(n => n.id));
    moveNotes(c, 'chords', ids, -10); expect(c.notes[0].at).toBe(0);
    moveNotes(c, 'chords', ids, 10); expect(c.notes[0].at).toBeCloseTo(.24);
    expect(c.notes.every(n => n.offset === 0)).toBe(true);
  });
  it('redimensionne, divise, puis répète dans les limites du clip', () => {
    const c = createClip(); const ids = new Set([c.notes[0].id]);
    resizeNotes(c, 'chords', ids, -2.76, .125); expect(c.notes[0].duration).toBeCloseTo(1);
    splitNotes(c, 'chords', ids); expect(c.notes[0].duration).toBeCloseTo(.5);
    const repeated = repeatNotes(c, 'chords', ids); expect(repeated).toHaveLength(1);
    expect(c.notes.every(n => n.at + n.duration <= 4)).toBe(true);
  });
  it('permet les triolets sans arrondi destructeur', () => {
    expect(snapBeat(.7, 1 / 3)).toBeCloseTo(2 / 3);
  });
});

describe('Événements partagés lecture / MIDI', () => {
  it('aligne parfaitement toutes les voix sans humanisation', () => {
    const p = createProject(); const events = timeline([activeClips(p)[0]], p);
    expect(new Set(events.map(n => n.at)).size).toBe(1); expect(events[0].at).toBe(0);
  });
  it('produit des variations déterministes et conserve les limites', () => {
    const p = createProject(); p.swing = 1; p.humanize = 1;
    applyPattern(activeClips(p)[0], 'chords', 'eighth');
    const a = timeline(activeClips(p), p), b = timeline(activeClips(p), p);
    expect(a).toEqual(b); expect(a.some(n => n.at > .8 && n.at < 1)).toBe(true);
    expect(a.every(n => n.at + n.duration <= 16.000001)).toBe(true);
  });
  it('fusionne les notes de même hauteur qui se chevauchent dans une piste', () => {
    const p = createProject(), c = activeClips(p)[0]; c.notes.push({ ...c.notes[0], id: 'overlap', at: .5, duration: .7 });
    expect(timeline([c], p).filter(n => n.track === 'chords')).toHaveLength(4);
  });
});
