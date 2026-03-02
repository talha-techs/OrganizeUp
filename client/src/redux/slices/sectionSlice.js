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
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/sections");
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

const sectionSlice = createSlice({
  name: "sections",
  initialState: {
    sections: [],
    currentSection: null,
    driveScan: null,
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
    },
    clearDriveScan: (state) => {
      state.driveScan = null;
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
      });
  },
});

export const { clearSectionError, clearCurrentSection, clearDriveScan } =
  sectionSlice.actions;
export default sectionSlice.reducer;
