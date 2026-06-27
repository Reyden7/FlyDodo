# FlyDodo!

Prototype mobile construit avec React, TypeScript, Phaser et Capacitor.

## Lancer le projet

Prérequis : Node.js 22 ou supérieur.

```bash
npm install
npm run dev
```

## Ouvrir Android Studio

```bash
npm run android:open
```

La commande compile le jeu, synchronise les fichiers avec Capacitor puis ouvre le projet Android.

## Pilotage actuel

- Maintenir la flèche droite, la touche D ou la moitié droite de l'écran : l'aile gauche bat plus vite, le Dodo s'incline et tourne vers la droite.
- Maintenir la flèche gauche, la touche A ou la moitié gauche de l'écran : l'aile droite bat plus vite, le Dodo s'incline et tourne vers la gauche.
- Sans commande, les deux ailes retrouvent le même rythme et le Dodo se redresse progressivement.
- La vitesse et l'inertie influencent la trajectoire : une forte inclinaison transforme la montée en déplacement latéral puis en chute.

## Version actuelle

- Dodo provisoire vu de face.
- Battement indépendant des ailes.
- Pilotage par inclinaison et inertie.
- Gravité et poussée de vol.
- Caméra qui monte sans redescendre.
- Dodo placé dans la partie basse de l'écran.
- Altitude actuelle, record, vitesse et compteur de pastèques.
- Délai de 5 secondes lorsque le Dodo tombe sous l'écran.
- Sauvegarde du record avec Capacitor Preferences.
