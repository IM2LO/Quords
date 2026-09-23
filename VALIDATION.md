# Validation de livraison

## Automatisée

- Installation npm : réussie, verrouillage inclus dans le dépôt.
- Serveur Vite local : démarrage réussi sous /Quords/.
- TypeScript et build de production : réussis.
- 38 tests : harmonie, gammes, édition rythmique, validation des projets, sauvegarde, MIDI relu et synchronisation audio.
- Export MIDI : contrôle des hauteurs, ticks, durées, tempo, mesure, pistes et variante active par réimportation des octets.
- Audio : tests d’horodatage commun, anticipation, boucle, arrêt et annulation pendant le déverrouillage.

## Interface locale vérifiée

- Bureau 1440 × 1000 ; mobile 390 × 844 et écran étroit 320 × 760.
- Palette, navigation, préécoute sans ajout et ajout explicite d’accords.
- Degrés de La mineure harmonique, changement de fondamentale et de mode.
- Application des motifs aux accords et à la basse indépendamment.
- Sélection de notes et saisie précise d’une durée.
- Sélection multiple, division et annulation.
- Démarrage/arrêt de la lecture avec compteur en mouvement, sans erreur console observée.
- Copie de variante A vers B, sélection de B et duplication de section.
- Persistance du nombre d’accords après rechargement.
- Ajustements anti-débordement à 320 px.

## Limites de ces contrôles

Le test interactif supplémentaire de glisser-déposer a été interrompu par une limite du service d’autorisation automatique, avant exécution. Les opérations de déplacement et redimensionnement sont couvertes par les tests unitaires, mais ce geste reste à vérifier manuellement sur de vrais appareils tactiles.

Les tailles mobiles sont des vues responsive de navigateur : elles ne remplacent pas une campagne sur iOS/Safari et Android/Chrome physiques. La latence acoustique réelle, notamment en Bluetooth, ne peut pas être déduite des tests d’horodatage.

## Déploiement

GitHub Pages est activé en mode GitHub Actions. Le premier workflow de publication a réussi :

https://github.com/IM2LO/Quords/actions/runs/35888512395

Les dernières corrections déclenchent le même pipeline obligatoire (installation, tests, build, déploiement). Le statut du dernier run est consultable ici :

https://github.com/IM2LO/Quords/actions

Application :

https://im2lo.github.io/Quords/
