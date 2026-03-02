import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

export const fetchCourses = createAsyncThunk(
  "courses/fetchCourses",
  async (categoryId, { rejectWithValue }) => {
    try {
      const params = categoryId ? { category: categoryId } : {};
      const { data } = await api.get("/courses", { params });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch courses",
      );
    }
  },
);

export const fetchCourse = createAsyncThunk(
  "courses/fetchCourse",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/courses/${id}`);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch course",
      );
    }
  },
);

export const fetchCategories = createAsyncThunk(
  "courses/fetchCategories",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/courses/categories");
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch categories",
      );
    }
  },
);

export const createCourse = createAsyncThunk(
  "courses/createCourse",
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/courses", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create course",
      );
    }
  },
);

export const updateCourse = createAsyncThunk(
  "courses/updateCourse",
  async ({ id, formData }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/courses/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update course",
      );
    }
  },
);

export const deleteCourse = createAsyncThunk(
  "courses/deleteCourse",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/courses/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete course",
      );
    }
  },
);

export const importToCourse = createAsyncThunk(
  "courses/importToCourse",
  async ({ courseId, importData }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `/courses/${courseId}/import`,
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

export const removeFileFromCourse = createAsyncThunk(
  "courses/removeFile",
  async ({ courseId, fileId }, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(`/courses/${courseId}/files/${fileId}`);
      return { courseId, fileId, course: data.course };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to remove file",
      );
    }
  },
);

export const createCategory = createAsyncThunk(
  "courses/createCategory",
  async (categoryData, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/courses/categories", categoryData);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create category",
      );
    }
  },
);

export const deleteCategory = createAsyncThunk(
  "courses/deleteCategory",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/courses/categories/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete category",
      );
    }
  },
);

const courseSlice = createSlice({
  name: "courses",
  initialState: {
    courses: [],
    currentCourse: null,
    categories: [],
    isLoading: false,
    error: null,
  },
  reducers: {
    clearCourseError: (state) => {
      state.error = null;
    },
    clearCurrentCourse: (state) => {
      state.currentCourse = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCourses.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.courses = action.payload.courses;
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch single course
      .addCase(fetchCourse.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCourse.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentCourse = action.payload.course;
      })
      .addCase(fetchCourse.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload.categories;
      })
      .addCase(createCourse.fulfilled, (state, action) => {
        state.courses.unshift(action.payload.course);
      })
      .addCase(updateCourse.fulfilled, (state, action) => {
        const index = state.courses.findIndex(
          (c) => c._id === action.payload.course._id,
        );
        if (index !== -1) state.courses[index] = action.payload.course;
        if (state.currentCourse?._id === action.payload.course._id) {
          state.currentCourse = action.payload.course;
        }
      })
      .addCase(deleteCourse.fulfilled, (state, action) => {
        state.courses = state.courses.filter((c) => c._id !== action.payload);
      })
      // Import files
      .addCase(importToCourse.fulfilled, (state, action) => {
        const idx = state.courses.findIndex(
          (c) => c._id === action.payload.course._id,
        );
        if (idx !== -1) state.courses[idx] = action.payload.course;
        if (state.currentCourse?._id === action.payload.course._id) {
          state.currentCourse = action.payload.course;
        }
      })
      // Remove file
      .addCase(removeFileFromCourse.fulfilled, (state, action) => {
        if (action.payload.course) {
          const idx = state.courses.findIndex(
            (c) => c._id === action.payload.course._id,
          );
          if (idx !== -1) state.courses[idx] = action.payload.course;
          if (state.currentCourse?._id === action.payload.course._id) {
            state.currentCourse = action.payload.course;
          }
        }
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.categories.push(action.payload.category);
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.categories = state.categories.filter(
          (c) => c._id !== action.payload,
        );
      });
  },
});

export const { clearCourseError, clearCurrentCourse } = courseSlice.actions;
export default courseSlice.reducer;
