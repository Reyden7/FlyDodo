export type CosmeticCategory =
  | 'hat'
  | 'glasses'
  | 'scarf'
  | 'shoes'
  | 'outfit';

export type ShopFilterCategory = 'all' | CosmeticCategory;

export type CosmeticPose = 'ground' | 'flight';

export type CosmeticOffsetSpace = 'dodo' | 'world';

export type ShopItemTone =
  | 'gold'
  | 'berry'
  | 'ocean'
  | 'leaf'
  | 'sunset'
  | 'violet';

export interface CosmeticTransform {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
  offsetSpace?: CosmeticOffsetSpace;
  rotationDegrees: number;
  originX: number;
  originY: number;
  depth: number;
  fallbackFontSize: number;
}

export interface ShopItem {
  id: string;
  title: string;
  category: CosmeticCategory;
  price: number;
  icon: string;
  tone: ShopItemTone;

  /**
   * Facultatif. En l'absence de valeur, le chemin est calculé automatiquement :
   * /assets/Accessoires/<dossier de catégorie>/<id>.png
   */
  imagePath?: string;
  imagePaths?: Partial<Record<CosmeticPose, string>>;
}

export const COSMETIC_CATEGORIES: readonly CosmeticCategory[] = [
  'outfit',
  'shoes',
  'scarf',
  'glasses',
  'hat',
];

/**
 * Ces noms doivent correspondre exactement aux dossiers présents dans public.
 * Les majuscules, espaces et accents comptent sur Android.
 */
export const COSMETIC_CATEGORY_FOLDERS: Readonly<
  Record<CosmeticCategory, string>
> = {
  hat: 'Chapeaux',
  glasses: 'Lunettes',
  scarf: 'Écharpes',
  shoes: 'Chaussures',
  outfit: 'Tenues Complètes',
};

export const SHOP_CATEGORY_OPTIONS: ReadonlyArray<{
  value: ShopFilterCategory;
  label: string;
}> = [
  { value: 'all', label: 'Tout' },
  { value: 'hat', label: 'Chapeaux' },
  { value: 'glasses', label: 'Lunettes' },
  { value: 'scarf', label: 'Écharpes' },
  { value: 'shoes', label: 'Chaussures' },
  { value: 'outfit', label: 'Tenues complètes' },
];

const DEFAULT_COSMETIC_TRANSFORMS: Readonly<
  Record<CosmeticCategory, Record<CosmeticPose, CosmeticTransform>>
> = {
  hat: {
    ground: {
      scaleX: 0.078,
      scaleY: 0.078,
      offsetX: 0,
      offsetY: -70,
      rotationDegrees: 0,
      originX: 0.5,
      originY: 0.5,
      depth: 15,
      fallbackFontSize: 48,
    },
    flight: {
      scaleX: 0.082,
      scaleY: 0.082,
      offsetX: 0,
      offsetY: -75,
      offsetSpace: 'dodo',
      rotationDegrees: 0,
      originX: 0.5,
      originY: 0.5,
      depth: 15,
      fallbackFontSize: 48,
    },
  },
  glasses: {
    ground: {
      scaleX: 0.061,
      scaleY: 0.061,
      offsetX: 0,
      offsetY: -66,
      rotationDegrees: 0,
      originX: 0.5,
      originY: 0.5,
      depth: 16,
      fallbackFontSize: 38,
    },
    flight: {
      scaleX: 0.061,
      scaleY: 0.061,
      offsetX: 0,
      offsetY: -72,
      offsetSpace: 'dodo',
      rotationDegrees: 0,
      originX: 0.5,
      originY: 0.5,
      depth: 16,
      fallbackFontSize: 38,
    },
  },
  scarf: {
    ground: {
      scaleX: 0.068,
      scaleY: 0.068,
      offsetX: 0,
      offsetY: -48,
      rotationDegrees: 0,
      originX: 0.5,
      originY: 0.5,
      depth: 13,
      fallbackFontSize: 40,
    },
    flight: {
      scaleX: 0.071,
      scaleY: 0.071,
      offsetX: 0,
      offsetY: -56,
      offsetSpace: 'world',
      rotationDegrees: 0,
      originX: 0.5,
      originY: 0.5,
      depth: 13,
      fallbackFontSize: 40,
    },
  },
  shoes: {
    ground: {
      scaleX: 0.070,
      scaleY: 0.070,
      offsetX: 0,
      offsetY: -4,
      rotationDegrees: 0,
      originX: 0.5,
      originY: 0.5,
      depth: 9,
      fallbackFontSize: 34,
    },
    flight: {
      scaleX: 0.073,
      scaleY: 0.073,
      offsetX: 0,
      offsetY: -10,
      offsetSpace: 'dodo',
      rotationDegrees: 0,
      originX: 0.5,
      originY: 0.5,
      depth: 9,
      fallbackFontSize: 34,
    },
  },
  outfit: {
    ground: {
      scaleX: 0.118,
      scaleY: 0.118,
      offsetX: 0,
      offsetY: -30,
      rotationDegrees: 0,
      originX: 0.5,
      originY: 0.5,
      depth: 11,
      fallbackFontSize: 48,
    },
    flight: {
      scaleX: 0.122,
      scaleY: 0.122,
      offsetX: 0,
      offsetY: -30,
      offsetSpace: 'dodo',
      rotationDegrees: 0,
      originX: 0.5,
      originY: 0.5,
      depth: 11,
      fallbackFontSize: 48,
    },
  },
};

export function getShopItemImagePath(
  item: ShopItem,
  pose: CosmeticPose = 'ground',
): string {
  const poseImagePath = item.imagePaths?.[pose];

  if (poseImagePath) {
    return poseImagePath;
  }

  if (item.imagePath) {
    return item.imagePath;
  }

  const folder = COSMETIC_CATEGORY_FOLDERS[item.category];
  return `/assets/Accessoires/${folder}/${item.id}.png`;
}

export function getShopItemTextureKey(
  item: ShopItem,
  pose: CosmeticPose = 'ground',
): string {
  return `cosmetic-${item.category}-${item.id}-${pose}`;
}

export function getShopItemById(itemId: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === itemId);
}

export function getCosmeticTransform(
  item: ShopItem,
  pose: CosmeticPose,
): CosmeticTransform {
  return DEFAULT_COSMETIC_TRANSFORMS[item.category][pose];
}

export const SHOP_ITEMS: readonly ShopItem[] = [
  {
    id: 'hat-straw',
    title: 'Chapeau de paille',
    category: 'hat',
    price: 15,
    icon: '👒',
    tone: 'gold',
  },
  {
    id: 'hat-magic-blue',
    title: 'Chapeau mage bleu',
    category: 'hat',
    price: 55,
    icon: 'hat',
    tone: 'violet',
    imagePath: '/assets/Accessoires/Chapeaux/hat-magicB.png',
  },
  {
    id: 'hat-magic-green',
    title: 'Chapeau mage vert',
    category: 'hat',
    price: 55,
    icon: 'hat',
    tone: 'leaf',
    imagePath: '/assets/Accessoires/Chapeaux/hat-magicV.png',
  },
  {
    id: 'hat-samurai',
    title: 'Casque samourai',
    category: 'hat',
    price: 70,
    icon: 'hat',
    tone: 'gold',
    imagePath:
      '/assets/Accessoires/Chapeaux/ChatGPT%20Image%208%20juil.%202026,%2010_50_19%20(5).png',
  },
  {
    id: 'hat-mand',
    title: 'Casque mandalorien',
    category: 'hat',
    price: 65,
    icon: 'hat',
    tone: 'leaf',
    imagePath: '/assets/Accessoires/Chapeaux/hat-Mand.png',
  },
  {
    id: 'hat-space-rebel',
    title: 'Casque rebelle',
    category: 'hat',
    price: 60,
    icon: 'hat',
    tone: 'gold',
    imagePath: '/assets/Accessoires/Chapeaux/hat-spaceSW.png',
  },
  {
    id: 'hat-space',
    title: 'Casque spatial',
    category: 'hat',
    price: 60,
    icon: 'hat',
    tone: 'ocean',
    imagePath: '/assets/Accessoires/Chapeaux/hat-space.png',
  },
  {
    id: 'hat-pirate',
    title: 'Chapeau pirate',
    category: 'hat',
    price: 50,
    icon: 'hat',
    tone: 'sunset',
    imagePath: '/assets/Accessoires/Chapeaux/hat-pirate.png',
  },
  {
    id: 'glasses-round',
    title: 'Lunettes rondes',
    category: 'glasses',
    price: 20,
    icon: '👓',
    tone: 'ocean',
  },
  {
    id: 'glasses-sun',
    title: 'Lunettes soleil',
    category: 'glasses',
    price: 35,
    icon: '🕶️',
    tone: 'violet',
  },
  {
    id: 'glasses-super-hero',
    title: 'Lunettes super-heros',
    category: 'glasses',
    price: 10,
    icon: 'glasses',
    tone: 'ocean',
    imagePath: '/assets/Accessoires/Lunettes/GlassesSuperHero.png',
  },
  {
    id: 'scarf-red',
    title: 'Écharpe rouge',
    category: 'scarf',
    price: 25,
    icon: '🧣',
    tone: 'berry',
  },
  {
    id: 'scarf-pilot',
    title: 'Écharpe aviateur',
    category: 'scarf',
    price: 40,
    icon: '🎗️',
    tone: 'gold',
  },
  {
    id: 'shoes-boots',
    title: 'Bottes aventure',
    category: 'shoes',
    price: 30,
    icon: '🥾',
    tone: 'leaf',
  },
  {
    id: 'shoes-fast',
    title: 'Baskets rapides',
    category: 'shoes',
    price: 50,
    icon: '👟',
    tone: 'ocean',
  },
  {
    id: 'shoes-space',
    title: 'Bottes spatiales',
    category: 'shoes',
    price: 10,
    icon: 'shoes',
    tone: 'ocean',
    imagePaths: {
      ground: '/assets/Accessoires/Chaussures/shoes-space-sol.png',
      flight: '/assets/Accessoires/Chaussures/shoes-space-vole.png',
    },
  },
  {
    id: 'outfit-pilot',
    title: 'Tenue aviateur',
    category: 'outfit',
    price: 80,
    icon: '🧥',
    tone: 'sunset',
  },
  {
    id: 'outfit-jungle',
    title: 'Tenue explorateur',
    category: 'outfit',
    price: 100,
    icon: '🦺',
    tone: 'leaf',
  },
];
