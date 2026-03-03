import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoBookmarkOutline,
  IoBookOutline,
  IoSchoolOutline,
  IoBulbOutline,
  IoFolderOutline,
  IoLogoYoutube,
  IoTrashOutline,
  IoWarningOutline,
  IoArrowForwardOutline,
  IoDocumentTextOutline,
  IoCreateOutline,
  IoCheckmarkOutline,
  IoCloseOutline,
} from 'react-icons/io5';
import { fetchLibrary, removeFromLibrary, updateLibraryNotes } from '../redux/slices/librarySlice';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

/* ── constants ─────────────────────────────────── */
const TYPE_META = {
  book:     { label: 'Book',     icon: IoBookOutline,    color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   route: (id) => `/books/${id}` },
  course:   { label: 'Course',   icon: IoSchoolOutline,  color: 'text-purple-400', bg: 'bg-purple-500/10', route: (id) => `/courses/${id}` },
  tool:     { label: 'Trick',    icon: IoBulbOutline,    color: 'text-amber-400',  bg: 'bg-amber-500/10',  route: (id) => `/tools/${id}` },
  section:  { label: 'Section',  icon: IoFolderOutline,  color: 'text-emerald-400',bg: 'bg-emerald-500/10',route: (id) => `/sections/${id}` },
  playlist: { label: 'Playlist', icon: IoLogoYoutube,    color: 'text-red-400',    bg: 'bg-red-500/10',    route: (id) => `/youtube-playlists/${id}` },
};

/* ── SavedItem card ─────────────────────────────── */
const SavedItem = ({ item, onRemove }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [confirming, setConfirming]   = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft]   = useState(item.personalNotes || '');
  const [savingNotes, setSavingNotes] = useState(false);

  const content = item.content || {};
  const meta    = TYPE_META[item.contentType] || TYPE_META.book;
  const thumb   = content.bannerImage || content.coverImage || content.thumbnailUrl;

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    const result = await dispatch(updateLibraryNotes({ id: item._id, personalNotes: notesDraft }));
    setSavingNotes(false);
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Notes saved');
      setEditingNotes(false);
    } else {
      toast.error(result.payload || 'Failed to save notes');
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="glass-card overflow-hidden"
    >
      {/* Top row */}
      <div className="flex items-start gap-4 p-4">
        {/* Thumbnail */}
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 flex items-center justify-center">
          {thumb ? (
            <img src={thumb} alt={content.title} className="w-full h-full object-cover" />
          ) : (
            <meta.icon size={22} className={meta.color} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-white font-semibold truncate">{content.title || 'Unknown'}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}>
                  {meta.label}
                </span>
                {content.addedBy?.name && (
                  <span className="text-xs text-slate-500">by {content.addedBy.name}</span>
                )}
                {content.category?.name && (
                  <span className="text-xs text-slate-600">· {content.category.name}</span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 mt-1">
                Saved {new Date(item.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => navigate(meta.route(item.contentId))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 transition-colors"
              >
                View <IoArrowForwardOutline size={12} />
              </button>

              <button
                onClick={() => setEditingNotes(!editingNotes)}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  editingNotes ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
                title="Notes"
              >
                <IoDocumentTextOutline size={14} />
              </button>

              {!confirming ? (
                <button
                  onClick={() => setConfirming(true)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Remove from library"
                >
                  <IoTrashOutline size={14} />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                    <IoWarningOutline size={11} className="text-orange-400" />
                  </span>
                  <button
                    onClick={() => { onRemove(); setConfirming(false); }}
                    className="text-[10px] px-2 py-1 rounded-lg bg-red-500 text-white hover:bg-red-400"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    className="text-[10px] px-2 py-1 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notes section (expandable) */}
      <AnimatePresence>
        {editingNotes && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t border-white/5"
          >
            <div className="px-4 pb-4 pt-3">
              <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                <IoCreateOutline size={12} /> Personal notes (only you can see this)
              </p>
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={3}
                placeholder="Add your private notes about this resource…"
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 resize-none"
              />
              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  onClick={() => { setNotesDraft(item.personalNotes || ''); setEditingNotes(false); }}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                >
                  <IoCloseOutline size={13} /> Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-50 transition-colors"
                >
                  <IoCheckmarkOutline size={13} /> {savingNotes ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ── Section block ──────────────────────────────── */
const TypeSection = ({ type, items, onRemove }) => {
  const meta = TYPE_META[type] || TYPE_META.book;
  const Icon = meta.icon;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center`}>
          <Icon size={14} className={meta.color} />
        </div>
        <h2 className="text-sm font-semibold text-white">{meta.label}s</h2>
        <span className="text-xs text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full">{items.length}</span>
      </div>
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <SavedItem key={item._id} item={item} onRemove={() => onRemove(item._id)} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ── Main page ──────────────────────────────────── */
const SavedLibraryPage = () => {
  const dispatch = useDispatch();
  const { saved, isLoading } = useSelector((state) => state.library);

  useEffect(() => {
    dispatch(fetchLibrary());
  }, [dispatch]);

  const handleRemove = async (libraryEntryId) => {
    const result = await dispatch(removeFromLibrary(libraryEntryId));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Removed from library');
    } else {
      toast.error(result.payload || 'Failed to remove');
    }
  };

  // Group saved items by contentType
  const grouped = saved.reduce((acc, item) => {
    const key = item.contentType || 'book';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const typeOrder = ['book', 'course', 'tool', 'section', 'playlist'];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 flex items-center justify-center">
            <IoBookmarkOutline size={20} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white font-display">Saved Library</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {saved.length} saved resource{saved.length !== 1 ? 's' : ''}
              {' · '}View, take notes, or remove items you've saved from Explore.
            </p>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner text="Loading your library…" />
        ) : saved.length === 0 ? (
          <div className="text-center py-24 glass-card">
            <IoBookmarkOutline className="mx-auto text-slate-700 mb-4" size={52} />
            <h3 className="text-lg font-medium text-slate-400 mb-2">Nothing saved yet</h3>
            <p className="text-sm text-slate-500">
              Browse <span className="text-indigo-400 font-medium">Explore</span> and save public resources to build your library.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {typeOrder
              .filter((t) => grouped[t]?.length > 0)
              .map((type) => (
                <TypeSection
                  key={type}
                  type={type}
                  items={grouped[type]}
                  onRemove={handleRemove}
                />
              ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default SavedLibraryPage;
