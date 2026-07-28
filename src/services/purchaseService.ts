import { Capacitor } from '@capacitor/core';
import {
  PRODUCT_CATEGORY,
  PURCHASES_ERROR_CODE,
  Purchases,
  type PurchasesError,
} from '@revenuecat/purchases-capacitor';

export type WatermelonPackId =
  | 'small'
  | 'medium'
  | 'large'
  | 'chest'
  | 'barrel'
  | 'mountain';

export const WATERMELON_PRODUCT_IDS: Readonly<
  Record<WatermelonPackId, string>
> = {
  small: 'flydodo_watermelons_5',
  medium: 'flydodo_watermelons_10',
  large: 'flydodo_watermelons_15',
  chest: 'flydodo_watermelons_50',
  barrel: 'flydodo_watermelons_75',
  mountain: 'flydodo_watermelons_150',
};

export const FULL_GAME_PRODUCT_ID = 'flydodo_full_game';

export type StorePurchaseResult =
  | { status: 'purchased'; simulated: boolean }
  | { status: 'cancelled' }
  | { status: 'unavailable' }
  | { status: 'failed' };

const revenueCatAndroidApiKey =
  import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY?.trim();

let configurationPromise: Promise<boolean> | null = null;

function isPurchasesError(error: unknown): error is PurchasesError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
  );
}

async function configurePurchases(): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'android' || !revenueCatAndroidApiKey) {
    return false;
  }

  if (!configurationPromise) {
    configurationPromise = Purchases.configure({
      apiKey: revenueCatAndroidApiKey,
    })
      .then(() => true)
      .catch((error: unknown) => {
        configurationPromise = null;
        console.error("Impossible d'initialiser les achats intégrés.", error);
        return false;
      });
  }

  return configurationPromise;
}

export async function purchaseWatermelonPack(
  packId: WatermelonPackId,
): Promise<StorePurchaseResult> {
  // Le navigateur Vite permet de tester tout le flux sans déclencher de paiement.
  if (import.meta.env.DEV && Capacitor.getPlatform() === 'web') {
    return { status: 'purchased', simulated: true };
  }

  if (!(await configurePurchases())) {
    return { status: 'unavailable' };
  }

  try {
    const productId = WATERMELON_PRODUCT_IDS[packId];
    const { products } = await Purchases.getProducts({
      productIdentifiers: [productId],
      type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    });
    const product = products.find((candidate) => candidate.identifier === productId);

    if (!product) {
      console.error(`Produit Google Play introuvable : ${productId}`);
      return { status: 'unavailable' };
    }

    await Purchases.purchaseStoreProduct({ product });
    return { status: 'purchased', simulated: false };
  } catch (error) {
    if (
      isPurchasesError(error) &&
      error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
    ) {
      return { status: 'cancelled' };
    }

    console.error("L'achat intégré a échoué.", error);
    return { status: 'failed' };
  }
}

export async function purchaseFullGame(): Promise<StorePurchaseResult> {
  if (import.meta.env.DEV && Capacitor.getPlatform() === 'web') {
    return { status: 'purchased', simulated: true };
  }

  if (!(await configurePurchases())) {
    return { status: 'unavailable' };
  }

  try {
    const { products } = await Purchases.getProducts({
      productIdentifiers: [FULL_GAME_PRODUCT_ID],
      type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    });
    const product = products.find(
      (candidate) => candidate.identifier === FULL_GAME_PRODUCT_ID,
    );

    if (!product) {
      console.error(
        `Produit Google Play introuvable : ${FULL_GAME_PRODUCT_ID}`,
      );
      return { status: 'unavailable' };
    }

    await Purchases.purchaseStoreProduct({ product });
    return { status: 'purchased', simulated: false };
  } catch (error) {
    if (
      isPurchasesError(error) &&
      error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
    ) {
      return { status: 'cancelled' };
    }

    console.error("L'achat du jeu complet a échoué.", error);
    return { status: 'failed' };
  }
}

export async function restoreFullGamePurchase(): Promise<boolean> {
  if (!(await configurePurchases())) {
    return false;
  }

  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return customerInfo.allPurchasedProductIdentifiers.includes(
      FULL_GAME_PRODUCT_ID,
    );
  } catch (error) {
    console.warn("Impossible de restaurer l'achat du jeu complet.", error);
    return false;
  }
}
