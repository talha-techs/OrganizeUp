import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

export const fetchTools = createAsyncThunk(
  "tools/fetchTools",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/tools");
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch tools",
      );
    }
  },
);

export const fetchTool = createAsyncThunk(
  "tools/fetchTool",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/tools/${id}`);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch tool",
      );
    }
  },
);

export const createTool = createAsyncThunk(
  "tools/createTool",
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/tools", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create tool",
      );
    }
  },
);

export const updateTool = createAsyncThunk(
  "tools/updateTool",
  async ({ id, formData }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/tools/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update tool",
      );
    }
  },
);

export const deleteTool = createAsyncThunk(
  "tools/deleteTool",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/tools/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete tool",
      );
    }
  },
);

export const importToTool = createAsyncThunk(
  "tools/importToTool",
  async ({ toolId, importData }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/tools/${toolId}/import`, importData);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to import files",
      );
    }
  },
);

export const removeFileFromTool = createAsyncThunk(
  "tools/removeFile",
  async ({ toolId, fileId }, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(`/tools/${toolId}/files/${fileId}`);
      return { toolId, fileId, tool: data.tool };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to remove file",
      );
    }
  },
);

const toolSlice = createSlice({
  name: "tools",
  initialState: {
    tools: [],
    currentTool: null,
    isLoading: false,
    error: null,
  },
  reducers: {
    clearToolError: (state) => {
      state.error = null;
    },
    clearCurrentTool: (state) => {
      state.currentTool = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTools.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchTools.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tools = action.payload.tools;
      })
      .addCase(fetchTools.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch single tool
      .addCase(fetchTool.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchTool.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentTool = action.payload.tool;
      })
      .addCase(fetchTool.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createTool.fulfilled, (state, action) => {
        state.tools.unshift(action.payload.tool);
      })
      .addCase(updateTool.fulfilled, (state, action) => {
        const index = state.tools.findIndex(
          (t) => t._id === action.payload.tool._id,
        );
        if (index !== -1) state.tools[index] = action.payload.tool;
        if (state.currentTool?._id === action.payload.tool._id) {
          state.currentTool = action.payload.tool;
        }
      })
      .addCase(deleteTool.fulfilled, (state, action) => {
        state.tools = state.tools.filter((t) => t._id !== action.payload);
      })
      // Import files
      .addCase(importToTool.fulfilled, (state, action) => {
        const idx = state.tools.findIndex(
          (t) => t._id === action.payload.tool._id,
        );
        if (idx !== -1) state.tools[idx] = action.payload.tool;
        if (state.currentTool?._id === action.payload.tool._id) {
          state.currentTool = action.payload.tool;
        }
      })
      // Remove file
      .addCase(removeFileFromTool.fulfilled, (state, action) => {
        if (action.payload.tool) {
          const idx = state.tools.findIndex(
            (t) => t._id === action.payload.tool._id,
          );
          if (idx !== -1) state.tools[idx] = action.payload.tool;
          if (state.currentTool?._id === action.payload.tool._id) {
            state.currentTool = action.payload.tool;
          }
        }
      });
  },
});

export const { clearToolError, clearCurrentTool } = toolSlice.actions;
export default toolSlice.reducer;
