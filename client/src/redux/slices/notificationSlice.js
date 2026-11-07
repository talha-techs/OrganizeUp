import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

export const fetchNotifications = createAsyncThunk(
  "notifications/fetchNotifications",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/notifications?limit=50");
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to load notifications"
      );
    }
  }
);

export const markNotificationsRead = createAsyncThunk(
  "notifications/markAllRead",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.patch("/notifications/read-all");
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to mark notifications read"
      );
    }
  }
);

export const markSingleNotificationRead = createAsyncThunk(
  "notifications/markSingleRead",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/notifications/${id}/read`);
      return { id, notification: res.data?.notification };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to mark notification read"
      );
    }
  }
);

const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
};

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    addRealtimeNotification: (state, action) => {
      state.notifications.unshift(action.payload);
      state.unreadCount += 1;
    },
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.notifications || [];
        state.unreadCount = action.payload.unreadCount || 0;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Mark All Read
      .addCase(markNotificationsRead.fulfilled, (state) => {
        state.unreadCount = 0;
        state.notifications = state.notifications.map((n) => ({
          ...n,
          read: true,
          readAt: n.readAt || new Date().toISOString(),
        }));
      })
      // Mark Single Read
      .addCase(markSingleNotificationRead.fulfilled, (state, action) => {
        const id = action.payload.id;
        const item = state.notifications.find((n) => (n._id || n.id) === id);
        if (item && !item.read) {
          item.read = true;
          item.readAt = new Date().toISOString();
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      });
  },
});

export const { addRealtimeNotification, clearNotifications } =
  notificationSlice.actions;
export default notificationSlice.reducer;

