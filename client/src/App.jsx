import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { getMe } from './redux/slices/authSlice';

// Layout (critical path — kept static)
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ErrorBoundary from './components/ui/ErrorBoundary';

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
const TelegramLibrary = lazy(() => import('./pages/telegram/TelegramLibrary'));
const DiscordLibrary = lazy(() => import('./pages/discord/DiscordLibrary'));
const CapturesPage = lazy(() => import('./pages/captures/CapturesPage'));

import SplashScreen from './components/layout/SplashScreen';
import InstallPrompt from './components/layout/InstallPrompt';
import QuickCaptureModal from './components/capture/QuickCaptureModal';
import { openQuickCapture } from './redux/slices/captureSlice';

const App = () => {
  const dispatch = useDispatch();
  // Only show splash screen on mobile devices (width < 768px)
  const [showSplash, setShowSplash] = useState(window.innerWidth < 768);

  // Validate session cookie on mount — getMe handles 401 gracefully
  useEffect(() => {
    dispatch(getMe());
  }, [dispatch]);

  // Global shortcut listeners (Ctrl+K, Ctrl+Shift+S, custom event)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || (e.shiftKey && (e.key === 's' || e.key === 'S')))) {
        // Prevent default browser search/save
        e.preventDefault();
        dispatch(openQuickCapture());
      }
    };

    const handleCustomOpen = (e) => {
      dispatch(openQuickCapture(e.detail));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-quick-capture', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-quick-capture', handleCustomOpen);
    };
  }, [dispatch]);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <>
      <InstallPrompt />
      <QuickCaptureModal />
      <ErrorBoundary>
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
              <Route path="/telegram-inbox" element={<TelegramLibrary />} />
              <Route path="/discord-inbox" element={<DiscordLibrary />} />
              <Route path="/captures" element={<CapturesPage />} />
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
      </ErrorBoundary>
    </>
  );
};

export default App;
