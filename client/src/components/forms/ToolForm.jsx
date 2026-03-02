import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { createTool, updateTool } from '../../redux/slices/toolSlice';
import toast from 'react-hot-toast';

const ToolForm = ({ tool, onClose }) => {
  const [formData, setFormData] = useState({
    title: tool?.title || '',
    description: tool?.description || '',
    link: tool?.link || '',
    bannerImage: tool?.bannerImage || '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const fd = new FormData();
      fd.append('title', formData.title);
      fd.append('description', formData.description);
      fd.append('link', formData.link);

      if (imageFile) {
        fd.append('bannerImage', imageFile);
      } else {
        fd.append('bannerImage', formData.bannerImage);
      }

      let result;
      if (tool) {
        result = await dispatch(updateTool({ id: tool._id, formData: fd }));
      } else {
        result = await dispatch(createTool(fd));
      }

      if (result.meta.requestStatus === 'fulfilled') {
        toast.success(tool ? 'Updated!' : 'Created!');
        onClose();
      } else {
        toast.error(result.payload || 'Something went wrong');
      }
    } catch (err) {
      toast.error('Error saving');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Title *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="input-dark"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="input-dark min-h-[100px] resize-y"
          rows={4}
          placeholder="Describe the tool, hack, or trick..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Link</label>
        <input
          type="url"
          value={formData.link}
          onChange={(e) => setFormData({ ...formData, link: e.target.value })}
          placeholder="https://... (optional)"
          className="input-dark"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Banner Image (optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
          className="input-dark text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-500/10 file:text-indigo-400 file:text-sm file:cursor-pointer"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : tool ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
};

export default ToolForm;
