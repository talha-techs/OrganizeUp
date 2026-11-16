import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

// Fetch user profile (or initialize default)
export const fetchHabitProfile = createAsyncThunk(
  "habits/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/habits/profile");
      return res.data.profile;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load habit profile");
    }
  }
);

// Update profile (tagline or wins)
export const updateHabitProfile = createAsyncThunk(
  "habits/updateProfile",
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.put("/habits/profile", data);
      return res.data.profile;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update profile");
    }
  }
);

// Add a new habit
export const addHabit = createAsyncThunk(
  "habits/addHabit",
  async ({ name, icon }, { rejectWithValue }) => {
    try {
      const res = await api.post("/habits", { name, icon });
      return res.data.profile;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to add habit");
    }
  }
);

// Update habit details
export const updateHabit = createAsyncThunk(
  "habits/updateHabit",
  async ({ habitId, ...data }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/habits/${habitId}`, data);
      return res.data.profile;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update habit");
    }
  }
);

// Delete habit
export const deleteHabit = createAsyncThunk(
  "habits/deleteHabit",
  async (habitId, { rejectWithValue }) => {
    try {
      const res = await api.delete(`/habits/${habitId}`);
      return { profile: res.data.profile, deletedHabitId: habitId };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete habit");
    }
  }
);

// Reorder table columns
export const reorderColumns = createAsyncThunk(
  "habits/reorderColumns",
  async (columnOrder, { rejectWithValue }) => {
    try {
      const res = await api.put("/habits/columns/reorder", { columnOrder });
      return res.data.columnOrder;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to reorder columns");
    }
  }
);

// Reorder habits list
export const reorderHabits = createAsyncThunk(
  "habits/reorderHabits",
  async (habitIds, { rejectWithValue }) => {
    try {
      const res = await api.put("/habits/reorder", { habitIds });
      return res.data.profile;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to reorder habits");
    }
  }
);

// Fetch habit logs for date range
export const fetchHabitLogs = createAsyncThunk(
  "habits/fetchLogs",
  async ({ startDate, endDate } = {}, { rejectWithValue }) => {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await api.get("/habits/logs", { params });
      return res.data.logs;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load logs");
    }
  }
);

// Toggle habit checkbox (with optimistic UI update)
export const toggleHabit = createAsyncThunk(
  "habits/toggleHabit",
  async ({ date, habitId }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/habits/logs/${date}/toggle`, { habitId });
      return res.data.log;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to toggle habit");
    }
  }
);

// Save daily reflection note
export const saveHabitNote = createAsyncThunk(
  "habits/saveNote",
  async ({ date, notes }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/habits/logs/${date}/note`, { notes });
      return res.data.log;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to save note");
    }
  }
);

// Update milestone in My Wins
export const updateWinMilestone = createAsyncThunk(
  "habits/updateWinMilestone",
  async ({ winId, reward, notes, achievedDate }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/habits/wins/${winId}`, { reward, notes, achievedDate });
      return res.data.profile;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update milestone");
    }
  }
);

// Fetch stats & monthly overview
export const fetchHabitStats = createAsyncThunk(
  "habits/fetchStats",
  async (year, { rejectWithValue }) => {
    try {
      const res = await api.get("/habits/stats", { params: { year } });
      return res.data.stats;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to calculate stats");
    }
  }
);

const initialState = {
  profile: {
    tagline: "Progress not Perfection",
    habits: [],
    columnOrder: [],
    wins: [],
  },
  logs: {}, // Keyed by YYYY-MM-DD
  stats: {
    year: new Date().getFullYear(),
    currentStreak: 0,
    longestStreak: 0,
    totalWinningDays: 0,
    monthlyProgress: {},
  },
  isLoading: false,
  error: null,
};

const habitSlice = createSlice({
  name: "habits",
  initialState,
  reducers: {
    setColumnOrderOptimistic: (state, action) => {
      state.profile.columnOrder = action.payload;
    },
    toggleHabitOptimistic: (state, action) => {
      const { date, habitId } = action.payload;
      if (!state.logs[date]) {
        state.logs[date] = { date, completedHabits: [habitId], notes: "" };
      } else {
        const completed = state.logs[date].completedHabits || [];
        const idx = completed.indexOf(habitId);
        if (idx > -1) {
          completed.splice(idx, 1);
        } else {
          completed.push(habitId);
        }
      }
    },
    setNoteOptimistic: (state, action) => {
      const { date, notes } = action.payload;
      if (!state.logs[date]) {
        state.logs[date] = { date, completedHabits: [], notes };
      } else {
        state.logs[date].notes = notes;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Profile
      .addCase(fetchHabitProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchHabitProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
      })
      .addCase(fetchHabitProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Updates returning updated profile
      .addCase(updateHabitProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
      })
      .addCase(addHabit.fulfilled, (state, action) => {
        state.profile = action.payload;
      })
      .addCase(updateHabit.fulfilled, (state, action) => {
        state.profile = action.payload;
      })
      .addCase(deleteHabit.fulfilled, (state, action) => {
        state.profile = action.payload.profile;
        const deletedId = action.payload.deletedHabitId;
        // Clean from cached logs
        Object.values(state.logs).forEach((log) => {
          if (Array.isArray(log.completedHabits)) {
            log.completedHabits = log.completedHabits.filter((id) => id !== deletedId);
          }
        });
      })
      .addCase(reorderHabits.fulfilled, (state, action) => {
        state.profile = action.payload;
      })
      .addCase(updateWinMilestone.fulfilled, (state, action) => {
        state.profile = action.payload;
      })

      // Reorder columns
      .addCase(reorderColumns.fulfilled, (state, action) => {
        state.profile.columnOrder = action.payload;
      })

      // Fetch logs
      .addCase(fetchHabitLogs.fulfilled, (state, action) => {
        action.payload.forEach((log) => {
          state.logs[log.date] = log;
        });
      })

      // Toggle & Note responses
      .addCase(toggleHabit.fulfilled, (state, action) => {
        if (action.payload) {
          state.logs[action.payload.date] = action.payload;
        }
      })
      .addCase(saveHabitNote.fulfilled, (state, action) => {
        if (action.payload) {
          state.logs[action.payload.date] = action.payload;
        }
      })

      // Stats
      .addCase(fetchHabitStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  },
});

export const { setColumnOrderOptimistic, toggleHabitOptimistic, setNoteOptimistic } = habitSlice.actions;
export default habitSlice.reducer;
