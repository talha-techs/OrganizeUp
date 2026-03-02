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
} from 'react-icons/io5';
import {
  fetchSections,
  createSection,
  deleteSection,
} from '../redux/slices/sectionSlice';
import { requestPublish } from '../redux/slices/exploreSlice';
import { toggleVisibility } from '../redux/slices/adminSlice';
import api from '../utils/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

const COLORS = [
  { name: 'indigo', from: 'from-indigo-500', to: 'to-blue-600' },
  { name: 'cyan', from: 'from-cyan-500', to: 'to-teal-600' },
  { name: 'purple', from: 'from-purple-500', to: 'to-pink-600' },
  { name: 'emerald', from: 'from-emerald-500', to: 'to-green-600' },
  { name: 'amber', from: 'from-amber-500', to: 'to-orange-600' },
  { name: 'rose', from: 'from-rose-500', to: 'to-red-600' },
];

function getColorClasses(color) {
  return COLORS.find((c) => c.name === color) || COLORS[0];
}

const SectionsPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('indigo');
  const [deleteSectionId, setDeleteSectionId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { sections, isLoading } = useSelector((state) => state.sections);
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    dispatch(fetchSections());
  }, [dispatch]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const result = await dispatch(
      createSection({ name: name.trim(), description: description.trim(), color: selectedColor }),
    );

    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Section created');
      setShowForm(false);
      setName('');
      setDescription('');
      setSelectedColor('indigo');
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
      toast.success('Section deleted');
      setDeleteSectionId(null);
    } else {
      toast.error(result.payload || 'Failed to delete section');
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
      toast.success(`Section set to ${newVis}`);
      dispatch(fetchSections());
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
          <h1 className="text-3xl font-bold text-white font-display">Custom Sections</h1>
          <p className="text-slate-400 text-sm mt-1">
            Create custom sections and import content from Google Drive
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <IoAdd size={18} /> New Section
        </button>
      </motion.div>

      {/* Sections Grid */}
      {isLoading ? (
        <LoadingSpinner text="Loading sections..." />
      ) : sections.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <IoFolderOutline className="mx-auto text-slate-600 mb-4" size={48} />
          <h3 className="text-lg font-medium text-slate-400 mb-2">No sections yet</h3>
          <p className="text-sm text-slate-500">
            Create your first custom section to organize Drive content
          </p>
        </motion.div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {sections.map((section, i) => {
              const col = getColorClasses(section.color);
              const isOwner =
                !!(user?._id && section.addedBy &&
                  String(section.addedBy?._id ?? section.addedBy) === String(user._id));
              const canManage = isAdmin || isOwner;

              return (
                <motion.div
                  key={section._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card group relative overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/sections/${section._id}`)}
                >
                  {/* Color banner */}
                  <div
                    className={`h-32 bg-gradient-to-br ${col.from} ${col.to} relative flex items-center justify-center`}
                  >
                    <IoFolderOutline size={40} className="text-white/30" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />

                    {/* Visibility badge */}
                    <div
                      className={`absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm ${
                        section.visibility === 'public'
                          ? 'text-emerald-300 bg-emerald-500/20'
                          : 'text-slate-300 bg-slate-500/20'
                      }`}
                    >
                      {section.visibility}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="text-base font-semibold text-white truncate mb-1">
                      {section.name}
                    </h3>
                    {section.description && (
                      <p className="text-sm text-slate-400 line-clamp-2 mb-2">
                        {section.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {section.files?.length || 0} file{section.files?.length !== 1 ? 's' : ''}
                      </span>

                      {canManage && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePublic(section);
                              }}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors text-xs"
                              title={section.visibility === 'public' ? 'Make Private' : 'Make Public'}
                            >
                              {section.visibility === 'public' ? 'Private' : 'Public'}
                            </button>
                          )}
                          {!isAdmin && isOwner && section.visibility === 'public' && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await api.put('/content/toggle-visibility', { contentType: 'section', contentId: section._id, visibility: 'private' });
                                  toast.success('Section set to private');
                                  dispatch(fetchSections());
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
                              handleDelete(section._id);
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

      {/* Create Section Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="New Custom Section">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Name</label>
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
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
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
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setSelectedColor(c.name)}
                  className={`w-8 h-8 rounded-xl bg-gradient-to-br ${c.from} ${c.to} transition-all ${
                    selectedColor === c.name
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
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
              Create Section
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteSectionId}
        title="Delete Section"
        message="Delete this section and all its files? This action cannot be undone."
        confirmText="Delete"
        onConfirm={confirmDeleteSection}
        onCancel={() => setDeleteSectionId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default SectionsPage;
