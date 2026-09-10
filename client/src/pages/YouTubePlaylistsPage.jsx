import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoAdd,
  IoLogoYoutube,
  IoPlayCircleOutline,
  IoTrashOutline,
  IoSearchOutline,
  IoFilmOutline,
  IoFolderOutline,
  IoTimeOutline,
  IoDocumentTextOutline,
  IoCheckmarkCircle,
  IoGlobeOutline,
  IoLockClosedOutline,
} from 'react-icons/io5';
import {
  fetchPlaylists,
  addPlaylist,
  deletePlaylist,
} from '../redux/slices/youtubePlaylistSlice';
import { toggleVisibility } from '../redux/slices/adminSlice';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import api from '../utils/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';

const YouTubePlaylistsPage = () => {
  useDocumentTitle('YouTube Library');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { playlists, isLoading } = useSelector((state) => state.playlists);
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';

  // Navigation & filter state
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'playlists' | 'videos'
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [addType, setAddType] = useState('playlist'); // 'playlist' | 'video'
  const [inputUrl, setInputUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [detectedType, setDetectedType] = useState(null);

  // Delete state
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchPlaylists());
  }, [dispatch]);

  // Smart URL type auto-detection
  const handleUrlChange = (e) => {
    const val = e.target.value;
    setInputUrl(val);

    const trimmed = val.trim();
    if (!trimmed) {
      setDetectedType(null);
      return;
    }

    const hasPlaylistParam = /[?&]list=([a-zA-Z0-9_-]+)/.test(trimmed) || /^[A-Za-z]{2}[a-zA-Z0-9_-]+$/.test(trimmed);
    const hasVideoParam =
      /[?&]v=([a-zA-Z0-9_-]{11})/.test(trimmed) ||
      /youtu\.be\/([a-zA-Z0-9_-]{11})/.test(trimmed) ||
      /\/shorts\/([a-zA-Z0-9_-]{11})/.test(trimmed) ||
      /\/embed\/([a-zA-Z0-9_-]{11})/.test(trimmed);

    if (hasPlaylistParam && (!hasVideoParam || trimmed.includes('/playlist?'))) {
      setDetectedType('playlist');
      setAddType('playlist');
    } else if (hasVideoParam) {
      setDetectedType('video');
      setAddType('video');
    } else {
      setDetectedType(null);
    }
  };

  const handleOpenAddModal = (presetType = null) => {
    if (presetType) {
      setAddType(presetType);
    }
    setInputUrl('');
    setDetectedType(null);
    setShowForm(true);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!inputUrl.trim()) {
      toast.error('YouTube URL is required');
      return;
    }
    setIsAdding(true);
    const result = await dispatch(
      addPlaylist({
        url: inputUrl.trim(),
        playlistUrl: inputUrl.trim(),
        type: addType,
      }),
    );
    setIsAdding(false);

    if (result.meta.requestStatus === 'fulfilled') {
      const addedItem = result.payload.playlist;
      toast.success(
        addedItem?.type === 'video'
          ? 'Single video added to library!'
          : 'Playlist added to library!',
      );
      setShowForm(false);
      setInputUrl('');
      setDetectedType(null);
    } else {
      toast.error(result.payload || 'Failed to add YouTube item');
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    const result = await dispatch(deletePlaylist(deleteId));
    setIsDeleting(false);
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Item removed');
      setDeleteId(null);
    } else {
      toast.error(result.payload || 'Failed to delete item');
    }
  };

  const handleTogglePublic = async (item) => {
    const newVis = item.visibility === 'public' ? 'private' : 'public';
    const result = await dispatch(
      toggleVisibility({
        contentType: 'playlist',
        contentId: item._id,
        visibility: newVis,
      }),
    );
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success(`Set to ${newVis}`);
      dispatch(fetchPlaylists());
    }
  };

  // Filtered lists
  const filteredItems = useMemo(() => {
    return (playlists || []).filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const title = item.title?.toLowerCase() || '';
      const channel = item.channelTitle?.toLowerCase() || '';
      const desc = item.description?.toLowerCase() || '';
      return title.includes(q) || channel.includes(q) || desc.includes(q);
    });
  }, [playlists, searchQuery]);

  const playlistList = useMemo(() => {
    return filteredItems.filter((item) => (item.type || 'playlist') === 'playlist');
  }, [filteredItems]);

  const singleVideoList = useMemo(() => {
    return filteredItems.filter((item) => item.type === 'video');
  }, [filteredItems]);

  const totalAll = (playlists || []).length;
  const totalPlaylists = (playlists || []).filter((p) => (p.type || 'playlist') === 'playlist').length;
  const totalVideos = (playlists || []).filter((p) => p.type === 'video').length;

  // Single Item Card Component
  const renderItemCard = (item, index) => {
    const isOwner =
      !!(user?._id && item.addedBy &&
        String(item.addedBy?._id ?? item.addedBy) === String(user._id));
    const canManage = isAdmin || isOwner;
    const isVideo = item.type === 'video';
    const singleVideoObj = isVideo ? item.videos?.[0] : null;
    const hasNotes = isVideo
      ? Boolean(singleVideoObj?.notes && singleVideoObj.notes.trim())
      : item.videos?.some((v) => v.notes && v.notes.trim());

    return (
      <motion.div
        key={item._id}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ delay: index * 0.04 }}
        className="glass-card group relative overflow-hidden cursor-pointer border border-subtle hover:border-accent/40 hover:shadow-lg hover:shadow-black/20 transition-all flex flex-col justify-between"
        onClick={() => navigate(`/youtube-playlists/${item._id}`)}
      >
        {/* Thumbnail & Badges */}
        <div>
          <div className="relative aspect-video w-full overflow-hidden bg-surface-raised">
            {item.thumbnail ? (
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-red-500/20 to-rose-500/10 flex items-center justify-center">
                <IoLogoYoutube size={44} className="text-red-500/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Play Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                <IoPlayCircleOutline size={30} />
              </div>
            </div>

            {/* Top-left Type Badge */}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold backdrop-blur-md flex items-center gap-1 shadow-sm ${
                  isVideo
                    ? 'bg-red-500/80 text-white'
                    : 'bg-indigo-500/80 text-white'
                }`}
              >
                {isVideo ? <IoFilmOutline size={12} /> : <IoFolderOutline size={12} />}
                {isVideo ? 'Single Video' : 'Playlist'}
              </span>

              {hasNotes && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/80 text-white backdrop-blur-md flex items-center gap-1 shadow-sm">
                  <IoDocumentTextOutline size={12} /> Notes
                </span>
              )}
            </div>

            {/* Top-right Privacy Badge */}
            <div className="absolute top-2.5 right-2.5">
              {isAdmin && item.visibility === 'public' ? (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-medium backdrop-blur-md flex items-center gap-1 shadow-sm text-emerald-300 bg-black/60 border border-emerald-500/30">
                  <IoGlobeOutline size={11} /> Published
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-medium backdrop-blur-md flex items-center gap-1 shadow-sm text-secondary bg-black/60 border border-subtle">
                  <IoLockClosedOutline size={11} /> Private
                </span>
              )}
            </div>

            {/* Bottom-right Duration / Count Badge */}
            <div className="absolute bottom-2.5 right-2.5">
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-black/80 text-primary backdrop-blur-md border border-white/10 flex items-center gap-1 shadow-sm">
                {isVideo ? (
                  <>
                    <IoTimeOutline size={12} />
                    {singleVideoObj?.duration || 'Video'}
                  </>
                ) : (
                  <>
                    <IoFolderOutline size={12} />
                    {item.videoCount || item.videos?.length || 0} videos
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-4">
            <h3 className="text-sm font-semibold text-primary line-clamp-2 leading-snug group-hover:text-accent transition-colors mb-1.5">
              {item.title}
            </h3>

            {item.channelTitle && (
              <p className="text-xs text-red-400 font-medium flex items-center gap-1 mb-1">
                <IoLogoYoutube size={13} /> {item.channelTitle}
              </p>
            )}

            {item.description && (
              <p className="text-xs text-secondary line-clamp-2 mt-1">
                {item.description}
              </p>
            )}
          </div>
        </div>

        {/* Card Footer / Management Controls */}
        <div className="px-4 pb-3.5 pt-1 border-t border-subtle flex items-center justify-between text-xs text-muted">
          <span>
            {isVideo ? 'Personal Video' : `${item.videoCount || 0} chapters`}
          </span>

          {canManage && (
            <div
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Only Admins can publish or unpublish to Explore */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleTogglePublic(item)}
                  className={`px-2 py-0.5 rounded transition-colors text-[11px] font-medium cursor-pointer ${
                    item.visibility === 'public'
                      ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                  title={item.visibility === 'public' ? 'Unpublish from Explore' : 'Publish to Explore'}
                >
                  {item.visibility === 'public' ? 'Unpublish' : 'Publish'}
                </button>
              )}

              <button
                type="button"
                onClick={() => handleDelete(item._id)}
                className="p-1 rounded hover:bg-red-500/10 text-muted hover:text-red-400 transition-colors cursor-pointer"
                title="Delete"
              >
                <IoTrashOutline size={14} />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-subtle pb-6"
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
              <IoLogoYoutube size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary font-display">
                YouTube Library
              </h1>
              <p className="text-secondary text-xs sm:text-sm">
                Watch playlists & single videos, write timestamped notes, and track completion.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => navigate('/explore?type=playlists')}
            className="btn-secondary flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer text-secondary hover:text-primary"
          >
            <IoGlobeOutline size={16} className="text-accent" />
            Explore Playlists
          </button>
          <button
            onClick={() => handleOpenAddModal('video')}
            className="btn-secondary flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer hover:border-red-500/30"
          >
            <IoFilmOutline size={16} className="text-red-400" />
            + Add Single Video
          </button>
          <button
            onClick={() => handleOpenAddModal('playlist')}
            className="btn-primary flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer shadow-lg shadow-accent/10"
          >
            <IoFolderOutline size={16} />
            + Add Playlist
          </button>
        </div>
      </motion.div>

      {/* Filter Toolbar & Tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Segmented Section Tabs */}
        <div className="flex items-center bg-surface-raised p-1 rounded-xl border border-subtle">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-accent text-white shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <span>All Items</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-surface text-muted'
              }`}
            >
              {totalAll}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('playlists')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'playlists'
                ? 'bg-accent text-white shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <IoFolderOutline size={13} />
            <span>Playlists</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'playlists'
                  ? 'bg-white/20 text-white'
                  : 'bg-surface text-muted'
              }`}
            >
              {totalPlaylists}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('videos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'videos'
                ? 'bg-accent text-white shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <IoFilmOutline size={13} />
            <span>Single Videos</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'videos'
                  ? 'bg-white/20 text-white'
                  : 'bg-surface text-muted'
              }`}
            >
              {totalVideos}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <IoSearchOutline
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search titles or channels..."
            className="input-dark w-full pl-9 py-1.5 text-xs sm:text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-primary"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <LoadingSpinner text="Loading YouTube content..." />
      ) : playlists.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20 glass-card border border-subtle"
        >
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 mx-auto flex items-center justify-center mb-4">
            <IoLogoYoutube size={36} />
          </div>
          <h3 className="text-lg font-semibold text-primary mb-1">
            Your YouTube library is empty
          </h3>
          <p className="text-sm text-secondary max-w-md mx-auto mb-6">
            Add your own playlist or video link, or discover admin-curated playlists in Explore to start taking notes and tracking your progress.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => handleOpenAddModal('video')}
              className="btn-secondary flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
            >
              <IoFilmOutline size={16} className="text-red-400" />
              Add Single Video
            </button>
            <button
              onClick={() => handleOpenAddModal('playlist')}
              className="btn-primary flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
            >
              <IoFolderOutline size={16} />
              Add Playlist
            </button>
            <button
              onClick={() => navigate('/explore?type=playlists')}
              className="btn-secondary flex items-center gap-2 text-xs sm:text-sm cursor-pointer text-accent hover:text-accent-hover"
            >
              <IoGlobeOutline size={16} />
              Explore Public Playlists
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-10">
          {/* TAB: ALL ITEMS */}
          {activeTab === 'all' && (
            <>
              {/* Playlists Section */}
              {playlistList.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <IoFolderOutline size={18} />
                      </div>
                      <h2 className="text-lg font-bold text-primary font-display">
                        Playlists ({playlistList.length})
                      </h2>
                    </div>
                    <button
                      onClick={() => handleOpenAddModal('playlist')}
                      className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <IoAdd size={14} /> Add Playlist
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence>
                      {playlistList.map((item, idx) => renderItemCard(item, idx))}
                    </AnimatePresence>
                  </div>
                </section>
              )}

              {/* Single Videos Section */}
              {singleVideoList.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                        <IoFilmOutline size={18} />
                      </div>
                      <h2 className="text-lg font-bold text-primary font-display">
                        Single Videos ({singleVideoList.length})
                      </h2>
                    </div>
                    <button
                      onClick={() => handleOpenAddModal('video')}
                      className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <IoAdd size={14} /> Add Single Video
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence>
                      {singleVideoList.map((item, idx) => renderItemCard(item, idx))}
                    </AnimatePresence>
                  </div>
                </section>
              )}

              {filteredItems.length === 0 && (
                <div className="text-center py-12 text-secondary text-sm">
                  No playlists or videos match "{searchQuery}".
                </div>
              )}
            </>
          )}

          {/* TAB: PLAYLISTS ONLY */}
          {activeTab === 'playlists' && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-primary font-display flex items-center gap-2">
                  <IoFolderOutline className="text-indigo-400" size={20} />
                  Playlists ({playlistList.length})
                </h2>
                <button
                  onClick={() => handleOpenAddModal('playlist')}
                  className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <IoAdd size={14} /> Add Playlist
                </button>
              </div>

              {playlistList.length === 0 ? (
                <div className="text-center py-16 glass-card border border-subtle">
                  <IoFolderOutline size={40} className="mx-auto text-muted mb-2" />
                  <p className="text-sm text-secondary">
                    {searchQuery
                      ? `No playlists match "${searchQuery}"`
                      : 'No playlists saved yet.'}
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <AnimatePresence>
                    {playlistList.map((item, idx) => renderItemCard(item, idx))}
                  </AnimatePresence>
                </div>
              )}
            </section>
          )}

          {/* TAB: SINGLE VIDEOS ONLY */}
          {activeTab === 'videos' && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-primary font-display flex items-center gap-2">
                  <IoFilmOutline className="text-red-400" size={20} />
                  Single Videos ({singleVideoList.length})
                </h2>
                <button
                  onClick={() => handleOpenAddModal('video')}
                  className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <IoAdd size={14} /> Add Single Video
                </button>
              </div>

              {singleVideoList.length === 0 ? (
                <div className="text-center py-16 glass-card border border-subtle">
                  <IoFilmOutline size={40} className="mx-auto text-muted mb-2" />
                  <p className="text-sm text-secondary">
                    {searchQuery
                      ? `No single videos match "${searchQuery}"`
                      : 'No single videos saved yet.'}
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <AnimatePresence>
                    {singleVideoList.map((item, idx) => renderItemCard(item, idx))}
                  </AnimatePresence>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* Add Content Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setInputUrl('');
          setDetectedType(null);
        }}
        title="Add to YouTube Library"
      >
        <form onSubmit={handleAdd} className="space-y-5">
          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
              Select Item Type
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-surface-raised rounded-xl border border-subtle">
              <button
                type="button"
                onClick={() => setAddType('playlist')}
                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  addType === 'playlist'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                <IoFolderOutline size={16} />
                <span>Playlist</span>
              </button>
              <button
                type="button"
                onClick={() => setAddType('video')}
                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  addType === 'video'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                <IoFilmOutline size={16} />
                <span>Single Video</span>
              </button>
            </div>
          </div>

          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">
              {addType === 'video'
                ? 'YouTube Video Link'
                : 'YouTube Playlist Link'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={inputUrl}
                onChange={handleUrlChange}
                placeholder={
                  addType === 'video'
                    ? 'https://www.youtube.com/watch?v=... or https://youtu.be/...'
                    : 'https://www.youtube.com/playlist?list=PL...'
                }
                className="input-dark w-full pr-10 text-sm"
                autoFocus
                required
                disabled={isAdding}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                <IoLogoYoutube size={18} className="text-red-500/60" />
              </div>
            </div>

            {/* Smart Detection Hint */}
            {detectedType && (
              <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
                <IoCheckmarkCircle size={13} />
                Detected: {detectedType === 'video' ? 'Single Video' : 'Playlist'} link.
              </p>
            )}

            <p className="text-xs text-muted mt-1.5">
              {addType === 'video'
                ? 'Paste any standard video, short, or share link. The title, channel, and thumbnail will be fetched automatically.'
                : 'Paste a playlist link. All videos, durations, and thumbnails will be retrieved automatically.'}
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-subtle">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setInputUrl('');
                setDetectedType(null);
              }}
              className="btn-secondary text-sm"
              disabled={isAdding}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2 text-sm"
              disabled={isAdding}
            >
              {isAdding ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Fetching Metadata...
                </>
              ) : addType === 'video' ? (
                'Add Video'
              ) : (
                'Add Playlist'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Item"
        message="Are you sure you want to remove this item and its associated notes from your library? This cannot be undone."
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default YouTubePlaylistsPage;
