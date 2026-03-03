import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IoSchoolOutline, IoAdd, IoArrowBack, IoOpenOutline, IoGridOutline, IoGlobeOutline, IoCloudDownloadOutline } from 'react-icons/io5';
import { fetchCourses, fetchCategories, createCourse, deleteCourse, deleteCategory, createCategory, importToCourse } from '../redux/slices/courseSlice';
import { requestPublish } from '../redux/slices/exploreSlice';
import { toggleVisibility } from '../redux/slices/adminSlice';
import api from '../utils/api';
import ResourceCard from '../components/ui/ResourceCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ResourceCommentPanel from '../components/ui/ResourceCommentPanel';
import CourseForm from '../components/forms/CourseForm';
import DriveImportModal from '../components/forms/DriveImportModal';
import toast from 'react-hot-toast';

const CoursesPage = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showDriveImport, setShowDriveImport] = useState(false);
  const [deleteCourseId, setDeleteCourseId] = useState(null);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);
  const [commentResource, setCommentResource] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { courses, categories, isLoading } = useSelector((state) => state.courses);
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchCourses());
  }, [dispatch]);

  const filteredCourses = selectedCategory
    ? courses.filter((c) => c.category?._id === selectedCategory._id)
    : courses;

  const handleDeleteCourse = (courseId) => {
    setDeleteCourseId(courseId);
  };

  const openComments = (course) => {
    setCommentResource((prev) => (prev?._id === course._id ? null : course));
  };

  const confirmDeleteCourse = async () => {
    if (!deleteCourseId) return;
    setIsDeletingCourse(true);
    const result = await dispatch(deleteCourse(deleteCourseId));
    setIsDeletingCourse(false);
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Course deleted');
      setDeleteCourseId(null);
    } else {
      toast.error(result.payload || 'Failed to delete course');
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (window.confirm('Delete this category? Must have no courses.')) {
      const result = await dispatch(deleteCategory(catId));
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('Category deleted');
        setSelectedCategory(null);
      } else {
        toast.error(result.payload || 'Cannot delete');
      }
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const result = await dispatch(
      createCategory({ name: newCategoryName.trim() })
    );
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Category created');
      setNewCategoryName('');
      setShowCategoryForm(false);
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
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-2 transition-colors"
            >
              <IoArrowBack size={14} /> All Categories
            </button>
          )}
          <h1 className="text-3xl font-bold text-white font-display">
            {selectedCategory ? selectedCategory.name : 'Courses'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {selectedCategory
              ? `${filteredCourses.length} course(s) in this category`
              : 'Browse courses by category'}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowDriveImport(true)} className="btn-secondary flex items-center gap-2">
            <IoCloudDownloadOutline size={16} /> Import from Drive
          </button>
          {isAdmin && !selectedCategory && (
            <button onClick={() => setShowCategoryForm(true)} className="btn-secondary">
              <IoGridOutline size={16} /> New Category
            </button>
          )}
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <IoAdd size={18} /> Add Course
          </button>
        </div>
      </motion.div>

      {/* Category View (when no category selected) */}
      {!selectedCategory ? (
        <div>
          {isLoading ? (
            <LoadingSpinner text="Loading categories..." />
          ) : categories.length === 0 ? (
            <div className="text-center py-20">
              <IoSchoolOutline className="mx-auto text-slate-600 mb-4" size={48} />
              <h3 className="text-lg text-slate-400 mb-2">No categories yet</h3>
              <p className="text-sm text-slate-500">
                {isAdmin ? 'Create your first category to organize courses' : 'Check back soon'}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {categories.map((cat, i) => {
                const courseCount = courses.filter((c) => c.category?._id === cat._id).length;
                return (
                  <motion.div
                    key={cat._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <button
                      onClick={() => setSelectedCategory(cat)}
                      className="w-full glass-card p-6 text-left group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <IoSchoolOutline className="text-white" size={22} />
                      </div>
                      <h3 className="text-base font-semibold text-white mb-1">{cat.name}</h3>
                      <p className="text-sm text-slate-400">{courseCount} course(s)</p>
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat._id); }}
                          className="mt-3 text-xs text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Delete category
                        </button>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Courses in selected category */
        <div>
          {isLoading ? (
            <LoadingSpinner text="Loading courses..." />
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-20">
              <IoSchoolOutline className="mx-auto text-slate-600 mb-4" size={48} />
              <h3 className="text-lg text-slate-400 mb-2">No courses in this category</h3>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {filteredCourses.map((course) => (
                  <ResourceCard
                    key={course._id}
                    title={course.title}
                    subtitle={course.category?.name}
                    image={course.bannerImage}
                    description={course.description}
                    isAdmin={isAdmin}
                    ownerId={course.addedBy}
                    visibility={course.visibility}
                    onEdit={() => { setEditCourse(course); setShowForm(true); }}
                    onDelete={() => handleDeleteCourse(course._id)}
                    onClick={() => navigate(`/courses/${course._id}`)}
                    onComment={() => openComments(course)}
                    commentCount={course.commentCount}
                    onRequestPublish={async () => {
                      const result = await dispatch(requestPublish({ contentType: 'course', contentId: course._id }));
                      if (result.meta.requestStatus === 'fulfilled') {
                        toast.success('Publish request sent!');
                        dispatch(fetchCourses());
                      } else {
                        toast.error(result.payload || 'Failed to request publish');
                      }
                    }}
                    onToggleVisibility={isAdmin ? async () => {
                      const newVis = course.visibility === 'public' ? 'private' : 'public';
                      const result = await dispatch(toggleVisibility({ contentType: 'course', contentId: course._id, visibility: newVis }));
                      if (result.meta.requestStatus === 'fulfilled') {
                        toast.success(`Course set to ${newVis}`);
                        dispatch(fetchCourses());
                      }
                    } : undefined}
                    onMakePrivate={async () => {
                      try {
                        await api.put('/content/toggle-visibility', { contentType: 'course', contentId: course._id, visibility: 'private' });
                        toast.success('Course set to private');
                        dispatch(fetchCourses());
                      } catch (err) {
                        toast.error(err.response?.data?.message || 'Failed to update');
                      }
                    }}
                  >
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-cyan-400">
                      <IoOpenOutline size={12} />
                      <span>View Course</span>
                    </div>
                  </ResourceCard>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Course Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditCourse(null); }}
        title={editCourse ? 'Edit Course' : 'Add New Course'}
        maxWidth="max-w-xl"
      >
        <CourseForm
          course={editCourse}
          onClose={() => { setShowForm(false); setEditCourse(null); }}
        />
      </Modal>

      {/* Category Form Modal */}
      <Modal
        isOpen={showCategoryForm}
        onClose={() => setShowCategoryForm(false)}
        title="New Category"
      >
        <form onSubmit={handleAddCategory} className="space-y-4">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Category name"
            className="input-dark"
            autoFocus
            required
          />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowCategoryForm(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">Create</button>
          </div>
        </form>
      </Modal>

      {/* Drive Import Modal */}
      <DriveImportModal
        isOpen={showDriveImport}
        onClose={() => setShowDriveImport(false)}
        onImport={async (data) => {
          const fd = new FormData();
          fd.append('title', data.details.title || data.folderName);
          fd.append('description', data.details.description || '');
          fd.append('driveLink', data.driveLink);

          if (data.details.categoryNew?.trim()) {
            fd.append('newCategory', data.details.categoryNew.trim());
          } else if (data.details.category) {
            fd.append('category', data.details.category);
          } else {
            toast.error('Category is required');
            throw new Error('Category is required');
          }

          if (data.details.bannerImage instanceof File) {
            fd.append('bannerImage', data.details.bannerImage);
          }

          const result = await dispatch(createCourse(fd));
          if (result.meta.requestStatus === 'fulfilled') {
            const courseId = result.payload.course._id;

            // Import files into the newly created course
            if (data.files?.length > 0 || data.folders?.length > 0) {
              const importResult = await dispatch(importToCourse({
                courseId,
                importData: {
                  driveLink: data.driveLink,
                  driveFolderId: data.driveFolderId,
                  files: data.files,
                  folders: data.folders,
                },
              }));
              if (importResult.meta.requestStatus === 'fulfilled') {
                toast.success(`Course created with ${data.files?.length || 0} files!`);
              } else {
                toast.success('Course created, but file import failed');
              }
            } else {
              toast.success('Course imported from Drive!');
            }

            dispatch(fetchCourses());
            dispatch(fetchCategories());
            navigate(`/courses/${courseId}`);
          } else {
            toast.error(result.payload || 'Failed to create course');
            throw new Error('Failed');
          }
        }}
        title="Import Course from Drive"
        detailsFields={[
          { name: 'title', label: 'Course Name', type: 'text', required: true, placeholder: 'Course title' },
          { name: 'description', label: 'Course Description (optional)', type: 'textarea', placeholder: 'Describe this course...' },
          {
            name: 'category', label: 'Category', type: 'select', required: true,
            placeholder: 'Select a category',
            options: categories.map((c) => ({ value: c._id, label: c.name })),
            allowNew: true,
            newPlaceholder: 'Or type a new category name',
          },
          { name: 'bannerImage', label: 'Cover Image (optional)', type: 'file' },
        ]}
      />

      <ConfirmDialog
        isOpen={!!deleteCourseId}
        title="Delete Course"
        message="Are you sure you want to delete this course? This action cannot be undone."
        confirmText="Delete"
        onConfirm={confirmDeleteCourse}
        onCancel={() => setDeleteCourseId(null)}
        isLoading={isDeletingCourse}
      />

      {/* Comment panel – rendered at page level to avoid re-rendering cards on keystroke */}
      <ResourceCommentPanel
        resource={commentResource}
        contentType="course"
        onClose={() => setCommentResource(null)}
      />
    </div>
  );
};

export default CoursesPage;
