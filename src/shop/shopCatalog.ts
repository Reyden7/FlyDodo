export type CosmeticCategory =
  | 'hat'
  | 'glasses'
  | 'scarf'
  | 'shoes'
  | 'outfit';

export type ShopFilterCategory = 'all' | CosmeticCategory;

export type CosmeticPose = 'ground' | 'flight';

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
  rotationDegrees: number;
  originX: number;
  originY: number;
  depth: number;
  fallbackFontSize: number;
}

export interface CosmeticTransformOverride
  extends Partial<CosmeticTransform> {}

export interface CosmeticVisualOverride {
  ground?: CosmeticTransformOverride;
  flight?: CosmeticTransformOverride;
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

  /**
   * Facultatif. Permet de corriger la position ou la taille d'un accessoire
   * particulier sans modifier le gestionnaire générique.
   */
  visual?: CosmeticVisualOverride;
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
      offsetY: -88,
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
      offsetY: -103,
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
      depth: 14,
      fallbackFontSize: 38,
    },
    flight: {
      scaleX: 0.064,
      scaleY: 0.064,
      offsetX: 0,
      offsetY: -78,
      rotationDegrees: 0,
      originX: 0.5,
      originY: 0.5,
      depth: 14,
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
      depth: 14,
      fallbackFontSize: 34,
    },
    flight: {
      scaleX: 0.073,
      scaleY: 0.073,
      offsetX: 0,
      offsetY: 7,
      rotationDegrees: 0,
      originX: 0.5,
      originY: 0.5,
      depth: 14,
      fallbackFontSize: 34,
    },
  },
  outfit: {
    ground: {
      scaleX: 0.118,
      scaleY: 0.118,
      offsetX: 0,
      offsetY: -45,
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
      offsetY: -50,
      rotationDegrees: 0,
      originX: 0.5,
      originY: 0.5,
      depth: 11,
      fallbackFontSize: 48,
    },
  },
};

export function getShopItemImagePath(item: ShopItem): string {
  if (item.imagePath) {
    return item.imagePath;
  }

  const folder = COSMETIC_CATEGORY_FOLDERS[item.category];
  return `/assets/Accessoires/${folder}/${item.id}.png`;
}

export function getShopItemTextureKey(item: ShopItem): string {
  return `cosmetic-${item.category}-${item.id}`;
}

export function getShopItemById(itemId: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === itemId);
}

export function getCosmeticTransform(
  item: ShopItem,
  pose: CosmeticPose,
): CosmeticTransform {
  const defaults = DEFAULT_COSMETIC_TRANSFORMS[item.category][pose];
  const override = item.visual?.[pose];

  return {
    ...defaults,
    ...override,
  };
}

export const SHOP_ITEMS: readonly ShopItem[] = [
  {
    id: 'hat-straw',
    title: 'Chapeau de paille',
    category: 'hat',
    price: 15,
    icon: '👒',
    tone: 'gold',

    visual: {
    ground: {
      scaleX: 0.07,
      scaleY: 0.07,
      offsetX: 0,
      offsetY: -86,
    },

    flight: {
      scaleX: 0.075,
      scaleY: 0.075,
      offsetX: 0,
      offsetY: -86,
    },
  },
  },
  {
    id: 'hat-crown',
    title: 'Couronne royale',
    category: 'hat',
    price: 45,
    icon: '👑',
    tone: 'sunset',
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
