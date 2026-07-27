import type { AppLanguage } from './i18n';

type TalentCopy = {
  title: string;
  description: string;
};

const talentCopy: Record<
  Exclude<AppLanguage, 'fr'>,
  Record<string, TalentCopy>
> = {
  en: {
    'control.lift': { title: 'Lift', description: 'Slows the Dodo’s free fall when the controls are released.' },
    'control.rotation': { title: 'Rotation', description: 'Increases the rotation speed produced by each side flap.' },
    'control.gyroscope': { title: 'Gyroscope', description: 'Speeds up the Dodo’s natural return to a stable posture.' },
    'control.wing': { title: 'Wing', description: 'Increases the vertical power of a wing flap.' },
    'control.master': { title: 'Master', description: 'Unlocks the best possible control for every skill.' },
    'endurance.heart': { title: 'Heart', description: 'Adds one life so the Dodo can survive longer.' },
    'endurance.regeneration': { title: 'Regeneration', description: 'Restores one life after 7 seconds without taking damage.' },
    'endurance.shield': { title: 'Shield', description: 'Adds a shield that blocks mosquitoes in the Forest level.' },
    'endurance.recharge': { title: 'Recharge', description: 'Repairs the shield 10 seconds after it is destroyed.' },
    'endurance.phoenix': { title: 'Phoenix', description: 'Once per run, the Dodo revives where it died with all lives and its shield.' },
    'blue.watermelonMagnet': { title: 'Watermelon magnet', description: 'Increases the attraction radius of the watermelon magnet.' },
    'blue.fruitMultiplier': { title: 'Fruit multiplier', description: 'Adds bonus watermelons to every watermelon collected.' },
    'blue.perch': { title: 'Perch', description: 'Lets the Dodo land on Forest branches when arriving from above.' },
    'blue.fruitDetector': { title: 'Fruit detector', description: 'Adds a button pointing toward the next watermelon.' },
    'blue.chainReaction': { title: 'Chain reaction', description: 'Doubles the next watermelons after two consecutive collections without a miss.' },
    'blue.powerTakeoff': { title: 'Power takeoff', description: 'Doubles the first flap’s power when taking off from a branch.' },
    'blue.feast': { title: 'Feast', description: 'Pulls every visible watermelon directly toward the Dodo.' },
  },
  es: {
    'control.lift': { title: 'Sustentación', description: 'Ralentiza la caída libre del Dodo al soltar los controles.' },
    'control.rotation': { title: 'Rotación', description: 'Aumenta la rotación producida por cada aleteo lateral.' },
    'control.gyroscope': { title: 'Giroscopio', description: 'Acelera el regreso natural del Dodo a una postura estable.' },
    'control.wing': { title: 'Ala', description: 'Aumenta la potencia vertical de cada aleteo.' },
    'control.master': { title: 'Maestro', description: 'Desbloquea el mejor control posible para todas las habilidades.' },
    'endurance.heart': { title: 'Corazón', description: 'Añade una vida para que el Dodo sobreviva más tiempo.' },
    'endurance.regeneration': { title: 'Regeneración', description: 'Recupera una vida tras 7 segundos sin recibir daño.' },
    'endurance.shield': { title: 'Escudo', description: 'Añade un escudo que bloquea los mosquitos del Bosque.' },
    'endurance.recharge': { title: 'Recarga', description: 'Repara el escudo 10 segundos después de destruirse.' },
    'endurance.phoenix': { title: 'Fénix', description: 'Una vez por partida, el Dodo revive donde murió con todas sus vidas y su escudo.' },
    'blue.watermelonMagnet': { title: 'Imán de sandías', description: 'Aumenta el radio de atracción del imán de sandías.' },
    'blue.fruitMultiplier': { title: 'Multiplicador frutal', description: 'Añade sandías extra a cada sandía recogida.' },
    'blue.perch': { title: 'Percha', description: 'Permite aterrizar sobre las ramas del Bosque desde arriba.' },
    'blue.fruitDetector': { title: 'Detector de fruta', description: 'Añade un botón que señala la siguiente sandía.' },
    'blue.chainReaction': { title: 'Reacción en cadena', description: 'Duplica las próximas sandías tras dos recogidas seguidas sin fallar.' },
    'blue.powerTakeoff': { title: 'Despegue potente', description: 'Duplica la potencia del primer aleteo al despegar de una rama.' },
    'blue.feast': { title: 'Festín', description: 'Atrae todas las sandías visibles directamente hacia el Dodo.' },
  },
  de: {
    'control.lift': { title: 'Auftrieb', description: 'Verlangsamt den freien Fall, wenn die Steuerung losgelassen wird.' },
    'control.rotation': { title: 'Drehung', description: 'Erhöht die Drehgeschwindigkeit jedes seitlichen Flügelschlags.' },
    'control.gyroscope': { title: 'Gyroskop', description: 'Bringt den Dodo schneller in eine stabile Haltung zurück.' },
    'control.wing': { title: 'Flügel', description: 'Erhöht die vertikale Kraft eines Flügelschlags.' },
    'control.master': { title: 'Meister', description: 'Schaltet die bestmögliche Kontrolle aller Fähigkeiten frei.' },
    'endurance.heart': { title: 'Herz', description: 'Fügt ein Leben hinzu, damit der Dodo länger überlebt.' },
    'endurance.regeneration': { title: 'Regeneration', description: 'Stellt nach 7 Sekunden ohne Schaden ein Leben wieder her.' },
    'endurance.shield': { title: 'Schild', description: 'Fügt einen Schild gegen Mücken im Wald hinzu.' },
    'endurance.recharge': { title: 'Aufladung', description: 'Repariert den Schild 10 Sekunden nach seiner Zerstörung.' },
    'endurance.phoenix': { title: 'Phönix', description: 'Einmal pro Runde wird der Dodo am Todesort mit allen Leben und Schild wiederbelebt.' },
    'blue.watermelonMagnet': { title: 'Wassermelonenmagnet', description: 'Erhöht den Anziehungsradius des Wassermelonenmagneten.' },
    'blue.fruitMultiplier': { title: 'Fruchtmultiplikator', description: 'Fügt jeder eingesammelten Wassermelone Bonusfrüchte hinzu.' },
    'blue.perch': { title: 'Landeplatz', description: 'Ermöglicht Landungen von oben auf Ästen im Wald.' },
    'blue.fruitDetector': { title: 'Fruchtdetektor', description: 'Fügt eine Taste hinzu, die zur nächsten Wassermelone zeigt.' },
    'blue.chainReaction': { title: 'Kettenreaktion', description: 'Verdoppelt kommende Wassermelonen nach zwei fehlerfreien Sammlungen.' },
    'blue.powerTakeoff': { title: 'Kraftstart', description: 'Verdoppelt den ersten Flügelschlag beim Start von einem Ast.' },
    'blue.feast': { title: 'Festmahl', description: 'Zieht alle sichtbaren Wassermelonen direkt zum Dodo.' },
  },
};

const shopItemTitles: Record<
  Exclude<AppLanguage, 'fr'>,
  Record<string, string>
> = {
  en: {
    'hat-straw': 'Straw hat', 'hat-magic-blue': 'Blue wizard hat',
    'hat-magic-green': 'Green wizard hat', 'hat-samurai': 'Samurai helmet',
    'hat-mand': 'Mandalorian helmet', 'hat-space-rebel': 'Rebel helmet',
    'hat-space': 'Space helmet', 'hat-pirate': 'Pirate hat',
    'glasses-hp': 'Wizard glasses', 'glasses-steam': 'Steampunk glasses',
    'glasses-rpo': 'Neon visor', 'glasses-rpov': 'Purple visor',
    'glasses-super-hero': 'Superhero glasses', 'scarf-red': 'Red scarf',
    'scarf-green': 'Green scarf', 'scarf-wizard': 'Wizard scarf',
    'scarf-ice': 'Frost scarf', 'shoes-basket-adventure': 'Adventure sneakers',
    'shoes-basket-red': 'Red sneakers', 'shoes-basket-night': 'Night sneakers',
    'shoes-space': 'Space boots', 'outfit-corsaire': 'Corsair outfit',
    'outfit-explorateur': 'Explorer outfit', 'outfit-paladin': 'Paladin outfit',
    'outfit-magicien': 'Wizard outfit', 'outfit-pretre': 'Priest outfit',
    'outfit-pirate': 'Pirate outfit', 'outfit-explo2': 'Captain outfit',
  },
  es: {
    'hat-straw': 'Sombrero de paja', 'hat-magic-blue': 'Sombrero de mago azul',
    'hat-magic-green': 'Sombrero de mago verde', 'hat-samurai': 'Casco samurái',
    'hat-mand': 'Casco mandaloriano', 'hat-space-rebel': 'Casco rebelde',
    'hat-space': 'Casco espacial', 'hat-pirate': 'Sombrero pirata',
    'glasses-hp': 'Gafas de mago', 'glasses-steam': 'Gafas steampunk',
    'glasses-rpo': 'Visor neón', 'glasses-rpov': 'Visor violeta',
    'glasses-super-hero': 'Gafas de superhéroe', 'scarf-red': 'Bufanda roja',
    'scarf-green': 'Bufanda verde', 'scarf-wizard': 'Bufanda de mago',
    'scarf-ice': 'Bufanda helada', 'shoes-basket-adventure': 'Zapatillas de aventura',
    'shoes-basket-red': 'Zapatillas rojas', 'shoes-basket-night': 'Zapatillas nocturnas',
    'shoes-space': 'Botas espaciales', 'outfit-corsaire': 'Traje de corsario',
    'outfit-explorateur': 'Traje de explorador', 'outfit-paladin': 'Traje de paladín',
    'outfit-magicien': 'Traje de mago', 'outfit-pretre': 'Traje de sacerdote',
    'outfit-pirate': 'Traje de pirata', 'outfit-explo2': 'Traje de capitán',
  },
  de: {
    'hat-straw': 'Strohhut', 'hat-magic-blue': 'Blauer Magierhut',
    'hat-magic-green': 'Grüner Magierhut', 'hat-samurai': 'Samuraihelm',
    'hat-mand': 'Mandalorianer-Helm', 'hat-space-rebel': 'Rebellenhelm',
    'hat-space': 'Weltraumhelm', 'hat-pirate': 'Piratenhut',
    'glasses-hp': 'Zaubererbrille', 'glasses-steam': 'Steampunk-Brille',
    'glasses-rpo': 'Neonvisier', 'glasses-rpov': 'Violettes Visier',
    'glasses-super-hero': 'Superheldenbrille', 'scarf-red': 'Roter Schal',
    'scarf-green': 'Grüner Schal', 'scarf-wizard': 'Zaubererschal',
    'scarf-ice': 'Frostschal', 'shoes-basket-adventure': 'Abenteuer-Sneaker',
    'shoes-basket-red': 'Rote Sneaker', 'shoes-basket-night': 'Nacht-Sneaker',
    'shoes-space': 'Weltraumstiefel', 'outfit-corsaire': 'Korsaren-Outfit',
    'outfit-explorateur': 'Entdecker-Outfit', 'outfit-paladin': 'Paladin-Outfit',
    'outfit-magicien': 'Magier-Outfit', 'outfit-pretre': 'Priester-Outfit',
    'outfit-pirate': 'Piraten-Outfit', 'outfit-explo2': 'Kapitäns-Outfit',
  },
};

export function localizeTalent(
  tree: 'control' | 'endurance' | 'blue',
  id: string,
  fallback: TalentCopy,
  language: AppLanguage,
): TalentCopy {
  return language === 'fr'
    ? fallback
    : talentCopy[language][`${tree}.${id}`] ?? fallback;
}

export function localizeShopItemTitle(
  id: string,
  fallback: string,
  language: AppLanguage,
): string {
  return language === 'fr' ? fallback : shopItemTitles[language][id] ?? fallback;
}
