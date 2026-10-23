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

export const fetchAnalytics = createAsyncThunk(
  "admin/fetchAnalytics",
  async (timeRange = "24h", { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/admin/analytics?timeRange=${timeRange}`);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch analytics",
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
            : contentType === "section"
              ? "/sections"
              : "/tools";
      const { data } = await api.get(`${route}/${contentId}`);
      const resource = data.book || data.course || data.section || data.tool;
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

export const fetchContentCounts = createAsyncThunk(
  "admin/fetchContentCounts",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/admin/counts");
      return data.counts;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch content counts",
      );
    }
  },
);

export const fetchAllContent = createAsyncThunk(
  "admin/fetchAllContent",
  async (
    {
      type,
      search = "",
      visibility = "public",
      owner = "",
      sort = "newest",
      page = 1,
      limit = 20,
    },
    { rejectWithValue },
  ) => {
    try {
      const params = new URLSearchParams({
        page,
        limit,
        visibility,
        sort,
      });
      if (search) params.set("search", search);
      if (owner) params.set("owner", owner);
      const { data } = await api.get(`/admin/content/${type}?${params.toString()}`);
      return { ...data, contentType: type, visibility };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch content",
      );
    }
  },
);

export const fetchContentPreview = createAsyncThunk(
  "admin/fetchContentPreview",
  async ({ type, id, reason = "" }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (reason) params.set("reason", reason);
      const queryStr = params.toString() ? `?${params.toString()}` : "";
      const { data } = await api.get(`/admin/content/${type}/${id}/preview${queryStr}`);
      return { type, item: data.item };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch preview",
      );
    }
  },
);

export const unpublishContent = createAsyncThunk(
  "admin/unpublishContent",
  async ({ type, id, reason = "" }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/admin/content/${type}/${id}/unpublish`, {
        reason,
      });
      return { type, id, data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to unpublish content",
      );
    }
  },
);

export const adminDeleteContent = createAsyncThunk(
  "admin/deleteContent",
  async ({ type, id, reason = "" }, { rejectWithValue }) => {
    try {
      await api.delete(`/admin/content/${type}/${id}`, {
        data: { reason },
      });
      return { contentType: type, contentId: id };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete content",
      );
    }
  },
);

export const fetchAuditLogs = createAsyncThunk(
  "admin/fetchAuditLogs",
  async ({ page = 1, limit = 25, action = "", targetType = "" } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ page, limit });
      if (action) params.set("action", action);
      if (targetType) params.set("targetType", targetType);
      const { data } = await api.get(`/admin/audit-logs?${params.toString()}`);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch audit logs",
      );
    }
  },
);

const adminSlice = createSlice({
  name: "admin",
  initialState: {
    stats: null,
    analytics: null,
    analyticsLoading: false,
    analyticsError: null,
    users: [],
    selectedUser: null,
    publishRequests: [],
    reviewResource: null,
    contentCounts: null,
    contentItems: [],
    contentTotal: 0,
    contentType: null,
    contentVisibility: "public",
    contentLoading: false,
    contentError: null,
    contentPreview: null,
    previewLoading: false,
    previewError: null,
    auditLogs: [],
    auditLogsTotal: 0,
    auditLogsLoading: false,
    auditLogsError: null,
    isLoading: false,
    error: null,
  },
  reducers: {
    clearAdminError: (state) => {
      state.error = null;
    },
    clearContentPreview: (state) => {
      state.contentPreview = null;
      state.previewError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.stats = action.payload.stats;
      })
      .addCase(fetchAnalytics.pending, (state) => {
        state.analyticsLoading = true;
        state.analyticsError = null;
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.analyticsLoading = false;
        state.analytics = action.payload;
        if (action.payload?.database?.content) {
          state.stats = {
            users: action.payload.database.users?.total || 0,
            books: action.payload.database.content.books?.total || 0,
            courses: action.payload.database.content.courses?.total || 0,
            tools: action.payload.database.content.tools?.total || 0,
            categories: action.payload.database.content.categories || 0,
            pendingRequests: action.payload.database.content.pendingRequests || 0,
          };
        }
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.analyticsLoading = false;
        state.analyticsError = action.payload;
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
      .addCase(fetchResourceForReview.pending, (state) => {
        state.reviewResource = null;
        state.isLoading = true;
      })
      .addCase(fetchResourceForReview.fulfilled, (state, action) => {
        state.isLoading = false;
        state.reviewResource = action.payload;
      })
      .addCase(fetchResourceForReview.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchContentCounts.fulfilled, (state, action) => {
        state.contentCounts = action.payload;
      })
      .addCase(fetchAllContent.pending, (state) => {
        state.contentLoading = true;
        state.contentError = null;
        state.contentItems = [];
      })
      .addCase(fetchAllContent.fulfilled, (state, action) => {
        state.contentLoading = false;
        state.contentItems = action.payload.items;
        state.contentTotal = action.payload.total;
        state.contentType = action.payload.contentType;
        state.contentVisibility = action.payload.visibility || "public";
      })
      .addCase(fetchAllContent.rejected, (state, action) => {
        state.contentLoading = false;
        state.contentError = action.payload;
      })
      .addCase(fetchContentPreview.pending, (state) => {
        state.previewLoading = true;
        state.previewError = null;
        state.contentPreview = null;
      })
      .addCase(fetchContentPreview.fulfilled, (state, action) => {
        state.previewLoading = false;
        state.contentPreview = action.payload;
      })
      .addCase(fetchContentPreview.rejected, (state, action) => {
        state.previewLoading = false;
        state.previewError = action.payload;
      })
      .addCase(unpublishContent.fulfilled, (state, action) => {
        state.contentItems = state.contentItems.map((item) =>
          item._id === action.payload.id ? { ...item, visibility: "private" } : item,
        );
        if (state.contentPreview?.item?._id === action.payload.id) {
          state.contentPreview.item.visibility = "private";
        }
      })
      .addCase(adminDeleteContent.fulfilled, (state, action) => {
        state.contentItems = state.contentItems.filter(
          (item) => item._id !== action.payload.contentId,
        );
        state.contentTotal = Math.max(0, state.contentTotal - 1);
        if (state.contentPreview?.item?._id === action.payload.contentId) {
          state.contentPreview = null;
        }
      })
      .addCase(fetchAuditLogs.pending, (state) => {
        state.auditLogsLoading = true;
        state.auditLogsError = null;
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.auditLogsLoading = false;
        state.auditLogs = action.payload.logs;
        state.auditLogsTotal = action.payload.total;
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.auditLogsLoading = false;
        state.auditLogsError = action.payload;
      });
  },
});

export const { clearAdminError, clearContentPreview } = adminSlice.actions;
export default adminSlice.reducer;
