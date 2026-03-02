import { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { HiPencil, HiTrash } from 'react-icons/hi';
import { IoGlobeOutline, IoLockClosedOutline, IoTimeOutline, IoRocketOutline, IoEyeOutline, IoEyeOffOutline, IoChatbubbleOutline } from 'react-icons/io5';
import { motion, AnimatePresence } from 'framer-motion';

const visibilityConfig = {
  public: { icon: IoGlobeOutline, label: 'Public', color: 'text-emerald-400 bg-emerald-500/10' },
  private: { icon: IoLockClosedOutline, label: 'Private', color: 'text-slate-400 bg-slate-500/10' },
  pending: { icon: IoTimeOutline, label: 'Pending', color: 'text-amber-400 bg-amber-500/10' },
};

const ResourceCard = ({
  title, subtitle, image, description, onEdit, onDelete, onClick,
  isAdmin, isOwner: isOwnerProp, ownerId, visibility,
  onRequestPublish, onToggleVisibility, onMakePrivate,
  onComment, commentCount,
  commentSection,  // React node rendered inline at the bottom of the card
  children,
}) => {
  const { user } = useSelector((state) => state.auth);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Compute ownership robustly inside the component.
  // If the caller passes `ownerId` (the raw addedBy field), we compare against
  // the live Redux user — this avoids stale / mis-typed prop comparisons.
  // Fall back to the legacy boolean `isOwner` prop when ownerId is absent.
  const isOwner =
    ownerId !== undefined
      ? !!(user?._id &&
          ownerId &&
          String(ownerId?._id ?? ownerId) === String(user._id))
      : !!isOwnerProp;

  const canManage = isAdmin || isOwner;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const vis = visibilityConfig[visibility] || visibilityConfig.private;
  const VisIcon = vis.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="glass-card group relative overflow-hidden cursor-pointer"
    >
      {/* Image */}
      <div onClick={onClick} className="relative">
        {image ? (
          <img src={image} alt={title} className="w-full h-44 object-cover rounded-t-2xl" />
        ) : (
          <div className="w-full h-44 rounded-t-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 flex items-center justify-center">
            <span className="text-4xl font-bold text-indigo-500/30">{title?.charAt(0)?.toUpperCase()}</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent rounded-t-2xl" />
      </div>

      {/* Visibility badge */}
      {visibility && (
        <div className={`absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm ${vis.color}`}>
          <VisIcon size={12} />
          {vis.label}
        </div>
      )}

      {/* Three dots menu */}
      {canManage && (
        <div ref={menuRef} className="absolute top-3 right-3 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="p-2 rounded-xl bg-slate-900/60 backdrop-blur-sm text-white/70 hover:text-white hover:bg-slate-900/80 transition-all"
          >
            <BsThreeDotsVertical size={14} />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -5 }}
                className="absolute right-0 mt-1 w-44 bg-slate-800 border border-white/10 rounded-xl shadow-xl overflow-hidden"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit?.(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  <HiPencil size={14} /> Edit
                </button>
                {isAdmin && onToggleVisibility && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleVisibility?.(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/5 transition-all"
                  >
                    {visibility === 'public' ? <IoEyeOffOutline size={14} /> : <IoEyeOutline size={14} />}
                    {visibility === 'public' ? 'Make Private' : 'Make Public'}
                  </button>
                )}
                {visibility === 'private' && isOwner && !isAdmin && onRequestPublish && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRequestPublish?.(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/5 transition-all"
                  >
                    <IoRocketOutline size={14} /> Request Publish
                  </button>
                )}
                {visibility === 'public' && isOwner && !isAdmin && onMakePrivate && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onMakePrivate?.(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-500/5 transition-all"
                  >
                    <IoLockClosedOutline size={14} /> Make Private
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete?.(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all"
                >
                  <HiTrash size={14} /> Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Content */}
      <div onClick={onClick} className="p-4 pb-2">
        <h3 className="text-base font-semibold text-white truncate mb-1">{title}</h3>
        {subtitle && <p className="text-sm text-indigo-400 mb-2">{subtitle}</p>}
        {description && (
          <p className="text-sm text-slate-400 line-clamp-2">{description}</p>
        )}
        {children}

        {/* Comment button */}
        {onComment && (
          <button
            onClick={(e) => { e.stopPropagation(); onComment(); }}
            className={`flex items-center gap-1 mt-3 transition-colors text-xs ${
              commentSection
                ? 'text-indigo-400'
                : 'text-slate-400 hover:text-indigo-400'
            }`}
            title="Toggle comments"
          >
            <IoChatbubbleOutline size={13} />
            <span>{commentCount ?? 0} comments</span>
          </button>
        )}
      </div>

      {/* Inline comment section (rendered without navigation onClick) */}
      {commentSection && (
        <div className="px-4 pb-4" onClick={(e) => e.stopPropagation()}>
          {commentSection}
        </div>
      )}
    </motion.div>
  );
};

export default ResourceCard;
