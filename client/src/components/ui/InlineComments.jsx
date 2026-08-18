import { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { IoSendOutline, IoTrashOutline, IoChatbubbleOutline, IoCloseOutline } from 'react-icons/io5';
import { fetchComments, addComment, deleteComment } from '../../redux/slices/exploreSlice';
import toast from 'react-hot-toast';

/**
 * Inline comment section that lives directly below a resource card.
 * Props:
 *   contentType  – 'book' | 'course' | 'tool'
 *   contentId    – mongo _id string
 *   onClose      – fn to collapse the panel
 */
const InlineComments = ({ contentType, contentId, onClose }) => {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);

  const dispatch = useDispatch();
  const { comments, commentsTotal, isLoading } = useSelector((s) => s.explore);
  const { user } = useSelector((s) => s.auth);

  useEffect(() => {
    dispatch(fetchComments({ contentType, contentId }));
    // Focus the input after mount
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [dispatch, contentType, contentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setIsSubmitting(true);
    const result = await dispatch(addComment({ contentType, contentId, text: text.trim() }));
    setIsSubmitting(false);
    if (result.meta.requestStatus === 'fulfilled') {
      setText('');
    } else {
      toast.error(result.payload || 'Failed to post comment');
    }
  };

  const handleDelete = async (commentId) => {
    const result = await dispatch(deleteComment({ commentId, contentType, contentId }));
    if (result.meta.requestStatus !== 'fulfilled') {
      toast.error(result.payload || 'Failed to delete');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="border-t border-white/5 pt-3 mt-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-secondary flex items-center gap-1.5">
          <IoChatbubbleOutline size={13} />
          {commentsTotal} comment{commentsTotal !== 1 ? 's' : ''}
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-muted hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer"
        >
          <IoCloseOutline size={14} />
        </button>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 mb-3">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment…"
          maxLength={500}
          className="flex-1 px-3 py-1.5 rounded-lg bg-surface border border-subtle text-primary text-xs placeholder-muted focus:border-accent focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={isSubmitting || !text.trim()}
          className="p-1.5 rounded-lg bg-accent-subtle text-accent hover:bg-accent-glow disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Post comment"
        >
          <IoSendOutline size={13} />
        </button>
      </form>

      {/* Comment list */}
      <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
        {isLoading ? (
          <p className="text-center text-xs text-muted py-3">Loading…</p>
        ) : comments.length === 0 ? (
          <p className="text-center text-xs text-muted py-3">
            No comments yet. Be the first!
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {comments.map((comment) => {
              const canDelete =
                user?.role === 'admin' ||
                String(comment.user?._id) === String(user?._id);
              return (
                <motion.div
                  key={comment._id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2 group"
                >
                  {/* Avatar */}
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-accent-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
                    {comment.user?.avatar ? (
                      <img
                        src={comment.user.avatar}
                        alt={comment.user?.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[9px] font-bold text-primary">
                        {comment.user?.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-medium text-primary truncate">
                        {comment.user?.name || 'Unknown'}
                        <span className="text-muted ml-1.5 font-normal">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </span>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(comment._id)}
                          className="p-1 rounded text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          title="Delete"
                        >
                          <IoTrashOutline size={11} />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-secondary whitespace-pre-wrap break-words">
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
  );
};

export default InlineComments;
