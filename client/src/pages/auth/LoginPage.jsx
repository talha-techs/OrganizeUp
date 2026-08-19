import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { IoMail, IoLockClosed, IoLogoGoogle, IoEye, IoEyeOff, IoArrowBack } from 'react-icons/io5';
import { login, clearError } from '../../redux/slices/authSlice';
import toast from 'react-hot-toast';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const LoginPage = () => {
  useDocumentTitle('Login');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isLoading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(login(formData));
  };

  const handleGoogleLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  return (
    <div className="min-h-screen bg-canvas text-primary flex items-center justify-center px-4 relative overflow-hidden">
      {/* Back button */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 md:top-10 md:left-10 text-secondary hover:text-primary flex items-center gap-2 transition-colors z-20"
      >
        <IoArrowBack size={20} />
        <span className="hidden sm:inline font-medium">Back to Home</span>
      </Link>

      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-accent/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-orange-500/6 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <img src="/pwa-192x192.png" alt="OrganizeUp" className="w-10 h-10 rounded-xl shadow-lg shadow-accent/20 object-cover" />
            <span className="text-2xl font-bold font-display">
              <span className="text-primary">Organize</span>
              <span className="gradient-text">Up</span>
            </span>
          </Link>
          <p className="text-secondary mt-3 text-sm">Welcome back! Login to your account</p>
        </div>

        {/* Form */}
        <div className="glass-card p-8 border border-subtle">
          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-subtle bg-surface text-primary font-medium hover:bg-surface-raised transition-all mb-6 cursor-pointer"
          >
            <IoLogoGoogle size={18} className="text-red-500" />
            Continue with Google
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-subtle" />
            <span className="text-xs text-muted">or</span>
            <div className="flex-1 h-px bg-subtle" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">Email</label>
              <div className="relative">
                <IoMail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  className="input-dark pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">Password</label>
              <div className="relative">
                <IoLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="input-dark pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary cursor-pointer"
                >
                  {showPassword ? <IoEyeOff size={16} /> : <IoEye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Login'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-accent hover:underline font-medium">
            Sign Up
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
