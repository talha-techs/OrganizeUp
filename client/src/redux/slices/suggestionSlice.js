import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

export const submitSuggestion = createAsyncThunk(
  "suggestions/submitSuggestion",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/suggestions", payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to submit feature suggestion",
      );
    }
  },
);

export const fetchMySuggestions = createAsyncThunk(
  "suggestions/fetchMySuggestions",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/suggestions/my");
      return data.suggestions;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch your suggestions",
      );
    }
  },
);

export const updateMySuggestion = createAsyncThunk(
  "suggestions/updateMySuggestion",
  async (
    { id, title, targetArea, problemStatement, proposedSolution, impact },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.put(`/suggestions/my/${id}`, {
        title,
        targetArea,
        problemStatement,
        proposedSolution,
        impact,
      });
      return data.suggestion;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update your suggestion",
      );
    }
  },
);

export const fetchAllSuggestions = createAsyncThunk(
  "suggestions/fetchAllSuggestions",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/suggestions", { params });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch suggestions",
      );
    }
  },
);

export const fetchSuggestionStats = createAsyncThunk(
  "suggestions/fetchSuggestionStats",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/suggestions/stats");
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch suggestion stats",
      );
    }
  },
);

export const updateSuggestionStatus = createAsyncThunk(
  "suggestions/updateSuggestionStatus",
  async ({ id, status, adminNotes }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/suggestions/${id}`, {
        status,
        adminNotes,
      });
      return data.suggestion;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update suggestion",
      );
    }
  },
);

export const deleteSuggestion = createAsyncThunk(
  "suggestions/deleteSuggestion",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/suggestions/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete suggestion",
      );
    }
  },
);

const suggestionSlice = createSlice({
  name: "suggestions",
  initialState: {
    mySuggestions: [],
    allSuggestions: [],
    stats: {
      total: 0,
      pending: 0,
      underReview: 0,
      planned: 0,
      completed: 0,
      dismissed: 0,
    },
    pagination: {
      page: 1,
      pages: 1,
      total: 0,
    },
    isLoading: false,
    isSubmitting: false,
    isUpdating: false,
    error: null,
  },
  reducers: {
    clearSuggestionError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Submit Suggestion
      .addCase(submitSuggestion.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(submitSuggestion.fulfilled, (state, action) => {
        state.isSubmitting = false;
        if (action.payload?.suggestion) {
          state.mySuggestions.unshift(action.payload.suggestion);
        }
      })
      .addCase(submitSuggestion.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload;
      })

      // Fetch My Suggestions
      .addCase(fetchMySuggestions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMySuggestions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.mySuggestions = action.payload || [];
      })
      .addCase(fetchMySuggestions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Fetch All Suggestions (Admin)
      .addCase(fetchAllSuggestions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllSuggestions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.allSuggestions = action.payload?.suggestions || [];
        state.pagination = {
          page: action.payload?.page || 1,
          pages: action.payload?.pages || 1,
          total: action.payload?.total || 0,
        };
      })
      .addCase(fetchAllSuggestions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Fetch Stats (Admin)
      .addCase(fetchSuggestionStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })

      // Update Suggestion (Admin)
      .addCase(updateSuggestionStatus.pending, (state) => {
        state.isUpdating = true;
      })
      .addCase(updateSuggestionStatus.fulfilled, (state, action) => {
        state.isUpdating = false;
        const updated = action.payload;
        if (updated) {
          const index = state.allSuggestions.findIndex(
            (s) => s._id === updated._id,
          );
          if (index !== -1) {
            state.allSuggestions[index] = updated;
          }
          const myIndex = state.mySuggestions.findIndex(
            (s) => s._id === updated._id,
          );
          if (myIndex !== -1) {
            state.mySuggestions[myIndex] = updated;
          }
        }
      })
      .addCase(updateSuggestionStatus.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload;
      })

      // Update My Suggestion (User)
      .addCase(updateMySuggestion.pending, (state) => {
        state.isUpdating = true;
      })
      .addCase(updateMySuggestion.fulfilled, (state, action) => {
        state.isUpdating = false;
        const updated = action.payload;
        if (updated) {
          const myIndex = state.mySuggestions.findIndex(
            (s) => s._id === updated._id,
          );
          if (myIndex !== -1) {
            state.mySuggestions[myIndex] = updated;
          }
          const allIndex = state.allSuggestions.findIndex(
            (s) => s._id === updated._id,
          );
          if (allIndex !== -1) {
            state.allSuggestions[allIndex] = updated;
          }
        }
      })
      .addCase(updateMySuggestion.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload;
      })

      // Delete Suggestion (Admin)
      .addCase(deleteSuggestion.fulfilled, (state, action) => {
        const id = action.payload;
        state.allSuggestions = state.allSuggestions.filter((s) => s._id !== id);
        state.mySuggestions = state.mySuggestions.filter((s) => s._id !== id);
        if (state.stats.total > 0) state.stats.total -= 1;
      });
  },
});

export const { clearSuggestionError } = suggestionSlice.actions;
export default suggestionSlice.reducer;
