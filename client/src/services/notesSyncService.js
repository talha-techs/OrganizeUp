import { notesDb, wipeUserNotesData } from './notesDb';
import api from '../utils/api';

const getCurrentUserId = () => {
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const u = JSON.parse(raw);
      return u._id || u.id || null;
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
};

class NotesSyncManager {
  constructor() {
    this.debounceTimers = new Map();
    this.isFlushing = false;
    this.activeDrafts = new Map(); // draftKey -> draft object
    this.setupListeners();
  }

  setupListeners() {
    if (typeof window === 'undefined') return;

    // Flush on visibility change or pagehide
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushAllPending();
      }
    });

    window.addEventListener('pagehide', () => {
      this.flushKeepAlive();
    });

    // Auto-sync pending queue when coming back online
    window.addEventListener('online', () => {
      const uid = getCurrentUserId();
      this.processSyncQueue(uid);
    });
  }

  /**
   * Save draft immediately into Dexie IndexedDB (keyed by userId)
   */
  async saveDraftLocally(draft, explicitUserId) {
    if (!draft || (!draft.id && !draft.clientId)) return;
    const userId = explicitUserId || draft.userId || getCurrentUserId() || 'default';
    const id = draft.id || draft.clientId;
    const draftKey = `${userId}:${id}`;

    try {
      const record = {
        draftKey,
        userId,
        id,
        noteId: draft.id || null,
        clientId: draft.clientId || null,
        title: draft.title || '',
        body: draft.body || '',
        pinned: Boolean(draft.pinned),
        archived: Boolean(draft.archived),
        tags: draft.tags || [],
        version: draft.version || 1,
        isDirty: draft.isDirty !== undefined ? Boolean(draft.isDirty) : true,
        updatedAt: Date.now(),
      };
      await notesDb.drafts.put(record);
      this.activeDrafts.set(draftKey, record);
      return record;
    } catch (err) {
      console.error('[NotesSync] saveDraftLocally error:', err);
    }
  }

  /**
   * Schedule debounced server sync (~800ms)
   */
  scheduleDebouncedSync({
    noteId,
    clientId,
    draftData,
    baseVersion,
    userId,
    onStatusChange,
    onSuccess,
    onConflict,
  }) {
    const uid = userId || getCurrentUserId() || 'default';
    const rawKey = noteId || clientId;
    if (!rawKey) return;
    const draftKey = `${uid}:${rawKey}`;

    // Immediately record locally (keeps local draft until server confirms)
    this.saveDraftLocally(
      { id: noteId, clientId, ...draftData, version: baseVersion, userId: uid, isDirty: true },
      uid
    );

    // Clear any previous debounce timer for this note
    if (this.debounceTimers.has(draftKey)) {
      clearTimeout(this.debounceTimers.get(draftKey));
    }

    if (onStatusChange) {
      onStatusChange({ status: 'saving', message: 'Saving…' });
    }

    const timer = setTimeout(async () => {
      this.debounceTimers.delete(draftKey);
      await this.executeSync({
        noteId,
        clientId,
        draftData,
        baseVersion,
        userId: uid,
        onStatusChange,
        onSuccess,
        onConflict,
      });
    }, 800);

    this.debounceTimers.set(draftKey, timer);
  }

  /**
   * Execute server save/update
   */
  async executeSync({
    noteId,
    clientId,
    draftData,
    baseVersion,
    userId,
    onStatusChange,
    onSuccess,
    onConflict,
    retryCount = 0,
  }) {
    const uid = userId || getCurrentUserId() || 'default';
    const rawKey = noteId || clientId;
    const draftKey = `${uid}:${rawKey}`;

    // Check online status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (onStatusChange) {
        onStatusChange({ status: 'offline', message: 'Offline, will sync' });
      }
      await this.enqueueForSync({ noteId, clientId, draftData, baseVersion, userId: uid });
      return;
    }

    try {
      let res;
      if (noteId && !noteId.startsWith('local-')) {
        // PATCH existing note
        res = await api.patch(`/notes/${noteId}`, {
          ...draftData,
          baseVersion,
        });
      } else {
        // POST new note (idempotent via clientId)
        res = await api.post('/notes', {
          ...draftData,
          clientId,
        });
      }

      if (res.data?.success) {
        const savedNote = res.data.note;

        // Keep local draft in Dexie and mark isDirty: false once server confirms
        const newDraftKey = `${uid}:${savedNote._id}`;
        if (draftKey !== newDraftKey) {
          // If clientId was replaced by server MongoDB _id, cleanup old temporary key
          await notesDb.drafts.delete(draftKey).catch(() => {});
          this.activeDrafts.delete(draftKey);
        }

        const confirmedRecord = {
          draftKey: newDraftKey,
          userId: uid,
          id: savedNote._id,
          noteId: savedNote._id,
          clientId: savedNote.clientId || clientId || null,
          title: savedNote.title,
          body: savedNote.body,
          pinned: savedNote.pinned,
          archived: savedNote.archived,
          tags: savedNote.tags || [],
          version: savedNote.version,
          isDirty: false,
          updatedAt: Date.now(),
        };

        await notesDb.drafts.put(confirmedRecord);
        this.activeDrafts.set(newDraftKey, confirmedRecord);

        if (onStatusChange) {
          onStatusChange({ status: 'saved', message: 'Saved' });
        }
        if (onSuccess) {
          onSuccess(savedNote);
        }
      }
    } catch (err) {
      if (err.response?.status === 409) {
        // Stale version conflict
        if (onStatusChange) {
          onStatusChange({ status: 'error', message: 'Conflict detected' });
        }
        if (onConflict) {
          onConflict({
            serverNote: err.response.data.serverNote,
            localDraft: draftData,
          });
        }
        return;
      }

      // Network / 5xx error: schedule retry with backoff
      if (retryCount < 3) {
        if (onStatusChange) {
          onStatusChange({ status: 'error', message: "Couldn't save, retrying…" });
        }
        const backoffMs = Math.min(10000, 1000 * Math.pow(2, retryCount));
        setTimeout(() => {
          this.executeSync({
            noteId,
            clientId,
            draftData,
            baseVersion,
            userId: uid,
            onStatusChange,
            onSuccess,
            onConflict,
            retryCount: retryCount + 1,
          });
        }, backoffMs);
      } else {
        // Enqueue to persistent Dexie queue for retry on next online event
        await this.enqueueForSync({ noteId, clientId, draftData, baseVersion, userId: uid });
        if (onStatusChange) {
          onStatusChange({ status: 'offline', message: 'Offline, will sync' });
        }
      }
    }
  }

  /**
   * Add to persistent offline sync queue in Dexie
   */
  async enqueueForSync(item) {
    try {
      const uid = item.userId || getCurrentUserId() || 'default';
      await notesDb.syncQueue.add({
        userId: uid,
        noteId: item.noteId || null,
        clientId: item.clientId || null,
        draftData: item.draftData,
        baseVersion: item.baseVersion,
        attempts: 0,
        createdAt: Date.now(),
      });
    } catch (err) {
      console.error('[NotesSync] enqueueForSync error:', err);
    }
  }

  /**
   * Process all queued offline changes (resumes sync on reconnect or re-login)
   */
  async processSyncQueue(forUserId) {
    try {
      const uid = forUserId || getCurrentUserId();
      let queued = [];
      if (uid) {
        queued = await notesDb.syncQueue.where('userId').equals(uid).toArray();
      } else {
        queued = await notesDb.syncQueue.toArray();
      }

      if (!queued.length) return;

      for (const item of queued) {
        try {
          let res;
          if (item.noteId && !item.noteId.startsWith('local-')) {
            res = await api.patch(`/notes/${item.noteId}`, {
              ...item.draftData,
              baseVersion: item.baseVersion,
            });
          } else {
            res = await api.post('/notes', {
              ...item.draftData,
              clientId: item.clientId,
            });
          }

          if (res.data?.success) {
            const saved = res.data.note;
            await notesDb.syncQueue.delete(item.queueId);

            // Update local draft as clean
            const targetUid = item.userId || uid || 'default';
            const draftKey = `${targetUid}:${saved._id}`;
            await notesDb.drafts.put({
              draftKey,
              userId: targetUid,
              id: saved._id,
              noteId: saved._id,
              clientId: saved.clientId || item.clientId || null,
              title: saved.title,
              body: saved.body,
              pinned: saved.pinned,
              archived: saved.archived,
              tags: saved.tags || [],
              version: saved.version,
              isDirty: false,
              updatedAt: Date.now(),
            });
          }
        } catch {
          // Increment attempt count on retryable error
          await notesDb.syncQueue.update(item.queueId, { attempts: (item.attempts || 0) + 1 });
        }
      }
    } catch (err) {
      console.error('[NotesSync] processSyncQueue error:', err);
    }
  }

  /**
   * Check unsynced changes, attempt flush, and warn before logout
   * Returns true if safe to proceed, false if user cancelled logout.
   */
  async prepareLogout(userId) {
    const uid = userId || getCurrentUserId();

    // 1. Flush active pending debounce timers
    this.flushAllPending();

    // 2. Attempt to flush sync queue if online
    if (uid && typeof navigator !== 'undefined' && navigator.onLine) {
      await this.processSyncQueue(uid);
    }

    // 3. Check for any remaining unsynced items
    let unsyncedCount = 0;
    if (uid) {
      try {
        const dirtyDrafts = await notesDb.drafts
          .where('userId')
          .equals(uid)
          .filter((d) => d.isDirty === true)
          .count();
        const queuedItems = await notesDb.syncQueue
          .where('userId')
          .equals(uid)
          .count();
        unsyncedCount = dirtyDrafts + queuedItems;
      } catch {
        // Ignore count errors
      }
    }

    // 4. Warn if unsynced notes remain and let user cancel logout
    if (unsyncedCount > 0) {
      const confirmMsg =
        `You have ${unsyncedCount} unsaved note ${unsyncedCount === 1 ? 'change' : 'changes'} that ${unsyncedCount === 1 ? 'has' : 'have'} not synced to the server yet.\n\n` +
        `Logging out now means these changes will remain locally on this device until you log back in.\n\n` +
        `Do you want to log out anyway? (Click Cancel to stay and finish syncing)`;
      const proceed = window.confirm(confirmMsg);
      if (!proceed) {
        return false; // User cancelled logout
      }
      // User chose to log out anyway: keep the data keyed by userId in Dexie for re-login resume
      return true;
    }

    // 5. Zero unsynced items: wipe that user's Dexie data on clean logout
    if (uid) {
      await wipeUserNotesData(uid);
      for (const [draftKey] of this.activeDrafts) {
        if (draftKey.startsWith(`${uid}:`)) {
          this.activeDrafts.delete(draftKey);
        }
      }
    }

    return true;
  }

  /**
   * Flush all active pending timers immediately (visibility change)
   */
  flushAllPending() {
    this.debounceTimers.forEach((timer, draftKey) => {
      clearTimeout(timer);
      const draft = this.activeDrafts.get(draftKey);
      if (draft && draft.isDirty) {
        this.executeSync({
          noteId: draft.noteId,
          clientId: draft.clientId,
          draftData: {
            title: draft.title,
            body: draft.body,
            pinned: draft.pinned,
            archived: draft.archived,
            tags: draft.tags,
          },
          baseVersion: draft.version,
          userId: draft.userId,
        });
      }
    });
    this.debounceTimers.clear();
  }

  /**
   * On pagehide: flush with fetch(..., { keepalive: true, credentials: 'include' })
   */
  flushKeepAlive() {
    try {
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || '';

      this.activeDrafts.forEach((draft) => {
        if (draft && draft.isDirty) {
          const isExisting = draft.noteId && !draft.noteId.startsWith('local-');
          const url = isExisting
            ? `${apiBase}/api/notes/${draft.noteId}`
            : `${apiBase}/api/notes`;
          const method = isExisting ? 'PATCH' : 'POST';

          const payload = isExisting
            ? {
                title: draft.title,
                body: draft.body,
                pinned: draft.pinned,
                archived: draft.archived,
                tags: draft.tags,
                baseVersion: draft.version,
              }
            : {
                title: draft.title,
                body: draft.body,
                pinned: draft.pinned,
                archived: draft.archived,
                tags: draft.tags,
                clientId: draft.clientId,
              };

          const headers = {
            'Content-Type': 'application/json',
          };
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }

          fetch(url, {
            method,
            keepalive: true,
            credentials: 'include',
            headers,
            body: JSON.stringify(payload),
          }).catch(() => {});
        }
      });
    } catch (err) {
      console.warn('[NotesSync] flushKeepAlive error:', err);
    }
  }
}

export const notesSyncManager = new NotesSyncManager();
