import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials, getMe } from '../../redux/slices/authSlice';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const GoogleSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('token', token);
      dispatch(getMe()).then((res) => {
        if (res.meta.requestStatus === 'fulfilled') {
          dispatch(setCredentials({ user: res.payload.user, token }));
          navigate('/dashboard');
        } else {
          navigate('/login?error=google_auth_failed');
        }
      });
    } else {
      navigate('/login?error=no_token');
    }
  }, [searchParams, navigate, dispatch]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <LoadingSpinner size="lg" text="Authenticating with Google..." />
    </div>
  );
};

export default GoogleSuccess;
