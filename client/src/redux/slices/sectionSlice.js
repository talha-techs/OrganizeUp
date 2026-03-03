import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

// Universal drive scan
export const scanDriveUniversal = createAsyncThunk(
  "sections/scanDriveUniversal",
  async (driveLink, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/drive/scan", { driveLink });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to scan Drive folder",
      );
    }
  },
);

export const fetchSections = createAsyncThunk(
  "sections/fetchSections",
  async (arg, { rejectWithValue }) => {
    try {
      const params = arg?.mine ? { mine: "true" } : {};
      const { data } = await api.get("/sections", { params });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch sections",
      );
    }
  },
);

export const fetchSection = createAsyncThunk(
  "sections/fetchSection",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/sections/${id}`);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch section",
      );
    }
  },
);

export const createSection = createAsyncThunk(
  "sections/createSection",
  async (sectionData, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/sections", sectionData);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create section",
      );
    }
  },
);

export const importToSection = createAsyncThunk(
  "sections/importToSection",
  async ({ sectionId, importData }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `/sections/${sectionId}/import`,
        importData,
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to import files",
      );
    }
  },
);

export const updateSection = createAsyncThunk(
  "sections/updateSection",
  async ({ id, data: updateData }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/sections/${id}`, updateData);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update section",
      );
    }
  },
);

export const deleteSection = createAsyncThunk(
  "sections/deleteSection",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/sections/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete section",
      );
    }
  },
);

export const removeFileFromSection = createAsyncThunk(
  "sections/removeFile",
  async ({ sectionId, fileId }, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(
        `/sections/${sectionId}/files/${fileId}`,
      );
      return { sectionId, fileId, section: data.section };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to remove file",
      );
    }
  },
);

// ── Sub-section thunks ───────────────────────────────────────────────────────

export const fetchSubSections = createAsyncThunk(
  "sections/fetchSubSections",
  async (sectionId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/sections/${sectionId}/subsections`);
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to load blocks",
      );
    }
  },
);

export const createSubSection = createAsyncThunk(
  "sections/createSubSection",
  async ({ sectionId, ...body }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `/sections/${sectionId}/subsections`,
        body,
      );
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to create block",
      );
    }
  },
);

export const updateSubSection = createAsyncThunk(
  "sections/updateSubSection",
  async ({ sectionId, subId, ...body }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(
        `/sections/${sectionId}/subsections/${subId}`,
        body,
      );
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update block",
      );
    }
  },
);

export const deleteSubSection = createAsyncThunk(
  "sections/deleteSubSection",
  async ({ sectionId, subId }, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(
        `/sections/${sectionId}/subsections/${subId}`,
      );
      return data; // { subId }
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to delete block",
      );
    }
  },
);

export const addTodoItem = createAsyncThunk(
  "sections/addTodoItem",
  async ({ sectionId, subId, ...body }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `/sections/${sectionId}/subsections/${subId}/todos`,
        body,
      );
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed");
    }
  },
);

export const updateTodoItem = createAsyncThunk(
  "sections/updateTodoItem",
  async ({ sectionId, subId, todoId, ...body }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(
        `/sections/${sectionId}/subsections/${subId}/todos/${todoId}`,
        body,
      );
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed");
    }
  },
);

export const deleteTodoItem = createAsyncThunk(
  "sections/deleteTodoItem",
  async ({ sectionId, subId, todoId }, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(
        `/sections/${sectionId}/subsections/${subId}/todos/${todoId}`,
      );
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed");
    }
  },
);

export const addBoardItem = createAsyncThunk(
  "sections/addBoardItem",
  async ({ sectionId, subId, ...body }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `/sections/${sectionId}/subsections/${subId}/board`,
        body,
      );
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed");
    }
  },
);

export const updateBoardItem = createAsyncThunk(
  "sections/updateBoardItem",
  async ({ sectionId, subId, itemId, ...body }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(
        `/sections/${sectionId}/subsections/${subId}/board/${itemId}`,
        body,
      );
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed");
    }
  },
);

export const deleteBoardItem = createAsyncThunk(
  "sections/deleteBoardItem",
  async ({ sectionId, subId, itemId }, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(
        `/sections/${sectionId}/subsections/${subId}/board/${itemId}`,
      );
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed");
    }
  },
);

export const addLink = createAsyncThunk(
  "sections/addLink",
  async ({ sectionId, subId, ...body }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `/sections/${sectionId}/subsections/${subId}/links`,
        body,
      );
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed");
    }
  },
);

export const removeLink = createAsyncThunk(
  "sections/removeLink",
  async ({ sectionId, subId, linkId }, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(
        `/sections/${sectionId}/subsections/${subId}/links/${linkId}`,
      );
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed");
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────

const sectionSlice = createSlice({
  name: "sections",
  initialState: {
    sections: [],
    currentSection: null,
    driveScan: null,
    subSections: [],
    subSectionsLoading: false,
    isLoading: false,
    isScanning: false,
    error: null,
  },
  reducers: {
    clearSectionError: (state) => {
      state.error = null;
    },
    clearCurrentSection: (state) => {
      state.currentSection = null;
      state.subSections = [];
    },
    clearDriveScan: (state) => {
      state.driveScan = null;
    },
    clearSubSections: (state) => {
      state.subSections = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all
      .addCase(fetchSections.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchSections.fulfilled, (state, action) => {
        state.isLoading = false;
        state.sections = action.payload.sections;
      })
      .addCase(fetchSections.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch one
      .addCase(fetchSection.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchSection.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentSection = action.payload.section;
      })
      .addCase(fetchSection.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createSection.fulfilled, (state, action) => {
        state.sections.unshift(action.payload.section);
      })
      // Import
      .addCase(importToSection.fulfilled, (state, action) => {
        const idx = state.sections.findIndex(
          (s) => s._id === action.payload.section._id,
        );
        if (idx !== -1) state.sections[idx] = action.payload.section;
        if (state.currentSection?._id === action.payload.section._id) {
          state.currentSection = action.payload.section;
        }
      })
      // Update
      .addCase(updateSection.fulfilled, (state, action) => {
        const idx = state.sections.findIndex(
          (s) => s._id === action.payload.section._id,
        );
        if (idx !== -1) state.sections[idx] = action.payload.section;
        if (state.currentSection?._id === action.payload.section._id) {
          state.currentSection = action.payload.section;
        }
      })
      // Delete
      .addCase(deleteSection.fulfilled, (state, action) => {
        state.sections = state.sections.filter((s) => s._id !== action.payload);
      })
      // Remove file
      .addCase(removeFileFromSection.fulfilled, (state, action) => {
        if (action.payload.section) {
          const idx = state.sections.findIndex(
            (s) => s._id === action.payload.sectionId,
          );
          if (idx !== -1) state.sections[idx] = action.payload.section;
          if (state.currentSection?._id === action.payload.sectionId) {
            state.currentSection = action.payload.section;
          }
        }
      })
      // Drive scan
      .addCase(scanDriveUniversal.pending, (state) => {
        state.isScanning = true;
        state.driveScan = null;
        state.error = null;
      })
      .addCase(scanDriveUniversal.fulfilled, (state, action) => {
        state.isScanning = false;
        state.driveScan = action.payload;
      })
      .addCase(scanDriveUniversal.rejected, (state, action) => {
        state.isScanning = false;
        state.error = action.payload;
      })
      // ── Sub-sections ────────────────────────────────────────────────────────
      .addCase(fetchSubSections.pending, (state) => {
        state.subSectionsLoading = true;
      })
      .addCase(fetchSubSections.fulfilled, (state, action) => {
        state.subSectionsLoading = false;
        state.subSections = action.payload.subSections;
      })
      .addCase(fetchSubSections.rejected, (state) => {
        state.subSectionsLoading = false;
      })
      .addCase(createSubSection.fulfilled, (state, action) => {
        state.subSections.push(action.payload.subSection);
      })
      .addCase(deleteSubSection.fulfilled, (state, action) => {
        state.subSections = state.subSections.filter(
          (s) => s._id !== action.payload.subId,
        );
      });

    // Helper: merge updated subSection into state
    const mergeSubSection = (state, action) => {
      const updated = action.payload.subSection;
      if (!updated) return;
      const idx = state.subSections.findIndex((s) => s._id === updated._id);
      if (idx !== -1) state.subSections[idx] = updated;
    };

    [
      updateSubSection,
      addTodoItem,
      updateTodoItem,
      deleteTodoItem,
      addBoardItem,
      updateBoardItem,
      deleteBoardItem,
      addLink,
      removeLink,
    ].forEach((thunk) => {
      builder.addCase(thunk.fulfilled, mergeSubSection);
    });
  },
});

export const {
  clearSectionError,
  clearCurrentSection,
  clearDriveScan,
  clearSubSections,
} = sectionSlice.actions;
export default sectionSlice.reducer;
