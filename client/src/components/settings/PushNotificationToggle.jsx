import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  IoNotificationsOutline,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoAlertCircle,
  IoPhonePortraitOutline,
  IoRefreshOutline,
} from 'react-icons/io5';
import {
  getPushSupportStatus,
  getCurrentPushSubscription,
  subscribeUserToPush,
  unsubscribeUserFromPush,
} from '../../utils/pushManager';
import { testOSNotification } from '../../utils/notificationService';

const PushNotificationToggle = () => {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [supportStatus, setSupportStatus] = useState(null);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const status = getPushSupportStatus();
      setSupportStatus(status);

      if (status.supported && status.permission === 'granted') {
        const sub = await getCurrentPushSubscription();
        setIsSubscribed(!!sub);
      } else {
        setIsSubscribed(false);
      }
    } catch (err) {
      console.warn('[PushNotificationToggle] Check status error:', err);
      setIsSubscribed(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleToggle = async () => {
    if (actionLoading) return;

    if (!supportStatus?.supported) {
      if (supportStatus?.needsInstall) {
        toast.error('On iOS, please add OrganizeUp to Home Screen first (Share > Add to Home Screen).');
      } else {
        toast.error(supportStatus?.reason || 'Push notifications are not supported on this browser.');
      }
      return;
    }

    if (supportStatus.permission === 'denied') {
      toast.error('Notifications are blocked in your browser. Please allow notifications in site settings.', {
        duration: 5000,
      });
      return;
    }

    setActionLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribeUserFromPush();
        setIsSubscribed(false);
        toast.success('Reminder notifications disabled.');
      } else {
        await subscribeUserToPush();
        setIsSubscribed(true);
        toast.success('Reminder notifications active! You will get alerts even when OrganizeUp is closed.', {
          icon: '🔔',
          duration: 4000,
        });
      }
      // Refresh status after toggle
      await checkStatus();
    } catch (err) {
      console.error('[PushNotificationToggle] Toggle error:', err);
      toast.error(err.message || 'Failed to update notification settings.');
      await checkStatus();
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestAlert = async () => {
    try {
      const res = await testOSNotification();
      if (res.success) {
        toast.success('Test notification delivered to your OS!');
      } else {
        toast.error(`Could not deliver test alert (${res.reason || 'check permissions'})`);
      }
    } catch (e) {
      toast.error('Failed to trigger test notification');
    }
  };

  return (
    <div className="bg-surface/30 rounded-2xl border border-subtle p-5 sm:p-6 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Info & Description */}
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent flex-shrink-0 mt-0.5">
            <IoNotificationsOutline size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-primary">Reminder notifications</h4>
              {isSubscribed && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <IoCheckmarkCircle size={12} /> Active
                </span>
              )}
              {supportStatus?.permission === 'denied' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                  <IoCloseCircle size={12} /> Blocked
                </span>
              )}
            </div>
            <p className="text-xs text-secondary mt-1 leading-relaxed max-w-xl">
              Receive timely OS alerts for scheduled Vault resources and YouTube learning queues, even when the browser or app is closed.
            </p>
          </div>
        </div>

        {/* Right: Switch Toggle */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          {isSubscribed && (
            <button
              type="button"
              onClick={handleTestAlert}
              className="text-xs px-3 py-1.5 rounded-xl border border-subtle bg-surface hover:bg-surface-raised text-secondary hover:text-primary transition-colors cursor-pointer"
            >
              Test Alert
            </button>
          )}

          <button
            type="button"
            role="switch"
            aria-checked={isSubscribed}
            disabled={loading || actionLoading || supportStatus?.permission === 'denied' || supportStatus?.needsInstall}
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isSubscribed ? 'bg-accent' : 'bg-surface-raised border-subtle'
            } ${
              loading || actionLoading || supportStatus?.permission === 'denied' || supportStatus?.needsInstall
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                isSubscribed ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Warnings & Help Banners */}
      {supportStatus?.needsInstall && (
        <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-200">
          <IoPhonePortraitOutline size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-300">iOS Setup Required</p>
            <p className="mt-0.5 text-amber-200/90 leading-relaxed">
              Apple requires adding OrganizeUp to your iOS Home Screen for Web Push notifications. Tap the <strong>Share</strong> button in Safari and choose <strong>Add to Home Screen</strong>, then open OrganizeUp from your home screen.
            </p>
          </div>
        </div>
      )}

      {supportStatus?.permission === 'denied' && (
        <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-200">
          <IoAlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-300">Notifications are blocked</p>
            <p className="mt-0.5 text-red-200/90 leading-relaxed">
              Browser permissions are currently blocked. To receive reminders, click the lock / settings icon next to the URL in your browser address bar and toggle Notifications to <strong>Allow</strong>, then reload this page.
            </p>
          </div>
        </div>
      )}

      {!loading && !supportStatus?.supported && !supportStatus?.needsInstall && (
        <div className="mt-4 p-3.5 rounded-xl bg-zinc-800 border border-subtle flex items-start gap-2.5 text-xs text-secondary">
          <IoAlertCircle size={18} className="text-muted flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-primary">Web Push Unsupported</p>
            <p className="mt-0.5 text-muted leading-relaxed">
              This browser environment does not support the Push API. In-app reminders and toasts will continue to work while the application is open.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PushNotificationToggle;

