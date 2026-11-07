import api from './api';

/**
 * Utility to convert base64 VAPID public key to Uint8Array
 */
export const urlBase64ToUint8Array = (base64String) => {
  if (!base64String) return new Uint8Array(0);
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Detect push notification support & platform limitations (e.g. iOS PWA requirements)
 */
export const getPushSupportStatus = () => {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      permission: 'denied',
      isIOS: false,
      needsInstall: false,
      reason: 'Server environment',
    };
  }

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent || '') ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const isStandalone =
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;

  const hasSW = 'serviceWorker' in navigator;
  const hasPush = 'PushManager' in window;
  const hasNotification = 'Notification' in window;

  if (isIOS && !isStandalone) {
    return {
      supported: false,
      permission: hasNotification ? Notification.permission : 'denied',
      isIOS: true,
      needsInstall: true,
      reason: 'iOS requires installing OrganizeUp to Home Screen to receive Web Push',
    };
  }

  const supported = hasSW && hasPush && hasNotification;

  return {
    supported,
    permission: hasNotification ? Notification.permission : 'denied',
    isIOS,
    needsInstall: false,
    reason: supported ? null : 'Browser does not support Web Push notifications',
  };
};

/**
 * Get the current active Service Worker PushSubscription, if any
 */
export const getCurrentPushSubscription = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (err) {
    console.warn('[PushManager] Failed to get subscription:', err);
    return null;
  }
};

/**
 * Subscribe current device to Web Push notifications
 */
export const subscribeUserToPush = async () => {
  const status = getPushSupportStatus();
  if (!status.supported) {
    throw new Error(status.reason || 'Web Push notifications are not supported');
  }

  // Request browser permission if needed
  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notifications are blocked. Please allow them in your browser site settings.'
        : 'Notification permission was not granted.'
    );
  }

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    throw new Error('VITE_VAPID_PUBLIC_KEY is not configured in client environment.');
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  const subJson = subscription.toJSON();
  const payload = {
    endpoint: subJson.endpoint,
    keys: {
      p256dh: subJson.keys?.p256dh,
      auth: subJson.keys?.auth,
    },
  };

  // Sync subscription with backend
  await api.post('/push/subscribe', payload);

  return subscription;
};

/**
 * Unsubscribe current device from Web Push notifications
 */
export const unsubscribeUserFromPush = async () => {
  try {
    const subscription = await getCurrentPushSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      // Inform server
      await api.post('/push/unsubscribe', { endpoint }).catch(() => {});
      // Unsubscribe from browser PushManager
      await subscription.unsubscribe();
    }
    return true;
  } catch (err) {
    console.error('[PushManager] Error during unsubscribe:', err);
    throw err;
  }
};

/**
 * Re-sync existing subscription with server on app open or login
 */
export const resyncPushSubscription = async () => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission !== 'granted') return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const subJson = subscription.toJSON();
    if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
      await api.post('/push/subscribe', {
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        },
      });
    }
  } catch (err) {
    // Non-blocking background sync failure
    console.warn('[PushManager] Background resync note:', err.message);
  }
};

