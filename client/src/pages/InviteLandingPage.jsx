import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import {
  IoFolderOutline,
  IoCheckmarkCircleOutline,
  IoAlertCircleOutline,
  IoPersonAddOutline,
  IoArrowForward,
  IoLogInOutline,
  IoLogOutOutline,
  IoTimeOutline,
} from 'react-icons/io5';
import { getPublicInviteInfo, acceptInvite, declineInvite } from '../redux/slices/sectionSlice';
import { logout } from '../redux/slices/authSlice';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';

const InviteLandingPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useDocumentTitle(invite ? `Join ${invite.sectionName} — OrganizeUp` : 'Invitation — OrganizeUp');

  useEffect(() => {
    const fetchInfo = async () => {
      setLoading(true);
      setErrorMsg(null);
      const res = await dispatch(getPublicInviteInfo(token));
      setLoading(false);

      if (res.meta.requestStatus === 'fulfilled') {
        setInvite(res.payload);
      } else {
        setErrorMsg(res.payload || 'Invalid or expired invitation token');
      }
    };

    if (token) fetchInfo();
  }, [token, dispatch]);

  const handleAccept = async () => {
    setActionLoading(true);
    const res = await dispatch(acceptInvite(token));
    setActionLoading(false);

    if (res.meta.requestStatus === 'fulfilled') {
      toast.success('Invitation accepted! Welcome to the team.');
      navigate(`/sections/${res.payload.sectionId}`);
    } else {
      const err = res.payload;
      toast.error(err?.message || 'Failed to accept invitation');
    }
  };

  const handleDecline = async () => {
    if (!window.confirm('Are you sure you want to decline this invitation?')) return;
    setActionLoading(true);
    const res = await dispatch(declineInvite(token));
    setActionLoading(false);

    if (res.meta.requestStatus === 'fulfilled') {
      toast.success('Invitation declined');
      navigate('/dashboard');
    } else {
      toast.error(res.payload || 'Failed to decline');
    }
  };

  const handleSwitchAccount = async () => {
    await dispatch(logout());
    navigate(`/login?redirect=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(invite?.invitedEmail || '')}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4">
        <LoadingSpinner />
        <p className="text-secondary mt-3 text-sm">Verifying invitation token…</p>
      </div>
    );
  }

  if (errorMsg || !invite) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4 text-center">
        <div className="glass-card max-w-md w-full p-8 border border-subtle space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mx-auto">
            <IoAlertCircleOutline size={28} />
          </div>
          <h2 className="text-xl font-bold text-primary font-display">Invitation Not Found</h2>
          <p className="text-sm text-secondary leading-relaxed">
            {errorMsg || 'This invitation link may be invalid, expired, or has already been used.'}
          </p>
          <div className="pt-2">
            <Link to="/dashboard" className="btn-primary w-full py-2.5 text-sm inline-block">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = invite.isExpired || invite.status === 'revoked';
  const isAccepted = invite.status === 'accepted';
  const isLoggedIn = !!user;
  const isMatchingEmail =
    isLoggedIn && user?.email?.toLowerCase() === invite.invitedEmail?.toLowerCase();

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card max-w-lg w-full p-8 border border-strong bg-surface-raised relative z-10 space-y-6 shadow-2xl"
      >
        {/* App Logo */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <img
              src="/organizeup-logo.svg"
              alt="OrganizeUp"
              className="w-10 h-10 object-contain drop-shadow-[0_2px_8px_rgba(255,87,34,0.3)]"
            />
            <span className="text-xl font-bold font-display">
              <span className="text-primary">Organize</span>
              <span className="gradient-text">Up</span>
            </span>
          </Link>
        </div>

        {/* Section Preview Card */}
        <div className="p-5 rounded-2xl bg-surface border border-subtle text-center space-y-3 relative overflow-hidden">
          {invite.bannerImage && (
            <div
              className="absolute inset-0 opacity-20 bg-cover bg-center"
              style={{ backgroundImage: `url(${invite.bannerImage})` }}
            />
          )}

          <div className="relative z-10 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-accent-subtle text-accent border border-accent/30 mx-auto flex items-center justify-center text-2xl shadow-lg">
              <IoFolderOutline />
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-accent px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20">
                Team Workspace Invite
              </span>
              <h1 className="text-2xl font-bold text-primary font-display mt-2">
                {invite.sectionName}
              </h1>
              {invite.sectionDescription && (
                <p className="text-xs text-secondary mt-1 max-w-sm mx-auto line-clamp-2">
                  {invite.sectionDescription}
                </p>
              )}
            </div>

            {/* Inviter Info */}
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-subtle">
              <div className="w-6 h-6 rounded-full bg-surface-raised flex items-center justify-center text-xs font-bold text-primary shrink-0 overflow-hidden border border-subtle">
                {invite.invitedBy?.avatar ? (
                  <img
                    src={invite.invitedBy.avatar}
                    alt={invite.invitedBy.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (invite.invitedBy?.name || 'T').charAt(0).toUpperCase()
                )}
              </div>
              <span className="text-xs text-secondary">
                <strong className="text-primary font-medium">{invite.invitedBy?.name}</strong> invited you to collaborate as{' '}
                <span className="text-accent font-semibold capitalize">{invite.role}</span>
              </span>
            </div>
          </div>
        </div>

        {/* State-dependent Action Section */}
        {isExpired ? (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center space-y-2">
            <IoTimeOutline size={24} className="text-red-400 mx-auto" />
            <h3 className="text-sm font-semibold text-red-300">Invitation Expired</h3>
            <p className="text-xs text-red-200/80">
              This invitation link has expired. Please contact the section owner for a fresh invite.
            </p>
            <Link to="/dashboard" className="btn-secondary text-xs px-4 py-2 inline-block mt-2">
              Back to Dashboard
            </Link>
          </div>
        ) : isAccepted ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
            <IoCheckmarkCircleOutline size={24} className="text-emerald-400 mx-auto" />
            <h3 className="text-sm font-semibold text-emerald-300">Already Accepted</h3>
            <p className="text-xs text-emerald-200/80">
              This invitation has already been accepted.
            </p>
            <Link to={`/sections/${invite.sectionId}`} className="btn-primary text-xs px-4 py-2 inline-block mt-2">
              Open Section
            </Link>
          </div>
        ) : !isLoggedIn ? (
          // Unregistered / Logged-out Funnel
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-surface border border-subtle text-xs text-secondary text-center">
              Invitation issued for <span className="font-semibold text-primary">{invite.invitedEmail}</span>. Sign up or log in with this email to join.
            </div>

            <div className="space-y-2.5">
              <Link
                to={`/signup?redirect=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(invite.invitedEmail)}`}
                className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 font-medium"
              >
                <IoPersonAddOutline size={18} />
                <span>Create Account to Join</span>
              </Link>

              <Link
                to={`/login?redirect=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(invite.invitedEmail)}`}
                className="btn-secondary w-full py-3 text-sm flex items-center justify-center gap-2 font-medium"
              >
                <IoLogInOutline size={18} />
                <span>I Already Have an Account</span>
              </Link>
            </div>
          </div>
        ) : isMatchingEmail ? (
          // Logged in with matching email
          <div className="space-y-3">
            <button
              onClick={handleAccept}
              disabled={actionLoading}
              className="btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2 font-semibold shadow-lg shadow-accent/25 cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? (
                'Accepting…'
              ) : (
                <>
                  <IoCheckmarkCircleOutline size={18} />
                  <span>Accept Invitation & Launch Workspace</span>
                </>
              )}
            </button>

            <button
              onClick={handleDecline}
              disabled={actionLoading}
              className="w-full text-center text-xs text-muted hover:text-red-400 py-1 transition-colors cursor-pointer"
            >
              Decline invitation
            </button>
          </div>
        ) : (
          // Logged in with MISMATCHED email
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3 text-center">
            <IoAlertCircleOutline size={24} className="text-amber-400 mx-auto" />
            <h3 className="text-sm font-semibold text-amber-300">Account Mismatch</h3>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              You are currently signed in as <strong className="text-white">{user?.email}</strong>, but this invitation was sent to{' '}
              <strong className="text-white">{invite.invitedEmail}</strong>.
            </p>
            <button
              onClick={handleSwitchAccount}
              className="btn-secondary text-xs px-4 py-2 flex items-center justify-center gap-1.5 mx-auto text-amber-300 hover:text-white border-amber-500/40"
            >
              <IoLogOutOutline size={16} />
              <span>Log out & Switch Account</span>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default InviteLandingPage;
