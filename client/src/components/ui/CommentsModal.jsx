import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IoSendOutline, IoTrashOutline } from 'react-icons/io5';
import { addComment, deleteComment } from '../../redux/slices/exploreSlice';
import Modal from './Modal';
import toast from 'react-hot-toast';

/**
 * Reusable comments modal for any resource type.
 * Props:
 *   isOpen       – boolean
 *   onClose      – fn
 *   item         – { _id, title, contentType }  e.g. { _id: '...', title: 'My Book', contentType: 'book' }
 */
const CommentsModal = ({ isOpen, onClose, item }) => {
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dispatch = useDispatch();
  const { comments, commentsTotal } = useSelector((state) => state.explore);
  const { user } = useSelector((state) => state.auth);

  const handleClose = () => {
    setCommentText('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !item) return;

    setIsSubmitting(true);
    const result = await dispatch(
      addComment({
        contentType: item.contentType,
        contentId: item._id,
        text: commentText.trim(),
      }),
    );
    setIsSubmitting(false);

    if (result.meta.requestStatus === 'fulfilled') {
      setCommentText('');
      toast.success('Comment posted');
    } else {
      toast.error(result.payload || 'Failed to post comment');
    }
  };

  const handleDelete = async (commentId) => {
    const result = await dispatch(
      deleteComment({ commentId, contentType: item?.contentType, contentId: item?._id }),
    );
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Comment deleted');
    } else {
      toast.error(result.payload || 'Failed to delete comment');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={item ? `Comments • ${item.title}` : 'Comments'}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Post comment form */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="input-dark flex-1"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={isSubmitting || !commentText.trim()}
            className="btn-primary flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IoSendOutline size={14} />
            Post
          </button>
        </form>

        <div className="text-xs text-slate-500">
          {commentsTotal} comment{commentsTotal === 1 ? '' : 's'}
        </div>

        {/* Comment list */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {comments.length === 0 ? (
            <div className="text-sm text-slate-400 py-8 text-center border border-white/5 rounded-xl">
              No comments yet. Start the discussion.
            </div>
          ) : (
            comments.map((comment) => {
              const canDelete =
                user?.role === 'admin' ||
                String(comment.user?._id) === String(user?._id);
              return (
                <div
                  key={comment._id}
                  className="border border-white/5 rounded-xl p-3 bg-slate-900/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
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
                      <div className="min-w-0">
                        <div className="text-sm text-white truncate">
                          {comment.user?.name || 'Unknown'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(comment.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {canDelete && (
                      <button
                        onClick={() => handleDelete(comment._id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                        title="Delete comment"
                      >
                        <IoTrashOutline size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-300 mt-2 whitespace-pre-wrap">
                    {comment.text}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CommentsModal;
