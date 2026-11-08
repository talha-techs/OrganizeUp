const webpush = require("web-push");
const CapturedResource = require("../models/CapturedResource");
const YoutubePlaylist = require("../models/YoutubePlaylist");
const Book = require("../models/Book");
const Notification = require("../models/Notification");
const PushSubscription = require("../models/PushSubscription");
const User = require("../models/User");
const { emitToUser } = require("../socket");

// Configure web-push with VAPID details if available
let vapidConfigured = false;
const configureWebPush = () => {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT) {
    try {
      webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
      vapidConfigured = true;
    } catch (err) {
      console.error("[Push] Failed to set VAPID details:", err.message);
      vapidConfigured = false;
    }
  } else {
    vapidConfigured = false;
  }
};

// Initialize VAPID
configureWebPush();

/**
 * Dispatch web-push notification to all registered subscriptions of a user
 * Automatically removes dead / expired subscriptions on 404 or 410 HTTP status.
 */
const sendPushToUser = async (userId, payload) => {
  if (!vapidConfigured) {
    // Attempt re-configuration in case env vars were set after boot
    configureWebPush();
    if (!vapidConfigured) {
      return { sent: 0, failed: 0, reason: "VAPID not configured" };
    }
  }

  try {
    const subscriptions = await PushSubscription.find({ user: userId });
    if (!subscriptions.length) {
      return { sent: 0, failed: 0 };
    }

    const payloadString = typeof payload === "string" ? payload : JSON.stringify(payload);
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth,
              },
            },
            payloadString,
            {
              TTL: 24 * 60 * 60, // 24 hours
              urgency: "high",
            }
          );
          return { subId: sub._id, status: "sent" };
        } catch (err) {
          // 404 Not Found or 410 Gone means the subscription is no longer active
          if (err.statusCode === 404 || err.statusCode === 410) {
            console.log(`[Push] Removing expired push subscription: ${sub._id}`);
            await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
          } else {
            console.warn(`[Push] Error pushing to ${sub.endpoint}:`, err.message);
          }
          throw err;
        }
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    return { sent, failed };
  } catch (err) {
    console.error(`[Push] sendPushToUser error for user ${userId}:`, err.message);
    return { sent: 0, failed: 0, error: err.message };
  }
};

/**
 * processDueReminders
 * Atomically claims due reminders across CapturedResource and YoutubePlaylist (including per-video),
 * creates in-app notifications, dispatches Web Push notifications, and broadcasts via Socket.IO.
 *
 * Idempotent, safe on crash, and concurrent-safe across multiple instances.
 */
const processDueReminders = async () => {
  const now = new Date();
  let processedCount = 0;
  const errors = [];

  // 1. Process CapturedResource reminders
  while (true) {
    try {
      const capture = await CapturedResource.findOneAndUpdate(
        {
          remindAt: { $lte: now },
          reminderFired: { $ne: true },
          status: { $ne: "archived" },
        },
        { $set: { reminderFired: true } },
        { new: true }
      );

      if (!capture) break; // No more due captures

      processedCount++;
      const platformLabel = capture.platform
        ? capture.platform.charAt(0).toUpperCase() + capture.platform.slice(1)
        : "Vault";
      const title = `⏰ Reminder: ${capture.title || platformLabel}`;
      const body = capture.notes
        ? capture.notes.slice(0, 140)
        : `Time to review your saved ${platformLabel} resource!`;
      const url = `/captures?highlight=${capture._id}`;
      const tag = `reminder-capture-${capture._id}`;

      // Create Notification record
      await Notification.create({
        user: capture.user,
        type: "reminder",
        title,
        body,
        url,
        refId: capture._id.toString(),
        createdAt: new Date(),
      }).catch((notifErr) => console.error("[Reminder] Failed to create notification:", notifErr));

      // Update User.notifications for backwards compatibility
      await User.findByIdAndUpdate(capture.user, {
        $push: {
          notifications: {
            $each: [
              {
                type: "reminder",
                contentTitle: title,
                message: body,
                link: url,
                read: false,
                createdAt: new Date(),
              },
            ],
            $position: 0,
            $slice: 100,
          },
        },
      }).catch(() => {});

      // Send Web Push notification
      await sendPushToUser(capture.user, {
        title,
        body,
        url,
        tag,
        icon: "/pwa-192x192.png",
        badge: "/notification-badge.png",
        data: { url, id: capture._id.toString() },
      });

      // Broadcast real-time reminder via Socket.IO
      emitToUser(capture.user, "vault_reminder", {
        id: capture._id.toString(),
        title,
        message: body,
        url,
        platform: capture.platform,
        thumbnailUrl: capture.thumbnailUrl,
        remindAt: capture.remindAt,
        priority: capture.priority,
      });

      console.log(`⏰ Vault reminder claimed and processed: "${capture.title || capture._id}"`);
    } catch (err) {
      console.error("[Reminder] Error processing capture reminder:", err);
      errors.push({ type: "capture", error: err.message });
      break;
    }
  }

  // 2. Process YouTube Playlist & Single Video top-level reminders
  while (true) {
    try {
      const ytItem = await YoutubePlaylist.findOneAndUpdate(
        {
          remindAt: { $lte: now },
          reminderFired: { $ne: true },
        },
        { $set: { reminderFired: true } },
        { new: true }
      );

      if (!ytItem) break; // No more top-level YouTube reminders

      processedCount++;
      const isVideo = ytItem.type === "video";
      const itemTypeLabel = isVideo ? "YouTube Video" : "YouTube Playlist";
      const title = `⏰ Reminder: ${ytItem.title || itemTypeLabel}`;
      const body = ytItem.reminderNote?.trim()
        ? ytItem.reminderNote.slice(0, 140)
        : isVideo
        ? `Time to watch your saved YouTube video: ${ytItem.title}`
        : `Time to continue your YouTube playlist: ${ytItem.title}`;
      const url = `/youtube-playlists/${ytItem._id}`;
      const tag = `reminder-yt-${ytItem._id}`;

      // Create Notification record
      await Notification.create({
        user: ytItem.addedBy,
        type: "reminder",
        title,
        body,
        url,
        refId: ytItem._id.toString(),
        createdAt: new Date(),
      }).catch((notifErr) => console.error("[Reminder] Failed to create notification:", notifErr));

      // Update User.notifications for backwards compatibility
      await User.findByIdAndUpdate(ytItem.addedBy, {
        $push: {
          notifications: {
            $each: [
              {
                type: "reminder",
                contentTitle: title,
                message: body,
                link: url,
                read: false,
                createdAt: new Date(),
              },
            ],
            $position: 0,
            $slice: 100,
          },
        },
      }).catch(() => {});

      // Send Web Push notification
      await sendPushToUser(ytItem.addedBy, {
        title,
        body,
        url,
        tag,
        icon: "/pwa-192x192.png",
        badge: "/notification-badge.png",
        data: { url, id: ytItem._id.toString() },
      });

      // Broadcast real-time reminder via Socket.IO
      emitToUser(ytItem.addedBy, "vault_reminder", {
        id: ytItem._id.toString(),
        title,
        message: body,
        url,
        platform: "youtube",
        thumbnailUrl: ytItem.thumbnail,
        remindAt: ytItem.remindAt,
        type: ytItem.type,
      });

      console.log(`⏰ YouTube reminder claimed and processed: "${ytItem.title || ytItem._id}"`);
    } catch (err) {
      console.error("[Reminder] Error processing YouTube top-level reminder:", err);
      errors.push({ type: "youtube_top", error: err.message });
      break;
    }
  }

  // 3. Process Per-Video reminders within YouTube Playlists
  while (true) {
    try {
      // Find a playlist with a due video item
      const candidate = await YoutubePlaylist.findOne(
        {
          videos: {
            $elemMatch: {
              remindAt: { $lte: now },
              reminderFired: { $ne: true },
            },
          },
        },
        {
          "videos.$": 1,
          addedBy: 1,
          title: 1,
        }
      );

      if (!candidate || !candidate.videos || !candidate.videos.length) break;

      const dueVideo = candidate.videos[0];
      const videoSubId = dueVideo._id;

      // Atomically claim this exact video by its subdocument _id
      const claimedDoc = await YoutubePlaylist.findOneAndUpdate(
        {
          _id: candidate._id,
          videos: {
            $elemMatch: {
              _id: videoSubId,
              reminderFired: { $ne: true },
            },
          },
        },
        {
          $set: {
            "videos.$.reminderFired": true,
          },
        },
        { new: true }
      );

      if (!claimedDoc) {
        // Someone else claimed it concurrently; continue loop to inspect remaining candidates
        continue;
      }

      processedCount++;
      const videoTitle = dueVideo.title || "Video";
      const title = `⏰ Video Reminder: ${videoTitle}`;
      const body = dueVideo.reminderNote?.trim()
        ? dueVideo.reminderNote.slice(0, 140)
        : `Time to continue watching "${videoTitle}" in playlist "${claimedDoc.title}"`;
      const url = `/youtube-playlists/${claimedDoc._id}?video=${dueVideo.videoId || ""}`;
      const tag = `reminder-yt-video-${videoSubId}`;

      // Create Notification record
      await Notification.create({
        user: claimedDoc.addedBy,
        type: "reminder",
        title,
        body,
        url,
        refId: videoSubId ? videoSubId.toString() : claimedDoc._id.toString(),
        createdAt: new Date(),
      }).catch((notifErr) => console.error("[Reminder] Failed to create notification:", notifErr));

      // Update User.notifications for backwards compatibility
      await User.findByIdAndUpdate(claimedDoc.addedBy, {
        $push: {
          notifications: {
            $each: [
              {
                type: "reminder",
                contentTitle: title,
                message: body,
                link: url,
                read: false,
                createdAt: new Date(),
              },
            ],
            $position: 0,
            $slice: 100,
          },
        },
      }).catch(() => {});

      // Send Web Push notification
      await sendPushToUser(claimedDoc.addedBy, {
        title,
        body,
        url,
        tag,
        icon: "/pwa-192x192.png",
        badge: "/notification-badge.png",
        data: { url, id: videoSubId ? videoSubId.toString() : claimedDoc._id.toString() },
      });

      // Broadcast real-time reminder via Socket.IO
      emitToUser(claimedDoc.addedBy, "vault_reminder", {
        id: videoSubId ? videoSubId.toString() : claimedDoc._id.toString(),
        title,
        message: body,
        url,
        platform: "youtube",
        thumbnailUrl: dueVideo.thumbnail || claimedDoc.thumbnail,
        remindAt: dueVideo.remindAt,
        type: "video",
      });

      console.log(`⏰ YouTube video reminder claimed and processed: "${videoTitle}"`);
    } catch (err) {
      console.error("[Reminder] Error processing YouTube video item reminder:", err);
      errors.push({ type: "youtube_video", error: err.message });
      break;
    }
  }

  // 4. Process Book reminders (automatically skip & halt completed books)
  while (true) {
    try {
      // First ensure any completed books with pending reminders have reminders halted
      await Book.updateMany(
        { isCompleted: true, remindAt: { $ne: null } },
        { $set: { remindAt: null, reminderFired: true } }
      ).catch(() => {});

      const book = await Book.findOneAndUpdate(
        {
          remindAt: { $lte: now },
          reminderFired: { $ne: true },
          isCompleted: { $ne: true },
        },
        { $set: { reminderFired: true } },
        { new: true }
      );

      if (!book) break; // No more due book reminders

      processedCount++;
      const typeLabel =
        book.type === "text"
          ? "Book (PDF)"
          : book.type === "audio"
          ? "Audio Book"
          : "Video Book";
      const title = `⏰ Reminder: ${book.title || typeLabel}`;
      const body = book.reminderNote?.trim()
        ? book.reminderNote.slice(0, 140)
        : `Time to continue reading/studying "${book.title}"!`;
      const url = `/books/${book._id}`;
      const tag = `reminder-book-${book._id}`;

      // Create Notification record
      await Notification.create({
        user: book.addedBy,
        type: "reminder",
        title,
        body,
        url,
        refId: book._id.toString(),
        createdAt: new Date(),
      }).catch((notifErr) => console.error("[Reminder] Failed to create book notification:", notifErr));

      // Update User.notifications for backwards compatibility
      await User.findByIdAndUpdate(book.addedBy, {
        $push: {
          notifications: {
            $each: [
              {
                type: "reminder",
                contentTitle: title,
                message: body,
                link: url,
                read: false,
                createdAt: new Date(),
              },
            ],
            $position: 0,
            $slice: 100,
          },
        },
      }).catch(() => {});

      // Send Web Push notification
      await sendPushToUser(book.addedBy, {
        title,
        body,
        url,
        tag,
        icon: "/pwa-192x192.png",
        badge: "/notification-badge.png",
        data: { url, id: book._id.toString() },
      });

      // Broadcast real-time reminder via Socket.IO
      emitToUser(book.addedBy, "vault_reminder", {
        id: book._id.toString(),
        title,
        message: body,
        url,
        platform: "book",
        thumbnailUrl: book.coverImage,
        remindAt: book.remindAt,
        type: book.type,
      });

      console.log(`⏰ Book reminder claimed and processed: "${book.title || book._id}"`);
    } catch (err) {
      console.error("[Reminder] Error processing Book reminder:", err);
      errors.push({ type: "book", error: err.message });
      break;
    }
  }

  return { processedCount, errors, timestamp: now };
};

module.exports = {
  processDueReminders,
  sendPushToUser,
  configureWebPush,
};

