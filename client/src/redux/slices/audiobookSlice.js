import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

export const fetchExploreAudiobooks = createAsyncThunk(
  "audiobooks/fetchExploreAudiobooks",
  async ({ page = 1, limit = 20, genre = "", search = "" } = {}, { rejectWithValue }) => {
    try {
      const params = { page, limit };
      if (genre && genre !== "all" && genre !== "All") params.genre = genre;
      if (search && search.trim()) params.search = search.trim();
      const { data } = await api.get("/audiobooks/explore", { params });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch audiobooks",
      );
    }
  },
);

export const fetchAudiobookById = createAsyncThunk(
  "audiobooks/fetchAudiobookById",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/audiobooks/${id}`);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch audiobook",
      );
    }
  },
);

export const saveAudiobook = createAsyncThunk(
  "audiobooks/saveAudiobook",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/audiobooks/${id}/save`);
      return { id, ...data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to save audiobook",
      );
    }
  },
);

export const unsaveAudiobook = createAsyncThunk(
  "audiobooks/unsaveAudiobook",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(`/audiobooks/${id}/unsave`);
      return { id, ...data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to remove audiobook from library",
      );
    }
  },
);

const audiobookSlice = createSlice({
  name: "audiobooks",
  initialState: {
    audiobooks: [],
    page: 1,
    limit: 20,
    hasMore: false,
    selectedGenre: "All",
    searchQuery: "",
    isLoading: false,
    error: null,
    currentAudiobook: null,
    activePlayerBook: null, // Currently active audiobook in quick player modal
  },
  reducers: {
    setSelectedGenre: (state, action) => {
      state.selectedGenre = action.payload;
      state.page = 1;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
      state.page = 1;
    },
    setAudiobookPage: (state, action) => {
      state.page = action.payload;
    },
    setActivePlayerBook: (state, action) => {
      state.activePlayerBook = action.payload;
    },
    clearActivePlayerBook: (state) => {
      state.activePlayerBook = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch explore audiobooks
      .addCase(fetchExploreAudiobooks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExploreAudiobooks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.audiobooks = action.payload.books || [];
        state.page = action.payload.page || 1;
        state.limit = action.payload.limit || 20;
        state.hasMore = action.payload.hasMore || false;
      })
      .addCase(fetchExploreAudiobooks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.audiobooks = [];
      })
      // Fetch single audiobook
      .addCase(fetchAudiobookById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchAudiobookById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentAudiobook = action.payload.book;
      })
      .addCase(fetchAudiobookById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Save audiobook
      .addCase(saveAudiobook.fulfilled, (state, action) => {
        const { id, libraryId, book } = action.payload;
        const index = state.audiobooks.findIndex((b) => b.id === id);
        if (index !== -1) {
          state.audiobooks[index].isSaved = true;
          state.audiobooks[index].libraryId = libraryId;
          state.audiobooks[index].dbBookId = book?._id;
        }
        if (state.activePlayerBook?.id === id) {
          state.activePlayerBook.isSaved = true;
          state.activePlayerBook.libraryId = libraryId;
        }
      })
      // Unsave audiobook
      .addCase(unsaveAudiobook.fulfilled, (state, action) => {
        const { id } = action.payload;
        const index = state.audiobooks.findIndex((b) => b.id === id);
        if (index !== -1) {
          state.audiobooks[index].isSaved = false;
          state.audiobooks[index].libraryId = null;
        }
        if (state.activePlayerBook?.id === id) {
          state.activePlayerBook.isSaved = false;
          state.activePlayerBook.libraryId = null;
        }
      });
  },
});

export const {
  setSelectedGenre,
  setSearchQuery,
  setAudiobookPage,
  setActivePlayerBook,
  clearActivePlayerBook,
} = audiobookSlice.actions;

export default audiobookSlice.reducer;
