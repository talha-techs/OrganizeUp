/**
 * PWA & OS-Level Notification Service for OrganizeUp
 * Handles native OS system notifications (Windows Action Center, Android, macOS)
 * using the Web Notifications API and ServiceWorkerRegistration.showNotification().
 */

const scheduledTimers = new Map();

/**
 * Checks if native notifications are supported in the current environment
 */
export const isNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Gets current notification permission state ('default' | 'granted' | 'denied')
 */
export const getNotificationPermission = () => {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
};

/**
 * Requests permission from the user for OS-level system notifications
 * @returns {Promise<'granted' | 'denied' | 'default'>}
 */
export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    console.warn('[Notification] Notifications not supported in this browser.');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('[Notification] Permission request error:', err);
    return Notification.permission || 'denied';
  }
};

/**
 * Sends a native OS-level notification to the user's operating system
 * @param {string} title
 * @param {Object} options
 * @returns {Promise<boolean>}
 */
export const sendOSNotification = async (title, options = {}) => {
  if (!isNotificationSupported()) return false;

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await requestNotificationPermission();
  }

  if (permission !== 'granted') {
    return false;
  }

  const notificationOptions = {
    body: options.body || options.message || '',
    icon: options.icon || options.thumbnailUrl || '/pwa-192x192.png',
    badge: options.badge || '/organizeup-favicon.svg',
    tag: options.tag || options.id || 'organizeup-vault-reminder',
    renotify: true,
    requireInteraction: true, // Keep notification visible in OS action center until user interacts
    silent: false,
    vibrate: [200, 100, 200],
    data: {
      url: options.url || '/captures',
      id: options.id,
      timestamp: Date.now(),
      ...options.data,
    },
  };

  // 1. Try displaying via active ServiceWorker (Standard PWA method for OS notification delivery)
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(title, notificationOptions);
        return true;
      }
    } catch (swErr) {
      console.warn('[Notification] SW showNotification fallback to Window Notification:', swErr?.message);
    }
  }

  // 2. Fallback to Window Notification constructor
  try {
    const notif = new Notification(title, notificationOptions);
    notif.onclick = function (event) {
      event.preventDefault();
      window.focus();
      if (notificationOptions.data?.url) {
        window.location.href = notificationOptions.data.url;
      }
      notif.close();
    };
    return true;
  } catch (winErr) {
    console.warn('[Notification] Window notification failed:', winErr);
    return false;
  }
};

/**
 * Schedules a client-side timer for a future reminder so that it fires precisely on time
 * even if there is background latency on the server check.
 * @param {Object} item - Capture item with { _id, title, remindAt, notes, platform, ... }
 */
export const scheduleClientReminder = (item) => {
  if (!item || !item.remindAt) return;
  const id = item._id || item.id;
  if (!id) return;

  // Clear existing timer if already scheduled
  if (scheduledTimers.has(id)) {
    clearTimeout(scheduledTimers.get(id));
    scheduledTimers.delete(id);
  }

  const remindTime = new Date(item.remindAt).getTime();
  const now = Date.now();
  const delayMs = remindTime - now;

  // Only schedule if in future and within the next 24 hours (setTimeout max precision window)
  if (delayMs > 0 && delayMs <= 24 * 60 * 60 * 1000) {
    const timer = setTimeout(() => {
      const platformLabel = item.platform
        ? item.platform.charAt(0).toUpperCase() + item.platform.slice(1)
        : item.type === 'video'
        ? 'YouTube Video'
        : 'YouTube Playlist';
      const title = `⏰ Reminder: ${item.title || platformLabel}`;
      const message = (item.reminderNote || item.notes)
        ? (item.reminderNote || item.notes).slice(0, 140)
        : `Time to watch your saved ${platformLabel}!`;
      const targetUrl = item.url || (item.platform === 'youtube' || item.playlistUrl || item.videoId ? `/youtube-playlists/${id}` : `/captures?highlight=${id}`);

      sendOSNotification(title, {
        id,
        body: message,
        url: targetUrl,
        thumbnailUrl: item.thumbnailUrl || item.thumbnail,
        platform: item.platform || 'youtube',
      });

      scheduledTimers.delete(id);
    }, delayMs);

    scheduledTimers.set(id, timer);
  }
};

/**
 * Cancels a previously scheduled client-side timer
 */
export const cancelClientReminder = (id) => {
  if (id && scheduledTimers.has(id)) {
    clearTimeout(scheduledTimers.get(id));
    scheduledTimers.delete(id);
  }
};

/**
 * Fires a sample notification to test OS-level notification delivery
 */
export const testOSNotification = async () => {
  if (!isNotificationSupported()) {
    return { success: false, reason: 'unsupported' };
  }

  let perm = Notification.permission;
  if (perm === 'default') {
    perm = await requestNotificationPermission();
  }

  if (perm !== 'granted') {
    return { success: false, reason: 'denied' };
  }

  const delivered = await sendOSNotification('🔔 OrganizeUp OS Alert Test', {
    body: 'Awesome! Your system notifications are active and ready. You will receive Vault reminders directly on your OS.',
    url: '/captures',
    tag: 'organizeup-test-notification',
  });

  return { success: delivered, reason: delivered ? null : 'failed' };
};

