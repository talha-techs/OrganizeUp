import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { getMe } from '../../redux/slices/authSlice';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const GoogleSuccess = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    const authenticate = async () => {
      try {
        if (token) {
          // Send token to backend via AJAX so the browser saves the cookie properly
          // This bypasses Safari/Chrome cross-site tracking cookie blocks on redirects.
          const { default: api } = await import('../../utils/api');
          await api.post('/auth/set-cookie', { token });
        }

        const res = await dispatch(getMe());
        if (res.meta.requestStatus === 'fulfilled') {
          navigate('/dashboard');
        } else {
          navigate('/login?error=google_auth_failed');
        }
      } catch (error) {
        navigate('/login?error=google_auth_failed');
      }
    };

    authenticate();
  }, [dispatch, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <LoadingSpinner size="lg" text="Authenticating with Google..." />
    </div>
  );
};

export default GoogleSuccess;
