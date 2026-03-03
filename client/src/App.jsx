import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getMe } from './redux/slices/authSlice';

// Layout
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Public pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import GoogleSuccess from './pages/auth/GoogleSuccess';

// Protected pages
import Dashboard from './pages/Dashboard';
import BooksPage from './pages/BooksPage';
import BookDetailPage from './pages/BookDetailPage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import ToolsPage from './pages/ToolsPage';
import ToolDetailPage from './pages/ToolDetailPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import ExplorePage from './pages/ExplorePage';
import SectionsPage from './pages/SectionsPage';
import SectionDetailPage from './pages/SectionDetailPage';
import YouTubePlaylistsPage from './pages/YouTubePlaylistsPage';
import YouTubePlaylistDetailPage from './pages/YouTubePlaylistDetailPage';
import SavedLibraryPage from './pages/SavedLibraryPage';

const App = () => {
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token) {
      dispatch(getMe());
    }
  }, [dispatch, token]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/auth/google/success" element={<GoogleSuccess />} />

      {/* Protected routes with layout */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/books" element={<BooksPage />} />
        <Route path="/books/:id" element={<BookDetailPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:id" element={<CourseDetailPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/tools/:id" element={<ToolDetailPage />} />
        <Route path="/sections" element={<SectionsPage />} />
        <Route path="/sections/:id" element={<SectionDetailPage />} />
        <Route path="/youtube-playlists" element={<YouTubePlaylistsPage />} />
        <Route path="/youtube-playlists/:id" element={<YouTubePlaylistDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/saved" element={<SavedLibraryPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
};

export default App;
