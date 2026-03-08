import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { getMe } from '../../redux/slices/authSlice';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const GoogleSuccess = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    // Token is in the httpOnly cookie — just fetch current user
    dispatch(getMe()).then((res) => {
      if (res.meta.requestStatus === 'fulfilled') {
        navigate('/dashboard');
      } else {
        navigate('/login?error=google_auth_failed');
      }
    });
  }, [dispatch, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <LoadingSpinner size="lg" text="Authenticating with Google..." />
    </div>
  );
};

export default GoogleSuccess;
