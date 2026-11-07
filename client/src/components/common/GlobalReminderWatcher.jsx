import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { connectSocket } from '../../utils/socket';
import { sendOSNotification, scheduleClientReminder } from '../../utils/notificationService';
import { resyncPushSubscription } from '../../utils/pushManager';
import api from '../../utils/api';
import { fetchCaptures } from '../../redux/slices/captureSlice';
import { fetchPlaylists } from '../../redux/slices/youtubePlaylistSlice';

/**
 * GlobalReminderWatcher
 * Listens for real-time vault & YouTube reminders via WebSocket and Web Push Service Worker,
 * fires native OS-level notifications when app is in background, provides in-app interactive toasts
 * when app is active (avoiding double notifications), and maintains subscription sync.
 */
const GlobalReminderWatcher = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    // Re-sync Push Subscription with server on app open
    resyncPushSubscription();

    // Connect socket for the authenticated user
    const socket = connectSocket();

    const showInAppReminderToast = (title, message, targetUrl) => {
      toast(
        (t) => (
          <div
            onClick={() => {
              toast.dismiss(t.id);
              if (targetUrl) navigate(targetUrl);
            }}
            className="flex items-center gap-3 cursor-pointer py-1"
          >
            <div className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-base flex-shrink-0 shadow">
              ⏰
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-primary truncate">
                {title || 'Reminder'}
              </p>
              <p className="text-[11px] text-muted line-clamp-1">
                {message || 'Click to view this item'}
              </p>
            </div>
          </div>
        ),
        {
          duration: 8000,
          position: 'top-right',
          style: {
            borderRadius: '16px',
            background: 'var(--surface-raised, #18181b)',
            color: 'var(--text-primary, #fff)',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          },
        }
      );
    };

    const handleVaultReminder = (data) => {
      console.log('⏰ [Watcher] Reminder received:', data);

      const title = data.title || '⏰ OrganizeUp Reminder';
      const body = data.message || 'Time to review your saved resource!';
      const targetUrl = data.url || `/captures?highlight=${data.id}`;

      // Avoid double OS notification: if app tab is focused and visible, show only in-app toast
      if (document.hidden) {
        sendOSNotification(title, {
          id: data.id,
          body,
          url: targetUrl,
          thumbnailUrl: data.thumbnailUrl,
          platform: data.platform,
        });
      }

      // Always show in-app interactive toast when window is alive
      showInAppReminderToast(title, body, targetUrl);

      // Refresh captures list & playlists in Redux
      dispatch(fetchCaptures());
      dispatch(fetchPlaylists());
    };

    socket.on('vault_reminder', handleVaultReminder);

    // Listen for Service Worker push messages broadcasted to open window clients
    const handleSWMessage = (event) => {
      if (event.data?.type === 'PUSH_NOTIFICATION_RECEIVED') {
        const { payload } = event.data;
        dispatch(fetchCaptures());
        dispatch(fetchPlaylists());
        if (payload?.title && !document.hidden) {
          showInAppReminderToast(payload.title, payload.body, payload.url);
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    // Initial check: load upcoming reminders from API to schedule client-side timers
    const scheduleUpcoming = async () => {
      try {
        const [capRes, ytRes] = await Promise.allSettled([
          api.get('/captures', { params: { remindersOnly: 'true', limit: 20 } }),
          api.get('/youtube-playlists'),
        ]);

        if (capRes.status === 'fulfilled') {
          const items = capRes.value.data?.captures || [];
          items.forEach(scheduleClientReminder);
        }

        if (ytRes.status === 'fulfilled') {
          const ytItems = ytRes.value.data?.playlists || [];
          ytItems.forEach((item) => {
            if (item.remindAt) {
              scheduleClientReminder({
                _id: item._id,
                title: item.title,
                remindAt: item.remindAt,
                reminderFired: item.reminderFired,
                reminderNote: item.reminderNote,
                url: `/youtube-playlists/${item._id}`,
                platform: 'youtube',
                thumbnailUrl: item.thumbnail,
                type: item.type,
              });
            }
          });
        }
      } catch (err) {
        // Silent catch for background scheduling
      }
    };

    scheduleUpcoming();

    return () => {
      socket.off('vault_reminder', handleVaultReminder);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, [user, dispatch, navigate]);

  return null;
};

export default GlobalReminderWatcher;
