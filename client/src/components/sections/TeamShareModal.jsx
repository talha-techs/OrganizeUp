import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoCloseOutline,
  IoPersonAddOutline,
  IoShieldCheckmarkOutline,
  IoEyeOutline,
  IoCreateOutline,
  IoTrashOutline,
  IoCopyOutline,
  IoCheckmarkOutline,
  IoTimeOutline,
  IoExitOutline,
  IoMailOutline,
} from 'react-icons/io5';
import {
  createInvite,
  fetchSectionMembers,
  updateCollaboratorRole,
  removeCollaborator,
} from '../../redux/slices/sectionSlice';
import toast from 'react-hot-toast';

const TeamShareModal = ({ isOpen, onClose, sectionId, sectionName, isOwner, canManage }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { sectionMembers, membersLoading } = useSelector((state) => state.sections);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviting, setInviting] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);
  const [recentInviteUrl, setRecentInviteUrl] = useState(null);

  useEffect(() => {
    if (isOpen && sectionId) {
      dispatch(fetchSectionMembers(sectionId));
    }
  }, [isOpen, sectionId, dispatch]);

  if (!isOpen) return null;

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    const res = await dispatch(
      createInvite({
        sectionId,
        email: inviteEmail.trim(),
        role: inviteRole,
      }),
    );
    setInviting(false);

    if (res.meta.requestStatus === 'fulfilled') {
      const inviteUrl = `${window.location.origin}${res.payload.inviteUrl}`;
      setRecentInviteUrl(inviteUrl);
      toast.success(res.payload.message || 'Invitation created!');
      setInviteEmail('');
      dispatch(fetchSectionMembers(sectionId));
    } else {
      toast.error(res.payload || 'Failed to create invitation');
    }
  };

  const handleCopyLink = (tokenOrUrl) => {
    const fullUrl = tokenOrUrl.startsWith('http')
      ? tokenOrUrl
      : `${window.location.origin}/invite/${tokenOrUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(tokenOrUrl);
    toast.success('Invite link copied to clipboard!');
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleRoleChange = async (userId, newRole) => {
    const res = await dispatch(
      updateCollaboratorRole({ sectionId, userId, role: newRole }),
    );
    if (res.meta.requestStatus === 'fulfilled') {
      toast.success('Collaborator role updated');
    } else {
      toast.error(res.payload || 'Failed to update role');
    }
  };

  const handleRemoveMember = async (userId, memberName) => {
    const isSelf = String(user?._id) === String(userId);
    const confirmMsg = isSelf
      ? 'Are you sure you want to leave this shared section?'
      : `Remove ${memberName || 'this collaborator'} from the section?`;

    if (!window.confirm(confirmMsg)) return;

    const res = await dispatch(removeCollaborator({ sectionId, userId }));
    if (res.meta.requestStatus === 'fulfilled') {
      toast.success(isSelf ? 'You have left the section' : 'Collaborator removed');
      if (isSelf) {
        onClose();
        window.location.href = '/sections';
      }
    } else {
      toast.error(res.payload || 'Failed to remove collaborator');
    }
  };

  const owner = sectionMembers?.owner;
  const collaborators = sectionMembers?.collaborators || [];
  const pendingInvites = sectionMembers?.pendingInvites || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95 }}
        className="glass-card w-full max-w-xl p-6 space-y-6 border border-strong bg-surface-raised max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-subtle pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-subtle flex items-center justify-center text-accent">
              <IoPersonAddOutline size={18} />
            </div>
            <div>
              <h3 className="text-primary font-semibold text-lg">Team & Collaborators</h3>
              <p className="text-xs text-muted">
                Manage access and shared permissions for <span className="text-secondary font-medium">"{sectionName}"</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-surface cursor-pointer"
          >
            <IoCloseOutline size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="space-y-6 overflow-y-auto pr-1 flex-1">
          {/* Invite Form (Owner / Admin only) */}
          {canManage && (
            <div className="p-4 rounded-xl bg-surface border border-subtle space-y-3">
              <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <IoMailOutline size={14} className="text-accent" />
                <span>Invite New Collaborator</span>
              </h4>
              <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Enter email address (e.g. alex@gmail.com)"
                    className="w-full bg-surface-raised border border-subtle rounded-xl px-3.5 py-2.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent"
                  />
                </div>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="bg-surface-raised border border-subtle rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent cursor-pointer"
                >
                  <option value="editor">Can edit</option>
                  <option value="viewer">Can view</option>
                </select>
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  className="btn-primary text-sm px-4 py-2.5 whitespace-nowrap cursor-pointer disabled:opacity-50"
                >
                  {inviting ? 'Inviting…' : 'Send Invite'}
                </button>
              </form>
              <p className="text-[11px] text-muted leading-relaxed">
                If the person is already registered, an in-app invite will appear in their dashboard. If they are new to OrganizeUp, they will be guided through quick registration and redirected straight to this workspace.
              </p>

              {/* Just Created Invite Link Banner */}
              {recentInviteUrl && (
                <div className="p-3 rounded-lg bg-accent-subtle/40 border border-accent/30 flex items-center justify-between gap-3 mt-2">
                  <div className="truncate text-xs text-accent">
                    <span className="font-semibold">Direct Invite URL:</span> {recentInviteUrl}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(recentInviteUrl)}
                    className="btn-primary text-xs px-2.5 py-1 flex items-center gap-1 shrink-0"
                  >
                    {copiedToken === recentInviteUrl ? (
                      <>
                        <IoCheckmarkOutline size={13} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <IoCopyOutline size={13} />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Members List */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center justify-between">
              <span>Active Members ({1 + collaborators.length})</span>
              {membersLoading && <span className="text-[11px] text-muted">Refreshing…</span>}
            </h4>

            <div className="divide-y divide-subtle border border-subtle rounded-xl overflow-hidden bg-surface">
              {/* Owner Row */}
              <div className="p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                    {owner?.avatar ? (
                      <img src={owner.avatar} alt={owner.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      (owner?.name || 'O').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-primary truncate">{owner?.name || 'Section Owner'}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        Owner
                      </span>
                    </div>
                    <span className="text-xs text-muted truncate block">{owner?.email}</span>
                  </div>
                </div>
                <div className="text-xs text-muted font-medium">Full Access</div>
              </div>

              {/* Collaborator Rows */}
              {collaborators.map((c) => {
                const cUser = c.user;
                const isMe = String(user?._id) === String(cUser?._id || cUser);
                return (
                  <div key={c._id || cUser?._id} className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                        {cUser?.avatar ? (
                          <img src={cUser.avatar} alt={cUser.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          (cUser?.name || 'U').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-primary truncate">
                            {cUser?.name || 'Team Member'} {isMe && '(You)'}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                              c.role === 'editor'
                                ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                                : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
                            }`}
                          >
                            {c.role === 'editor' ? 'Editor' : 'Viewer'}
                          </span>
                        </div>
                        <span className="text-xs text-muted truncate block">{cUser?.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Role selector dropdown if owner */}
                      {canManage && !isMe ? (
                        <select
                          value={c.role}
                          onChange={(e) => handleRoleChange(cUser?._id, e.target.value)}
                          className="bg-surface-raised border border-subtle rounded-lg px-2.5 py-1 text-xs text-primary focus:outline-none focus:border-accent cursor-pointer"
                        >
                          <option value="editor">Can edit</option>
                          <option value="viewer">Can view</option>
                        </select>
                      ) : null}

                      {/* Remove / Leave button */}
                      {canManage && !isMe ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(cUser?._id, cUser?.name)}
                          className="p-1.5 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Remove collaborator"
                        >
                          <IoTrashOutline size={16} />
                        </button>
                      ) : isMe && !isOwner ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(user._id, user.name)}
                          className="btn-secondary text-xs px-2.5 py-1 flex items-center gap-1 text-red-400 hover:text-red-300 cursor-pointer"
                        >
                          <IoExitOutline size={14} />
                          <span>Leave</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {collaborators.length === 0 && (
                <div className="p-4 text-center text-xs text-muted">
                  No other collaborators yet. Invite team members to build and edit this space together!
                </div>
              )}
            </div>
          </div>

          {/* Pending Invitations (Owner only) */}
          {canManage && pendingInvites.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">
                Pending Invitations ({pendingInvites.length})
              </h4>
              <div className="divide-y divide-subtle border border-subtle rounded-xl overflow-hidden bg-surface">
                {pendingInvites.map((inv) => (
                  <div key={inv._id} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary truncate">{inv.invitedEmail}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-subtle text-accent border border-accent/30 uppercase font-semibold">
                          {inv.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted mt-0.5 flex items-center gap-1">
                        <IoTimeOutline size={12} />
                        <span>Expires {new Date(inv.expiresAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(inv.token)}
                      className="btn-secondary text-xs px-2.5 py-1 flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {copiedToken === inv.token ? (
                        <>
                          <IoCheckmarkOutline size={13} className="text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <IoCopyOutline size={13} />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-subtle">
          <button onClick={onClose} className="btn-secondary text-xs px-4 py-2 cursor-pointer">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TeamShareModal;
