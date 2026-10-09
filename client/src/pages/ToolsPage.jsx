import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IoConstructOutline, IoAdd, IoOpenOutline, IoGlobeOutline, IoCloudDownloadOutline } from 'react-icons/io5';
import { fetchTools, createTool, deleteTool, importToTool } from '../redux/slices/toolSlice';
import { removeFromLibrary } from '../redux/slices/librarySlice';
import { requestPublish } from '../redux/slices/exploreSlice';
import { toggleVisibility } from '../redux/slices/adminSlice';
import api from '../utils/api';
import ResourceCard from '../components/ui/ResourceCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ToolForm from '../components/forms/ToolForm';
import DriveImportModal from '../components/forms/DriveImportModal';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';

const ToolsPage = () => {
  useDocumentTitle('Tricks');
  const [showForm, setShowForm] = useState(false);
  const [editTool, setEditTool] = useState(null);
  const [showDriveImport, setShowDriveImport] = useState(false);
  const [deleteToolId, setDeleteToolId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const confirmDeleteTool = async () => {
    if (!deleteToolId) return;
    const targetTool = tools.find((t) => String(t._id) === String(deleteToolId));
    if (targetTool && !targetTool.isOwner) {
      toast.error('Only the author can delete this tool. To remove it from your space, unsave it.');
      setDeleteToolId(null);
      return;
    }
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

  const handleUnsaveTool = async (toolId) => {
    const result = await dispatch(removeFromLibrary(toolId));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Removed from your tricks');
      dispatch(fetchTools());
    } else {
      toast.error(result.payload || 'Failed to remove from library');
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
          <h1 className="text-3xl font-bold text-primary font-display">Tools & Tricks</h1>
          <p className="text-secondary text-sm mt-1">Hacks, free trials, and useful resources</p>
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
          <IoConstructOutline className="mx-auto text-muted mb-4" size={48} />
          <h3 className="text-lg text-secondary mb-2">No tools yet</h3>
          <p className="text-sm text-muted mb-4">
            {isAdmin ? 'Click "Add New" to get started or browse public tricks in Explore' : 'Explore developer tools and tricks shared by the community'}
          </p>
          <button
            onClick={() => navigate('/explore?type=tricks')}
            className="btn-primary text-xs py-2.5 px-4 inline-flex items-center gap-2 cursor-pointer"
          >
            <IoConstructOutline size={16} /> Explore Public Tricks
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {tools.map((tool) => (
              <ResourceCard
                key={tool._id}
                type="tool"
                contentType="tool"
                title={tool.title}
                image={tool.bannerImage}
                description={tool.description}
                isAdmin={isAdmin}
                ownerId={tool.addedBy}
                isOwner={tool.isOwner}
                visibility={tool.visibility}
                isSaved={tool.isSaved}
                onUnsave={() => handleUnsaveTool(tool._id)}
                onEdit={tool.isOwner ? () => { setEditTool(tool); setShowForm(true); } : undefined}
                onDelete={tool.isOwner ? () => handleDelete(tool._id) : undefined}
                onClick={() => navigate(`/tools/${tool._id}`)}
                onRequestPublish={tool.isOwner ? async () => {
                  const result = await dispatch(requestPublish({ contentType: 'tool', contentId: tool._id }));
                  if (result.meta.requestStatus === 'fulfilled') {
                    toast.success('Publish request sent!');
                    dispatch(fetchTools());
                  } else {
                    toast.error(result.payload || 'Failed to request publish');
                  }
                } : undefined}
                onToggleVisibility={tool.isOwner && isAdmin ? async () => {
                  const newVis = tool.visibility === 'public' ? 'private' : 'public';
                  const result = await dispatch(toggleVisibility({ contentType: 'tool', contentId: tool._id, visibility: newVis }));
                  if (result.meta.requestStatus === 'fulfilled') {
                    toast.success(`Tool set to ${newVis}`);
                    dispatch(fetchTools());
                  }
                } : undefined}
                onMakePrivate={tool.isOwner ? async () => {
                  try {
                    await api.put('/content/toggle-visibility', { contentType: 'tool', contentId: tool._id, visibility: 'private' });
                    toast.success('Tool set to private');
                    dispatch(fetchTools());
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Failed to update');
                  }
                } : undefined}
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
