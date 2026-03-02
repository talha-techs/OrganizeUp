import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IoConstructOutline, IoAdd, IoOpenOutline, IoGlobeOutline, IoCloudDownloadOutline } from 'react-icons/io5';
import { fetchTools, createTool, deleteTool, importToTool } from '../redux/slices/toolSlice';
import { requestPublish } from '../redux/slices/exploreSlice';
import { toggleVisibility } from '../redux/slices/adminSlice';
import api from '../utils/api';
import ResourceCard from '../components/ui/ResourceCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import CommentsModal from '../components/ui/CommentsModal';
import InlineComments from '../components/ui/InlineComments';
import ToolForm from '../components/forms/ToolForm';
import DriveImportModal from '../components/forms/DriveImportModal';
import toast from 'react-hot-toast';

const ToolsPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [editTool, setEditTool] = useState(null);
  const [showDriveImport, setShowDriveImport] = useState(false);
  const [deleteToolId, setDeleteToolId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { tools, isLoading } = useSelector((state) => state.tools);
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    dispatch(fetchTools());
  }, [dispatch]);

  const handleDelete = (toolId) => {
    setDeleteToolId(toolId);
  };

  const openComments = (tool) => {
    setActiveCommentId((prev) => (prev === tool._id ? null : tool._id));
  };

  const confirmDeleteTool = async () => {
    if (!deleteToolId) return;
    setIsDeleting(true);
    const result = await dispatch(deleteTool(deleteToolId));
    setIsDeleting(false);
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Deleted!');
      setDeleteToolId(null);
    } else {
      toast.error(result.payload || 'Failed to delete tool');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-white font-display">Tools & Tricks</h1>
          <p className="text-slate-400 text-sm mt-1">Hacks, free trials, and useful resources</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowDriveImport(true)} className="btn-secondary flex items-center gap-2">
            <IoCloudDownloadOutline size={16} /> Import from Drive
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <IoAdd size={18} /> Add New
          </button>
        </div>
      </motion.div>

      {isLoading ? (
        <LoadingSpinner text="Loading tools..." />
      ) : tools.length === 0 ? (
        <div className="text-center py-20">
          <IoConstructOutline className="mx-auto text-slate-600 mb-4" size={48} />
          <h3 className="text-lg text-slate-400 mb-2">No tools yet</h3>
          <p className="text-sm text-slate-500">
            {isAdmin ? 'Click "Add New" to get started' : 'Check back soon'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {tools.map((tool) => (
              <ResourceCard
                key={tool._id}
                title={tool.title}
                image={tool.bannerImage}
                description={tool.description}
                isAdmin={isAdmin}
                ownerId={tool.addedBy}
                visibility={tool.visibility}
                onEdit={() => { setEditTool(tool); setShowForm(true); }}
                onDelete={() => handleDelete(tool._id)}
                onClick={() => navigate(`/tools/${tool._id}`)}
                onComment={() => openComments(tool)}
                commentCount={tool.commentCount}
                commentSection={
                  activeCommentId === tool._id ? (
                    <InlineComments
                      contentType="tool"
                      contentId={tool._id}
                      onClose={() => setActiveCommentId(null)}
                    />
                  ) : null
                }
                onRequestPublish={async () => {
                  const result = await dispatch(requestPublish({ contentType: 'tool', contentId: tool._id }));
                  if (result.meta.requestStatus === 'fulfilled') {
                    toast.success('Publish request sent!');
                    dispatch(fetchTools());
                  } else {
                    toast.error(result.payload || 'Failed to request publish');
                  }
                }}
                onToggleVisibility={isAdmin ? async () => {
                  const newVis = tool.visibility === 'public' ? 'private' : 'public';
                  const result = await dispatch(toggleVisibility({ contentType: 'tool', contentId: tool._id, visibility: newVis }));
                  if (result.meta.requestStatus === 'fulfilled') {
                    toast.success(`Tool set to ${newVis}`);
                    dispatch(fetchTools());
                  }
                } : undefined}
                onMakePrivate={async () => {
                  try {
                    await api.put('/content/toggle-visibility', { contentType: 'tool', contentId: tool._id, visibility: 'private' });
                    toast.success('Tool set to private');
                    dispatch(fetchTools());
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Failed to update');
                  }
                }}
              >
                <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-400">
                  <IoOpenOutline size={12} />
                  <span>View Tool</span>
                </div>
              </ResourceCard>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditTool(null); }}
        title={editTool ? 'Edit Tool/Trick' : 'Add New Tool/Trick'}
        maxWidth="max-w-xl"
      >
        <ToolForm
          tool={editTool}
          onClose={() => { setShowForm(false); setEditTool(null); }}
        />
      </Modal>

      {/* Drive Import Modal */}
      <DriveImportModal
        isOpen={showDriveImport}
        onClose={() => setShowDriveImport(false)}
        onImport={async (data) => {
          const fd = new FormData();
          fd.append('title', data.details.title || data.folderName);
          fd.append('description', data.details.description || '');
          fd.append('link', data.driveLink);

          if (data.details.bannerImage instanceof File) {
            fd.append('bannerImage', data.details.bannerImage);
          }

          const result = await dispatch(createTool(fd));
          if (result.meta.requestStatus === 'fulfilled') {
            const toolId = result.payload.tool._id;

            // Import files into the newly created tool
            if (data.files?.length > 0 || data.folders?.length > 0) {
              const importResult = await dispatch(importToTool({
                toolId,
                importData: {
                  driveLink: data.driveLink,
                  driveFolderId: data.driveFolderId,
                  files: data.files,
                  folders: data.folders,
                },
              }));
              if (importResult.meta.requestStatus === 'fulfilled') {
                toast.success(`Tool created with ${data.files?.length || 0} files!`);
              } else {
                toast.success('Tool created, but file import failed');
              }
            } else {
              toast.success('Tool imported from Drive!');
            }

            dispatch(fetchTools());
            navigate(`/tools/${toolId}`);
          } else {
            toast.error(result.payload || 'Failed to create tool');
            throw new Error('Failed');
          }
        }}
        title="Import Tool from Drive"
        detailsFields={[
          { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Tool/trick name' },
          { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe this tool or trick...' },
          { name: 'bannerImage', label: 'Cover Image (optional)', type: 'file' },
        ]}
      />

      <ConfirmDialog
        isOpen={!!deleteToolId}
        title="Delete Tool"
        message="Are you sure you want to delete this tool/trick? This action cannot be undone."
        confirmText="Delete"
        onConfirm={confirmDeleteTool}
        onCancel={() => setDeleteToolId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default ToolsPage;
