import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoAdd,
  IoFolderOutline,
  IoCloudDownloadOutline,
  IoTrashOutline,
  IoCreateOutline,
  IoBookmark,
  IoCloseOutline,
  IoImageOutline,
  IoCloudUploadOutline,
  IoSparklesOutline,
  IoPeopleOutline,
  IoMailOpenOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoExitOutline,
} from 'react-icons/io5';
import {
  fetchSections,
  createSection,
  deleteSection,
  updateSection,
  fetchPendingInvites,
  acceptInvite,
  declineInvite,
  removeCollaborator,
} from '../redux/slices/sectionSlice';
import { removeFromLibrary } from '../redux/slices/librarySlice';
import { toggleVisibility } from '../redux/slices/adminSlice';
import api from '../utils/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';

const COLORS = [
  { name: 'coral', from: 'from-[#ff5722]', to: 'to-[#f4511e]' },
  { name: 'amber', from: 'from-amber-500', to: 'to-orange-600' },
  { name: 'purple', from: 'from-purple-500', to: 'to-pink-600' },
  { name: 'emerald', from: 'from-emerald-500', to: 'to-green-600' },
  { name: 'rose', from: 'from-rose-500', to: 'to-red-600' },
  { name: 'zinc', from: 'from-zinc-700', to: 'to-zinc-900' },
];

function getColorClasses(color) {
  return COLORS.find((c) => c.name === color) || COLORS[0];
}

const SectionsPage = () => {
  useDocumentTitle('Workspaces');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('coral');
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerFile, setBannerFile] = useState(null);
  const [deleteSectionId, setDeleteSectionId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'mine' | 'shared'
  const [leaveSectionTarget, setLeaveSectionTarget] = useState(null);
  const [isLeaving, setIsLeaving] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { sections, pendingInvites, isLoading } = useSelector((state) => state.sections);
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    dispatch(fetchSections());
    dispatch(fetchPendingInvites());
  }, [dispatch]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    let createPayload;
    if (bannerFile) {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('description', description.trim());
      fd.append('color', selectedColor);
      fd.append('image', bannerFile);
      createPayload = fd;
    } else {
      createPayload = {
        name: name.trim(),
        description: description.trim(),
        color: selectedColor,
        bannerImage: bannerUrl.trim(),
      };
    }

    const result = await dispatch(createSection(createPayload));

    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Workspace created');
      setShowForm(false);
      setName('');
      setDescription('');
      setSelectedColor('coral');
      setBannerUrl('');
      setBannerFile(null);
    } else {
      toast.error(result.payload || 'Failed to create section');
    }
  };

  const handleDelete = (id) => {
    setDeleteSectionId(id);
  };

  const confirmDeleteSection = async () => {
    if (!deleteSectionId) return;
    setIsDeleting(true);
    const result = await dispatch(deleteSection(deleteSectionId));
    setIsDeleting(false);
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Workspace deleted');
      setDeleteSectionId(null);
    } else {
      toast.error(result.payload || 'Failed to delete section');
    }
  };

  const handleLeaveSection = async () => {
    if (!leaveSectionTarget || !user?._id) return;
    setIsLeaving(true);
    const result = await dispatch(
      removeCollaborator({ sectionId: leaveSectionTarget._id, userId: user._id }),
    );
    setIsLeaving(false);
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('You have left the shared section');
      setLeaveSectionTarget(null);
      dispatch(fetchSections());
    } else {
      toast.error(result.payload || 'Failed to leave section');
    }
  };

  const handleAcceptInvite = async (token) => {
    const result = await dispatch(acceptInvite(token));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Joined team workspace!');
      dispatch(fetchSections());
      dispatch(fetchPendingInvites());
    } else {
      toast.error(
        typeof result.payload === 'string'
          ? result.payload
          : result.payload?.message || 'Failed to accept invite',
      );
    }
  };

  const handleDeclineInvite = async (token) => {
    const result = await dispatch(declineInvite(token));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Invitation declined');
      dispatch(fetchPendingInvites());
    } else {
      toast.error(
        typeof result.payload === 'string'
          ? result.payload
          : result.payload?.message || 'Failed to decline invite',
      );
    }
  };



  const handleTogglePublic = async (section) => {
    const newVis = section.visibility === 'public' ? 'private' : 'public';
    const result = await dispatch(
      toggleVisibility({
        contentType: 'section',
        contentId: section._id,
        visibility: newVis,
      }),
    );
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success(`Workspace set to ${newVis}`);
      dispatch(fetchSections());
    }
  };

  const handleUnsaveSection = async (sectionId) => {
    const result = await dispatch(removeFromLibrary(sectionId));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Removed from your sections');
      dispatch(fetchSections());
    } else {
      toast.error(result.payload || 'Failed to remove from library');
    }
  };

  // Section categorization
  const isSectionOwner = (s) =>
    s.isOwner ??
    (user?._id && s.addedBy && String(s.addedBy?._id ?? s.addedBy) === String(user._id));

  const mySections = sections.filter((s) => isSectionOwner(s));
  const sharedSections = sections.filter(
    (s) => !isSectionOwner(s) && (s.myRole === 'editor' || s.myRole === 'viewer'),
  );

  const displayedSections =
    filterTab === 'mine'
      ? mySections
      : filterTab === 'shared'
      ? sharedSections
      : sections;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-primary font-display">Workspaces</h1>
          <p className="text-secondary text-sm mt-1">
            Create collaborative workspaces, co-edit with your team, and organize modular blocks
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <IoAdd size={18} /> New Workspace
        </button>
      </motion.div>

      {/* Pending Team Invites Banner */}
      <AnimatePresence>
        {pendingInvites && pendingInvites.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="overflow-hidden"
          >
            <div className="glass-card border border-accent/40 bg-accent/5 p-4 rounded-2xl relative shadow-lg shadow-accent/5">
              <div className="flex items-center gap-2 mb-3">
                <span className="p-1.5 rounded-lg bg-accent/20 text-accent">
                  <IoMailOpenOutline size={18} />
                </span>
                <h3 className="text-sm font-semibold text-primary">
                  Pending Team Invitations ({pendingInvites.length})
                </h3>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pendingInvites.map((inv) => (
                  <div
                    key={inv._id}
                    className="p-3 rounded-xl bg-surface border border-subtle flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold text-primary truncate">
                          {inv.sectionId?.name || 'Untitled Section'}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            inv.role === 'editor'
                              ? 'bg-accent/15 text-accent border border-accent/30'
                              : 'bg-surface-raised text-secondary border border-subtle'
                          }`}
                        >
                          {inv.role}
                        </span>
                      </div>
                      <p className="text-xs text-muted">
                        Invited by{' '}
                        <span className="text-secondary font-medium">
                          {inv.invitedBy?.name || 'Collaborator'}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-subtle">
                      <button
                        onClick={() => handleAcceptInvite(inv.token)}
                        className="btn-primary text-xs py-1.5 px-3 flex-1 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <IoCheckmarkCircleOutline size={14} /> Accept
                      </button>
                      <button
                        onClick={() => handleDeclineInvite(inv.token)}
                        className="btn-secondary text-xs py-1.5 px-3 hover:text-red-400 hover:border-red-500/30 transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-subtle pb-3">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
            filterTab === 'all'
              ? 'bg-accent text-white shadow-md shadow-accent/20'
              : 'text-secondary hover:text-primary hover:bg-surface-raised'
          }`}
        >
          All
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              filterTab === 'all' ? 'bg-white/20 text-white' : 'bg-surface-raised text-muted'
            }`}
          >
            {sections.length}
          </span>
        </button>

        <button
          onClick={() => setFilterTab('mine')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
            filterTab === 'mine'
              ? 'bg-accent text-white shadow-md shadow-accent/20'
              : 'text-secondary hover:text-primary hover:bg-surface-raised'
          }`}
        >
          My Workspaces
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              filterTab === 'mine' ? 'bg-white/20 text-white' : 'bg-surface-raised text-muted'
            }`}
          >
            {mySections.length}
          </span>
        </button>

        <button
          onClick={() => setFilterTab('shared')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
            filterTab === 'shared'
              ? 'bg-accent text-white shadow-md shadow-accent/20'
              : 'text-secondary hover:text-primary hover:bg-surface-raised'
          }`}
        >
          <IoPeopleOutline size={13} />
          Shared with Me
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              filterTab === 'shared' ? 'bg-white/20 text-white' : 'bg-surface-raised text-muted'
            }`}
          >
            {sharedSections.length}
          </span>
        </button>
      </div>

      {/* Sections Grid */}
      {isLoading ? (
        <LoadingSpinner text="Loading workspaces..." />
      ) : displayedSections.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <IoFolderOutline className="mx-auto text-muted mb-4" size={48} />
          <h3 className="text-lg font-medium text-secondary mb-2">
            {filterTab === 'shared'
              ? 'No shared workspaces yet'
              : filterTab === 'mine'
              ? 'No created workspaces yet'
              : 'No workspaces yet'}
          </h3>
          <p className="text-sm text-muted">
            {filterTab === 'shared'
              ? 'When colleagues or teammates invite you to shared workspaces, they will appear here.'
              : 'Create your first workspace to organize blocks, docs, and team tasks.'}
          </p>
        </motion.div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {displayedSections.map((section, i) => {
              const col = getColorClasses(section.color);
              const isOwner = isSectionOwner(section);
              const canManage = isAdmin || isOwner;
              const hasCollaborators =
                Array.isArray(section.collaborators) && section.collaborators.length > 0;

              return (
                <motion.div
                  key={section._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card group relative overflow-hidden cursor-pointer border border-subtle"
                  onClick={() => navigate(`/workspaces/${section._id}`)}
                >
                  {/* Banner media or color gradient */}
                  <div
                    className={`h-32 relative flex items-center justify-center overflow-hidden ${
                      section.bannerImage ? 'bg-canvas' : `bg-gradient-to-br ${col.from} ${col.to}`
                    }`}
                  >
                    {section.bannerImage ? (
                      <img
                        src={section.bannerImage}
                        alt={section.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <IoFolderOutline size={40} className="text-white/30" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                    {/* Top-left Badges (Visibility & Collaboration) */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap z-10">
                      {section.visibility === 'public' && (
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-medium backdrop-blur-sm text-emerald-400 bg-emerald-500/20">
                          public
                        </span>
                      )}

                      {/* Role badge if guest */}
                      {!isOwner && section.myRole && (
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold backdrop-blur-sm capitalize ${
                            section.myRole === 'editor'
                              ? 'bg-accent/20 text-accent border border-accent/30'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {section.myRole}
                        </span>
                      )}

                      {/* Shared badge if owner */}
                      {isOwner && hasCollaborators && (
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-medium backdrop-blur-sm bg-accent/20 text-accent border border-accent/30 flex items-center gap-1">
                          <IoPeopleOutline size={12} />
                          {section.collaborators.length}
                        </span>
                      )}
                    </div>

                    {/* Top-Right: Saved or Leave button */}
                    <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
                      {section.isSaved && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnsaveSection(section._id);
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-emerald-400 bg-surface/90 hover:text-red-400 hover:bg-red-500/15 border border-emerald-500/30 hover:border-red-500/30 backdrop-blur-md shadow-md transition-all cursor-pointer group/unsave"
                          title="Click to unsave from your library"
                        >
                          <IoBookmark className="group-hover/unsave:hidden text-emerald-400" size={13} />
                          <IoCloseOutline className="hidden group-hover/unsave:inline text-red-400" size={14} />
                          <span className="group-hover/unsave:hidden">Saved</span>
                          <span className="hidden group-hover/unsave:inline">Unsave</span>
                        </button>
                      )}

                      {!isOwner && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLeaveSectionTarget(section);
                          }}
                          className="p-1.5 rounded-xl text-xs text-muted hover:text-red-400 bg-surface/80 hover:bg-red-500/15 border border-subtle hover:border-red-500/30 backdrop-blur-md transition-colors cursor-pointer"
                          title="Leave this shared section"
                        >
                          <IoExitOutline size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="text-base font-semibold text-primary truncate mb-1">
                      {section.name}
                    </h3>
                    {section.description && (
                      <p className="text-sm text-secondary line-clamp-2 mb-2">
                        {section.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">
                          {section.files?.length || 0} file{section.files?.length !== 1 ? 's' : ''}
                        </span>

                        {/* Collaborator Avatars */}
                        {hasCollaborators && (
                          <div className="flex items-center -space-x-1.5">
                            {section.collaborators.slice(0, 3).map((collab, cIdx) => {
                              const u = collab.user;
                              return (
                                <div
                                  key={u?._id || cIdx}
                                  title={`${u?.name || 'Collaborator'} (${collab.role})`}
                                  className="w-5 h-5 rounded-full ring-2 ring-surface overflow-hidden bg-surface-raised flex items-center justify-center text-[9px] font-bold text-secondary"
                                >
                                  {u?.avatar ? (
                                    <img
                                      src={u.avatar}
                                      alt={u.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    (u?.name || 'U').charAt(0).toUpperCase()
                                  )}
                                </div>
                              );
                            })}
                            {section.collaborators.length > 3 && (
                              <span className="w-5 h-5 rounded-full ring-2 ring-surface bg-surface-raised flex items-center justify-center text-[9px] font-bold text-muted">
                                +{section.collaborators.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isAdmin && !isOwner && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePublic(section);
                              }}
                              className="p-1.5 rounded-lg hover:bg-surface-raised text-secondary hover:text-primary transition-colors text-xs cursor-pointer"
                              title={section.visibility === 'public' ? 'Make Private' : 'Make Public'}
                            >
                              {section.visibility === 'public' ? 'Private' : 'Public'}
                            </button>
                          )}
                          {isOwner && section.visibility === 'public' && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (isAdmin) {
                                  handleTogglePublic(section);
                                } else {
                                  try {
                                    await api.put('/content/toggle-visibility', {
                                      contentType: 'section',
                                      contentId: section._id,
                                      visibility: 'private',
                                    });
                                    toast.success('Section set to private');
                                    dispatch(fetchSections());
                                  } catch (err) {
                                    toast.error(err.response?.data?.message || 'Failed to update');
                                  }
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-amber-500/10 text-secondary hover:text-amber-400 transition-colors text-xs cursor-pointer"
                              title="Make Private"
                            >
                              Private
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(section._id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <IoTrashOutline size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create Workspace Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="New Workspace">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Machine Learning, UI Design..."
              className="input-dark w-full"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              className="input-dark w-full h-20 resize-none"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-secondary">
                Banner Image (optional)
              </label>
              <span className="text-[11px] text-muted flex items-center gap-1">
                <IoSparklesOutline size={12} className="text-accent" /> Auto-fetched via Pexels if empty
              </span>
            </div>
            <div className="space-y-2">
              <input
                type="url"
                value={bannerUrl}
                onChange={(e) => {
                  setBannerUrl(e.target.value);
                  setBannerFile(null);
                }}
                placeholder="Paste web image address (https://...)"
                className="input-dark w-full text-xs"
                disabled={!!bannerFile}
              />
              <div className="flex items-center gap-2">
                <label className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer">
                  <IoCloudUploadOutline size={14} />
                  <span className="truncate max-w-[200px]">
                    {bannerFile ? bannerFile.name : 'Upload from device'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setBannerFile(e.target.files[0]);
                        setBannerUrl('');
                      }
                    }}
                  />
                </label>
                {bannerFile && (
                  <button
                    type="button"
                    onClick={() => setBannerFile(null)}
                    className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setSelectedColor(c.name)}
                  className={`w-8 h-8 rounded-xl bg-gradient-to-br ${c.from} ${c.to} transition-all cursor-pointer ${
                    selectedColor === c.name
                      ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface scale-110'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Workspace
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteSectionId}
        title="Delete Workspace"
        message="Delete this workspace and all its blocks and files? This action cannot be undone."
        confirmText="Delete"
        onConfirm={confirmDeleteSection}
        onCancel={() => setDeleteSectionId(null)}
        isLoading={isDeleting}
      />

      {/* Leave Shared Workspace Confirmation */}
      <ConfirmDialog
        isOpen={!!leaveSectionTarget}
        title="Leave Shared Workspace"
        message={`Are you sure you want to leave "${leaveSectionTarget?.name}"? You will lose access to its workspace blocks and files.`}
        confirmText="Leave Workspace"
        onConfirm={handleLeaveSection}
        onCancel={() => setLeaveSectionTarget(null)}
        isLoading={isLeaving}
      />
    </div>
  );
};

export default SectionsPage;
