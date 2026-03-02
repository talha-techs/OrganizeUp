import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

export const fetchExploreContent = createAsyncThunk(
  "explore/fetchContent",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/explore", { params });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch explore content",
      );
    }
  },
);

export const fetchExploreItem = createAsyncThunk(
  "explore/fetchItem",
  async ({ contentType, contentId }, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/explore/${contentType}/${contentId}`);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch item",
      );
    }
  },
);

export const voteContent = createAsyncThunk(
  "explore/vote",
  async ({ contentType, contentId, value }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `/social/vote/${contentType}/${contentId}`,
        { value },
      );
      return { contentType, contentId, ...data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to vote");
    }
  },
);

export const fetchComments = createAsyncThunk(
  "explore/fetchComments",
  async ({ contentType, contentId, page = 1 }, { rejectWithValue }) => {
    try {
      const { data } = await api.get(
        `/social/comments/${contentType}/${contentId}`,
        { params: { page } },
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch comments",
      );
    }
  },
);

export const addComment = createAsyncThunk(
  "explore/addComment",
  async ({ contentType, contentId, text }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `/social/comments/${contentType}/${contentId}`,
        { text },
      );
      // Return contentType + contentId so the reducer can update the card's commentCount
      return { ...data, contentType, contentId };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to add comment",
      );
    }
  },
);

export const deleteComment = createAsyncThunk(
  "explore/deleteComment",
  async ({ commentId, contentType, contentId }, { rejectWithValue }) => {
    try {
      await api.delete(`/social/comments/${commentId}`);
      return { commentId, contentType, contentId };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete comment",
      );
    }
  },
);

export const requestPublish = createAsyncThunk(
  "explore/requestPublish",
  async ({ contentType, contentId, category }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `/social/publish-request/${contentType}/${contentId}`,
        { category },
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to request publish",
      );
    }
  },
);

const exploreSlice = createSlice({
  name: "explore",
  initialState: {
    results: { books: [], courses: [], tools: [] },
    totals: { books: 0, courses: 0, tools: 0 },
    currentItem: null,
    comments: [],
    commentsTotal: 0,
    isLoading: false,
    isVoting: false,
    error: null,
  },
  reducers: {
    clearExploreError: (state) => {
      state.error = null;
    },
    clearCurrentItem: (state) => {
      state.currentItem = null;
      state.comments = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExploreContent.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchExploreContent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.results = action.payload.results;
        state.totals = action.payload.totals;
      })
      .addCase(fetchExploreContent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchExploreItem.fulfilled, (state, action) => {
        state.currentItem = action.payload.item;
      })
      .addCase(voteContent.fulfilled, (state, action) => {
        // Update vote counts in results
        const { contentType, contentId, upvotes, downvotes, score, userVote } =
          action.payload;
        const typeKey = contentType + "s";
        const list = state.results[typeKey];
        if (list) {
          const idx = list.findIndex((item) => item._id === contentId);
          if (idx !== -1) {
            list[idx].upvotes = upvotes;
            list[idx].downvotes = downvotes;
            list[idx].score = score;
            list[idx].userVote = userVote;
          }
        }
        if (state.currentItem?._id === contentId) {
          state.currentItem.upvotes = upvotes;
          state.currentItem.downvotes = downvotes;
          state.currentItem.score = score;
          state.currentItem.userVote = userVote;
        }
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.comments = action.payload.comments;
        state.commentsTotal = action.payload.total;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        state.comments.unshift(action.payload.comment);
        state.commentsTotal += 1;
        // Keep the commentCount on the explore results card in sync
        const typeKey = action.payload.contentType + "s";
        const list = state.results[typeKey];
        if (list) {
          const idx = list.findIndex(
            (item) => item._id === action.payload.contentId,
          );
          if (idx !== -1)
            list[idx].commentCount = (list[idx].commentCount || 0) + 1;
        }
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        state.comments = state.comments.filter(
          (c) => c._id !== action.payload.commentId,
        );
        state.commentsTotal = Math.max(0, state.commentsTotal - 1);
        // Keep the commentCount on the explore results card in sync
        const typeKey = action.payload.contentType + "s";
        const list = state.results[typeKey];
        if (list) {
          const idx = list.findIndex(
            (item) => item._id === action.payload.contentId,
          );
          if (idx !== -1)
            list[idx].commentCount = Math.max(
              0,
              (list[idx].commentCount || 0) - 1,
            );
        }
      });
  },
});

export const { clearExploreError, clearCurrentItem } = exploreSlice.actions;
export default exploreSlice.reducer;
