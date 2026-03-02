import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { createBook, updateBook } from '../../redux/slices/bookSlice';
import toast from 'react-hot-toast';
import { IoAdd, IoTrash } from 'react-icons/io5';

const BookForm = ({ book, onClose }) => {
  const [formData, setFormData] = useState({
    title: book?.title || '',
    author: book?.author || '',
    type: book?.type || 'video',
    description: book?.description || '',
    embedLink: book?.embedLink || '',
    driveLink: book?.driveLink || '',
    totalPages: book?.totalPages || 0,
    coverImage: book?.coverImage || '',
  });
  const [videos, setVideos] = useState(
    book?.videos?.length > 0
      ? book.videos
      : [{ title: '', driveFileId: '', duration: '', order: 0 }]
  );
  const [pdfFile, setPdfFile] = useState(null);
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useDispatch();

  const handleVideoChange = (index, field, value) => {
    const updated = [...videos];
    updated[index] = { ...updated[index], [field]: value };
    setVideos(updated);
  };

  const addVideo = () => {
    setVideos([...videos, { title: '', driveFileId: '', duration: '', order: videos.length }]);
  };

  const removeVideo = (index) => {
    if (videos.length > 1) {
      setVideos(videos.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const fd = new FormData();
      fd.append('title', formData.title);
      fd.append('author', formData.author);
      fd.append('type', formData.type);
      fd.append('description', formData.description);
      fd.append('driveLink', formData.driveLink);
      fd.append('totalPages', formData.totalPages);

      if (formData.type === 'video') {
        fd.append('videos', JSON.stringify(videos.map((v, i) => ({ ...v, order: i }))));
      }

      if (pdfFile) {
        fd.append('pdfFile', pdfFile);
      }

      if (coverImageFile) {
        fd.append('coverImage', coverImageFile);
      }

      let result;
      if (book) {
        result = await dispatch(updateBook({ id: book._id, formData: fd }));
      } else {
        result = await dispatch(createBook(fd));
      }

      if (result.meta.requestStatus === 'fulfilled') {
        toast.success(book ? 'Book updated!' : 'Book created!');
        onClose();
      } else {
        toast.error(result.payload || 'Something went wrong');
      }
    } catch (error) {
      toast.error('Error saving book');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
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
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Author *</label>
          <input
            type="text"
            value={formData.author}
            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
            className="input-dark"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Type *</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="input-dark"
          >
            <option value="video">Video Book</option>
            <option value="text">Text Book (PDF)</option>
            <option value="audio">Audio Book</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="input-dark min-h-[80px] resize-y"
          rows={3}
        />
      </div>

      {/* PDF-specific fields */}
      {formData.type === 'text' && (
        <div className="space-y-4 p-4 rounded-xl bg-slate-900/50 border border-white/5">
          <h4 className="text-sm font-medium text-indigo-400">PDF Settings</h4>
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">
              Upload PDF File
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files[0])}
              className="input-dark text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-500/10 file:text-indigo-400 file:text-sm file:cursor-pointer"
            />
            {pdfFile && (
              <p className="text-xs text-emerald-400 mt-1.5">
                Selected: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(1)} MB)
              </p>
            )}
            {!pdfFile && book?.embedLink && (
              <p className="text-xs text-slate-500 mt-1.5">
                Current PDF already uploaded. Upload a new file to replace it.
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Total Pages</label>
            <input
              type="number"
              value={formData.totalPages}
              onChange={(e) => setFormData({ ...formData, totalPages: parseInt(e.target.value) || 0 })}
              className="input-dark w-32"
              min={0}
            />
          </div>
        </div>
      )}

      {/* Video-specific fields */}
      {formData.type === 'video' && (
        <div className="space-y-4 p-4 rounded-xl bg-slate-900/50 border border-white/5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-indigo-400">Video Episodes</h4>
            <button type="button" onClick={addVideo} className="btn-secondary text-xs py-1.5 px-3">
              <IoAdd size={14} /> Add Video
            </button>
          </div>
          {videos.map((video, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50">
              <span className="text-xs text-slate-500 mt-2.5 w-5 flex-shrink-0">{i + 1}.</span>
              <div className="flex-1 grid grid-cols-3 gap-3">
                <input
                  type="text"
                  value={video.title}
                  onChange={(e) => handleVideoChange(i, 'title', e.target.value)}
                  placeholder="Video title"
                  className="input-dark text-sm"
                />
                <input
                  type="text"
                  value={video.driveFileId}
                  onChange={(e) => handleVideoChange(i, 'driveFileId', e.target.value)}
                  placeholder="Drive File ID"
                  className="input-dark text-sm"
                />
                <input
                  type="text"
                  value={video.duration}
                  onChange={(e) => handleVideoChange(i, 'duration', e.target.value)}
                  placeholder="Duration (e.g. 45:30)"
                  className="input-dark text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => removeVideo(i)}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all mt-0.5"
              >
                <IoTrash size={14} />
              </button>
            </div>
          ))}
          <p className="text-xs text-slate-500">
            To get the Drive File ID: right-click video in Google Drive → Share → Copy link → extract the ID between /d/ and /view
          </p>
        </div>
      )}

      {/* Cover Image */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Cover Image (optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setCoverImageFile(e.target.files[0])}
          className="input-dark text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-500/10 file:text-indigo-400 file:text-sm file:cursor-pointer"
        />
        {coverImageFile && (
          <p className="text-xs text-emerald-400 mt-1.5">
            Selected: {coverImageFile.name} ({(coverImageFile.size / 1024 / 1024).toFixed(1)} MB)
          </p>
        )}
        {!coverImageFile && book?.coverImageId && (
          <p className="text-xs text-slate-500 mt-1.5">
            Cover image already uploaded. Upload a new file to replace it.
          </p>
        )}
      </div>

      {/* Drive Link (general) */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Drive Link (optional)</label>
        <input
          type="url"
          value={formData.driveLink}
          onChange={(e) => setFormData({ ...formData, driveLink: e.target.value })}
          placeholder="https://drive.google.com/..."
          className="input-dark"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : book ? (
            'Update Book'
          ) : (
            'Create Book'
          )}
        </button>
      </div>
    </form>
  );
};

export default BookForm;
