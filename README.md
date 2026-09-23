# Quords

**Application : [im2lo.github.io/Quords](https://im2lo.github.io/Quords/)**

Un atelier harmonique web indépendant pour composer, dessiner un rythme, comprendre les accords et exporter ses idées en MIDI. Interface sombre, responsive et utilisable au tactile. Aucun compte, serveur applicatif, sample audio ni service payant.

## Composer

- Choisir une fondamentale, une gamme et la notation Do–Ré–Mi ou C–D–E.
- Les sept cartes de degrés servent à **préécouter**, sans ajouter un accord.
- Personnaliser sur le pupitre : triade, septième, extensions diatoniques jusqu’à la 13e, sus2, sus4, add9, sixte, octave, renversement et voicing ouvert « drop 2 ».
- Cliquer sur **Ajouter à la suite**, ou sur **Remplacer l’accord actif** pour conserver son rythme.
- Explorer les emprunts au mode parallèle et les dominantes secondaires. Les notes hors gamme sont explicitement signalées.
- Dupliquer, supprimer, réordonner ou rapprocher automatiquement les renversements avec **Lier les voix**.
- Jouer le clavier Do3–Do6 (MIDI 48–84), défilant sur téléphone, sans noms imprimés sur ses touches.

Gammes disponibles : majeure/ionienne, mineure naturelle/éolienne, mineure harmonique, mineure mélodique ascendante, dorienne, phrygienne, lydienne, mixolydienne et locrienne. La mineure mélodique utilise sa forme ascendante également à la descente, comme souvent en jazz ; l’explication pédagogique distingue la convention classique.

Changer la gamme de la palette **ne transpose pas les accords existants** : un projet peut ainsi combiner plusieurs tonalités et modes. Chaque accord conserve sa propre origine harmonique.

## Éditer le rythme

La grille affiche les blocs d’accords et les notes alignés sur le même temps. L’édition est **rythmique par défaut** : chaque note est rattachée à une voix de l’accord, pas à une hauteur figée. Changer d’accord ou de renversement ne détruit donc pas le rythme.

- Sélectionner et déplacer une note ; tirer son bord droit pour changer sa durée.
- Utiliser **Dessiner** pour ajouter une note sur une hauteur de l’accord.
- Activer **Multisélection**, ou Maj + clic sur ordinateur, pour éditer plusieurs notes de l’accord actif.
- Régler départ, durée et vélocité dans les champs sous la grille : alternative précise aux gestes tactiles.
- Diviser, répéter, copier/coller ou supprimer. Coller place les notes au début de l’accord actif.
- Choisir une grille de la noire à la triple croche, ou les triolets.
- Appliquer une nappe, une pulsation, des croches, des contretemps, un arpège ou un motif aéré ; sauvegarder ses propres motifs.
- Appliquer un motif à l’accord, à tous les accords touchant la zone de boucle, ou à la section complète.
- Activer **Hauteurs libres** pour modifier aussi la hauteur (décalage relatif à la voix). Reverrouiller les hauteurs conserve les décalages déjà créés.
- La basse possède ses propres notes, motifs, vélocités et octave. Par défaut, elle joue la fondamentale.
- Swing et humanisation sont optionnels et à zéro au départ : les accords sont alors parfaitement simultanés.

Le temps est exprimé en **noires**, quelle que soit la mesure. Une mesure 4/4 dure 4 temps, une mesure 3/4 ou 6/8 dure 3 temps. Le métronome de 6/8 marque les deux noires pointées.

Les notes restent dans leur bloc d’accord. Allonger/raccourcir le bloc met son rythme à l’échelle. Les notes identiques qui se chevauchent sur une même piste sont fusionnées pour éviter des coupures MIDI intempestives.

## Arrangement, variantes et pédagogie

Créer autant de sections et d’accords que nécessaire, sans plafond artificiel de longueur (les ressources du navigateur restent la limite pratique). Nommer, dupliquer et réordonner les sections. Chaque section possède une variante **A** et **B** indépendantes ; l’arrangement lit et exporte seulement la variante active.

La page **Comprendre** présente les intervalles T/S, les degrés, les notes de chaque triade, les notes communes entre accords et la logique des renversements. Les propositions de degrés sont des pistes à écouter, pas une notation automatique de la qualité musicale.

## Sauvegarde et export

- Sauvegarde automatique dans `localStorage`, clé `quords.project.v1`, distincte de l’application Piano Harmonie.
- Export/import JSON complet via **Projet** : sections, variantes, motifs personnels, harmonie et rythme.
- Validation des données importées et de la sauvegarde locale. Une sauvegarde illisible n’est pas écrasée automatiquement ; le menu Projet permet de la récupérer.
- Annuler/rétablir les 80 dernières modifications pendant la session.
- Export MIDI standard multipiste : accords sur le canal 1, basse sur le canal 2 ; notes, durées, vélocités, tempo et signature rythmique.
- Exporter tout l’arrangement ou la section active, avec les deux pistes ou une seule.
- La mise en sourdine sert à l’écoute ; une piste explicitement choisie est toujours exportée.
- Le MIDI utilise le même générateur d’événements que la lecture, y compris swing et humanisation déterministe. Il **ne contient pas le son** : attribuer un instrument dans le logiciel musical de destination.

La sauvegarde locale appartient à un navigateur et à une origine web, pas à un compte : elle ne se synchronise pas entre appareils. Exporter régulièrement le JSON, notamment avant d’effacer les données du navigateur. Ouvrir le JSON sur un autre appareil permet de transférer le travail.

## Audio et raccourcis

Synthèse Web Audio par oscillateurs, issue du moteur de Piano Harmonie : sons Doux, Clair et Orgue. Contexte à latence interactive, attaques de 2 ms et un horodatage commun à toutes les voix d’un accord. Les événements sont programmés sur l’horloge audio avec une petite anticipation, indépendamment du rendu de la page.

Un premier geste est nécessaire pour activer l’audio dans certains navigateurs. L’écoute est interrompue quand la fenêtre perd le focus, pour éviter une lecture oubliée. La latence physique dépend toujours du navigateur, de l’appareil et de la sortie sonore ; le Bluetooth peut ajouter un délai important. Préférer les haut-parleurs ou un casque filaire pour jouer.

- Espace : lire / arrêter, hors champs de saisie.
- Ctrl/Cmd Z : annuler ; Ctrl/Cmd Maj Z ou Ctrl Y : rétablir.
- Dans Rythme : Ctrl/Cmd A pour toutes les notes de l’accord, C/V pour copier/coller, Suppr pour supprimer.
- Échap : fermer une fenêtre ou annuler un geste en cours.

Application web autonome, **pas un plug-in VST/AU**, ni une copie de l’interface ou des assets de Captain Chords. Pas d’import MIDI, d’enregistrement audio, d’hébergement de plug-ins ou de synchronisation cloud dans cette version. L’export MIDI est destiné au passage vers un DAW.

## Développement

Node.js **24** et npm. Tout le code et le verrouillage des dépendances sont dans ce dépôt.

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

L’application locale est accessible sous `/Quords/`, comme la version publiée. Les polices sont embarquées via Fontsource, pas téléchargées depuis Google au chargement.

Organisation :

- `src/music.ts` : gammes et orthographe musicale, repris du projet Piano Harmonie.
- `src/harmony.ts` : accords enrichis, registres, emprunts, renversements.
- `src/model.ts` : projet, motifs, événements, validation, historique.
- `src/editor.ts` : opérations de grille indépendantes du rendu.
- `src/audio.ts` : synthèse directe et horloge de lecture.
- `src/midi.ts` : export SMF avec `@tonejs/midi`.
- `src/grid.ts`, `src/main.ts`, `src/style.css` : grille, interface responsive et interactions.
- `src/*.test.ts` : tests des 108 gammes, éditions, imports, exports relus, simultanéité et arrêt audio.

## GitHub Pages

Le workflow `.github/workflows/pages.yml` installe les dépendances avec `npm ci`, exécute les tests et construit le site. Il déploie sur chaque push vers `main` **uniquement après succès**. Une pull request exécute les vérifications mais ne publie pas.

Les réglages du dépôt utilisent **GitHub Actions** comme source Pages. Déploiement avec les actions officielles `configure-pages`, `upload-pages-artifact` et `deploy-pages`.

Vite utilise `base: '/Quords/'`. Les pages internes utilisent des fragments (`#/composer`, `#/rythme`, `#/arrangement`, `#/comprendre`) pour permettre le rafraîchissement direct sur GitHub Pages sans erreur 404.

Les bibliothèques et polices tierces conservent leurs licences respectives dans leurs paquets : @tonejs/midi (MIT), Zod (MIT), DM Sans et Space Grotesk (SIL OFL). Aucun sample ni asset de Captain Chords n’est distribué.
