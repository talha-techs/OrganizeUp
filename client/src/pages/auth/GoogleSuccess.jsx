import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { getMe } from '../../redux/slices/authSlice';
import api from '../../utils/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const GoogleSuccess = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    const authenticate = async () => {
      try {
        if (token) {
          // Store token in localStorage immediately so request interceptor includes Bearer token
          localStorage.setItem('token', token);

          // Best-effort cookie sync for browsers allowing cross-origin cookies
          try {
            await api.post('/auth/set-cookie', { token });
          } catch (cookieErr) {
            console.warn('Cookie sync skipped/unsupported, continuing with Bearer token:', cookieErr);
          }
        }

        const res = await dispatch(getMe());
        if (res.meta.requestStatus === 'fulfilled') {
          // Direct navigation to dashboard without intermediate pages
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/login?error=google_auth_failed', { replace: true });
        }
      } catch (error) {
        console.error('Google authentication error:', error);
        navigate('/login?error=google_auth_failed', { replace: true });
      }
    };

    authenticate();
  }, [dispatch, navigate]);

  return (
    <div className="min-h-screen bg-canvas text-primary flex items-center justify-center">
      <LoadingSpinner size="lg" text="Authenticating with Google..." />
    </div>
  );
};

export default GoogleSuccess;
