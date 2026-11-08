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
      if (err.response?.status === 409) {
        return rejectWithValue({
          isConflict: true,
          message: err.response.data.message || 'Version conflict detected',
          serverNote: err.response.data.serverNote,
        });
      }
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
  conflictModalData: null, // { localDraft, serverNote }
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
        // Also update matching snippet and title in list item if present
        const item = state.notes.find((n) => n._id === state.activeNote._id);
        if (item) {
          if (action.payload.title !== undefined) item.title = action.payload.title;
          if (action.payload.body !== undefined) {
            item.snippet = action.payload.body.slice(0, 160).replace(/\r?\n/g, ' ');
          }
          if (action.payload.pinned !== undefined) item.pinned = action.payload.pinned;
          if (action.payload.archived !== undefined) item.archived = action.payload.archived;
          if (action.payload.tags !== undefined) item.tags = action.payload.tags;
        }
      }
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
    setConflictModalData: (state, action) => {
      state.conflictModalData = action.payload;
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
        // Prepend to notes list
        const listItem = {
          _id: created._id,
          id: created._id,
          title: created.title,
          snippet: created.body ? created.body.slice(0, 160).replace(/\r?\n/g, ' ') : '',
          pinned: created.pinned,
          archived: created.archived,
          tags: created.tags || [],
          version: created.version || 1,
          clientId: created.clientId,
          updatedAt: created.updatedAt,
          createdAt: created.createdAt,
        };
        const exists = state.notes.some((n) => n._id === created._id);
        if (!exists) {
          state.notes.unshift(listItem);
        }
      }
    });

    // updateNote
    builder.addCase(updateNote.fulfilled, (state, action) => {
      const updated = action.payload.note;
      if (updated) {
        state.activeNote = updated;
        const idx = state.notes.findIndex((n) => n._id === updated._id);
        if (idx !== -1) {
          state.notes[idx] = {
            ...state.notes[idx],
            title: updated.title,
            snippet: updated.body ? updated.body.slice(0, 160).replace(/\r?\n/g, ' ') : '',
            pinned: updated.pinned,
            archived: updated.archived,
            tags: updated.tags || [],
            version: updated.version,
            updatedAt: updated.updatedAt,
          };
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
  setSaveStatus,
  setViewFilter,
  setSearchQuery,
  setSelectedTag,
  setConflictModalData,
  clearNotesState,
} = noteSlice.actions;

export default noteSlice.reducer;

