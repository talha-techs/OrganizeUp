import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { getMe } from './redux/slices/authSlice';

// Layout (critical path — kept static)
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Public pages (lazy-loaded)
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const SignupPage = lazy(() => import('./pages/auth/SignupPage'));
const GoogleSuccess = lazy(() => import('./pages/auth/GoogleSuccess'));

// Protected pages (lazy-loaded — excluded from initial bundle)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const BooksPage = lazy(() => import('./pages/BooksPage'));
const BookDetailPage = lazy(() => import('./pages/BookDetailPage'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const CourseDetailPage = lazy(() => import('./pages/CourseDetailPage'));
const ToolsPage = lazy(() => import('./pages/ToolsPage'));
const ToolDetailPage = lazy(() => import('./pages/ToolDetailPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const SectionsPage = lazy(() => import('./pages/SectionsPage'));
const SectionDetailPage = lazy(() => import('./pages/SectionDetailPage'));
const YouTubePlaylistsPage = lazy(() => import('./pages/YouTubePlaylistsPage'));
const YouTubePlaylistDetailPage = lazy(() => import('./pages/YouTubePlaylistDetailPage'));
const SavedLibraryPage = lazy(() => import('./pages/SavedLibraryPage'));

const App = () => {
  const dispatch = useDispatch();

  // Validate session cookie on mount — getMe handles 401 gracefully
  useEffect(() => {
    dispatch(getMe());
  }, [dispatch]);

  return (
    <Suspense fallback={<LoadingSpinner />}>
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
    </Suspense>
  );
};

export default App;
