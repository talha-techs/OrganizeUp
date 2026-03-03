import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

export const fetchStats = createAsyncThunk(
  "admin/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/admin/stats");
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch stats",
      );
    }
  },
);

export const fetchUsers = createAsyncThunk(
  "admin/fetchUsers",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/admin/users");
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch users",
      );
    }
  },
);

export const fetchUserDetail = createAsyncThunk(
  "admin/fetchUserDetail",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/admin/users/${id}`);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch user",
      );
    }
  },
);

export const deleteUser = createAsyncThunk(
  "admin/deleteUser",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/admin/users/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete user",
      );
    }
  },
);

export const fetchResourceForReview = createAsyncThunk(
  "admin/fetchResourceForReview",
  async ({ contentType, contentId }, { rejectWithValue }) => {
    try {
      const route =
        contentType === "book"
          ? "/books"
          : contentType === "course"
            ? "/courses"
            : "/tools";
      const { data } = await api.get(`${route}/${contentId}`);
      const resource = data.book || data.course || data.tool;
      return { contentType, resource };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch resource",
      );
    }
  },
);

export const fetchPublishRequests = createAsyncThunk(
  "admin/fetchPublishRequests",
  async (status = "pending", { rejectWithValue }) => {
    try {
      const { data } = await api.get(
        `/social/publish-requests?status=${status}`,
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch publish requests",
      );
    }
  },
);

export const reviewPublishRequest = createAsyncThunk(
  "admin/reviewPublishRequest",
  async ({ id, status, adminNote }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/social/publish-requests/${id}`, {
        status,
        adminNote,
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to review request",
      );
    }
  },
);

export const toggleVisibility = createAsyncThunk(
  "admin/toggleVisibility",
  async ({ contentType, contentId, visibility }, { rejectWithValue }) => {
    try {
      const { data } = await api.put("/admin/toggle-visibility", {
        contentType,
        contentId,
        visibility,
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to toggle visibility",
      );
    }
  },
);

export const fetchAllContent = createAsyncThunk(
  "admin/fetchAllContent",
  async ({ type, search = "", page = 1 }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      if (search) params.set("search", search);
      const { data } = await api.get(`/admin/content/${type}?${params}`);
      return { ...data, contentType: type };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch content",
      );
    }
  },
);

export const adminDeleteContent = createAsyncThunk(
  "admin/deleteContent",
  async ({ type, id }, { rejectWithValue }) => {
    try {
      await api.delete(`/admin/content/${type}/${id}`);
      return { contentType: type, contentId: id };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete content",
      );
    }
  },
);

const adminSlice = createSlice({
  name: "admin",
  initialState: {
    stats: null,
    users: [],
    selectedUser: null,
    publishRequests: [],
    reviewResource: null,
    contentItems: [],
    contentTotal: 0,
    contentType: null,
    isLoading: false,
    error: null,
  },
  reducers: {
    clearAdminError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.stats = action.payload.stats;
      })
      .addCase(fetchUsers.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = action.payload.users;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchUserDetail.fulfilled, (state, action) => {
        state.selectedUser = action.payload.user;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users = state.users.filter((u) => u._id !== action.payload);
      })
      .addCase(fetchPublishRequests.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPublishRequests.fulfilled, (state, action) => {
        state.isLoading = false;
        state.publishRequests = action.payload.requests;
      })
      .addCase(fetchPublishRequests.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(reviewPublishRequest.fulfilled, (state, action) => {
        state.publishRequests = state.publishRequests.filter(
          (r) => r._id !== action.payload.request._id,
        );
        state.reviewResource = null;
      })
      .addCase(fetchResourceForReview.fulfilled, (state, action) => {
        state.reviewResource = action.payload;
      })
      .addCase(fetchAllContent.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchAllContent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.contentItems = action.payload.items;
        state.contentTotal = action.payload.total;
        state.contentType = action.payload.contentType;
      })
      .addCase(fetchAllContent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(adminDeleteContent.fulfilled, (state, action) => {
        state.contentItems = state.contentItems.filter(
          (item) => item._id !== action.payload.contentId,
        );
        state.contentTotal = Math.max(0, state.contentTotal - 1);
      });
  },
});

export const { clearAdminError } = adminSlice.actions;
export default adminSlice.reducer;
