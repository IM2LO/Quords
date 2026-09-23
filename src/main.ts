import './style.css';
import { PianoAudioEngine } from './audio';
import { COLORS, COLOR_NAMES, chordInfo, chordPitches, DEFAULT_SPEC, smoothVoicing, borrowedSpec, secondarySpec, transitionInfo, type ChordSpec, type Color } from './harmony';
import { activeClips, activeSection, applyPattern, barBeats, BUILTIN_PATTERNS, clone, createClip, createProject, createSection, duplicateClip, History, loadProject, parseProject, resizeClip, sectionBeats, setChord, STORAGE_KEY, timeline, uid, type Clip, type Project, type Track, type RhythmNote } from './model';
import { buildScale, formatSpelledPitch, midiNoteName, MODE_EXPLANATIONS, mod12, NATURAL_PITCH_CLASSES, noteName, rootChoiceName, SCALE_MODES, SCALE_PROFILES, scaleName, spellScale, type ScaleMode } from './music';
import { arrangement, download, exportMidi, safeFilename, type ExportScope } from './midi';
import { moveNotes, repeatNotes, resizeNotes, safeOffset, SNAP_OPTIONS, snapBeat, splitNotes, trackNotes } from './editor';
import { gridMarkup } from './grid';
import { icon } from './icons';

const app = document.querySelector<HTMLDivElement>('#app')!;
const audio = new PianoAudioEngine();
const history = new History();
let loaded: ReturnType<typeof loadProject>;
try { loaded = loadProject(localStorage); } catch { loaded = { project: createProject(), error: 'Le stockage local est indisponible. Pense à exporter ton projet JSON.' }; }
let project = loaded.project;
let storageBlocked = !!loaded.error, saveStatus = loaded.error ? 'Sauvegarde à vérifier' : 'Enregistré sur cet appareil';
let selectedClip = activeClips(project)[0]?.id ?? '';
let selectedNotes = new Set<string>();
let draft: ChordSpec = { ...DEFAULT_SPEC, tonic: project.tonic, mode: project.mode };
let paletteSource = 'scale', track: Track = 'chords', snap = .25, zoom = 60, advanced = false, multi = false, tool: 'select' | 'draw' = 'select';
let patternScope = 'clip', loop = true, loopStart = 0, loopEnd = sectionBeats(activeClips(project)), metronome = false, playing = false, playbackScope: ExportScope = 'section';
let modal = '', clipboard: RhythmNote[] = [], notePasteOrigin = 0, liveBeat = 0;
let toastTimer: ReturnType<typeof setTimeout>;
const routes = ['composer', 'rythme', 'arrangement', 'comprendre'];
function route(): string { const r = location.hash.replace('#/', ''); return routes.includes(r) ? r : 'composer'; }
const esc = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const num = (n: number) => Math.round(n * 100) / 100;
const checked = (value: boolean) => value ? 'checked' : '';
const selected = (a: unknown, b: unknown) => a === b ? 'selected' : '';
const disabled = (value: boolean) => value ? 'disabled' : '';
function button(action: string, label: string, symbol?: string, classes = '', extra = '') {
  return '<button type="button" data-action="' + action + '" class="' + classes + '" ' + extra + '>' + (symbol ? icon(symbol) : '') + label + '</button>';
}
function selectField(label: string, id: string, options: string, extra = '') { return '<label class="field">' + label + '<select id="' + id + '" ' + extra + '>' + options + '</select></label>'; }
function numberField(label: string, id: string, value: number, min: number, max: number, step: number | string = 1) { return '<label class="field">' + label + '<input id="' + id + '" type="number" value="' + num(value) + '" min="' + min + '" max="' + max + '" step="' + step + '"></label>'; }
function rootOptions(value: number) { return Array.from({ length: 12 }, (_, i) => '<option value="' + i + '" ' + selected(i, value) + '>' + rootChoiceName(i, project.notation) + '</option>').join(''); }
function modeOptions(value: string) { return SCALE_MODES.map(m => '<option value="' + m + '" ' + selected(m, value) + '>' + SCALE_PROFILES[m].label + '</option>').join(''); }
function currentClip() { return activeClips(project).find(c => c.id === selectedClip); }
function notify(message: string) {
  const el = document.querySelector('#toast')!;
  el.textContent = message; el.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 4200);
}
function save() {
  if (storageBlocked) { saveStatus = 'Sauvegarde suspendue'; return; }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); saveStatus = 'Enregistré sur cet appareil'; }
  catch { saveStatus = 'Stockage plein ou indisponible'; notify('La sauvegarde a échoué. Exporte ton projet JSON pour le conserver.'); }
}
function syncSelection() {
  const clips = activeClips(project);
  if (!clips.some(c => c.id === selectedClip)) selectedClip = clips[0]?.id ?? '';
  const clip = currentClip();
  selectedNotes = new Set([...selectedNotes].filter(id => clip && trackNotes(clip, track).some(n => n.id === id)));
  const end = sectionBeats(clips);
  loopEnd = Math.min(loopEnd || end, end); loopStart = Math.min(loopStart, Math.max(0, end - .25));
}
function stop() { audio.stopAll(); playing = false; }
function change(fn: () => void, message?: string) {
  stop(); history.push(project); fn(); syncSelection(); save(); render();
  if (message) notify(message);
}
function chooseClip(id: string) {
  selectedClip = id; selectedNotes.clear(); render();
}
function preview(spec: ChordSpec = draft) { audio.tone = project.tone; audio.setVolume(project.volume); audio.playTogether(chordPitches(spec), 1.4); }
function paletteSpec(degree: number): ChordSpec {
  const base = { ...draft, tonic: project.tonic, mode: project.mode, inversion: 0, source: 'scale' as const };
  return paletteSource === 'borrowed' ? borrowedSpec(base, degree) : paletteSource === 'secondary' ? secondarySpec(base, degree) : { ...base, degree };
}

function header() {
  return '<header class="app-header"><a href="#/composer" class="brand" aria-label="Quords, accueil"><span class="brand-symbol">Q</span>quords<span class="brand-dot">.</span></a><div class="project-heading"><input id="project-name" aria-label="Nom du projet" maxlength="100" value="' + esc(project.name) + '"><span class="save-status"><i></i>' + esc(saveStatus) + '</span></div><div class="header-actions">' + button('undo', '', 'undo', 'icon-button', 'aria-label="Annuler" title="Annuler · Ctrl Z" ' + disabled(!history.canUndo)) + button('redo', '', 'redo', 'icon-button', 'aria-label="Rétablir" title="Rétablir · Ctrl Maj Z" ' + disabled(!history.canRedo)) + button('project-menu', '<span class="desktop-label">Projet</span>', 'file', 'quiet', 'aria-label="Sauvegarde et projets"') + button('export', '<span>MIDI</span>', 'download', 'primary') + '</div></header><nav class="main-nav" aria-label="Navigation principale">' + [
    ['composer', 'Composer', 'chords'], ['rythme', 'Rythme', 'grid'], ['arrangement', 'Arrangement', 'arrange'], ['comprendre', 'Comprendre', 'learn'],
  ].map(([r, label, symbol]) => '<a href="#/' + r + '" class="' + (route() === r ? 'active' : '') + '" ' + (route() === r ? 'aria-current="page"' : '') + '>' + icon(symbol) + '<span>' + label + '</span></a>').join('') + '<span class="nav-caption">L’atelier harmonique</span></nav>';
}

function keySettings() {
  return '<div class="key-settings">' + selectField('Fondamentale', 'tonic', rootOptions(project.tonic)) + selectField('Gamme / mode', 'mode', modeOptions(project.mode)) + selectField('Notation', 'notation', '<option value="latin" ' + selected(project.notation, 'latin') + '>Do Ré Mi</option><option value="international" ' + selected(project.notation, 'international') + '>C D E</option>') + '</div>';
}

function composer() {
  const chord = chordInfo(draft, project.notation), clip = currentClip();
  const outside = chord.pitchClasses.filter(pc => !buildScale(project.tonic, project.mode).includes(pc));
  return '<section class="page-intro"><div><div class="eyebrow">01 / TROUVER SA COULEUR</div><h1>Les accords. <em>À ta façon.</em></h1><p>Écoute, assemble, puis donne du mouvement à ton idée.</p></div><div class="intro-tag"><span class="signal-dot"></span>Synthèse directe<br><small>Zéro sample à charger</small></div></section>' +
    '<div class="compose-layout"><section class="panel palette-panel"><div class="panel-heading"><h2>Ta palette harmonique</h2><span class="tag">' + SCALE_PROFILES[project.mode].romans.join(' · ') + '</span></div>' + keySettings() +
    '<div class="segmented source-tabs" aria-label="Famille d’accords">' + [['scale', 'Dans la gamme'], ['borrowed', 'Emprunts'], ['secondary', 'Dominantes']].map(([v, label]) => button('source', label, undefined, paletteSource === v ? 'active' : '', 'data-value="' + v + '" aria-pressed="' + (paletteSource === v) + '"')).join('') + '</div>' +
    '<div class="degree-grid">' + Array.from({ length: 7 }, (_, degree) => {
      const spec = paletteSpec(degree), c = chordInfo(spec, project.notation);
      return button('preview-degree', '<span class="degree-label">' + (paletteSource === 'secondary' ? 'V/' + SCALE_PROFILES[project.mode].romans[degree] : c.roman) + '</span><strong>' + c.name + '</strong><small>' + c.names.join(' · ') + '</small><span class="audition">' + icon('volume') + 'Écouter</span>', undefined, 'degree-card ' + (draft.degree === spec.degree && draft.tonic === spec.tonic && draft.mode === spec.mode && draft.source === spec.source ? 'active' : ''), 'data-degree="' + degree + '"');
    }).join('') + '</div><p class="microcopy">' + (paletteSource === 'scale' ? 'Un clic = un aperçu. Rien n’est ajouté tant que tu ne le décides pas.' : paletteSource === 'borrowed' ? 'Même tonique, mode parallèle : une couleur empruntée au ' + (project.mode === 'major' ? 'mineur naturel' : 'majeur') + '.' : 'Chaque dominante prépare le degré indiqué. Certaines résolutions modales sont moins stables, notamment vers un accord diminué.') + '</p>' +
    '<div class="color-row"><span>Enrichir</span>' + COLORS.map(c => button('color', COLOR_NAMES[c], undefined, 'color-chip ' + (draft.color === c ? 'active' : ''), 'data-value="' + c + '" aria-pressed="' + (draft.color === c) + '"')).join('') + '</div></section>' +
    '<aside class="panel preview-panel"><div class="eyebrow">SUR LE PUPITRE</div><div class="chord-title"><h2>' + chord.name + '</h2>' + button('preview', '', 'volume', 'round-button', 'aria-label="Écouter l’accord préparé"') + '</div><div class="note-pills">' + chord.names.map(n => '<span>' + n + '</span>').join('') + '</div><p class="formula">' + chord.formula + '</p>' +
    '<div class="fields two">' + selectField('Octave de départ', 'draft-octave', [1, 2, 3, 4, 5].map(n => '<option ' + selected(draft.octave, n) + '>' + n + '</option>').join('')) + selectField('Renversement', 'draft-inversion', chord.intervals.map((_, i) => '<option value="' + i + '" ' + selected(i, draft.inversion % chord.intervals.length) + '>' + (i ? i + 'e renversement' : 'Fondamentale') + '</option>').join('')) + '</div><label class="check-field"><input id="draft-spread" type="checkbox" ' + checked(draft.spread) + '>Voicing ouvert (drop 2)</label>' +
    '<p class="microcopy ' + (outside.length ? 'warning-text' : '') + '">' + (outside.length ? 'Hors gamme : ' + outside.map(pc => noteName(pc, project.notation)).join(', ') + '. Une couleur volontaire, pas une erreur.' : 'Toutes ces notes appartiennent à la gamme sélectionnée.') + '</p><div class="preview-actions">' + button('add-chord', 'Ajouter à la suite', 'plus', 'primary wide') + button('replace-chord', 'Remplacer l’accord actif', undefined, 'quiet wide', disabled(!clip)) + '</div></aside></div>' +
    pianoMarkup(chord.pitchClasses) + progressionMarkup() + editorMarkup(false);
}

function pianoMarkup(highlight: number[]) {
  let white = 0;
  const keys = Array.from({ length: 37 }, (_, i) => {
    const midi = 48 + i, natural = NATURAL_PITCH_CLASSES.has(mod12(midi));
    const left = natural ? white++ * 34 : white * 34 - 11;
    return '<button class="piano-key ' + (natural ? 'white-key' : 'black-key') + (highlight.includes(mod12(midi)) ? ' highlighted' : '') + '" data-key="' + midi + '" style="left:' + left + 'px" aria-label="Jouer ' + midiNoteName(midi, project.notation) + '"></button>';
  }).join('');
  return '<section class="piano-panel"><div class="piano-caption"><span>' + icon('chords') + 'Au bout des doigts</span><small>Do3 → Do6 · glisse pour explorer</small></div><div class="piano-scroll"><div class="piano-keys" style="width:' + white * 34 + 'px">' + keys + '</div></div></section>';
}

function progressionMarkup() {
  const clips = activeClips(project), section = activeSection(project);
  return '<section class="panel progression-panel"><div class="panel-heading"><div><div class="eyebrow">TON FIL MUSICAL</div><h2>' + esc(section.name) + '<span class="heading-count">' + clips.length + ' accords · ' + num(sectionBeats(clips)) + ' temps</span></h2></div><div class="inline-controls"><div class="segmented compact">' + ['A', 'B'].map(v => button('variant', v, undefined, section.variant === v ? 'active' : '', 'data-value="' + v + '" aria-label="Variante ' + v + '" aria-pressed="' + (section.variant === v) + '"')).join('') + '</div>' + button('copy-variant', 'Copier vers ' + (section.variant === 'A' ? 'B' : 'A'), 'copy', 'quiet small') + '</div></div>' +
    '<div class="clip-strip">' + clips.map((c, i) => {
      const info = chordInfo(c.chord, project.notation);
      return '<button data-action="select-clip" data-id="' + c.id + '" class="clip-card ' + (selectedClip === c.id ? 'active' : '') + '" aria-pressed="' + (selectedClip === c.id) + '"><span class="clip-index">' + String(i + 1).padStart(2, '0') + '</span><span class="clip-roman">' + (c.chord.source === 'scale' ? info.roman : c.chord.source === 'borrowed' ? 'Emprunt' : 'Dominante') + '</span><strong>' + info.name + '</strong><div class="mini-bars">' + chordPitches(c.chord).map((n, j) => '<i style="width:' + (32 + j * 12) + '%;margin-left:' + mod12(n) * 3 + '%"></i>').join('') + '</div><small>' + num(c.beats) + ' temps</small></button>';
    }).join('') + button('add-chord', '<span>+</span><small>Ajouter<br>' + chordInfo(draft, project.notation).name + '</small>', undefined, 'add-clip') + '</div>' + (clips.length ? '<div class="clip-toolbar">' + button('preview-clip', 'Écouter', 'volume', 'quiet') + button('load-clip', 'Personnaliser', 'chords', 'quiet') + button('duplicate-clip', 'Dupliquer', 'copy', 'quiet') + button('clip-left', '', 'left', 'icon-button', 'aria-label="Déplacer l’accord à gauche"') + button('clip-right', '', 'right', 'icon-button', 'aria-label="Déplacer l’accord à droite"') + button('delete-clip', '', 'trash', 'icon-button danger', 'aria-label="Supprimer l’accord actif"') + button('smooth', 'Lier les voix', 'magic', 'quiet accent') + '</div>' : '<p class="empty-message">Ta page blanche. Écoute un accord dans la palette, puis ajoute-le ici.</p>') + '</section>';
}

function editorMarkup(editable: boolean) {
  const clip = currentClip(), notes = clip ? trackNotes(clip, track).filter(n => selectedNotes.has(n.id)) : [];
  const options = { track, zoom, snap, selectedClip, selectedNotes, notation: project.notation, bar: barBeats(project.meter), advanced, editable };
  return '<section class="panel editor-panel"><div class="panel-heading"><div><div class="eyebrow">' + (editable ? 'DESSINER LE MOUVEMENT' : 'L’IDÉE PREND FORME') + '</div><h2>Le piano roll <span class="tag purple">' + (advanced ? 'Hauteurs libres' : 'Rythme seulement') + '</span></h2></div><div class="inline-controls"><div class="segmented"><button data-action="track" data-value="chords" class="' + (track === 'chords' ? 'active' : '') + '">Accords</button><button data-action="track" data-value="bass" class="' + (track === 'bass' ? 'active' : '') + '">Basse</button></div>' + (editable ? '' : '<a class="button quiet" href="#/rythme">Éditer le rythme ' + icon('arrow') + '</a>') + '</div></div>' +
    (editable ? '<div class="editor-tools"><div class="segmented">' + button('tool', 'Sélection', undefined, tool === 'select' ? 'active' : '', 'data-value="select"') + button('tool', 'Dessiner', 'plus', tool === 'draw' ? 'active' : '', 'data-value="draw"') + '</div>' + selectField('Grille', 'snap', SNAP_OPTIONS.map(s => '<option value="' + s.value + '" ' + selected(s.value, snap) + '>' + s.label + '</option>').join('')) + '<label class="check-field"><input id="multi" type="checkbox" ' + checked(multi) + '>Multisélection</label><label class="check-field lock-toggle"><input id="advanced" type="checkbox" ' + checked(advanced) + '>' + icon(advanced ? 'grid' : 'lock') + 'Hauteurs libres</label><label class="zoom-field">Zoom<input id="zoom" type="range" min="30" max="160" step="10" value="' + zoom + '"></label></div>' : '') +
    (activeClips(project).length ? gridMarkup(activeClips(project), options) : '<div class="empty-message">Ajoute ton premier accord pour commencer à dessiner.</div>') +
    '<div class="grid-footnote"><span>' + (editable ? tool === 'draw' ? 'Clique une ligne de l’accord pour dessiner une note. Glisse pour choisir sa durée.' : 'Glisse une note pour la déplacer, son bord droit pour l’étirer. Maj + clic : sélection multiple.' : 'Les blocs sont les accords, les rectangles sont les notes. La hauteur représente la note ; la largeur, sa durée.') + '</span><span>1 temps = 1 noire</span></div>' +
    (editable && clip ? '<div class="note-inspector"><div class="note-selection"><strong>' + notes.length + ' note' + (notes.length > 1 ? 's' : '') + ' sélectionnée' + (notes.length > 1 ? 's' : '') + '</strong><small>' + chordInfo(clip.chord, project.notation).name + ' · ' + (track === 'bass' ? 'Basse' : 'Accords') + '</small></div><div class="note-actions">' + button('select-all', 'Tout', undefined, 'quiet small') + button('split-notes', 'Diviser', undefined, 'quiet small', disabled(!notes.length)) + button('repeat-notes', 'Répéter', undefined, 'quiet small', disabled(!notes.length)) + button('copy-notes', '', 'copy', 'icon-button', 'aria-label="Copier les notes" ' + disabled(!notes.length)) + button('paste-notes', 'Coller', undefined, 'quiet small', disabled(!clipboard.length)) + button('delete-notes', '', 'trash', 'icon-button danger', 'aria-label="Supprimer les notes" ' + disabled(!notes.length)) + '</div>' +
    (notes.length ? '<div class="fields note-fields">' + numberField('Départ (temps)', 'note-at', notes[0].at, 0, clip.beats - .01, 'any') + numberField('Durée (temps)', 'note-duration', notes[0].duration, .01, clip.beats, 'any') + numberField('Vélocité %', 'note-velocity', notes[0].velocity * 100, 1, 100, 'any') + (advanced ? numberField('Décalage (½ tons)', 'note-offset', notes[0].offset, -48, 48) : '') + '</div>' : '<p class="microcopy">Touche une note pour la régler précisément, même sans glisser.</p>') + '</div>' : '') + '</section>';
}

function rhythm() {
  const clip = currentClip();
  return '<section class="page-intro"><div><div class="eyebrow">02 / DONNER DU MOUVEMENT</div><h1>Même harmonie. <em>Autre énergie.</em></h1><p>Les hauteurs restent liées aux accords. À toi de jouer avec le temps.</p></div></section>' + progressionMarkup() + editorMarkup(true) +
    '<div class="rhythm-bottom"><section class="panel"><div class="panel-heading"><h2>Une impulsion de départ</h2>' + selectField('Appliquer à', 'pattern-scope', '<option value="clip" ' + selected(patternScope, 'clip') + '>L’accord actif</option><option value="region" ' + selected(patternScope, 'region') + '>La zone de boucle</option><option value="section" ' + selected(patternScope, 'section') + '>Toute la section</option>') + '</div><div class="pattern-grid">' + BUILTIN_PATTERNS.map((p, i) => button('pattern', '<span class="pattern-art p' + i + '"><i></i><i></i><i></i><i></i></span><strong>' + p.name + '</strong><small>' + p.detail + '</small>', undefined, 'pattern-card', 'data-id="' + p.id + '"')).join('') + project.patterns.map(p => button('pattern', '<strong>' + esc(p.name) + '</strong><small>Ton motif enregistré</small>', undefined, 'pattern-card custom-pattern', 'data-id="' + p.id + '"')).join('') + '</div><div class="inline-controls">' + button('save-pattern', 'Sauver le motif actif', 'plus', 'quiet', disabled(!clip)) + button('clear-rhythm', 'Créer un silence', undefined, 'quiet danger', disabled(!clip)) + '</div><p class="microcopy">Un motif remplace le rythme de la piste choisie. Annuler reste toujours disponible.</p></section>' +
    '<section class="panel feel-panel"><h2>Le détail qui change tout</h2><label class="slider-field">Swing <span>' + Math.round(project.swing * 100) + '%</span><input id="swing" type="range" value="' + project.swing + '" min="0" max="1" step=".01"></label><label class="slider-field">Humanisation <span>' + Math.round(project.humanize * 100) + '%</span><input id="humanize" type="range" value="' + project.humanize + '" min="0" max="1" step=".01"></label><p class="microcopy">À 0 %, les attaques sont parfaitement alignées. Le swing retarde les contretemps de croche ; l’humanisation ajoute de très légères variations de temps et d’intensité, aussi dans le MIDI.</p>' + (clip ? '<div class="fields two">' + numberField('Durée de l’accord', 'clip-beats', clip.beats, .25, 64, .25) + selectField('Octave de la basse', 'bass-octave', [0, 1, 2, 3, 4].map(n => '<option ' + selected(clip.chord.bassOctave, n) + '>' + n + '</option>').join('')) + '</div>' : '') + '</section></div>';
}

function arrangePage() {
  return '<section class="page-intro"><div><div class="eyebrow">03 / RACONTER QUELQUE CHOSE</div><h1>Des idées. <em>Une histoire.</em></h1><p>Chaque section a deux variantes. L’arrangement joue la variante active, de haut en bas.</p></div>' + button('add-section', 'Nouvelle section', 'plus', 'primary') + '</section><div class="arrange-layout"><section class="section-list">' +
    project.sections.map((s, index) => '<article class="panel section-card ' + (s.id === project.activeSection ? 'active' : '') + '"><div class="section-number">' + String(index + 1).padStart(2, '0') + '</div><div class="section-main"><input class="section-name" data-section-name="' + s.id + '" aria-label="Nom de la section ' + (index + 1) + '" value="' + esc(s.name) + '" maxlength="60"><div class="section-chords">' + s.variants[s.variant].map(c => '<span>' + chordInfo(c.chord, project.notation).name + '</span>').join('') + (s.variants[s.variant].length ? '' : '<small>Section vide — ouvre-la pour composer</small>') + '</div><small>' + num(sectionBeats(s.variants[s.variant])) + ' temps · variante ' + s.variant + '</small></div><div class="section-actions">' + button('open-section', 'Ouvrir', undefined, 'quiet', 'data-id="' + s.id + '"') + button('duplicate-section', '', 'copy', 'icon-button', 'data-id="' + s.id + '" aria-label="Dupliquer ' + esc(s.name) + '"') + button('section-up', '', 'left', 'icon-button up-icon', 'data-id="' + s.id + '" aria-label="Monter la section" ' + disabled(index === 0)) + button('section-down', '', 'right', 'icon-button up-icon', 'data-id="' + s.id + '" aria-label="Descendre la section" ' + disabled(index === project.sections.length - 1)) + button('delete-section', '', 'trash', 'icon-button danger', 'data-id="' + s.id + '" aria-label="Supprimer la section" ' + disabled(project.sections.length === 1)) + '</div></article>').join('') +
    '</section><aside class="panel arrange-aside"><div class="eyebrow">LA VUE D’ENSEMBLE</div><h2>' + num(sectionBeats(arrangement(project, 'song')) / barBeats(project.meter)) + '<small> mesures au total</small></h2><p>La variante B est ton terrain d’essai. Duplique A vers B, transforme-la, puis compare à l’oreille.</p>' + button('play-song', 'Écouter l’arrangement', 'play', 'primary wide') + button('export', 'Exporter en MIDI', 'download', 'quiet wide') + '<div class="callout">Accords et basse sortent sur deux pistes séparées : tu gardes la main dans ton logiciel de musique.</div></aside></div>';
}

function learnPage() {
  const profile = SCALE_PROFILES[project.mode], spelled = spellScale(project.tonic, project.mode);
  const clips = activeClips(project), clip = currentClip(), index = clips.findIndex(c => c.id === selectedClip), prev = clips[index - 1];
  const transition = prev && clip ? transitionInfo(prev.chord, clip.chord, project.notation) : undefined;
  return '<section class="page-intro"><div><div class="eyebrow">04 / COMPRENDRE EN FAISANT</div><h1>Moins de hasard. <em>Plus d’oreille.</em></h1><p>Les règles sont des repères, pas des barrières.</p></div></section><section class="panel theory-panel"><div class="panel-heading"><h2>' + scaleName(project.tonic, project.mode, project.notation) + '</h2></div>' + keySettings() + '<p>' + MODE_EXPLANATIONS[project.mode] + '</p><div class="scale-ladder">' + spelled.map((n, i) => '<div><span class="ladder-degree">' + (i + 1) + '</span><strong>' + formatSpelledPitch(n, project.notation) + '</strong><span class="ladder-step">' + profile.steps[i] + '</span></div>').join('') + '</div><p class="microcopy">T = un ton, S = un demi-ton. Le dernier intervalle revient à la tonique à l’octave.</p><div class="theory-degrees">' + Array.from({ length: 7 }, (_, i) => { const c = chordInfo({ ...DEFAULT_SPEC, tonic: project.tonic, mode: project.mode, degree: i, color: 'triad' }, project.notation); return button('theory-preview', '<span>' + c.roman + '</span><strong>' + c.name + '</strong><small>' + c.names.join(' · ') + '</small>', undefined, 'theory-degree', 'data-degree="' + i + '"'); }).join('') + '</div><div class="callout">Construire un accord : partir d’un degré, prendre une note sur deux dans la gamme. 1–3–5 forme la triade ; on ajoute ensuite 7, 9, 11, 13. Majuscules = majeur, minuscules = mineur, ° = diminué, + = augmenté.</div></section>' +
    '<div class="learn-grid"><section class="panel"><span class="eyebrow">DANS TA PROGRESSION</span><h2>' + (transition && prev && clip ? chordInfo(prev.chord, project.notation).name + ' → ' + chordInfo(clip.chord, project.notation).name : 'Les liens entre les accords') + '</h2><p>' + (transition ? transition.description : 'Sélectionne un accord après le premier dans ta progression pour analyser le passage qui le précède.') + '</p>' + (transition ? '<div class="metric-row"><div><strong>' + transition.common.length + '</strong><small>notes communes</small></div><div><strong>' + transition.distance + '</strong><small>½ tons de mouvement*</small></div></div><p>' + (transition.common.join(' · ') || 'Aucune note commune') + '</p><small>* Somme des déplacements des voix classées du grave à l’aigu ; indicateur simple, pas un jugement musical.</small>' : '') + button('smooth', 'Rapprocher les voix', 'magic', 'quiet accent') + '</section>' +
    '<section class="panel"><span class="eyebrow">LE RYTHME EN CLAIR</span><h2>Lire la grille</h2><p>De gauche à droite : le temps. De bas en haut : du grave à l’aigu. La longueur d’un rectangle est la durée d’une note.</p><ul class="lesson-list"><li><strong>Rythme seulement</strong> : les voix suivent les accords, même après un remplacement.</li><li><strong>Renversement</strong> : on change la note la plus basse, pas la famille de l’accord.</li><li><strong>Octave</strong> : même note, registre différent. Do4 est le MIDI 60.</li><li><strong>Vélocité</strong> : l’intensité d’attaque, de 1 à 127 dans le MIDI.</li><li><strong>6/8</strong> : six croches ; le métronome marque les deux noires pointées.</li></ul></section>' +
    '<section class="panel"><span class="eyebrow">DES PISTES, PAS DES OBLIGATIONS</span><h2>Et après cet accord ?</h2><p>Essaie un retour vers la tonique, une dominante, ou un degré qui partage des notes. Préécoute avant d’ajouter.</p><div class="suggestions">' + [0, 3, 4, 5, 1].map(i => { const c = chordInfo({ ...draft, tonic: project.tonic, mode: project.mode, degree: i, source: 'scale' }, project.notation); return button('suggestion', c.roman + ' · ' + c.name, 'volume', 'quiet', 'data-degree="' + i + '"'); }).join('') + '</div><p class="microcopy">Le bouton prépare l’accord dans Composer ; il ne l’ajoute pas à ta place.</p></section></div>';
}

function transport() {
  return '<footer class="transport"><div class="transport-play">' + button('play', '', playing ? 'stop' : 'play', 'play-button', 'aria-label="' + (playing ? 'Arrêter' : 'Lire') + '" title="Espace : lecture / arrêt"') + '<div class="position"><strong id="position">' + (playing ? num(liveBeat).toFixed(1) : '01.1') + '</strong><small>' + (playbackScope === 'song' ? 'Arrangement' : 'Section active') + '</small></div></div><div class="transport-controls">' + numberField('BPM', 'bpm', project.bpm, 30, 250) + selectField('Mesure', 'meter', ['4/4', '3/4', '6/8'].map(m => '<option ' + selected(m, project.meter) + '>' + m + '</option>').join('')) + '<label class="check-field metro"><input id="metronome" type="checkbox" ' + checked(metronome) + '>Métronome</label><button data-action="loop" class="icon-button ' + (loop ? 'active' : '') + '" aria-pressed="' + loop + '" aria-label="Boucle" title="Boucle">' + icon('loop') + '</button></div><div class="transport-sound">' + selectField('Son', 'tone', '<option value="soft" ' + selected(project.tone, 'soft') + '>Doux</option><option value="bright" ' + selected(project.tone, 'bright') + '>Clair</option><option value="organ" ' + selected(project.tone, 'organ') + '>Orgue</option>') + '<label class="volume-slider" aria-label="Volume">' + icon('volume') + '<input id="volume" aria-label="Volume" type="range" min="0" max="1" step=".01" value="' + project.volume + '"></label></div></footer>';
}

function loopMarkup() {
  const total = Math.max(.25, sectionBeats(activeClips(project)));
  return '<section class="session-options"><div class="loop-region"><span>' + icon('loop') + 'Zone de boucle <small>(temps depuis 0)</small></span>' + numberField('Début', 'loop-start', loopStart, 0, total - .25, .25) + numberField('Fin', 'loop-end', loopEnd, .25, total, .25) + button('loop-all', 'Toute la section', undefined, 'quiet small') + '</div><div class="track-mutes"><label class="check-field"><input id="metronome-main" type="checkbox" '+ checked(metronome) +'>Métronome</label><label class="check-field"><input id="chords-audible" type="checkbox" ' + checked(!project.chordsMuted) + '>Accords audibles</label><label class="check-field"><input id="bass-audible" type="checkbox" ' + checked(!project.bassMuted) + '>Basse audible</label></div></section>';
}

function modalMarkup() {
  if (!modal) return '';
  let content = '';
  if (modal === 'export') content = '<div class="eyebrow">DE L’IDÉE À TON LOGICIEL</div><h2>Emporte ta musique.</h2><p>Un vrai fichier MIDI multipiste : notes, durées, vélocités, tempo et mesure.</p>' + selectField('Contenu', 'export-scope', '<option value="song">Tout l’arrangement</option><option value="section">Section active · variante ' + activeSection(project).variant + '</option>') + selectField('Pistes', 'export-tracks', '<option value="all">Accords + basse (2 pistes)</option><option value="chords">Accords seuls</option><option value="bass">Basse seule</option>') + '<p class="microcopy">Les pistes muettes sont incluses si tu les choisis. Le MIDI contient la musique, pas le son de synthèse : choisis ton instrument dans ton logiciel.</p>' + button('download-midi', 'Télécharger le .mid', 'download', 'primary wide');
  if (modal === 'project') content = '<div class="eyebrow">TES IDÉES T’APPARTIENNENT</div><h2>Ton projet, chez toi.</h2><p>Enregistrement automatique dans ce navigateur, sans compte ni serveur. Une sauvegarde JSON conserve aussi tes variantes et motifs.</p><div class="project-buttons">' + button('download-json', 'Sauvegarder le projet JSON', 'download', 'primary wide') + '<label class="button quiet wide upload-label">' + icon('file') + 'Ouvrir un projet JSON<input id="import-project" type="file" accept=".json,application/json"></label>' + button('new-project', 'Nouveau projet vide', 'plus', 'quiet wide') + '</div><p class="microcopy">Changer de navigateur ou effacer ses données peut supprimer la sauvegarde locale. Le fichier JSON est ta copie de sécurité.</p>' + (storageBlocked ? '<div class="callout warning-text">La sauvegarde locale est suspendue pour ne pas écraser des données illisibles.' + button('download-raw', 'Récupérer la sauvegarde brute', 'download', 'quiet wide') + button('allow-save', 'Remplacer avec ce projet', undefined, 'quiet wide') + '</div>' : '');
  if (modal === 'pattern') content = '<h2>Garder ce rythme</h2><p>Il pourra être réappliqué à d’autres accords, indépendamment de leurs notes.</p><label class="field">Nom du motif<input id="pattern-name" value="Mon motif" maxlength="40"></label>' + button('confirm-pattern', 'Enregistrer le motif', 'check', 'primary wide');
  return '<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1"><div id="dialog-title" class="sr-only">' + (modal === 'export' ? 'Export MIDI' : modal === 'pattern' ? 'Enregistrer un motif' : 'Gestion du projet') + '</div>' + button('close-modal', '', 'close', 'modal-close icon-button', 'aria-label="Fermer"') + content + '</section></div>';
}

function render() {
  const roll = document.querySelector('#roll-scroll'), piano = document.querySelector('.piano-scroll');
  const scroll = { x: roll?.scrollLeft ?? 0, y: roll?.scrollTop ?? 0, piano: piano?.scrollLeft ?? 0 };
  const focusId = document.activeElement?.id;
  syncSelection();
  const page = route();
  app.innerHTML = header() + '<main id="main-content">' + (page === 'composer' ? composer() : page === 'rythme' ? rhythm() : page === 'arrangement' ? arrangePage() : learnPage()) + (page === 'composer' || page === 'rythme' ? loopMarkup() : '') + '<div class="page-footer"><span>quords. <i>Créer, entendre, comprendre.</i></span><small>Local par nature. Musical par envie.</small></div></main>' + transport() + modalMarkup();
  const newRoll = document.querySelector('#roll-scroll');
  if (newRoll) { newRoll.scrollLeft = scroll.x; newRoll.scrollTop = scroll.y; }
  const newPiano = document.querySelector('.piano-scroll'); if (newPiano) newPiano.scrollLeft = scroll.piano;
  if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
  if (modal) requestAnimationFrame(() => (document.querySelector('.modal input, .modal select, .modal button') as HTMLElement)?.focus());
  paintPosition(liveBeat);
}

function paintPosition(beat: number) {
  liveBeat = beat;
  const head = document.querySelector<HTMLElement>('#playhead');
  if (head) { head.hidden = !playing || playbackScope !== 'section'; head.style.left = beat * zoom + 'px'; }
  const pos = document.querySelector('#position');
  if (pos) pos.textContent = playing ? String(Math.floor(beat / barBeats(project.meter)) + 1).padStart(2, '0') + '.' + (Math.floor(beat % barBeats(project.meter)) + 1) : '01.1';
}
function play(scope: ExportScope = 'section') {
  if (playing) { stop(); render(); return; }
  const clips = arrangement(project, scope), total = sectionBeats(clips);
  if (!total) { notify('Ajoute un accord avant de lancer la lecture.'); return; }
  stop(); playing = true; playbackScope = scope;
  audio.tone = project.tone; audio.setVolume(project.volume);
  const start = scope === 'section' && loop ? loopStart : 0, end = scope === 'section' && loop ? Math.max(start + .25, loopEnd) : total;
  render();
  void audio.playTimeline(timeline(clips, project), project.bpm, start, end, loop, metronome, project.meter === '6/8' ? 1.5 : 1, barBeats(project.meter), paintPosition, () => { playing = false; render(); });
}

function patternTargets(): Clip[] {
  const clips = activeClips(project); let cursor = 0;
  return patternScope === 'section' ? clips : patternScope === 'clip' ? clips.filter(c => c.id === selectedClip) : clips.filter(c => { const start = cursor; cursor += c.beats; return start < loopEnd && cursor > loopStart; });
}
function copyNotes() {
  const clip = currentClip(); if (!clip) return;
  clipboard = clone(trackNotes(clip, track).filter(n => selectedNotes.has(n.id)));
  notePasteOrigin = clipboard.length ? Math.min(...clipboard.map(n => n.at)) : 0;
  notify(clipboard.length + ' notes copiées'); render();
}
function deleteNotes() {
  const clip = currentClip(); if (!clip || !selectedNotes.size) return;
  change(() => { if (track === 'bass') clip.bass = clip.bass.filter(n => !selectedNotes.has(n.id)); else clip.notes = clip.notes.filter(n => !selectedNotes.has(n.id)); selectedNotes.clear(); });
}

app.addEventListener('click', event => {
  const keyboardNote = (event.target as HTMLElement).closest<HTMLElement>('[data-note]');
  if (event.detail === 0 && keyboardNote && route() === 'rythme') {
    selectedClip = keyboardNote.dataset.clip!;
    selectedNotes = new Set([keyboardNote.dataset.note!]); render(); return;
  }
  const el = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!el || (el instanceof HTMLButtonElement && el.disabled)) return;
  const action = el.dataset.action, value = el.dataset.value, id = el.dataset.id;
  const clip = currentClip(), clips = activeClips(project), section = activeSection(project);
  if (action === 'preview-degree' || action === 'suggestion') {
    draft = action === 'preview-degree' ? paletteSpec(Number(el.dataset.degree)) : { ...draft, tonic: project.tonic, mode: project.mode, degree: Number(el.dataset.degree), source: 'scale' };
    preview(); render(); if (action === 'suggestion') notify(chordInfo(draft, project.notation).name + ' préparé dans Composer');
  } else if (action === 'theory-preview') preview({ ...DEFAULT_SPEC, tonic: project.tonic, mode: project.mode, degree: Number(el.dataset.degree), color: 'triad' });
  else if (action === 'source') { paletteSource = value!; render(); }
  else if (action === 'color') { draft.color = value as Color; draft.inversion = 0; preview(); render(); }
  else if (action === 'preview') preview();
  else if (action === 'add-chord') change(() => { const c = createClip(draft, barBeats(project.meter)); clips.push(c); selectedClip = c.id; loopEnd = sectionBeats(clips); }, 'Accord ajouté à la progression');
  else if (action === 'replace-chord' && clip) change(() => setChord(clip, draft), 'Accord remplacé. Son rythme est conservé.');
  else if (action === 'select-clip') chooseClip(id!);
  else if (action === 'preview-clip' && clip) preview(clip.chord);
  else if (action === 'load-clip' && clip) { draft = clone(clip.chord); location.hash = '/composer'; render(); notify('Accord chargé sur le pupitre. Remplacer pour appliquer tes réglages.'); }
  else if (action === 'duplicate-clip' && clip) change(() => { const c = duplicateClip(clip); clips.splice(clips.indexOf(clip) + 1, 0, c); selectedClip = c.id; loopEnd = sectionBeats(clips); });
  else if (action === 'delete-clip' && clip) change(() => clips.splice(clips.indexOf(clip), 1));
  else if ((action === 'clip-left' || action === 'clip-right') && clip) {
    const at = clips.indexOf(clip), next = at + (action === 'clip-left' ? -1 : 1);
    if (next >= 0 && next < clips.length) change(() => { [clips[at], clips[next]] = [clips[next], clips[at]]; });
  } else if (action === 'smooth') change(() => { for (let i = 1; i < clips.length; i++) setChord(clips[i], smoothVoicing(chordPitches(clips[i - 1].chord), clips[i].chord)); }, 'Renversements rapprochés ; rythme et piste de basse conservés.');
  else if (action === 'variant') change(() => { section.variant = value as 'A' | 'B'; selectedClip = activeClips(project)[0]?.id ?? ''; loopStart = 0; loopEnd = sectionBeats(activeClips(project)); });
  else if (action === 'copy-variant') {
    const destination = section.variant === 'A' ? 'B' : 'A';
    if (section.variants[destination].length && !confirm('Remplacer la variante ' + destination + ' par une copie de ' + section.variant + ' ? Tu pourras annuler.')) return;
    change(() => { section.variants[destination] = clips.map(duplicateClip); }, 'Copie enregistrée dans la variante ' + destination);
  } else if (action === 'track') { track = value as Track; selectedNotes.clear(); render(); }
  else if (action === 'tool') { tool = value as 'select' | 'draw'; render(); }
  else if (action === 'pattern' && clip) change(() => { for (const c of patternTargets()) applyPattern(c, track, id!, project.patterns.find(p => p.id === id)); selectedNotes.clear(); }, 'Motif appliqué à la piste ' + (track === 'bass' ? 'basse' : 'accords'));
  else if (action === 'clear-rhythm' && clip) change(() => { for (const c of patternTargets()) if (track === 'bass') c.bass = []; else c.notes = []; });
  else if (action === 'save-pattern') { modal = 'pattern'; render(); }
  else if (action === 'confirm-pattern' && clip) {
    const name = (document.querySelector('#pattern-name') as HTMLInputElement).value.trim();
    if (name) change(() => { project.patterns.push({ id: uid(), name, notes: clone(trackNotes(clip, track)), beats: clip.beats }); modal = ''; }, 'Motif personnel enregistré');
  } else if (action === 'select-all' && clip) { selectedNotes = new Set(trackNotes(clip, track).map(n => n.id)); render(); }
  else if (action === 'copy-notes') copyNotes();
  else if (action === 'paste-notes' && clip && clipboard.length) change(() => {
    const voices = track === 'bass' ? 1 : chordInfo(clip.chord).intervals.length;
    const copies = clipboard.filter(n => n.voice < voices).map(n => ({ ...n, id: uid(), at: n.at - notePasteOrigin })).filter(n => n.at < clip.beats).map(n => ({ ...n, duration: Math.min(n.duration, clip.beats - n.at) }));
    trackNotes(clip, track).push(...copies); selectedNotes = new Set(copies.map(n => n.id));
  }, 'Notes collées au début de l’accord actif');
  else if (action === 'split-notes' && clip) change(() => splitNotes(clip, track, selectedNotes));
  else if (action === 'repeat-notes' && clip) change(() => { selectedNotes = new Set(repeatNotes(clip, track, selectedNotes)); });
  else if (action === 'delete-notes') deleteNotes();
  else if (action === 'add-section') change(() => { const s = createSection('Section ' + (project.sections.length + 1)); project.sections.push(s); project.activeSection = s.id; loopStart = 0; loopEnd = 0; });
  else if (action === 'open-section') { stop(); project.activeSection = id!; selectedNotes.clear(); loopStart = 0; loopEnd = sectionBeats(activeClips(project)); save(); location.hash = '/composer'; render(); }
  else if (action === 'duplicate-section') change(() => {
    const s = project.sections.find(s => s.id === id)!;
    const copy = { ...clone(s), id: uid(), name: (s.name + ' — copie').slice(0, 60), variants: { A: s.variants.A.map(duplicateClip), B: s.variants.B.map(duplicateClip) } };
    project.sections.splice(project.sections.indexOf(s) + 1, 0, copy);
  });
  else if (action === 'delete-section' && project.sections.length > 1) {
    if (confirm('Supprimer cette section et ses deux variantes ? Cette action peut être annulée.')) change(() => { project.sections = project.sections.filter(s => s.id !== id); if (project.activeSection === id) project.activeSection = project.sections[0].id; });
  } else if (action === 'section-up' || action === 'section-down') {
    const i = project.sections.findIndex(s => s.id === id), j = i + (action === 'section-up' ? -1 : 1);
    if (j >= 0 && j < project.sections.length) change(() => { [project.sections[i], project.sections[j]] = [project.sections[j], project.sections[i]]; });
  } else if (action === 'loop') { stop(); loop = !loop; render(); }
  else if (action === 'loop-all') { stop(); loopStart = 0; loopEnd = sectionBeats(clips); render(); }
  else if (action === 'play') play(route() === 'arrangement' ? 'song' : 'section');
  else if (action === 'play-song') play('song');
  else if (action === 'undo') { stop(); project = history.undo(project); syncSelection(); save(); render(); }
  else if (action === 'redo') { stop(); project = history.redo(project); syncSelection(); save(); render(); }
  else if (action === 'project-menu' || action === 'export') { modal = action === 'export' ? 'export' : 'project'; render(); }
  else if (action === 'close-modal') { modal = ''; render(); }
  else if (action === 'download-midi') {
    const scope = (document.querySelector('#export-scope') as HTMLSelectElement).value as ExportScope;
    const tracks = (document.querySelector('#export-tracks') as HTMLSelectElement).value as Track | 'all';
    try { download(exportMidi(project, scope, tracks), safeFilename(project.name) + '-' + tracks + '.mid', 'audio/midi'); notify('MIDI exporté · ' + project.bpm + ' BPM · ' + project.meter); } catch { notify('L’export MIDI a échoué. Sauvegarde ton projet JSON.'); }
  } else if (action === 'download-json') download(JSON.stringify(project, null, 2), safeFilename(project.name) + '.quords.json', 'application/json');
  else if (action === 'new-project') {
    if (confirm('Créer un projet vide ? Sauvegarde le projet actuel en JSON si tu veux le garder. Tu peux aussi annuler cette action.')) change(() => { project = createProject(); activeSection(project).variants.A = []; project.name = 'Sans titre'; selectedClip = ''; loopStart = 0; loopEnd = 0; modal = ''; }, 'Nouveau projet');
  } else if (action === 'download-raw') {
    try { download(localStorage.getItem(STORAGE_KEY) ?? '', 'quords-sauvegarde-a-recuperer.json', 'application/json'); } catch { notify('Le navigateur bloque l’accès à son stockage.'); }
  } else if (action === 'allow-save' && confirm('Remplacer la sauvegarde locale par le projet actuellement ouvert ?')) { storageBlocked = false; save(); render(); }
});

app.addEventListener('change', async event => {
  const el = event.target as HTMLInputElement | HTMLSelectElement, value = el.value, n = Number(value), clip = currentClip();
  if (el instanceof HTMLInputElement && el.type === 'number' && (!Number.isFinite(n) || !el.validity.valid)) { notify('Choisis une valeur comprise entre ' + el.min + ' et ' + el.max + '.'); render(); return; }
  if (el.id === 'import-project' && el instanceof HTMLInputElement) {
    const file = el.files?.[0]; if (!file) return;
    if (file.size > 20 * 1024 * 1024) { notify('Ce fichier dépasse 20 Mo.'); return; }
    try {
      const imported = parseProject(await file.text());
      if (confirm('Ouvrir « ' + imported.name + ' » à la place du projet actuel ? Tu peux annuler ensuite.')) change(() => { project = imported; loopStart = 0; loopEnd = sectionBeats(activeClips(project)); selectedClip = ''; modal = ''; }, 'Projet importé');
    } catch { notify('Fichier invalide ou version non prise en charge. Le projet actuel est intact.'); }
  } else if (el.id === 'project-name' && value.trim()) change(() => { project.name = value.trim().slice(0, 100); });
  else if (el.dataset.sectionName && value.trim()) change(() => { project.sections.find(s => s.id === el.dataset.sectionName)!.name = value.trim().slice(0, 60); });
  else if (el.id === 'tonic' || el.id === 'mode') change(() => {
    if (el.id === 'tonic') project.tonic = n; else project.mode = value as ScaleMode;
    draft = { ...draft, tonic: project.tonic, mode: project.mode, source: 'scale', inversion: 0 }; paletteSource = 'scale';
  }, 'Palette mise à jour ; les accords déjà composés restent inchangés.');
  else if (el.id === 'notation') change(() => { project.notation = value as Project['notation']; });
  else if (el.id === 'draft-octave' || el.id === 'draft-inversion' || el.id === 'draft-spread') {
    if (el.id === 'draft-octave') draft.octave = n; else if (el.id === 'draft-inversion') draft.inversion = n; else draft.spread = (el as HTMLInputElement).checked;
    preview(); render();
  } else if (el.id === 'snap') { snap = n; render(); }
  else if (el.id === 'zoom') { zoom = n; render(); }
  else if (el.id === 'multi') { multi = (el as HTMLInputElement).checked; render(); }
  else if (el.id === 'advanced') { advanced = (el as HTMLInputElement).checked; render(); notify(advanced ? 'Hauteurs déverrouillées. Le décalage est conservé si tu changes d’accord.' : 'Hauteurs verrouillées. Les décalages déjà créés sont conservés.'); }
  else if (el.id === 'pattern-scope') { patternScope = value; }
  else if (el.id === 'loop-start' || el.id === 'loop-end') {
    stop();
    if (el.id === 'loop-start') loopStart = Math.min(n, loopEnd - .25); else loopEnd = Math.max(n, loopStart + .25);
    render();
  } else if (el.id === 'metronome' || el.id === 'metronome-main') { stop(); metronome = (el as HTMLInputElement).checked; render(); }
  else if (['bpm', 'meter', 'tone', 'volume', 'swing', 'humanize', 'chords-audible', 'bass-audible'].includes(el.id)) change(() => {
    if (el.id === 'bpm') project.bpm = n;
    if (el.id === 'meter') project.meter = value as Project['meter'];
    if (el.id === 'tone') { project.tone = value as Project['tone']; audio.tone = project.tone; }
    if (el.id === 'volume') { project.volume = n; audio.setVolume(n); }
    if (el.id === 'swing') project.swing = n;
    if (el.id === 'humanize') project.humanize = n;
    if (el.id === 'chords-audible') project.chordsMuted = !(el as HTMLInputElement).checked;
    if (el.id === 'bass-audible') project.bassMuted = !(el as HTMLInputElement).checked;
  });
  else if (clip && el.id === 'clip-beats') change(() => { resizeClip(clip, n); loopEnd = sectionBeats(activeClips(project)); });
  else if (clip && el.id === 'bass-octave') change(() => { setChord(clip, { ...clip.chord, bassOctave: n }); });
  else if (clip && el.id.startsWith('note-') && selectedNotes.size) change(() => {
    const notes = trackNotes(clip, track).filter(n => selectedNotes.has(n.id));
    if (el.id === 'note-at') moveNotes(clip, track, selectedNotes, n - notes[0].at);
    if (el.id === 'note-duration') resizeNotes(clip, track, selectedNotes, n - notes[0].duration, .01);
    if (el.id === 'note-velocity') for (const note of notes) note.velocity = n / 100;
    if (el.id === 'note-offset') for (const note of notes) note.offset = safeOffset(clip, track, note.voice, n);
  });
});

type Drag = { pointer: number; x: number; y: number; clip: Clip; before: Project; originals: RhythmNote[]; ids: Set<string>; resize: boolean; draw: boolean; moved: boolean; container: HTMLElement };
let drag: Drag | undefined;
const releases = new Map<number, () => void>();
app.addEventListener('pointerdown', event => {
  const target = event.target as HTMLElement, key = target.closest<HTMLElement>('[data-key]');
  if (key) {
    event.preventDefault(); audio.tone = project.tone; audio.setVolume(project.volume);
    releases.get(event.pointerId)?.(); releases.set(event.pointerId, audio.play(Number(key.dataset.key), undefined, 15));
    key.classList.add('pressed'); key.setPointerCapture(event.pointerId); return;
  }
  if (route() !== 'rythme' || event.button !== 0) return;
  const area = target.closest<HTMLElement>('#roll-area');
  if (!area || target.closest('.grid-chord')) return;
  const noteElement = target.closest<HTMLElement>('[data-note]'), rect = area.getBoundingClientRect();
  const beat = (event.clientX - rect.left) / zoom, midi = Number(area.dataset.max) - Math.floor((event.clientY - rect.top - Number(area.dataset.header)) / Number(area.dataset.row));
  if (event.clientY - rect.top < Number(area.dataset.header)) return;
  stop();
  let clip = noteElement ? activeClips(project).find(c => c.id === noteElement.dataset.clip) : undefined, start = 0;
  if (!clip && tool === 'draw') {
    for (const c of activeClips(project)) { if (beat >= start && beat < start + c.beats) { clip = c; break; } start += c.beats; }
  }
  if (!clip) { selectedNotes.clear(); render(); return; }
  if (selectedClip !== clip.id) selectedNotes.clear();
  selectedClip = clip.id;
  const before = clone(project);
  let drawing = false;
  if (noteElement) {
    const id = noteElement.dataset.note!;
    if (multi || event.shiftKey) {
      if (selectedNotes.has(id)) { selectedNotes.delete(id); render(); return; }
      selectedNotes.add(id);
    } else if (!selectedNotes.has(id)) selectedNotes = new Set([id]);
  } else {
    const pitches = track === 'bass' ? [12 * (clip.chord.bassOctave + 1) + chordInfo(clip.chord).root] : chordPitches(clip.chord);
    let voice = pitches.indexOf(midi), offset = 0;
    if (voice < 0 && !advanced) { notify('En mode rythme, dessine sur une hauteur de l’accord. Active « Hauteurs libres » pour sortir de ces notes.'); return; }
    if (voice < 0) { voice = pitches.reduce((best, p, i) => Math.abs(p - midi) < Math.abs(pitches[best] - midi) ? i : best, 0); offset = midi - pitches[voice]; }
    if (Math.abs(offset) > 48) { notify('Choisis une hauteur à moins de quatre octaves de cette voix.'); return; }
    const at = Math.max(0, Math.min(clip.beats - .01, snapBeat(beat - start, snap)));
    const note = { id: uid(), voice, at, duration: Math.min(snap, clip.beats - at), velocity: .78, offset };
    trackNotes(clip, track).push(note); selectedNotes = new Set([note.id]); drawing = true;
  }
  drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY, clip, before, originals: clone(trackNotes(clip, track)), ids: new Set(selectedNotes), resize: !!target.closest('[data-resize]'), draw: drawing, moved: drawing, container: app };
  event.preventDefault(); app.setPointerCapture(event.pointerId);
  // Keep the capture target stable; rebuild only the grid's content while dragging.
  refreshGrid();
});
function refreshGrid() {
  const scroll = document.querySelector<HTMLElement>('#roll-scroll');
  if (!scroll) return;
  const x = scroll.scrollLeft, y = scroll.scrollTop;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = gridMarkup(activeClips(project), { track, zoom, snap, selectedClip, selectedNotes, notation: project.notation, bar: barBeats(project.meter), advanced, editable: true });
  scroll.replaceWith(wrapper.firstElementChild!);
  const next = document.querySelector('#roll-scroll')!; next.scrollLeft = x; next.scrollTop = y;
}
app.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.pointer) return;
  const dx = snapBeat((event.clientX - drag.x) / zoom, snap), dy = advanced && !drag.resize && !drag.draw ? -Math.round((event.clientY - drag.y) / 21) : 0;
  if (!drag.moved && Math.abs(event.clientX - drag.x) < 4 && Math.abs(event.clientY - drag.y) < 5) return;
  drag.moved = true;
  if (track === 'bass') drag.clip.bass = clone(drag.originals); else drag.clip.notes = clone(drag.originals);
  if (drag.resize || drag.draw) resizeNotes(drag.clip, track, drag.ids, dx, Math.min(snap, .125));
  else moveNotes(drag.clip, track, drag.ids, dx, dy);
  refreshGrid();
});
function finishPointer(event: PointerEvent, cancel = false) {
  releases.get(event.pointerId)?.(); releases.delete(event.pointerId);
  document.querySelectorAll('.piano-key.pressed, .rail-key.pressed').forEach(el => el.classList.remove('pressed'));
  if (!drag || drag.pointer !== event.pointerId) return;
  const d = drag; drag = undefined;
  if (cancel) project = d.before;
  else if (d.moved) { history.push(d.before); save(); }
  render();
}
window.addEventListener('pointerup', event => finishPointer(event));
window.addEventListener('pointercancel', event => finishPointer(event, true));
window.addEventListener('blur', () => {
  const shouldRender = playing || !!drag;
  if (drag) { project = drag.before; drag = undefined; }
  if (playing) stop();
  for (const release of releases.values()) release();
  releases.clear();
  if (shouldRender) render();
});
window.addEventListener('hashchange', () => { modal = ''; render(); window.scrollTo({ top: 0 }); });
window.addEventListener('keydown', event => {
  if (event.key === 'Escape') { if (drag) { project = drag.before; drag = undefined; } modal = ''; stop(); render(); return; }
  if (modal && event.key === 'Tab') {
    const els = [...document.querySelectorAll<HTMLElement>('.modal button:not(:disabled), .modal input, .modal select, .modal [tabindex="0"]')];
    const first = els[0], last = els.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    return;
  }
  if ((event.target as HTMLElement).matches('input,select,textarea') || modal) return;
  const command = event.ctrlKey || event.metaKey;
  if (event.code === 'Space' && !(event.target as HTMLElement).closest('[data-note]')) { event.preventDefault(); play(route() === 'arrangement' ? 'song' : 'section'); }
  if (command && event.key.toLowerCase() === 'z') { event.preventDefault(); stop(); project = event.shiftKey ? history.redo(project) : history.undo(project); syncSelection(); save(); render(); }
  if (command && event.key.toLowerCase() === 'y') { event.preventDefault(); stop(); project = history.redo(project); syncSelection(); save(); render(); }
  if (route() === 'rythme') {
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); deleteNotes(); }
    if (command && event.key.toLowerCase() === 'a') { event.preventDefault(); const c = currentClip(); if (c) selectedNotes = new Set(trackNotes(c, track).map(n => n.id)); render(); }
    if (command && event.key.toLowerCase() === 'c') { event.preventDefault(); copyNotes(); }
    if (command && event.key.toLowerCase() === 'v') { event.preventDefault(); document.querySelector<HTMLButtonElement>('[data-action="paste-notes"]')?.click(); }
  }
});
audio.addEventListener('status', () => { if (audio.status.includes('indisponible') || audio.status.includes('Impossible')) notify(audio.status); });
render();
if (loaded.error) notify(loaded.error);
else save();
