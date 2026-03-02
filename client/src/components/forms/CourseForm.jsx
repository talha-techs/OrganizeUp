import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { createCourse, updateCourse, fetchCategories } from '../../redux/slices/courseSlice';
import toast from 'react-hot-toast';

const CourseForm = ({ course, onClose }) => {
  const [formData, setFormData] = useState({
    title: course?.title || '',
    description: course?.description || '',
    driveLink: course?.driveLink || '',
    category: course?.category?._id || '',
    newCategory: '',
    bannerImage: course?.bannerImage || '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useDispatch();
  const { categories } = useSelector((state) => state.courses);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const fd = new FormData();
      fd.append('title', formData.title);
      fd.append('description', formData.description);
      fd.append('driveLink', formData.driveLink);

      if (formData.newCategory.trim()) {
        fd.append('newCategory', formData.newCategory.trim());
      } else {
        fd.append('category', formData.category);
      }

      if (imageFile) {
        fd.append('bannerImage', imageFile);
      } else if (!imageFile) {
        fd.append('bannerImage', formData.bannerImage);
      }

      let result;
      if (course) {
        result = await dispatch(updateCourse({ id: course._id, formData: fd }));
      } else {
        result = await dispatch(createCourse(fd));
      }

      if (result.meta.requestStatus === 'fulfilled') {
        toast.success(course ? 'Course updated!' : 'Course created!');
        dispatch(fetchCategories());
        onClose();
      } else {
        toast.error(result.payload || 'Something went wrong');
      }
    } catch (err) {
      toast.error('Error saving course');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Course Name *</label>
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
          className="input-dark min-h-[80px] resize-y"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Drive Link</label>
        <input
          type="url"
          value={formData.driveLink}
          onChange={(e) => setFormData({ ...formData, driveLink: e.target.value })}
          placeholder="https://drive.google.com/... (optional)"
          className="input-dark"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Category *</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value, newCategory: '' })}
          className="input-dark"
        >
          <option value="">Select category or type new below</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>{cat.name}</option>
          ))}
        </select>
        <input
          type="text"
          value={formData.newCategory}
          onChange={(e) => setFormData({ ...formData, newCategory: e.target.value, category: '' })}
          placeholder="Or type a new category name"
          className="input-dark mt-2"
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
          ) : course ? 'Update Course' : 'Create Course'}
        </button>
      </div>
    </form>
  );
};

export default CourseForm;
