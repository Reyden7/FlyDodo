import { Capacitor, type PluginListenerHandle } from '@capacitor/core';

const ANDROID_TEST_INTERSTITIAL_ID =
  'ca-app-pub-3940256099942544/1033173712';
const ANDROID_TEST_REWARDED_ID =
  'ca-app-pub-3940256099942544/5224354917';

const configuredInterstitialId =
  import.meta.env.VITE_ADMOB_ANDROID_INTERSTITIAL_ID?.trim();
const configuredRewardedId =
  import.meta.env.VITE_ADMOB_ANDROID_REWARDED_ID?.trim();
const interstitialAdId =
  configuredInterstitialId || ANDROID_TEST_INTERSTITIAL_ID;
const rewardedAdId = configuredRewardedId || ANDROID_TEST_REWARDED_ID;
const isTesting =
  import.meta.env.DEV ||
  !configuredInterstitialId ||
  !configuredRewardedId;

let initializationPromise: Promise<boolean> | null = null;
let interstitialInFlight = false;
let rewardedInFlight = false;
let forcedAdsDisabled = false;

export function setForcedAdsDisabled(disabled: boolean): void {
  forcedAdsDisabled = disabled;
}

function isNativeAdsPlatform(): boolean {
  return Capacitor.getPlatform() === 'android';
}

export function initializeAds(): Promise<boolean> {
  if (!isNativeAdsPlatform()) {
    return Promise.resolve(import.meta.env.DEV);
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      try {
        const { AdMob, AdmobConsentStatus } = await import(
          '@capacitor-community/admob'
        );

        await AdMob.initialize({ initializeForTesting: isTesting });

        let consentInfo = await AdMob.requestConsentInfo();

        if (
          consentInfo.status === AdmobConsentStatus.REQUIRED &&
          consentInfo.isConsentFormAvailable
        ) {
          consentInfo = await AdMob.showConsentForm();
        }

        return consentInfo.canRequestAds;
      } catch (error) {
        console.warn('Impossible d\u2019initialiser les publicites AdMob.', error);
        return isTesting;
      }
    })();
  }

  return initializationPromise;
}

export async function showInterstitialAd(): Promise<boolean> {
  if (forcedAdsDisabled || !isNativeAdsPlatform() || interstitialInFlight) {
    return false;
  }

  interstitialInFlight = true;

  try {
    if (!(await initializeAds())) {
      return false;
    }

    const { AdMob, InterstitialAdPluginEvents } = await import(
      '@capacitor-community/admob'
    );
    await AdMob.prepareInterstitial({
      adId: interstitialAdId,
      isTesting,
      immersiveMode: true,
    });

    return await new Promise<boolean>((resolve) => {
      let settled = false;
      const listenerHandles: PluginListenerHandle[] = [];

      const finish = (wasDismissed: boolean): void => {
        if (settled) {
          return;
        }

        settled = true;

        for (const handle of listenerHandles) {
          void handle.remove();
        }

        resolve(wasDismissed);
      };

      void Promise.all([
        AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () =>
          finish(true),
        ),
        AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () =>
          finish(false),
        ),
      ])
        .then((handles) => {
          listenerHandles.push(...handles);

          // La promesse native se résout dès l'affichage. Seul Dismissed
          // indique que le joueur a réellement quitté la publicité.
          void AdMob.showInterstitial().catch(() => finish(false));
        })
        .catch(() => finish(false));
    });
  } catch (error) {
    console.warn('Publicite interstitielle indisponible.', error);
    return false;
  } finally {
    interstitialInFlight = false;
  }
}

export async function showRewardedAd(): Promise<boolean> {
  if (!isNativeAdsPlatform()) {
    // Permet de tester les parcours de recompense dans le navigateur de dev.
    return import.meta.env.DEV;
  }

  if (rewardedInFlight) {
    return false;
  }

  rewardedInFlight = true;

  try {
    if (!(await initializeAds())) {
      return false;
    }

    const { AdMob, RewardAdPluginEvents } = await import(
      '@capacitor-community/admob'
    );
    await AdMob.prepareRewardVideoAd({
      adId: rewardedAdId,
      isTesting,
      immersiveMode: true,
    });

    return await new Promise<boolean>((resolve) => {
      let settled = false;
      let rewardEarned = false;
      const listenerHandles: PluginListenerHandle[] = [];

      const finish = (rewardEarned: boolean): void => {
        if (settled) {
          return;
        }

        settled = true;

        for (const handle of listenerHandles) {
          void handle.remove();
        }

        resolve(rewardEarned);
      };

      void Promise.all([
        AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
          rewardEarned = true;
        }),
        AdMob.addListener(RewardAdPluginEvents.Dismissed, () =>
          finish(rewardEarned),
        ),
        AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => finish(false)),
      ])
        .then((handles) => {
          listenerHandles.push(...handles);

          // Sur Android, cette promesse se résout quand la récompense est
          // gagnée, avant que la publicité soit fermée. On mémorise donc le
          // gain, puis on attend obligatoirement l'événement Dismissed.
          void AdMob.showRewardVideoAd()
            .then(() => {
              rewardEarned = true;
            })
            .catch(() => finish(false));
        })
        .catch(() => finish(false));
    });
  } catch (error) {
    console.warn('Publicite recompensee indisponible.', error);
    return false;
  } finally {
    rewardedInFlight = false;
  }
}
