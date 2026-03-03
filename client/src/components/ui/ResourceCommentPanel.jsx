import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoCloseOutline,
  IoSendOutline,
  IoTrashOutline,
  IoChatbubbleOutline,
  IoBookOutline,
  IoSchoolOutline,
  IoConstructOutline,
} from 'react-icons/io5';
import { fetchComments, addComment, deleteComment } from '../../redux/slices/exploreSlice';
import toast from 'react-hot-toast';

/**
 * Half-screen right-side panel for viewing and posting comments on a resource.
 *
 * Props:
 *   resource      – the full resource object (title, bannerImage/coverImage, category, author…)
 *   contentType   – 'book' | 'course' | 'tool'
 *   onClose       – close the panel
 */
const ResourceCommentPanel = ({ resource, contentType, onClose }) => {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);
  const dispatch = useDispatch();

  const { comments, commentsTotal, isLoading } = useSelector((s) => s.explore);
  const { user } = useSelector((s) => s.auth);

  // Load comments when the panel mounts / resource changes
  useEffect(() => {
    if (!resource) return;
    dispatch(fetchComments({ contentType, contentId: resource._id }));
    setTimeout(() => inputRef.current?.focus(), 200);
  }, [dispatch, resource, contentType]);

  // Trap Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setIsSubmitting(true);
    const result = await dispatch(addComment({ contentType, contentId: resource._id, text: text.trim() }));
    setIsSubmitting(false);
    if (result.meta.requestStatus === 'fulfilled') {
      setText('');
    } else {
      toast.error(result.payload || 'Failed to post comment');
    }
  };

  const handleDelete = async (commentId) => {
    const result = await dispatch(deleteComment({ commentId, contentType, contentId: resource._id }));
    if (result.meta.requestStatus !== 'fulfilled') {
      toast.error(result.payload || 'Failed to delete');
    }
  };

  const PlaceholderIcon =
    contentType === 'book' ? IoBookOutline
    : contentType === 'course' ? IoSchoolOutline
    : IoConstructOutline;

  const bannerSrc = resource?.bannerImage || resource?.coverImage || null;
  const subtitle = resource?.category?.name || resource?.author || null;

  return (
    <AnimatePresence>
      {resource && (
        /* Full-screen backdrop — click outside panel to close */
        <motion.div
          key="panel-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex justify-end"
          onClick={onClose}
        >
          {/* Frosted left-side backdrop */}
          <div className="flex-1 bg-black/40 backdrop-blur-[2px]" />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-[50vw] min-w-[360px] max-w-[680px] h-full bg-slate-950 border-l border-white/5 flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Top bar ── */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <IoChatbubbleOutline className="text-indigo-400 flex-shrink-0" size={16} />
                <span className="text-sm font-semibold text-white truncate">
                  Comments
                </span>
                <span className="text-xs text-slate-500 font-normal truncate">
                  · {resource?.title}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 flex-shrink-0 ml-2 transition-colors"
                title="Close"
              >
                <IoCloseOutline size={18} />
              </button>
            </div>

            {/* ── Resource banner ── */}
            <div className="relative w-full h-44 bg-gradient-to-br from-slate-800 to-slate-900 flex-shrink-0">
              {bannerSrc ? (
                <img
                  src={bannerSrc}
                  alt={resource?.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <PlaceholderIcon className="text-slate-700" size={48} />
                </div>
              )}
              {/* Gradient fade at bottom */}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950 to-transparent" />
            </div>

            {/* ── Resource title / subtitle ── */}
            <div className="px-5 pb-4 flex-shrink-0">
              <h2 className="text-base font-bold text-white leading-snug line-clamp-2">
                {resource?.title}
              </h2>
              {subtitle && (
                <p className="text-xs text-indigo-400 mt-0.5">{subtitle}</p>
              )}
            </div>

            {/* ── Comment input (pinned below banner) ── */}
            <div className="px-5 pb-4 flex-shrink-0 border-b border-white/5">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                {/* User avatar */}
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-indigo-500/25 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-white">
                      {user?.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write a comment…"
                  maxLength={500}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-800/70 border border-white/5 text-white text-sm placeholder-slate-500 focus:border-indigo-500/50 focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !text.trim()}
                  className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  title="Post comment"
                >
                  <IoSendOutline size={15} />
                </button>
              </form>
            </div>

            {/* ── Comments list (scrollable) ── */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <div className="text-xs text-slate-500 mb-3">
                {commentsTotal} comment{commentsTotal !== 1 ? 's' : ''}
              </div>

              {isLoading ? (
                <p className="text-center text-sm text-slate-500 py-10">Loading…</p>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <IoChatbubbleOutline className="text-slate-700 mb-3" size={36} />
                  <p className="text-sm text-slate-500">No comments yet.</p>
                  <p className="text-xs text-slate-600 mt-1">Be the first to share your thoughts!</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {comments.map((comment) => {
                    const canDelete =
                      user?.role === 'admin' ||
                      String(comment.user?._id) === String(user?._id);
                    return (
                      <motion.div
                        key={comment._id}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="flex items-start gap-3 group"
                      >
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          {comment.user?.avatar ? (
                            <img
                              src={comment.user.avatar}
                              alt={comment.user?.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-white">
                              {comment.user?.name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 bg-slate-900/50 rounded-xl px-3 py-2.5 border border-white/5">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-semibold text-slate-200 truncate">
                                {comment.user?.name || 'Unknown'}
                              </span>
                              <span className="text-[10px] text-slate-600 flex-shrink-0">
                                {new Date(comment.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(comment._id)}
                                className="p-1 rounded text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                title="Delete"
                              >
                                <IoTrashOutline size={12} />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-slate-300 whitespace-pre-wrap break-words leading-relaxed">
                            {comment.text}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ResourceCommentPanel;
