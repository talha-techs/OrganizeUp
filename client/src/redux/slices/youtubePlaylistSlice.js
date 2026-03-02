import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

export const fetchPlaylists = createAsyncThunk(
  "playlists/fetchPlaylists",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/youtube-playlists");
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch playlists",
      );
    }
  },
);

export const fetchPlaylist = createAsyncThunk(
  "playlists/fetchPlaylist",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/youtube-playlists/${id}`);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch playlist",
      );
    }
  },
);

export const addPlaylist = createAsyncThunk(
  "playlists/addPlaylist",
  async (playlistData, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/youtube-playlists", playlistData);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to add playlist",
      );
    }
  },
);

export const updatePlaylist = createAsyncThunk(
  "playlists/updatePlaylist",
  async ({ id, data: updateData }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/youtube-playlists/${id}`, updateData);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update playlist",
      );
    }
  },
);

export const deletePlaylist = createAsyncThunk(
  "playlists/deletePlaylist",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/youtube-playlists/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete playlist",
      );
    }
  },
);

export const saveVideoNotes = createAsyncThunk(
  "playlists/saveVideoNotes",
  async ({ playlistId, videoId, notes }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(
        `/youtube-playlists/${playlistId}/videos/${videoId}/notes`,
        { notes },
      );
      return { videoId, notes, data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to save notes",
      );
    }
  },
);

export const fetchCombinedNotes = createAsyncThunk(
  "playlists/fetchCombinedNotes",
  async (playlistId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/youtube-playlists/${playlistId}/notes`);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch notes",
      );
    }
  },
);

export const refreshPlaylist = createAsyncThunk(
  "playlists/refreshPlaylist",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/youtube-playlists/${id}/refresh`);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to refresh playlist",
      );
    }
  },
);

const youtubePlaylistSlice = createSlice({
  name: "playlists",
  initialState: {
    playlists: [],
    currentPlaylist: null,
    combinedNotes: "",
    isLoading: false,
    isSavingNotes: false,
    error: null,
  },
  reducers: {
    clearPlaylistError: (state) => {
      state.error = null;
    },
    clearCurrentPlaylist: (state) => {
      state.currentPlaylist = null;
      state.combinedNotes = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlaylists.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPlaylists.fulfilled, (state, action) => {
        state.isLoading = false;
        state.playlists = action.payload.playlists;
      })
      .addCase(fetchPlaylists.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchPlaylist.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPlaylist.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentPlaylist = action.payload.playlist;
      })
      .addCase(fetchPlaylist.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(addPlaylist.fulfilled, (state, action) => {
        state.playlists.unshift(action.payload.playlist);
      })
      .addCase(updatePlaylist.fulfilled, (state, action) => {
        const idx = state.playlists.findIndex(
          (p) => p._id === action.payload.playlist._id,
        );
        if (idx !== -1) state.playlists[idx] = action.payload.playlist;
        if (state.currentPlaylist?._id === action.payload.playlist._id) {
          state.currentPlaylist = action.payload.playlist;
        }
      })
      .addCase(deletePlaylist.fulfilled, (state, action) => {
        state.playlists = state.playlists.filter(
          (p) => p._id !== action.payload,
        );
      })
      .addCase(saveVideoNotes.pending, (state) => {
        state.isSavingNotes = true;
      })
      .addCase(saveVideoNotes.fulfilled, (state, action) => {
        state.isSavingNotes = false;
        // Update the video's notes in currentPlaylist
        if (state.currentPlaylist) {
          const video = state.currentPlaylist.videos.find(
            (v) => v.videoId === action.payload.videoId,
          );
          if (video) {
            video.notes = action.payload.notes;
          }
        }
      })
      .addCase(saveVideoNotes.rejected, (state) => {
        state.isSavingNotes = false;
      })
      .addCase(fetchCombinedNotes.fulfilled, (state, action) => {
        state.combinedNotes = action.payload.combinedNotes;
      })
      .addCase(refreshPlaylist.fulfilled, (state, action) => {
        const idx = state.playlists.findIndex(
          (p) => p._id === action.payload.playlist._id,
        );
        if (idx !== -1) state.playlists[idx] = action.payload.playlist;
        if (state.currentPlaylist?._id === action.payload.playlist._id) {
          state.currentPlaylist = action.payload.playlist;
        }
      });
  },
});

export const { clearPlaylistError, clearCurrentPlaylist } =
  youtubePlaylistSlice.actions;
export default youtubePlaylistSlice.reducer;
