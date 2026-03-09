import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

export const fetchBooks = createAsyncThunk(
  "books/fetchBooks",
  async (arg, { rejectWithValue }) => {
    try {
      const params = {};
      if (typeof arg === "string") params.type = arg;
      else if (arg && typeof arg === "object") {
        if (arg.type) params.type = arg.type;
        if (arg.mine) params.mine = "true";
      }
      const { data } = await api.get("/books", { params });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch books",
      );
    }
  },
);

export const fetchBook = createAsyncThunk(
  "books/fetchBook",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/books/${id}`);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch book",
      );
    }
  },
);

export const createBook = createAsyncThunk(
  "books/createBook",
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/books", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create book",
      );
    }
  },
);

export const updateBook = createAsyncThunk(
  "books/updateBook",
  async ({ id, formData }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/books/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update book",
      );
    }
  },
);

export const deleteBook = createAsyncThunk(
  "books/deleteBook",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/books/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete book",
      );
    }
  },
);

export const removeVideoFromBook = createAsyncThunk(
  "books/removeVideo",
  async ({ bookId, videoId }, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(`/books/${bookId}/videos/${videoId}`);
      return { bookId, videoId, book: data.book };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to remove video",
      );
    }
  },
);

export const removeAudioFromBook = createAsyncThunk(
  "books/removeAudio",
  async ({ bookId, audioId }, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(`/books/${bookId}/audio/${audioId}`);
      return { bookId, audioId, book: data.book };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to remove audio track",
      );
    }
  },
);

export const updateVideoProgress = createAsyncThunk(
  "books/updateVideoProgress",
  async ({ bookId, progressData }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(
        `/books/${bookId}/video-progress`,
        progressData,
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update progress",
      );
    }
  },
);

export const updateReadingProgress = createAsyncThunk(
  "books/updateReadingProgress",
  async ({ bookId, progressData }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(
        `/books/${bookId}/reading-progress`,
        progressData,
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update progress",
      );
    }
  },
);

export const fetchBookProgress = createAsyncThunk(
  "books/fetchBookProgress",
  async (bookId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/books/${bookId}/progress`);
      return { bookId, ...data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch progress",
      );
    }
  },
);

export const scanDriveFolder = createAsyncThunk(
  "books/scanDriveFolder",
  async (driveLink, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/books/scan-drive", { driveLink });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to scan Drive folder",
      );
    }
  },
);

export const importDriveBook = createAsyncThunk(
  "books/importDriveBook",
  async (bookData, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/books/import-drive", bookData);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to import book",
      );
    }
  },
);

const bookSlice = createSlice({
  name: "books",
  initialState: {
    books: [],
    currentBook: null,
    progress: {},
    driveScanned: null,
    isLoading: false,
    isScanningDrive: false,
    isImporting: false,
    error: null,
  },
  reducers: {
    clearBookError: (state) => {
      state.error = null;
    },
    clearCurrentBook: (state) => {
      state.currentBook = null;
    },
    clearDriveScanned: (state) => {
      state.driveScanned = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBooks.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchBooks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.books = action.payload.books;
      })
      .addCase(fetchBooks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchBook.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchBook.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentBook = action.payload.book;
      })
      .addCase(fetchBook.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createBook.fulfilled, (state, action) => {
        state.books.unshift(action.payload.book);
      })
      .addCase(updateBook.fulfilled, (state, action) => {
        const index = state.books.findIndex(
          (b) => b._id === action.payload.book._id,
        );
        if (index !== -1) state.books[index] = action.payload.book;
        if (state.currentBook?._id === action.payload.book._id) {
          state.currentBook = action.payload.book;
        }
      })
      .addCase(deleteBook.fulfilled, (state, action) => {
        state.books = state.books.filter((b) => b._id !== action.payload);
      })
      .addCase(removeVideoFromBook.fulfilled, (state, action) => {
        const { book } = action.payload;
        const idx = state.books.findIndex((b) => b._id === book._id);
        if (idx !== -1) state.books[idx] = book;
        if (state.currentBook?._id === book._id) state.currentBook = book;
      })
      .addCase(removeAudioFromBook.fulfilled, (state, action) => {
        const { book } = action.payload;
        const idx = state.books.findIndex((b) => b._id === book._id);
        if (idx !== -1) state.books[idx] = book;
        if (state.currentBook?._id === book._id) state.currentBook = book;
      })
      .addCase(fetchBookProgress.fulfilled, (state, action) => {
        state.progress[action.payload.bookId] = {
          videoProgress: action.payload.videoProgress,
          readingProgress: action.payload.readingProgress,
        };
      })
      .addCase(updateVideoProgress.fulfilled, () => {
        // Progress is stored on user, will be refreshed via getMe
      })
      .addCase(updateReadingProgress.fulfilled, () => {
        // Progress is stored on user, will be refreshed via getMe
      })
      // Drive scan
      .addCase(scanDriveFolder.pending, (state) => {
        state.isScanningDrive = true;
        state.driveScanned = null;
        state.error = null;
      })
      .addCase(scanDriveFolder.fulfilled, (state, action) => {
        state.isScanningDrive = false;
        state.driveScanned = action.payload;
      })
      .addCase(scanDriveFolder.rejected, (state, action) => {
        state.isScanningDrive = false;
        state.error = action.payload;
      })
      // Drive import
      .addCase(importDriveBook.pending, (state) => {
        state.isImporting = true;
      })
      .addCase(importDriveBook.fulfilled, (state, action) => {
        state.isImporting = false;
        state.books.unshift(action.payload.book);
        state.driveScanned = null;
      })
      .addCase(importDriveBook.rejected, (state, action) => {
        state.isImporting = false;
        state.error = action.payload;
      });
  },
});

export const { clearBookError, clearCurrentBook, clearDriveScanned } =
  bookSlice.actions;
export default bookSlice.reducer;
