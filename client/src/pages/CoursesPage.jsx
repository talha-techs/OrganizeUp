import { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoSchoolOutline,
  IoAdd,
  IoArrowBack,
  IoOpenOutline,
  IoGridOutline,
  IoGlobeOutline,
  IoCloudDownloadOutline,
  IoCompassOutline,
  IoSparklesOutline,
  IoSearchOutline,
  IoTrashOutline,
  IoPlayCircleOutline,
  IoDocumentTextOutline,
  IoLayersOutline,
  IoChevronForward,
} from 'react-icons/io5';
import {
  fetchCourses,
  fetchCategories,
  createCourse,
  deleteCourse,
  deleteCategory,
  createCategory,
  importToCourse,
} from '../redux/slices/courseSlice';
import { removeFromLibrary } from '../redux/slices/librarySlice';
import { requestPublish } from '../redux/slices/exploreSlice';
import { toggleVisibility } from '../redux/slices/adminSlice';
import api from '../utils/api';
import ResourceCard from '../components/ui/ResourceCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import CourseForm from '../components/forms/CourseForm';
import DriveImportModal from '../components/forms/DriveImportModal';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';

const CoursesPage = () => {
  useDocumentTitle('Courses');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [viewMode, setViewMode] = useState('category'); // 'category' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryQuery, setNewCategoryQuery] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [showDriveImport, setShowDriveImport] = useState(false);
  const [deleteCourseId, setDeleteCourseId] = useState(null);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { courses, categories, isLoading } = useSelector((state) => state.courses);
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchCourses());
  }, [dispatch]);

  const filteredCourses = useMemo(() => {
    let list = selectedCategory
      ? courses.filter((c) => c.category?._id === selectedCategory._id)
      : courses;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.category?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [courses, selectedCategory, searchQuery]);

  const handleDeleteCourse = (courseId) => {
    setDeleteCourseId(courseId);
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

  const handleUnsaveCourse = async (courseId) => {
    const result = await dispatch(removeFromLibrary(courseId));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Removed from your courses');
      dispatch(fetchCourses());
    } else {
      toast.error(result.payload || 'Failed to remove from library');
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (window.confirm('Delete this category? Category must have no courses.')) {
      const result = await dispatch(deleteCategory(catId));
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('Category deleted');
        setSelectedCategory(null);
      } else {
        toast.error(result.payload || 'Cannot delete category');
      }
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setIsCreatingCategory(true);
    const result = await dispatch(
      createCategory({
        name: newCategoryName.trim(),
        description: newCategoryQuery.trim() ? `Search: ${newCategoryQuery.trim()}` : '',
      })
    );
    setIsCreatingCategory(false);

    if (result.meta.requestStatus === 'fulfilled') {
      toast.success(isAdmin ? 'Global category created with Pexels cover!' : 'Personal category created with Pexels cover!');
      setNewCategoryName('');
      setNewCategoryQuery('');
      setShowCategoryForm(false);
      dispatch(fetchCategories());
    } else {
      toast.error(result.payload || 'Failed to create category');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline mb-2 transition-colors cursor-pointer"
            >
              <IoArrowBack size={14} /> Back to All Categories
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent to-orange-500 flex items-center justify-center shadow-lg shadow-accent/20">
              <IoSchoolOutline size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary font-display tracking-tight">
                {selectedCategory ? selectedCategory.name : 'Courses & Academy'}
              </h1>
              <p className="text-secondary text-xs sm:text-sm mt-0.5">
                {selectedCategory
                  ? `${filteredCourses.length} course${filteredCourses.length !== 1 ? 's' : ''} in this track`
                  : 'Master structured video lectures, PDFs, and notes organized by category'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowDriveImport(true)}
            className="btn-secondary flex items-center gap-2 cursor-pointer text-xs py-2.5 px-3.5"
            title="Import an entire folder of videos and PDFs from Google Drive"
          >
            <IoCloudDownloadOutline size={16} className="text-accent" />
            <span>Import from Drive</span>
          </button>
          <button
            onClick={() => setShowCategoryForm(true)}
            className="btn-secondary flex items-center gap-2 cursor-pointer text-xs py-2.5 px-3.5"
            title="Create a new course category with automated Pexels cover"
          >
            <IoGridOutline size={15} />
            <span>New Category</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-1.5 cursor-pointer text-xs py-2.5 px-4 shadow-md shadow-accent/20"
          >
            <IoAdd size={18} />
            <span>Add Course</span>
          </button>
        </div>
      </motion.div>

      {/* Selected Category Hero Banner */}
      {selectedCategory && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative h-44 sm:h-52 rounded-3xl overflow-hidden mb-8 border border-zinc-800 shadow-xl"
        >
          {selectedCategory.image || selectedCategory.bannerImage ? (
            <img
              src={selectedCategory.image || selectedCategory.bannerImage}
              alt={selectedCategory.name}
              className="absolute inset-0 w-full h-full object-cover"
              fetchpriority="high"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-purple-900 to-indigo-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-black/30" />
          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent/90 text-white backdrop-blur-md mb-2 shadow-sm">
                <IoSparklesOutline size={12} />
                Category Track
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight drop-shadow-md">
                {selectedCategory.name}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-xl line-clamp-1">
                {selectedCategory.description || `High-impact courses and learning tracks curated for ${selectedCategory.name}.`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/explore?type=courses&search=${encodeURIComponent(selectedCategory.name)}`)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/20 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <IoCompassOutline size={15} />
                Explore Public {selectedCategory.name}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        {!selectedCategory ? (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setViewMode('category')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                viewMode === 'category'
                  ? 'bg-accent text-white shadow-md shadow-accent/20'
                  : 'text-secondary hover:text-primary hover:bg-surface-raised border border-subtle'
              }`}
            >
              <IoGridOutline size={15} />
              <span>By Category ({categories.length})</span>
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-accent text-white shadow-md shadow-accent/20'
                  : 'text-secondary hover:text-primary hover:bg-surface-raised border border-subtle'
              }`}
            >
              <IoSchoolOutline size={15} />
              <span>All Courses ({courses.length})</span>
            </button>
          </div>
        ) : (
          <div className="text-xs text-secondary font-medium">
            Showing courses in <strong>{selectedCategory.name}</strong>
          </div>
        )}

        {/* Course search input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses..."
            className="w-full bg-zinc-900/90 dark:bg-zinc-900 border border-zinc-800 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-3.5 py-2 pl-9 text-xs text-zinc-100 placeholder-zinc-500 transition-colors"
          />
          <IoSearchOutline size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {!selectedCategory ? (
        viewMode === 'category' ? (
          /* Categories View */
          <div>
            {isLoading ? (
              <LoadingSpinner text="Loading course categories..." />
            ) : categories.length === 0 ? (
              /* Empty Categories State */
              <div className="text-center py-20 px-4 glass-card border border-subtle rounded-3xl max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-3xl bg-accent-subtle flex items-center justify-center mx-auto mb-4 text-accent">
                  <IoGridOutline size={32} />
                </div>
                <h3 className="text-lg font-bold text-primary mb-2">No Categories Yet</h3>
                <p className="text-xs text-secondary mb-6 leading-relaxed">
                  Categories help group your learning paths by subject (e.g. AI, Web Development, Design). Every category gets a high-resolution Pexels photo automatically.
                </p>
                <button
                  onClick={() => setShowCategoryForm(true)}
                  className="btn-primary text-xs py-2.5 px-4 inline-flex items-center gap-2 cursor-pointer shadow-md shadow-accent/25"
                >
                  <IoAdd size={16} /> Create First Category
                </button>
              </div>
            ) : (
              /* Rich Category Cards Grid with Pexels Covers */
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {categories.map((cat, i) => {
                  const courseCount = courses.filter((c) => c.category?._id === cat._id).length;
                  const cover = cat.image || cat.bannerImage;
                  const isOwner = user && (cat.createdBy?._id === user._id || cat.createdBy === user._id);
                  const canDelete = isAdmin || (isOwner && !cat.isGlobal);

                  return (
                    <motion.div
                      key={cat._id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <div
                        onClick={() => setSelectedCategory(cat)}
                        className="group relative h-56 rounded-3xl overflow-hidden border border-zinc-800/80 hover:border-accent/40 bg-zinc-900 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between p-5 select-none"
                      >
                        {/* Background Pexels Image */}
                        {cover ? (
                          <img
                            src={cover}
                            alt={cat.name}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-zinc-950" />
                        )}

                        {/* High-Contrast Gradient Overlays */}
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-black/30 transition-opacity group-hover:opacity-90" />
                        <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {/* Top Meta Bar */}
                        <div className="relative z-10 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/60 text-zinc-100 backdrop-blur-md border border-white/10 shadow-sm">
                              <span className={`w-1.5 h-1.5 rounded-full ${courseCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                              {courseCount} {courseCount === 1 ? 'Course' : 'Courses'}
                            </span>
                            {!cat.isGlobal && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/20 text-accent border border-accent/30 backdrop-blur-md">
                                Personal
                              </span>
                            )}
                          </div>

                          {canDelete && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCategory(cat._id);
                              }}
                              className="p-1.5 rounded-xl bg-black/60 hover:bg-rose-600/90 text-zinc-400 hover:text-white backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                              title="Delete category (must have 0 courses)"
                            >
                              <IoTrashOutline size={14} />
                            </button>
                          )}
                        </div>

                        {/* Bottom Content */}
                        <div className="relative z-10 space-y-2">
                          <h3 className="text-xl font-extrabold text-white tracking-tight drop-shadow-sm group-hover:text-accent transition-colors">
                            {cat.name}
                          </h3>

                          <div className="flex items-center justify-between pt-1 border-t border-white/10">
                            <span className="text-xs text-zinc-300 font-medium">Browse track</span>
                            <span className="w-6 h-6 rounded-full bg-white/10 group-hover:bg-accent text-white flex items-center justify-center transition-colors">
                              <IoChevronForward size={13} className="group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* If New User Has 0 Courses Overall */}
            {!isLoading && courses.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12 p-8 rounded-3xl bg-gradient-to-br from-zinc-900/90 to-zinc-950 border border-zinc-800 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

                <div className="relative z-10 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-accent-subtle text-accent border border-accent/20 mb-4">
                    <IoSparklesOutline size={14} />
                    <span>Welcome to OrganizeUp Courses</span>
                  </div>

                  <h3 className="text-2xl font-extrabold text-white tracking-tight mb-2">
                    Your Course Library is Empty
                  </h3>

                  <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                    You haven't added or saved any courses yet. Start your personal learning journey in seconds: explore community-curated courses in the Public Hub, import an entire lecture folder directly from Google Drive, or create your custom course track.
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => navigate('/explore?type=courses')}
                      className="btn-primary text-xs py-2.5 px-4 inline-flex items-center gap-2 shadow-lg shadow-accent/25 cursor-pointer"
                    >
                      <IoCompassOutline size={16} /> Explore Public Courses
                    </button>
                    <button
                      onClick={() => setShowDriveImport(true)}
                      className="btn-secondary text-xs py-2.5 px-4 inline-flex items-center gap-2 cursor-pointer"
                    >
                      <IoCloudDownloadOutline size={16} className="text-accent" /> Import from Google Drive
                    </button>
                    <button
                      onClick={() => setShowForm(true)}
                      className="btn-secondary text-xs py-2.5 px-4 inline-flex items-center gap-2 cursor-pointer"
                    >
                      <IoAdd size={16} /> Create Course Manually
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-zinc-800/80">
                  <div className="flex items-center gap-3 text-xs text-zinc-300">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center flex-shrink-0">
                      <IoPlayCircleOutline size={18} />
                    </div>
                    <span>Cinema video player with bookmark notes</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-300">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0">
                      <IoDocumentTextOutline size={18} />
                    </div>
                    <span>PDF lecture reader with quote-to-notes</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-300">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
                      <IoLayersOutline size={18} />
                    </div>
                    <span>Automated Pexels banners on every track</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          /* All Courses View */
          <div>
            {isLoading ? (
              <LoadingSpinner text="Loading courses..." />
            ) : filteredCourses.length === 0 ? (
              /* All Courses Empty State */
              <div className="text-center py-20 px-4 glass-card border border-subtle rounded-3xl max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-3xl bg-accent-subtle flex items-center justify-center mx-auto mb-4 text-accent">
                  <IoSchoolOutline size={32} />
                </div>
                <h3 className="text-xl font-bold text-primary mb-2">
                  {searchQuery ? 'No matching courses found' : 'No courses in your library'}
                </h3>
                <p className="text-xs text-secondary mb-6 leading-relaxed">
                  {searchQuery
                    ? `No course matches "${searchQuery}". Try a different keyword or clear search.`
                    : 'Discover public courses from the community in Explore or import your own course materials directly from Google Drive.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {searchQuery ? (
                    <button onClick={() => setSearchQuery('')} className="btn-secondary text-xs py-2.5 px-4 cursor-pointer">
                      Clear Search
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => navigate('/explore?type=courses')}
                        className="btn-primary text-xs py-2.5 px-4 inline-flex items-center gap-2 cursor-pointer shadow-md shadow-accent/25"
                      >
                        <IoCompassOutline size={16} /> Explore Public Courses
                      </button>
                      <button
                        onClick={() => setShowDriveImport(true)}
                        className="btn-secondary text-xs py-2.5 px-4 inline-flex items-center gap-2 cursor-pointer"
                      >
                        <IoCloudDownloadOutline size={16} className="text-accent" /> Import from Drive
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* All Courses Grid */
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                  {filteredCourses.map((course) => (
                    <ResourceCard
                      key={course._id}
                      type="course"
                      title={course.title}
                      subtitle={course.category?.name}
                      image={course.bannerImage}
                      description={course.description}
                      isAdmin={isAdmin}
                      ownerId={course.addedBy}
                      visibility={course.visibility}
                      isSaved={course.isSaved}
                      onUnsave={() => handleUnsaveCourse(course._id)}
                      onEdit={() => {
                        setEditCourse(course);
                        setShowForm(true);
                      }}
                      onDelete={() => handleDeleteCourse(course._id)}
                      onClick={() => navigate(`/courses/${course._id}`)}
                      onRequestPublish={async () => {
                        const result = await dispatch(requestPublish({ contentType: 'course', contentId: course._id }));
                        if (result.meta.requestStatus === 'fulfilled') {
                          toast.success('Publish request sent!');
                          dispatch(fetchCourses());
                        } else {
                          toast.error(result.payload || 'Failed to request publish');
                        }
                      }}
                      onToggleVisibility={
                        isAdmin
                          ? async () => {
                              const newVis = course.visibility === 'public' ? 'private' : 'public';
                              const result = await dispatch(
                                toggleVisibility({
                                  contentType: 'course',
                                  contentId: course._id,
                                  visibility: newVis,
                                })
                              );
                              if (result.meta.requestStatus === 'fulfilled') {
                                toast.success(`Course set to ${newVis}`);
                                dispatch(fetchCourses());
                              }
                            }
                          : undefined
                      }
                      onMakePrivate={async () => {
                        try {
                          await api.put('/content/toggle-visibility', {
                            contentType: 'course',
                            contentId: course._id,
                            visibility: 'private',
                          });
                          toast.success('Course set to private');
                          dispatch(fetchCourses());
                        } catch (err) {
                          toast.error(err.response?.data?.message || 'Failed to update');
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5 mt-3 text-xs text-accent font-semibold">
                        <IoOpenOutline size={13} />
                        <span>Launch Course Studio</span>
                      </div>
                    </ResourceCard>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )
      ) : (
        /* Courses inside Selected Category View */
        <div>
          {isLoading ? (
            <LoadingSpinner text="Loading courses..." />
          ) : filteredCourses.length === 0 ? (
            /* Category Courses Empty State */
            <div className="text-center py-16 px-4 glass-card border border-subtle rounded-3xl max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-accent-subtle flex items-center justify-center mx-auto mb-4 text-accent">
                <IoSchoolOutline size={32} />
              </div>
              <h3 className="text-xl font-bold text-primary mb-2">
                No courses in "{selectedCategory.name}" yet
              </h3>
              <p className="text-xs text-secondary mb-6 leading-relaxed">
                Be the first to add a course under this category, or import an entire folder from Google Drive.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setShowForm(true)}
                  className="btn-primary text-xs py-2.5 px-4 inline-flex items-center gap-2 cursor-pointer shadow-md shadow-accent/25"
                >
                  <IoAdd size={16} /> Add Course to {selectedCategory.name}
                </button>
                <button
                  onClick={() => setShowDriveImport(true)}
                  className="btn-secondary text-xs py-2.5 px-4 inline-flex items-center gap-2 cursor-pointer"
                >
                  <IoCloudDownloadOutline size={16} className="text-accent" /> Import from Drive
                </button>
                <button
                  onClick={() =>
                    navigate(`/explore?type=courses&search=${encodeURIComponent(selectedCategory.name)}`)
                  }
                  className="btn-secondary text-xs py-2.5 px-4 inline-flex items-center gap-2 cursor-pointer"
                >
                  <IoCompassOutline size={16} /> Explore Hub
                </button>
              </div>
            </div>
          ) : (
            /* Selected Category Grid */
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {filteredCourses.map((course) => (
                  <ResourceCard
                    key={course._id}
                    type="course"
                    title={course.title}
                    subtitle={course.category?.name}
                    image={course.bannerImage}
                    description={course.description}
                    isAdmin={isAdmin}
                    ownerId={course.addedBy}
                    visibility={course.visibility}
                    isSaved={course.isSaved}
                    onUnsave={() => handleUnsaveCourse(course._id)}
                    onEdit={() => {
                      setEditCourse(course);
                      setShowForm(true);
                    }}
                    onDelete={() => handleDeleteCourse(course._id)}
                    onClick={() => navigate(`/courses/${course._id}`)}
                    onRequestPublish={async () => {
                      const result = await dispatch(requestPublish({ contentType: 'course', contentId: course._id }));
                      if (result.meta.requestStatus === 'fulfilled') {
                        toast.success('Publish request sent!');
                        dispatch(fetchCourses());
                      } else {
                        toast.error(result.payload || 'Failed to request publish');
                      }
                    }}
                    onToggleVisibility={
                      isAdmin
                        ? async () => {
                            const newVis = course.visibility === 'public' ? 'private' : 'public';
                            const result = await dispatch(
                              toggleVisibility({
                                contentType: 'course',
                                contentId: course._id,
                                visibility: newVis,
                              })
                            );
                            if (result.meta.requestStatus === 'fulfilled') {
                              toast.success(`Course set to ${newVis}`);
                              dispatch(fetchCourses());
                            }
                          }
                        : undefined
                    }
                    onMakePrivate={async () => {
                      try {
                        await api.put('/content/toggle-visibility', {
                          contentType: 'course',
                          contentId: course._id,
                          visibility: 'private',
                        });
                        toast.success('Course set to private');
                        dispatch(fetchCourses());
                      } catch (err) {
                        toast.error(err.response?.data?.message || 'Failed to update');
                      }
                    }}
                  >
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-accent font-semibold">
                      <IoOpenOutline size={13} />
                      <span>Launch Course Studio</span>
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
        onClose={() => {
          setShowForm(false);
          setEditCourse(null);
        }}
        title={editCourse ? 'Edit Course' : 'Add New Course'}
        maxWidth="max-w-xl"
      >
        <CourseForm
          course={editCourse}
          onClose={() => {
            setShowForm(false);
            setEditCourse(null);
          }}
        />
      </Modal>

      {/* Revamped Category Form Modal with Pexels integration */}
      <Modal
        isOpen={showCategoryForm}
        onClose={() => setShowCategoryForm(false)}
        title={isAdmin ? "Create Global Category" : "Create Personal Category"}
      >
        <form onSubmit={handleAddCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Category Name *
            </label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Machine Learning, Cloud Architecture, DevOps"
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              autoFocus
              required
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-accent">
              <IoSparklesOutline size={15} />
              <span>{isAdmin ? "Global Category with Automated Cover" : "Private to Your Personal Space"}</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {isAdmin
                ? "This category will be available to all platform members with an automated high-resolution landscape cover from Pexels."
                : "This category will only be visible in your personal account and will not appear in anyone else's workspace. OrganizeUp automatically discovers a professional Pexels cover for it."}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCategoryForm(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingCategory || !newCategoryName.trim()}
              className="btn-primary text-xs py-2 px-4 shadow-md shadow-accent/25 flex items-center gap-2"
            >
              {isCreatingCategory ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Discovering Cover & Creating...</span>
                </>
              ) : (
                <>
                  <IoSparklesOutline size={14} />
                  <span>Create Category</span>
                </>
              )}
            </button>
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
          } else if (selectedCategory) {
            fd.append('category', selectedCategory._id);
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
              const importResult = await dispatch(
                importToCourse({
                  courseId,
                  importData: {
                    driveLink: data.driveLink,
                    driveFolderId: data.driveFolderId,
                    files: data.files,
                    folders: data.folders,
                  },
                })
              );
              if (importResult.meta.requestStatus === 'fulfilled') {
                toast.success(`Course created with ${data.files?.length || 0} files!`);
              } else {
                toast.success('Course created, but file import had an issue');
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
        title="Import Course from Google Drive"
        detailsFields={[
          {
            name: 'title',
            label: 'Course Name',
            type: 'text',
            required: true,
            placeholder: 'e.g. Complete Python Bootcamp',
          },
          {
            name: 'description',
            label: 'Course Description (optional)',
            type: 'textarea',
            placeholder: 'What topics and skills does this course cover?',
          },
          {
            name: 'category',
            label: 'Category',
            type: 'select',
            required: true,
            placeholder: 'Select a category',
            options: categories.map((c) => ({
              value: c._id,
              label: `${c.name}${!c.isGlobal ? ' (Personal)' : ''}`,
            })),
            allowNew: true,
            newPlaceholder: 'Or enter a new category name (auto-discovers Pexels cover)',
          },
          {
            name: 'bannerImage',
            label: 'Cover Image (optional)',
            type: 'file',
          },
        ]}
      />

      <ConfirmDialog
        isOpen={!!deleteCourseId}
        title="Delete Course"
        message="Are you sure you want to delete this course? All uploaded files and notes for this course will be permanently removed."
        confirmText="Delete"
        onConfirm={confirmDeleteCourse}
        onCancel={() => setDeleteCourseId(null)}
        isLoading={isDeletingCourse}
      />
    </div>
  );
};

export default CoursesPage;
