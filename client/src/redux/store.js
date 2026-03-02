import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import bookReducer from "./slices/bookSlice";
import courseReducer from "./slices/courseSlice";
import toolReducer from "./slices/toolSlice";
import adminReducer from "./slices/adminSlice";
import exploreReducer from "./slices/exploreSlice";
import libraryReducer from "./slices/librarySlice";
import sectionReducer from "./slices/sectionSlice";
import playlistReducer from "./slices/youtubePlaylistSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    books: bookReducer,
    courses: courseReducer,
    tools: toolReducer,
    admin: adminReducer,
    explore: exploreReducer,
    library: libraryReducer,
    sections: sectionReducer,
    playlists: playlistReducer,
  },
});
