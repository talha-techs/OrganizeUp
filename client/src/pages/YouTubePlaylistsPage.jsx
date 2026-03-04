import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoAdd,
  IoLogoYoutube,
  IoPlayCircleOutline,
  IoTrashOutline,
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
  useDocumentTitle('YouTube Playlists');
  const [showForm, setShowForm] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deletePlaylistId, setDeletePlaylistId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { playlists, isLoading } = useSelector((state) => state.playlists);
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    dispatch(fetchPlaylists());
  }, [dispatch]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!playlistUrl.trim()) {
      toast.error('Playlist URL is required');
      return;
    }
    setIsAdding(true);
    const result = await dispatch(
      addPlaylist({ playlistUrl: playlistUrl.trim() }),
    );
    setIsAdding(false);

    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Playlist added!');
      setShowForm(false);
      setPlaylistUrl('');
    } else {
      toast.error(result.payload || 'Failed to add playlist');
    }
  };

  const handleDelete = (id) => {
    setDeletePlaylistId(id);
  };

  const confirmDeletePlaylist = async () => {
    if (!deletePlaylistId) return;
    setIsDeleting(true);
    const result = await dispatch(deletePlaylist(deletePlaylistId));
    setIsDeleting(false);
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Playlist deleted');
      setDeletePlaylistId(null);
    } else {
      toast.error(result.payload || 'Failed to delete playlist');
    }
  };

  const handleTogglePublic = async (playlist) => {
    const newVis = playlist.visibility === 'public' ? 'private' : 'public';
    const result = await dispatch(
      toggleVisibility({
        contentType: 'playlist',
        contentId: playlist._id,
        visibility: newVis,
      }),
    );
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success(`Playlist set to ${newVis}`);
      dispatch(fetchPlaylists());
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-white font-display">YouTube Playlists</h1>
          <p className="text-slate-400 text-sm mt-1">Save and watch YouTube playlists</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <IoAdd size={18} /> Add Playlist
        </button>
      </motion.div>

      {/* Grid */}
      {isLoading ? (
        <LoadingSpinner text="Loading playlists..." />
      ) : playlists.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <IoLogoYoutube className="mx-auto text-slate-600 mb-4" size={48} />
          <h3 className="text-lg font-medium text-slate-400 mb-2">No playlists yet</h3>
          <p className="text-sm text-slate-500">Add a YouTube playlist URL to get started</p>
        </motion.div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {playlists.map((pl, i) => {
              const isOwner =
                !!(user?._id && pl.addedBy &&
                  String(pl.addedBy?._id ?? pl.addedBy) === String(user._id));
              const canManage = isAdmin || isOwner;

              return (
                <motion.div
                  key={pl._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card group relative overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/youtube-playlists/${pl._id}`)}
                >
                  {/* Thumbnail / Banner */}
                  <div className="relative">
                    {pl.thumbnail ? (
                      <img
                        src={pl.thumbnail}
                        alt={pl.title}
                        className="w-full h-44 object-cover rounded-t-2xl"
                      />
                    ) : (
                      <div className="w-full h-44 bg-gradient-to-br from-red-500/20 to-rose-500/10 rounded-t-2xl flex items-center justify-center">
                        <IoLogoYoutube size={48} className="text-red-500/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent rounded-t-2xl" />

                    {/* Play icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <IoPlayCircleOutline size={48} className="text-white/80" />
                    </div>

                    {/* Visibility badge */}
                    <div
                      className={`absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm ${
                        pl.visibility === 'public'
                          ? 'text-emerald-300 bg-emerald-500/20'
                          : 'text-slate-300 bg-slate-500/20'
                      }`}
                    >
                      {pl.visibility}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="text-base font-semibold text-white truncate mb-1">
                      {pl.title}
                    </h3>
                    {pl.channelTitle && (
                      <p className="text-sm text-red-400 mb-1">{pl.channelTitle}</p>
                    )}
                    {pl.description && (
                      <p className="text-sm text-slate-400 line-clamp-2 mb-2">{pl.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {pl.videoCount || 0} video{pl.videoCount !== 1 ? 's' : ''}
                      </span>

                      {canManage && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePublic(pl);
                              }}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors text-xs"
                            >
                              {pl.visibility === 'public' ? 'Private' : 'Public'}
                            </button>
                          )}
                          {!isAdmin && isOwner && pl.visibility === 'public' && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await api.put('/content/toggle-visibility', { contentType: 'playlist', contentId: pl._id, visibility: 'private' });
                                  toast.success('Playlist set to private');
                                  dispatch(fetchPlaylists());
                                } catch (err) {
                                  toast.error(err.response?.data?.message || 'Failed to update');
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-amber-500/10 text-slate-400 hover:text-amber-400 transition-colors text-xs"
                              title="Make Private"
                            >
                              Private
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(pl._id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
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

      {/* Add Playlist Modal — just paste URL, everything auto-fetched */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setPlaylistUrl(''); }} title="Add YouTube Playlist">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">YouTube Playlist URL</label>
            <input
              type="text"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              placeholder="https://www.youtube.com/playlist?list=PL..."
              className="input-dark w-full"
              autoFocus
              required
              disabled={isAdding}
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Paste a playlist link — title, videos, and thumbnails will be fetched automatically.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowForm(false); setPlaylistUrl(''); }} className="btn-secondary" disabled={isAdding}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={isAdding}>
              {isAdding ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Fetching...
                </>
              ) : (
                'Add Playlist'
              )}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletePlaylistId}
        title="Delete Playlist"
        message="Are you sure you want to delete this playlist? This action cannot be undone."
        confirmText="Delete"
        onConfirm={confirmDeletePlaylist}
        onCancel={() => setDeletePlaylistId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default YouTubePlaylistsPage;
