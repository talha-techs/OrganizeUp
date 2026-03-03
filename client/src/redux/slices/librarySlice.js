import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

export const fetchLibrary = createAsyncThunk(
  "library/fetchLibrary",
  async (type, { rejectWithValue }) => {
    try {
      const params = type ? { type } : {};
      const { data } = await api.get("/library", { params });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch library",
      );
    }
  },
);

export const addToLibrary = createAsyncThunk(
  "library/addToLibrary",
  async ({ contentType, contentId }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/library/${contentType}/${contentId}`);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to add to library",
      );
    }
  },
);

export const removeFromLibrary = createAsyncThunk(
  "library/removeFromLibrary",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/library/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to remove from library",
      );
    }
  },
);

export const checkInLibrary = createAsyncThunk(
  "library/checkInLibrary",
  async ({ contentType, contentId }, { rejectWithValue }) => {
    try {
      const { data } = await api.get(
        `/library/check/${contentType}/${contentId}`,
      );
      return { contentType, contentId, ...data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to check library",
      );
    }
  },
);

const librarySlice = createSlice({
  name: "library",
  initialState: {
    books: [],
    courses: [],
    tools: [],
    saved: [],
    isLoading: false,
    error: null,
  },
  reducers: {
    clearLibraryError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLibrary.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchLibrary.fulfilled, (state, action) => {
        state.isLoading = false;
        state.books = action.payload.books;
        state.courses = action.payload.courses;
        state.tools = action.payload.tools;
        state.saved = action.payload.saved;
      })
      .addCase(fetchLibrary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(removeFromLibrary.fulfilled, (state, action) => {
        state.saved = state.saved.filter((s) => s._id !== action.payload);
      })
      .addCase(addToLibrary.fulfilled, (state, action) => {
        // action.payload = { message, saved } — saved is the raw UserLibrary doc
        const s = action.payload.saved;
        if (s) {
          // Avoid duplicates if the thunk somehow fires twice
          const exists = state.saved.some((x) => x._id === s._id);
          if (!exists) {
            state.saved.push({
              _id: s._id,
              contentType: s.contentType,
              contentId: s.contentId,
            });
          }
        }
      });
  },
});

export const { clearLibraryError } = librarySlice.actions;
export default librarySlice.reducer;
