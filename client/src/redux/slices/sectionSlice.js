import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";
import { removeFromLibrary } from "./librarySlice";

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

export const cloneSection = createAsyncThunk(
  "sections/cloneSection",
  async (sectionId, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/sections/${sectionId}/clone`);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to clone section",
      );
    }
  },
);

export const uploadSectionImage = createAsyncThunk(
  "sections/uploadSectionImage",
  async ({ sectionId, file }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("image", file);
      const { data } = await api.post(
        `/sections/${sectionId}/upload-image`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      return data; // { imageUrl, fileId }
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to upload image",
      );
    }
  },
);

export const updateSectionBanner = createAsyncThunk(
  "sections/updateSectionBanner",
  async ({ sectionId, bannerData }, { rejectWithValue }) => {
    try {
      let res;
      if (bannerData instanceof FormData) {
        res = await api.patch(`/sections/${sectionId}/banner`, bannerData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await api.patch(`/sections/${sectionId}/banner`, bannerData);
      }
      return res.data; // { section }
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update banner",
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
      if (err.response?.status === 409) {
        return rejectWithValue({
          isConflict: true,
          message:
            err.response.data?.message ||
            "Conflict: This block was modified by another collaborator",
          currentBlock: err.response.data?.currentBlock,
        });
      }
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

export const bulkAddTodos = createAsyncThunk(
  "sections/bulkAddTodos",
  async ({ sectionId, subId, todos }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `/sections/${sectionId}/subsections/${subId}/todos/bulk`,
        { todos },
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

// ── Team Collaboration & Invites ─────────────────────────────────────────────

export const createInvite = createAsyncThunk(
  "sections/createInvite",
  async ({ sectionId, email, role }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/sections/${sectionId}/invites`, {
        email,
        role,
      });
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to create invitation",
      );
    }
  },
);

export const getPublicInviteInfo = createAsyncThunk(
  "sections/getPublicInviteInfo",
  async (token, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/sections/invites/public/${token}`);
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch invitation",
      );
    }
  },
);

export const acceptInvite = createAsyncThunk(
  "sections/acceptInvite",
  async (token, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/sections/invites/${token}/accept`);
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data || {
          message: err.response?.data?.message || "Failed to accept invite",
        },
      );
    }
  },
);

export const declineInvite = createAsyncThunk(
  "sections/declineInvite",
  async (token, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/sections/invites/${token}/decline`);
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to decline invite",
      );
    }
  },
);

export const fetchPendingInvites = createAsyncThunk(
  "sections/fetchPendingInvites",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/sections/invites/pending");
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch pending invites",
      );
    }
  },
);

export const fetchSectionMembers = createAsyncThunk(
  "sections/fetchSectionMembers",
  async (sectionId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/sections/${sectionId}/members`);
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch members",
      );
    }
  },
);

export const updateCollaboratorRole = createAsyncThunk(
  "sections/updateCollaboratorRole",
  async ({ sectionId, userId, role }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(
        `/sections/${sectionId}/members/${userId}`,
        { role },
      );
      return { sectionId, userId, role, collaborators: data.collaborators };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update role",
      );
    }
  },
);

export const removeCollaborator = createAsyncThunk(
  "sections/removeCollaborator",
  async ({ sectionId, userId }, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(
        `/sections/${sectionId}/members/${userId}`,
      );
      return { sectionId, userId, message: data.message };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to remove collaborator",
      );
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────

const sectionSlice = createSlice({
  name: "sections",
  initialState: {
    sections: [],
    currentSection: null,
    myRole: "owner",
    permissions: {
      canView: true,
      canEdit: true,
      canManage: true,
      canLeave: false,
    },
    sectionMembers: {
      owner: null,
      collaborators: [],
      pendingInvites: [],
      canManage: false,
    },
    membersLoading: false,
    pendingInvites: [],
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
      state.myRole = "owner";
      state.permissions = {
        canView: true,
        canEdit: true,
        canManage: true,
        canLeave: false,
      };
      state.sectionMembers = {
        owner: null,
        collaborators: [],
        pendingInvites: [],
        canManage: false,
      };
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
        state.myRole = action.payload.myRole || "owner";
        state.permissions = action.payload.permissions || {
          canView: true,
          canEdit: true,
          canManage: true,
          canLeave: false,
        };
      })
      .addCase(fetchSection.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Pending invites for current user
      .addCase(fetchPendingInvites.fulfilled, (state, action) => {
        state.pendingInvites = action.payload.invites || [];
      })
      .addCase(acceptInvite.fulfilled, (state, action) => {
        if (action.meta.arg) {
          state.pendingInvites = state.pendingInvites.filter(
            (inv) => inv.token !== action.meta.arg,
          );
        }
      })
      .addCase(declineInvite.fulfilled, (state, action) => {
        if (action.meta.arg) {
          state.pendingInvites = state.pendingInvites.filter(
            (inv) => inv.token !== action.meta.arg,
          );
        }
      })
      // Section members
      .addCase(fetchSectionMembers.pending, (state) => {
        state.membersLoading = true;
      })
      .addCase(fetchSectionMembers.fulfilled, (state, action) => {
        state.membersLoading = false;
        state.sectionMembers = action.payload;
      })
      .addCase(fetchSectionMembers.rejected, (state) => {
        state.membersLoading = false;
      })
      .addCase(createInvite.fulfilled, (state, action) => {
        if (action.payload?.invite && state.sectionMembers) {
          state.sectionMembers.pendingInvites.unshift(action.payload.invite);
        }
      })
      .addCase(updateCollaboratorRole.fulfilled, (state, action) => {
        if (action.payload.collaborators) {
          if (state.sectionMembers) {
            state.sectionMembers.collaborators = action.payload.collaborators;
          }
          if (state.currentSection) {
            state.currentSection.collaborators = action.payload.collaborators;
          }
        }
      })
      .addCase(removeCollaborator.fulfilled, (state, action) => {
        const uId = action.payload.userId;
        if (state.sectionMembers) {
          state.sectionMembers.collaborators =
            state.sectionMembers.collaborators.filter(
              (c) => String(c.user?._id || c.user) !== String(uId),
            );
        }
        if (state.currentSection?.collaborators) {
          state.currentSection.collaborators =
            state.currentSection.collaborators.filter(
              (c) => String(c.user?._id || c.user) !== String(uId),
            );
        }
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
      // Clone
      .addCase(cloneSection.fulfilled, (state, action) => {
        if (action.payload.section) {
          state.sections.unshift(action.payload.section);
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
      // Update Banner
      .addCase(updateSectionBanner.fulfilled, (state, action) => {
        if (action.payload.section) {
          const updated = action.payload.section;
          const idx = state.sections.findIndex((s) => s._id === updated._id);
          if (idx !== -1) state.sections[idx] = updated;
          if (state.currentSection?._id === updated._id) {
            state.currentSection = updated;
          }
        }
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
        state.subSections.sort((a, b) => (a.order || 0) - (b.order || 0));
      })
      .addCase(deleteSubSection.fulfilled, (state, action) => {
        state.subSections = state.subSections.filter(
          (s) => s._id !== action.payload.subId,
        );
      })
      .addCase(updateSubSection.rejected, (state, action) => {
        if (action.payload?.isConflict && action.payload?.currentBlock) {
          const updated = action.payload.currentBlock;
          const idx = state.subSections.findIndex((s) => s._id === updated._id);
          if (idx !== -1) {
            state.subSections[idx] = updated;
          }
        }
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
      bulkAddTodos,
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

    builder.addCase(removeFromLibrary.fulfilled, (state, action) => {
      const id = action.payload?.contentId || action.payload?.id || action.payload;
      if (id) {
        state.sections = state.sections.filter(
          (s) => !(s.isSaved && (String(s._id) === String(id) || String(s.libraryEntryId) === String(id)))
        );
      }
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
