import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export const fetchNotes = createAsyncThunk(
  'notes/fetchNotes',
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get('/notes', { params });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load notes');
    }
  }
);

export const fetchNoteById = createAsyncThunk(
  'notes/fetchNoteById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`/notes/${id}`);
      return res.data.note;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Note not found');
    }
  }
);

export const createNote = createAsyncThunk(
  'notes/createNote',
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post('/notes', data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create note');
    }
  }
);

export const updateNote = createAsyncThunk(
  'notes/updateNote',
  async ({ id, data, baseVersion }, { rejectWithValue }) => {
    try {
      const payload = { ...data };
      if (baseVersion !== undefined && baseVersion !== null) {
        payload.baseVersion = baseVersion;
      }
      const res = await api.patch(`/notes/${id}`, payload);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update note');
    }
  }
);

export const softDeleteNote = createAsyncThunk(
  'notes/softDeleteNote',
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.delete(`/notes/${id}`);
      return { id, data: res.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete note');
    }
  }
);

export const restoreNote = createAsyncThunk(
  'notes/restoreNote',
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.post(`/notes/${id}/restore`);
      return res.data.note;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to restore note');
    }
  }
);

export const permanentDeleteNote = createAsyncThunk(
  'notes/permanentDeleteNote',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/notes/${id}/permanent`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to permanently delete note');
    }
  }
);

const sortNotesArray = (arr) => {
  if (!Array.isArray(arr)) return;
  arr.sort((a, b) => {
    const aPin = Boolean(a.pinned);
    const bPin = Boolean(b.pinned);
    if (aPin !== bPin) {
      return aPin ? -1 : 1;
    }
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
};

const initialState = {
  notes: [],
  hasMore: false,
  nextCursor: null,
  activeNoteId: null,
  activeNote: null,
  isLoading: false,
  isLoadingActiveNote: false,
  saveStatus: 'saved', // 'saved' | 'saving' | 'offline' | 'error'
  statusMessage: 'Saved',
  viewFilter: 'active', // 'active' | 'archived' | 'trash'
  searchQuery: '',
  selectedTag: null,
};

const noteSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    setActiveNoteId: (state, action) => {
      state.activeNoteId = action.payload;
    },
    setActiveNote: (state, action) => {
      state.activeNote = action.payload;
      if (action.payload) {
        state.activeNoteId = action.payload._id;
      }
    },
    updateActiveNoteDraft: (state, action) => {
      if (state.activeNote) {
        state.activeNote = { ...state.activeNote, ...action.payload };
        const activeId = state.activeNote._id;
        const activeClient = state.activeNote.clientId;
        const idx = state.notes.findIndex(
          (n) => (activeId && (n._id === activeId || n.id === activeId)) || (activeClient && n.clientId === activeClient)
        );
        if (idx !== -1) {
          const item = state.notes[idx];
          if (action.payload.title !== undefined) item.title = action.payload.title;
          if (action.payload.body !== undefined) {
            item.body = action.payload.body;
            item.snippet = action.payload.body.slice(0, 160).replace(/\r?\n/g, ' ');
          }
          if (action.payload.pinned !== undefined) item.pinned = Boolean(action.payload.pinned);
          if (action.payload.archived !== undefined) item.archived = Boolean(action.payload.archived);
          if (action.payload.tags !== undefined) item.tags = action.payload.tags;
          item.updatedAt = new Date().toISOString();
        } else {
          state.notes.unshift({
            _id: activeId,
            id: activeId,
            clientId: activeClient || null,
            title: state.activeNote.title || '',
            body: state.activeNote.body || '',
            snippet: state.activeNote.body ? state.activeNote.body.slice(0, 160).replace(/\r?\n/g, ' ') : '',
            pinned: Boolean(state.activeNote.pinned),
            archived: Boolean(state.activeNote.archived),
            tags: state.activeNote.tags || [],
            version: state.activeNote.version || 1,
            createdAt: state.activeNote.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isLocalDraft: Boolean(state.activeNote.isLocalDraft),
          });
        }
        sortNotesArray(state.notes);
      }
    },
    upsertNoteInList: (state, action) => {
      const note = action.payload;
      if (!note) return;
      const id = note._id || note.id;
      const clientId = note.clientId;
      const idx = state.notes.findIndex(
        (n) => (id && (n._id === id || n.id === id)) || (clientId && n.clientId === clientId)
      );

      const item = {
        _id: id,
        id: id,
        clientId: clientId || null,
        title: note.title !== undefined ? note.title : '',
        body: note.body !== undefined ? note.body : '',
        snippet: note.body ? note.body.slice(0, 160).replace(/\r?\n/g, ' ') : (note.snippet || ''),
        pinned: Boolean(note.pinned),
        archived: Boolean(note.archived),
        tags: note.tags || [],
        version: note.version || 1,
        createdAt: note.createdAt || new Date().toISOString(),
        updatedAt: note.updatedAt || new Date().toISOString(),
        isLocalDraft: Boolean(note.isLocalDraft),
      };

      if (idx !== -1) {
        state.notes[idx] = { ...state.notes[idx], ...item };
      } else {
        state.notes.unshift(item);
      }
      sortNotesArray(state.notes);
    },
    removeNoteFromList: (state, action) => {
      const targetId = action.payload;
      state.notes = state.notes.filter(
        (n) => n._id !== targetId && n.id !== targetId && n.clientId !== targetId
      );
    },
    setSaveStatus: (state, action) => {
      state.saveStatus = action.payload.status;
      state.statusMessage = action.payload.message || action.payload.status;
    },
    setViewFilter: (state, action) => {
      state.viewFilter = action.payload;
      state.selectedTag = null;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setSelectedTag: (state, action) => {
      state.selectedTag = action.payload;
    },
    clearNotesState: () => initialState,
  },
  extraReducers: (builder) => {
    // fetchNotes
    builder
      .addCase(fetchNotes.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchNotes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notes = action.payload.notes || [];
        sortNotesArray(state.notes);
        state.hasMore = action.payload.hasMore || false;
        state.nextCursor = action.payload.nextCursor || null;
      })
      .addCase(fetchNotes.rejected, (state, action) => {
        state.isLoading = false;
        toast.error(action.payload || 'Failed to load notes');
      });

    // fetchNoteById
    builder
      .addCase(fetchNoteById.pending, (state) => {
        state.isLoadingActiveNote = true;
      })
      .addCase(fetchNoteById.fulfilled, (state, action) => {
        state.isLoadingActiveNote = false;
        state.activeNote = action.payload;
        state.activeNoteId = action.payload?._id || null;
      })
      .addCase(fetchNoteById.rejected, (state, action) => {
        state.isLoadingActiveNote = false;
        toast.error(action.payload || 'Could not load note');
      });

    // createNote
    builder.addCase(createNote.fulfilled, (state, action) => {
      const created = action.payload.note;
      if (created) {
        state.activeNote = created;
        state.activeNoteId = created._id;
        const listItem = {
          _id: created._id,
          id: created._id,
          title: created.title,
          snippet: created.body ? created.body.slice(0, 160).replace(/\r?\n/g, ' ') : '',
          pinned: Boolean(created.pinned),
          archived: Boolean(created.archived),
          tags: created.tags || [],
          version: created.version || 1,
          clientId: created.clientId,
          updatedAt: created.updatedAt,
          createdAt: created.createdAt,
        };
        const idx = state.notes.findIndex(
          (n) => n._id === created._id || (created.clientId && n.clientId === created.clientId)
        );
        if (idx !== -1) {
          state.notes[idx] = { ...state.notes[idx], ...listItem };
        } else {
          state.notes.unshift(listItem);
        }
        sortNotesArray(state.notes);
      }
    });

    // updateNote
    builder.addCase(updateNote.fulfilled, (state, action) => {
      const updated = action.payload.note;
      if (updated) {
        state.activeNote = updated;
        const idx = state.notes.findIndex(
          (n) => n._id === updated._id || (updated.clientId && n.clientId === updated.clientId)
        );
        if (idx !== -1) {
          state.notes[idx] = {
            ...state.notes[idx],
            _id: updated._id,
            id: updated._id,
            title: updated.title,
            snippet: updated.body
              ? updated.body.slice(0, 160).replace(/\r?\n/g, ' ')
              : updated.snippet || state.notes[idx].snippet || '',
            pinned: Boolean(updated.pinned),
            archived: Boolean(updated.archived),
            tags: updated.tags || [],
            version: updated.version,
            updatedAt: updated.updatedAt,
          };
          sortNotesArray(state.notes);
        }
      }
    });

    // softDeleteNote
    builder.addCase(softDeleteNote.fulfilled, (state, action) => {
      const id = action.payload.id;
      if (state.viewFilter !== 'trash') {
        state.notes = state.notes.filter((n) => n._id !== id);
      }
      if (state.activeNoteId === id) {
        state.activeNote = null;
        state.activeNoteId = null;
      }
      toast.success('Note moved to trash');
    });

    // restoreNote
    builder.addCase(restoreNote.fulfilled, (state, action) => {
      const restored = action.payload;
      if (state.viewFilter === 'trash') {
        state.notes = state.notes.filter((n) => n._id !== restored._id);
      }
      if (state.activeNoteId === restored._id) {
        state.activeNote = restored;
      }
      toast.success('Note restored to active list');
    });

    // permanentDeleteNote
    builder.addCase(permanentDeleteNote.fulfilled, (state, action) => {
      const id = action.payload;
      state.notes = state.notes.filter((n) => n._id !== id);
      if (state.activeNoteId === id) {
        state.activeNote = null;
        state.activeNoteId = null;
      }
      toast.success('Note permanently deleted');
    });
  },
});

export const {
  setActiveNoteId,
  setActiveNote,
  updateActiveNoteDraft,
  upsertNoteInList,
  removeNoteFromList,
  setSaveStatus,
  setViewFilter,
  setSearchQuery,
  setSelectedTag,
  clearNotesState,
} = noteSlice.actions;

export default noteSlice.reducer;

