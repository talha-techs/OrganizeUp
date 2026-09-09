import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

export const fetchCaptures = createAsyncThunk(
  "captures/fetchCaptures",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/captures", { params });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch captures",
      );
    }
  },
);

export const scrapeMetadata = createAsyncThunk(
  "captures/scrapeMetadata",
  async (url, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/captures/scrape", { url });
      return data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to scrape link preview",
      );
    }
  },
);

export const createCapture = createAsyncThunk(
  "captures/createCapture",
  async (payload, { rejectWithValue }) => {
    try {
      const isFormData = payload instanceof FormData;
      const headers = isFormData
        ? { "Content-Type": "multipart/form-data" }
        : { "Content-Type": "application/json" };
      const { data } = await api.post("/captures", payload, { headers });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to save capture",
      );
    }
  },
);

export const updateCapture = createAsyncThunk(
  "captures/updateCapture",
  async ({ id, data: updateData }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/captures/${id}`, updateData);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update capture",
      );
    }
  },
);

export const toggleCaptureComplete = createAsyncThunk(
  "captures/toggleCaptureComplete",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/captures/${id}/toggle`);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to toggle status",
      );
    }
  },
);

export const deleteCapture = createAsyncThunk(
  "captures/deleteCapture",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(`/captures/${id}`);
      return { id, ...data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete capture",
      );
    }
  },
);

const initialState = {
  captures: [],
  stats: {
    total: 0,
    inbox: 0,
    completed: 0,
    remindersDue: 0,
    activeReminders: 0,
    platforms: {
      all: 0,
      whatsapp: 0,
      instagram: 0,
      facebook: 0,
      linkedin: 0,
      web_image: 0,
    },
  },
  loading: false,
  error: null,
  scrapeLoading: false,
  scrapedData: null,
  scrapeError: null,
  isQuickCaptureOpen: false,
  initialData: null,
};

const captureSlice = createSlice({
  name: "captures",
  initialState,
  reducers: {
    openQuickCapture: (state, action) => {
      state.isQuickCaptureOpen = true;
      state.initialData = action.payload || null;
      state.scrapedData = null;
      state.scrapeError = null;
    },
    closeQuickCapture: (state) => {
      state.isQuickCaptureOpen = false;
      state.initialData = null;
      state.scrapedData = null;
      state.scrapeError = null;
    },
    clearScrapedData: (state) => {
      state.scrapedData = null;
      state.scrapeError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch captures
      .addCase(fetchCaptures.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCaptures.fulfilled, (state, action) => {
        state.loading = false;
        state.captures = action.payload.captures || [];
        if (action.payload.stats) {
          state.stats = action.payload.stats;
        }
      })
      .addCase(fetchCaptures.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Scrape metadata
      .addCase(scrapeMetadata.pending, (state) => {
        state.scrapeLoading = true;
        state.scrapeError = null;
      })
      .addCase(scrapeMetadata.fulfilled, (state, action) => {
        state.scrapeLoading = false;
        state.scrapedData = action.payload;
      })
      .addCase(scrapeMetadata.rejected, (state, action) => {
        state.scrapeLoading = false;
        state.scrapeError = action.payload;
      })

      // Create capture
      .addCase(createCapture.fulfilled, (state, action) => {
        if (action.payload.capture) {
          state.captures.unshift(action.payload.capture);
          state.stats.total += 1;
          state.stats.inbox += 1;
          const plat = action.payload.capture.platform;
          if (state.stats.platforms) {
            state.stats.platforms.all = (state.stats.platforms.all || 0) + 1;
            if (["web_image", "web"].includes(plat)) {
              state.stats.platforms.web_image = (state.stats.platforms.web_image || 0) + 1;
            } else if (state.stats.platforms[plat] !== undefined) {
              state.stats.platforms[plat] += 1;
            }
          }
        }
      })

      // Update capture
      .addCase(updateCapture.fulfilled, (state, action) => {
        if (action.payload.capture) {
          const index = state.captures.findIndex(
            (c) => c._id === action.payload.capture._id,
          );
          if (index !== -1) {
            state.captures[index] = action.payload.capture;
          }
        }
      })

      // Toggle status
      .addCase(toggleCaptureComplete.fulfilled, (state, action) => {
        if (action.payload.capture) {
          const index = state.captures.findIndex(
            (c) => c._id === action.payload.capture._id,
          );
          if (index !== -1) {
            const oldStatus = state.captures[index].status;
            const newStatus = action.payload.capture.status;
            state.captures[index] = action.payload.capture;

            if (oldStatus === "inbox" && newStatus === "completed") {
              state.stats.inbox = Math.max(0, state.stats.inbox - 1);
              state.stats.completed += 1;
            } else if (oldStatus === "completed" && newStatus === "inbox") {
              state.stats.completed = Math.max(0, state.stats.completed - 1);
              state.stats.inbox += 1;
            }
          }
        }
      })

      // Delete capture
      .addCase(deleteCapture.fulfilled, (state, action) => {
        const deletedItem = state.captures.find((c) => c._id === action.payload.id);
        if (deletedItem) {
          state.captures = state.captures.filter((c) => c._id !== action.payload.id);
          state.stats.total = Math.max(0, state.stats.total - 1);
          if (deletedItem.status === "inbox") {
            state.stats.inbox = Math.max(0, state.stats.inbox - 1);
          } else if (deletedItem.status === "completed") {
            state.stats.completed = Math.max(0, state.stats.completed - 1);
          }
          const plat = deletedItem.platform;
          if (state.stats.platforms) {
            state.stats.platforms.all = Math.max(0, (state.stats.platforms.all || 1) - 1);
            if (["web_image", "web"].includes(plat)) {
              state.stats.platforms.web_image = Math.max(
                0,
                (state.stats.platforms.web_image || 1) - 1,
              );
            } else if (state.stats.platforms[plat] !== undefined) {
              state.stats.platforms[plat] = Math.max(0, state.stats.platforms[plat] - 1);
            }
          }
        }
      });
  },
});

export const { openQuickCapture, closeQuickCapture, clearScrapedData } =
  captureSlice.actions;

export default captureSlice.reducer;
