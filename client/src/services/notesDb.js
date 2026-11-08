import Dexie from 'dexie';

export const notesDb = new Dexie('OrganizeUpNotesDb');

// Version 1: Initial schema
notesDb.version(1).stores({
  drafts: 'id, clientId, userId, updatedAt, isDirty',
  syncQueue: '++queueId, noteId, action, attempts, createdAt',
});

// Version 2: Keyed by draftKey and userId for multi-user isolation
notesDb.version(2).stores({
  drafts: 'draftKey, [userId+id], userId, id, clientId, updatedAt, isDirty',
  syncQueue: '++queueId, userId, noteId, action, attempts, createdAt',
}).upgrade((tx) => {
  return tx.table('drafts').toCollection().modify((draft) => {
    if (!draft.draftKey) {
      draft.draftKey = `${draft.userId || 'default'}:${draft.id || draft.clientId}`;
    }
  });
});

/**
 * Wipe all local drafts and sync queue data across all users
 */
export const wipeLocalNotesData = async () => {
  try {
    await notesDb.drafts.clear();
    await notesDb.syncQueue.clear();
  } catch (err) {
    console.error('[NotesDb] Failed to wipe local notes drafts:', err);
  }
};

/**
 * Wipe drafts and sync queue data for a specific user only
 */
export const wipeUserNotesData = async (userId) => {
  if (!userId) return;
  try {
    await notesDb.drafts.where('userId').equals(userId).delete();
    await notesDb.syncQueue.where('userId').equals(userId).delete();
  } catch (err) {
    console.error('[NotesDb] Failed to wipe user notes drafts:', err);
  }
};
