import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoArrowBack,
  IoCloudDownloadOutline,
  IoFolderOutline,
  IoDocumentOutline,
  IoImageOutline,
  IoVideocamOutline,
  IoCodeSlashOutline,
  IoChevronDown,
  IoChevronForward,
  IoTrashOutline,
  IoOpenOutline,
  IoSchoolOutline,
  IoCheckmarkCircle,
  IoCheckmarkCircleOutline,
  IoBookmark,
  IoBookmarkOutline,
  IoCloseOutline,
  IoShareSocialOutline,
  IoPlay,
  IoPlayCircleOutline,
  IoGridOutline,
  IoListOutline,
  IoSearchOutline,
  IoClose,
  IoAddOutline,
  IoSparklesOutline,
  IoCheckmarkDoneOutline,
  IoDocumentTextOutline,
  IoLayersOutline,
} from 'react-icons/io5';
import {
  fetchCourse,
  fetchCategories,
  importToCourse,
  removeFileFromCourse,
  clearCurrentCourse,
  fetchCourseProgress,
  updateCourseFileProgress,
} from '../redux/slices/courseSlice';
import { addToLibrary, removeFromLibrary } from '../redux/slices/librarySlice';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import DriveImportModal from '../components/forms/DriveImportModal';
import FileViewer from '../components/ui/FileViewer';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const FILE_TYPE_CONFIG = {
  video: {
    label: 'VIDEO',
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    icon: <IoVideocamOutline size={18} className="text-rose-400" />,
    actionLabel: 'Watch Lecture',
  },
  pdf: {
    label: 'PDF',
    badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30',
    icon: <IoDocumentOutline size={18} className="text-red-400" />,
    actionLabel: 'Read Document',
  },
  image: {
    label: 'IMAGE',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: <IoImageOutline size={18} className="text-emerald-400" />,
    actionLabel: 'View Image',
  },
  gslides: {
    label: 'SLIDES',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: <IoDocumentTextOutline size={18} className="text-amber-400" />,
    actionLabel: 'View Slides',
  },
  gdoc: {
    label: 'DOC',
    badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    icon: <IoDocumentOutline size={18} className="text-sky-400" />,
    actionLabel: 'Open Document',
  },
  gsheet: {
    label: 'SHEET',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: <IoDocumentTextOutline size={18} className="text-emerald-400" />,
    actionLabel: 'Open Sheet',
  },
  html: {
    label: 'HTML / CODE',
    badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    icon: <IoCodeSlashOutline size={18} className="text-orange-400" />,
    actionLabel: 'View Code',
  },
  text: {
    label: 'TEXT',
    badgeClass: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
    icon: <IoDocumentTextOutline size={18} className="text-zinc-300" />,
    actionLabel: 'Read Notes',
  },
  other: {
    label: 'FILE',
    badgeClass: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
    icon: <IoDocumentOutline size={18} className="text-zinc-400" />,
    actionLabel: 'Preview File',
  },
};

/**
 * Thumbnail Preview Component with fallbacks for Drive Files
 */
const FileThumbnail = ({ file }) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const isVideo = file.fileType === 'video';
  const isImage = file.fileType === 'image';
  const isPdf = file.fileType === 'pdf';
  const isSlides = file.fileType === 'gslides';

  const driveThumbUrl = `https://drive.google.com/thumbnail?id=${file.driveFileId}&sz=w600`;

  return (
    <div className="relative w-full h-36 bg-surface-raised overflow-hidden flex items-center justify-center border-b border-subtle">
      {!imgError ? (
        <>
          <img
            src={driveThumbUrl}
            alt={file.name}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
              imgLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/70">
              <div className="w-5 h-5 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
            </div>
          )}
        </>
      ) : (
        <div
          className={`w-full h-full flex flex-col items-center justify-center gap-1.5 p-4 ${
            isVideo
              ? 'bg-rose-500/10 text-rose-400'
              : isPdf
              ? 'bg-red-500/10 text-red-400'
              : isImage
              ? 'bg-emerald-500/10 text-emerald-400'
              : isSlides
              ? 'bg-amber-500/10 text-amber-400'
              : 'bg-surface text-secondary'
          }`}
        >
          {isVideo ? (
            <IoVideocamOutline size={38} />
          ) : isPdf ? (
            <IoDocumentOutline size={38} />
          ) : isImage ? (
            <IoImageOutline size={38} />
          ) : (
            <IoDocumentTextOutline size={38} />
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
            {file.fileType || 'Material'}
          </span>
        </div>
      )}

      {/* Video Play Overlay */}
      {isVideo && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-all group-hover:bg-black/25">
          <div className="w-11 h-11 rounded-full bg-accent/90 text-white flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform">
            <IoPlay size={20} className="translate-x-0.5" />
          </div>
        </div>
      )}
    </div>
  );
};

const CourseDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentCourse, isLoading, categories, progress } = useSelector((state) => state.courses);
  const { user } = useSelector((state) => state.auth);

  useDocumentTitle(currentCourse?.title || 'Course');
  const isAdmin = user?.role === 'admin';
  const [showImport, setShowImport] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Filter & View states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeTab, setActiveTypeTab] = useState('all'); // 'all' | 'video' | 'pdf' | 'doc' | 'image'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'incomplete' | 'completed'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [groupByFolder, setGroupByFolder] = useState(false);
  const [openFolders, setOpenFolders] = useState({});

  useEffect(() => {
    dispatch(fetchCourse(id));
    dispatch(fetchCategories());
    dispatch(fetchCourseProgress(id));

    return () => {
      dispatch(clearCurrentCourse());
    };
  }, [dispatch, id]);

  const courseProgress = progress[id] || { completedFiles: [], progress: 0, completed: false };
  const completedFiles = courseProgress.completedFiles || [];

  // Flatten and normalize all files across root and folders
  const allCourseFiles = useMemo(() => {
    if (!currentCourse) return [];
    const collected = [];

    // Root files
    (currentCourse.files || []).forEach((f) => {
      collected.push({
        ...f,
        folderName: '',
        folderPath: '',
        isRoot: true,
      });
    });

    // Nested folders
    const traverse = (folder, pathStr = '') => {
      const currentPath = pathStr ? `${pathStr} / ${folder.name}` : folder.name;
      (folder.files || []).forEach((f) => {
        collected.push({
          ...f,
          folderName: folder.name,
          folderPath: currentPath,
          isRoot: false,
        });
      });
      (folder.subfolders || []).forEach((sub) => traverse(sub, currentPath));
    };

    (currentCourse.folders || []).forEach((folder) => traverse(folder));
    return collected;
  }, [currentCourse]);

  // Counts by category
  const fileCounts = useMemo(() => {
    const total = allCourseFiles.length;
    const video = allCourseFiles.filter((f) => f.fileType === 'video').length;
    const pdf = allCourseFiles.filter((f) => f.fileType === 'pdf').length;
    const doc = allCourseFiles.filter((f) =>
      ['gdoc', 'gsheet', 'gslides', 'text', 'html'].includes(f.fileType)
    ).length;
    const image = allCourseFiles.filter((f) => f.fileType === 'image').length;
    return { total, video, pdf, doc, image };
  }, [allCourseFiles]);

  // Filtered files
  const filteredFiles = useMemo(() => {
    return allCourseFiles.filter((file) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (file.name || '').toLowerCase().includes(q);
        const matchesFolder = (file.folderName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesFolder) return false;
      }

      // Type Tab
      if (activeTypeTab === 'video' && file.fileType !== 'video') return false;
      if (activeTypeTab === 'pdf' && file.fileType !== 'pdf') return false;
      if (
        activeTypeTab === 'doc' &&
        !['gdoc', 'gsheet', 'gslides', 'text', 'html'].includes(file.fileType)
      )
        return false;
      if (activeTypeTab === 'image' && file.fileType !== 'image') return false;

      // Status
      const isDone = completedFiles.includes(file.driveFileId || file._id);
      if (statusFilter === 'incomplete' && isDone) return false;
      if (statusFilter === 'completed' && !isDone) return false;

      return true;
    });
  }, [allCourseFiles, searchQuery, activeTypeTab, statusFilter, completedFiles]);

  const handleToggleComplete = async (file, e) => {
    if (e) e.stopPropagation();
    const fileId = file.driveFileId || file._id;
    const isCompleted = completedFiles.includes(fileId);
    try {
      await dispatch(
        updateCourseFileProgress({
          courseId: id,
          fileId,
          completed: !isCompleted,
          isVideo: file.fileType === 'video',
          title: file.name,
        })
      ).unwrap();
      toast.success(!isCompleted ? 'Marked as completed' : 'Marked as incomplete');
    } catch (err) {
      toast.error(err || 'Failed to update progress');
    }
  };

  const handleImport = async (importData) => {
    try {
      await dispatch(
        importToCourse({
          courseId: id,
          folders: importData.folders,
          files: importData.files,
        })
      ).unwrap();
      toast.success('Files imported successfully');
      setShowImport(false);
      dispatch(fetchCourse(id));
    } catch (err) {
      toast.error(err || 'Failed to import files');
    }
  };

  const handleRemoveFile = async (fileId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this file from the course?')) return;
    try {
      await dispatch(removeFileFromCourse({ courseId: id, fileId })).unwrap();
      toast.success('File removed');
      dispatch(fetchCourse(id));
    } catch (err) {
      toast.error(err || 'Failed to remove file');
    }
  };

  const isOwner =
    user?._id &&
    currentCourse?.addedBy &&
    String(currentCourse.addedBy._id || currentCourse.addedBy) === String(user._id);
  const canManage = isAdmin || isOwner;
  const isSavedInLibrary = Boolean(currentCourse?.isSaved);

  const handleToggleLibrary = async () => {
    if (isSavedInLibrary) {
      const result = await dispatch(removeFromLibrary(id));
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('Removed from your courses');
        dispatch(fetchCourse(id));
      } else {
        toast.error(result.payload || 'Failed to remove from library');
      }
    } else {
      const result = await dispatch(addToLibrary({ contentType: 'course', contentId: id }));
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('Saved to your courses!');
        dispatch(fetchCourse(id));
      } else {
        toast.error(result.payload || 'Failed to save to library');
      }
    }
  };

  const handleShareResource = async () => {
    const shareUrl = window.location.href;
    const shareTitle = currentCourse?.title
      ? `${currentCourse.title} — OrganizeUp`
      : 'Course — OrganizeUp';
    const shareText = `Check out "${currentCourse?.title || 'this course'}" on OrganizeUp!`;

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') console.warn('Web Share failed, fallback to copy:', err);
        else return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Course link copied to clipboard!', { icon: '🔗' });
    } catch {
      toast.error('Failed to copy link to clipboard');
    }
  };

  // Quick Resume: First uncompleted lecture
  const firstUnfinishedFile = useMemo(() => {
    return allCourseFiles.find((f) => !completedFiles.includes(f.driveFileId || f._id)) || allCourseFiles[0];
  }, [allCourseFiles, completedFiles]);

  if (isLoading) {
    return <LoadingSpinner text="Loading course..." />;
  }

  if (!currentCourse) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-primary mb-2">Course not found</h2>
        <button onClick={() => navigate('/courses')} className="btn-secondary">
          Back to Courses
        </button>
      </div>
    );
  }

  // Full-Screen Dedicated File Viewer
  if (selectedFile) {
    const isFileCompleted = completedFiles.includes(selectedFile.driveFileId || selectedFile._id);
    return (
      <div className="h-[calc(100vh-64px)] flex flex-col p-3 sm:p-6 max-w-7xl mx-auto w-full">
        <FileViewer
          file={selectedFile}
          isCompleted={isFileCompleted}
          onToggleComplete={(f) => handleToggleComplete(f)}
          onBack={() => setSelectedFile(null)}
          onClose={() => setSelectedFile(null)}
        />
      </div>
    );
  }

  const hasFolders = currentCourse.folders && currentCourse.folders.length > 0;
  const hasFiles = currentCourse.files && currentCourse.files.length > 0;
  const hasAnyContent = hasFiles || hasFolders || allCourseFiles.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <button
          onClick={() => navigate('/courses')}
          className="flex items-center gap-2 text-sm text-secondary hover:text-primary mb-4 transition-colors cursor-pointer"
        >
          <IoArrowBack size={14} /> All Courses
        </button>

        {/* Banner image */}
        {currentCourse.bannerImage && (
          <div className="w-full h-48 sm:h-56 rounded-2xl overflow-hidden mb-6 border border-subtle relative shadow-lg">
            <img
              src={currentCourse.bannerImage}
              alt={currentCourse.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-primary font-display">
                {currentCourse.title}
              </h1>
              {currentCourse.category?.name && (
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-accent/15 text-accent border border-accent/25">
                  {currentCourse.category.name}
                </span>
              )}
            </div>

            {currentCourse.description && (
              <p className="text-secondary text-sm mt-2 leading-relaxed max-w-2xl">
                {currentCourse.description}
              </p>
            )}

            {/* Course Metadata Stats */}
            <div className="flex items-center gap-3 mt-4 flex-wrap text-xs text-muted">
              <span>{allCourseFiles.length} lectures & files</span>
              {fileCounts.video > 0 && <span>· {fileCounts.video} videos</span>}
              {fileCounts.pdf > 0 && <span>· {fileCounts.pdf} PDFs</span>}
              {currentCourse.addedBy?.name && <span>· by {currentCourse.addedBy.name}</span>}

              {/* Progress pill */}
              <div className="flex items-center gap-2 bg-surface px-3 py-1 rounded-full border border-subtle ml-auto sm:ml-0">
                <span className="text-xs text-secondary font-medium">
                  {completedFiles.length} of {allCourseFiles.length} completed ({courseProgress.progress}%)
                </span>
                {courseProgress.completed && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <IoCheckmarkCircle size={13} /> Completed
                  </span>
                )}
              </div>
            </div>

            {/* Course Progress bar */}
            <div className="w-full max-w-md mt-3">
              <div className="w-full h-2 rounded-full bg-surface border border-subtle overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, courseProgress.progress || 0))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons Header */}
          <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center">
            {/* Start / Resume Course CTA */}
            {firstUnfinishedFile && (
              <button
                type="button"
                onClick={() => setSelectedFile(firstUnfinishedFile)}
                className="btn-primary flex items-center gap-2 text-xs py-2.5 px-4 shadow-lg shadow-accent/20 cursor-pointer font-semibold"
              >
                <IoPlay size={16} />
                <span>{completedFiles.length > 0 ? 'Resume Learning' : 'Start Course'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleShareResource}
              className="btn-secondary flex items-center gap-1.5 text-xs py-2.5 px-3.5 shadow-sm cursor-pointer hover:border-accent/40"
              title="Share this course link"
            >
              <IoShareSocialOutline size={15} />
              <span>Share</span>
            </button>

            {!isOwner && (
              isSavedInLibrary ? (
                <button
                  onClick={handleToggleLibrary}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-400 bg-surface border border-emerald-500/30 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all cursor-pointer group-unsave shadow-sm"
                  title="Click to unsave from your courses"
                >
                  <IoBookmark className="unsave-default-show text-emerald-400" size={14} />
                  <IoCloseOutline className="unsave-hover-show text-red-400" size={15} />
                  <span className="unsave-default-show">Saved</span>
                  <span className="unsave-hover-show">Unsave</span>
                </button>
              ) : (
                <button
                  onClick={handleToggleLibrary}
                  className="btn-primary flex items-center gap-1.5 text-xs py-2.5 px-4 shadow-sm cursor-pointer"
                >
                  <IoBookmarkOutline size={14} />
                  <span>Save to Courses</span>
                </button>
              )
            )}

            {currentCourse.driveLink && (
              <a
                href={currentCourse.driveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center gap-2 cursor-pointer text-xs py-2.5 px-3.5"
                title="Open root folder on Google Drive"
              >
                <IoOpenOutline size={16} /> <span>Open Drive</span>
              </a>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Main Content Area ── */}
      {!hasAnyContent ? (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card text-center py-20 px-4 rounded-3xl border border-subtle"
        >
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4 text-accent">
            <IoSchoolOutline size={36} />
          </div>
          <h3 className="text-xl font-bold text-primary mb-2 font-display">No Course Files Yet</h3>
          <p className="text-sm text-secondary mb-6 max-w-md mx-auto leading-relaxed">
            Import an entire folder of video lectures, PDFs, and notes directly from Google Drive to populate this course.
          </p>
          {canManage && (
            <button
              onClick={() => setShowImport(true)}
              className="btn-primary inline-flex items-center gap-2 cursor-pointer text-sm py-3 px-6 shadow-xl shadow-accent/25"
            >
              <IoCloudDownloadOutline size={20} /> Import from Google Drive
            </button>
          )}
        </motion.div>
      ) : (
        /* Enhanced Files Section */
        <div className="space-y-6">
          {/* Controls & Filter Toolbar */}
          <div className="glass-card p-4 rounded-2xl border border-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <IoSearchOutline size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search lectures, documents, topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-raised border border-subtle rounded-xl pl-10 pr-9 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-accent/40"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary cursor-pointer"
                >
                  <IoClose size={14} />
                </button>
              )}
            </div>

            {/* View Mode & Add Files Actions */}
            <div className="flex items-center gap-2.5 flex-wrap self-end md:self-auto">
              {/* Add Files from Drive (Subtle toolbar button for owners) */}
              {canManage && (
                <button
                  onClick={() => setShowImport(true)}
                  className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 cursor-pointer hover:border-accent/40"
                  title="Import additional files from Google Drive"
                >
                  <IoAddOutline size={16} className="text-accent" />
                  <span>Add Files</span>
                </button>
              )}

              {/* Status Filter Dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface-raised border border-subtle text-xs text-secondary rounded-xl px-3 py-2 cursor-pointer focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="incomplete">Unfinished Only</option>
                <option value="completed">Completed Only</option>
              </select>

              {/* View Toggle (Grid vs List) */}
              <div className="flex items-center bg-surface-raised rounded-xl p-1 border border-subtle">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid' ? 'bg-accent text-white shadow-sm' : 'text-secondary hover:text-primary'
                  }`}
                  title="Visual Card Grid"
                >
                  <IoGridOutline size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'list' ? 'bg-accent text-white shadow-sm' : 'text-secondary hover:text-primary'
                  }`}
                  title="Compact List View"
                >
                  <IoListOutline size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Type Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {[
              { id: 'all', label: 'All Files', count: fileCounts.total },
              { id: 'video', label: '🎬 Videos', count: fileCounts.video },
              { id: 'pdf', label: '📄 PDFs', count: fileCounts.pdf },
              { id: 'doc', label: '📝 Documents', count: fileCounts.doc },
              { id: 'image', label: '🖼️ Images', count: fileCounts.image },
            ].map((tab) => {
              if (tab.id !== 'all' && tab.count === 0) return null;
              const active = activeTypeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTypeTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                    active
                      ? 'bg-accent-subtle text-accent border-accent/30 shadow-sm'
                      : 'bg-surface text-secondary border-subtle hover:bg-surface-raised'
                  }`}
                >
                  {tab.label} <span className="opacity-60 text-[11px] ml-1">({tab.count})</span>
                </button>
              );
            })}
          </div>

          {/* ── Files Rendering ── */}
          {filteredFiles.length === 0 ? (
            <div className="glass-card text-center py-16 px-4 rounded-2xl border border-subtle">
              <IoSearchOutline size={32} className="mx-auto text-muted mb-2" />
              <p className="text-sm font-semibold text-primary">No matching files found</p>
              <p className="text-xs text-muted mt-1">Try clearing your search query or filters.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveTypeTab('all');
                  setStatusFilter('all');
                }}
                className="btn-secondary text-xs py-2 px-4 mt-4 cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* Visual Grid Card Mode */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredFiles.map((file) => {
                const fileId = file.driveFileId || file._id;
                const isDone = completedFiles.includes(fileId);
                const cfg = FILE_TYPE_CONFIG[file.fileType] || FILE_TYPE_CONFIG.other;

                return (
                  <div
                    key={fileId}
                    onClick={() => setSelectedFile(file)}
                    className={`glass-card rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col group cursor-pointer hover:shadow-xl hover:border-accent/40 ${
                      isDone ? 'border-emerald-500/30 bg-surface/80' : 'border-subtle bg-surface/40'
                    }`}
                  >
                    {/* Visual Preview Thumbnail */}
                    <div className="relative">
                      <FileThumbnail file={file} />

                      {/* File Type Pill */}
                      <span
                        className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border backdrop-blur-md shadow ${cfg.badgeClass}`}
                      >
                        {cfg.label}
                      </span>

                      {/* Completed Badge Indicator */}
                      {isDone && (
                        <span className="absolute top-2.5 right-2.5 bg-emerald-500 text-white p-1 rounded-full shadow-lg">
                          <IoCheckmarkCircle size={14} />
                        </span>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <div>
                        {file.folderName && (
                          <span className="text-[10px] text-accent font-medium flex items-center gap-1 mb-1 truncate">
                            <IoFolderOutline size={11} /> {file.folderName}
                          </span>
                        )}
                        <h4
                          className={`text-xs font-semibold leading-snug line-clamp-2 ${
                            isDone ? 'text-secondary' : 'text-primary'
                          }`}
                          title={file.name}
                        >
                          {file.name}
                        </h4>
                      </div>

                      {/* Card Footer Info & Controls */}
                      <div className="mt-3 pt-3 border-t border-subtle/60 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-muted">{formatBytes(file.size)}</span>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {/* Toggle complete button */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleComplete(file, e)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isDone
                                ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                                : 'text-muted hover:text-emerald-400 hover:bg-surface-raised'
                            }`}
                            title={isDone ? 'Mark as Incomplete' : 'Mark as Completed'}
                          >
                            <IoCheckmarkCircleOutline size={16} />
                          </button>

                          {/* Open in Drive */}
                          <a
                            href={`https://drive.google.com/file/d/${file.driveFileId}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-raised transition-colors"
                            title="Open in Google Drive"
                          >
                            <IoOpenOutline size={15} />
                          </a>

                          {/* Delete (owner/admin) */}
                          {canManage && (
                            <button
                              type="button"
                              onClick={(e) => handleRemoveFile(file._id, e)}
                              className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title="Remove from course"
                            >
                              <IoTrashOutline size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Enhanced List View Mode */
            <div className="glass-card rounded-2xl border border-subtle divide-y divide-subtle/50 overflow-hidden">
              {filteredFiles.map((file) => {
                const fileId = file.driveFileId || file._id;
                const isDone = completedFiles.includes(fileId);
                const cfg = FILE_TYPE_CONFIG[file.fileType] || FILE_TYPE_CONFIG.other;

                return (
                  <div
                    key={fileId}
                    onClick={() => setSelectedFile(file)}
                    className="p-3 sm:px-4 flex items-center gap-3.5 hover:bg-surface-raised transition-colors cursor-pointer group"
                  >
                    {/* Small thumbnail / Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-surface-raised border border-subtle overflow-hidden flex items-center justify-center flex-shrink-0">
                      {cfg.icon}
                    </div>

                    {/* Title and metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold truncate ${isDone ? 'line-through text-muted' : 'text-primary'}`}>
                          {file.name}
                        </span>
                        <span className={`hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${cfg.badgeClass}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted flex-wrap">
                        {file.folderName && (
                          <span className="flex items-center gap-1 text-accent">
                            <IoFolderOutline size={11} /> {file.folderName}
                          </span>
                        )}
                        {file.size && <span>· {formatBytes(file.size)}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {isDone && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                          <IoCheckmarkCircle size={12} /> Done
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleToggleComplete(file, e)}
                        className={`p-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          isDone
                            ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                            : 'text-muted hover:text-emerald-400 hover:bg-surface-raised'
                        }`}
                        title={isDone ? 'Mark Incomplete' : 'Mark Completed'}
                      >
                        <IoCheckmarkCircleOutline size={18} />
                      </button>

                      <a
                        href={`https://drive.google.com/file/d/${file.driveFileId}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-raised transition-colors"
                        title="Open in Drive"
                      >
                        <IoOpenOutline size={16} />
                      </a>

                      {canManage && (
                        <button
                          type="button"
                          onClick={(e) => handleRemoveFile(file._id, e)}
                          className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Remove file"
                        >
                          <IoTrashOutline size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Drive Import Modal (When requested by user) */}
      <DriveImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
        title={`Import to "${currentCourse.title}"`}
      />
    </div>
  );
};

export default CourseDetailPage;
