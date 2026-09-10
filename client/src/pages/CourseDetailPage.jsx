import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
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
  IoBookmark,
  IoBookmarkOutline,
  IoCloseOutline,
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

const FILE_ICONS = {
  pdf: <IoDocumentOutline size={16} className="text-red-400" />,
  html: <IoCodeSlashOutline size={16} className="text-orange-400" />,
  text: <IoDocumentOutline size={16} className="text-secondary" />,
  image: <IoImageOutline size={16} className="text-emerald-400" />,
  video: <IoVideocamOutline size={16} className="text-rose-400" />,
  gdoc: <IoDocumentOutline size={16} className="text-amber-400" />,
  gsheet: <IoDocumentOutline size={16} className="text-emerald-400" />,
  gslides: <IoDocumentOutline size={16} className="text-yellow-400" />,
  other: <IoDocumentOutline size={16} className="text-muted" />,
};

const FolderTree = ({ folder, onFileClick, completedFiles = [], onToggleComplete, depth = 0 }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 py-2 px-3 w-full rounded-lg hover:bg-surface-raised transition-colors cursor-pointer"
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {expanded ? <IoChevronDown size={12} /> : <IoChevronForward size={12} />}
        <IoFolderOutline size={16} className="text-accent" />
        <span className="text-sm font-medium text-primary">{folder.name}</span>
        <span className="text-xs text-muted ml-auto">{folder.files?.length || 0} files</span>
      </button>

      {expanded && (
        <div>
          {folder.files?.map((file) => {
            const isDone = completedFiles.includes(file.driveFileId || file._id);
            return (
              <button
                key={file._id || file.driveFileId}
                onClick={() => onFileClick(file)}
                className="flex items-center gap-2 py-2 px-3 w-full rounded-lg hover:bg-surface-raised transition-colors cursor-pointer group"
                style={{ paddingLeft: `${(depth + 1) * 16 + 24}px` }}
              >
                {FILE_ICONS[file.fileType] || FILE_ICONS.other}
                <span className={`text-sm truncate flex-1 text-left ${isDone ? 'line-through text-muted' : 'text-secondary group-hover:text-primary'}`}>
                  {file.name}
                </span>
                {isDone && (
                  <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                    <IoCheckmarkCircle size={12} /> Completed
                  </span>
                )}
              </button>
            );
          })}

          {folder.subfolders?.map((sub, i) => (
            <FolderTree
              key={sub.driveFileId || i}
              folder={sub}
              onFileClick={onFileClick}
              completedFiles={completedFiles}
              onToggleComplete={onToggleComplete}
              depth={depth + 1}
            />
          ))}
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

  const handleToggleComplete = async (file) => {
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
      toast.success(!isCompleted ? 'File marked as completed' : 'Marked as incomplete');
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
      dispatch(fetchCourse(id));
    } catch (err) {
      toast.error(err || 'Failed to import files');
    }
  };

  const handleRemoveFile = async (fileId) => {
    try {
      await dispatch(removeFileFromCourse({ courseId: id, fileId })).unwrap();
      toast.success('File removed');
      dispatch(fetchCourse(id));
    } catch (err) {
      toast.error(err || 'Failed to remove file');
    }
  };

  const isOwner = user?._id && currentCourse?.addedBy && String(currentCourse.addedBy._id || currentCourse.addedBy) === String(user._id);
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
          onToggleComplete={handleToggleComplete}
          onBack={() => setSelectedFile(null)}
          onClose={() => setSelectedFile(null)}
        />
      </div>
    );
  }

  const hasFolders = currentCourse.folders && currentCourse.folders.length > 0;
  const hasFiles = currentCourse.files && currentCourse.files.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          onClick={() => navigate('/courses')}
          className="flex items-center gap-2 text-sm text-secondary hover:text-primary mb-4 transition-colors cursor-pointer"
        >
          <IoArrowBack size={14} /> All Courses
        </button>

        {/* Banner image */}
        {currentCourse.bannerImage && (
          <div className="w-full h-48 rounded-2xl overflow-hidden mb-6 border border-subtle">
            <img
              src={currentCourse.bannerImage}
              alt={currentCourse.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary font-display">
              {currentCourse.title}
            </h1>
            {currentCourse.category?.name && (
              <span className="inline-block mt-2 px-3 py-1 text-xs font-medium rounded-full bg-accent-subtle text-accent border border-accent/20">
                {currentCourse.category.name}
              </span>
            )}
            {currentCourse.description && (
              <p className="text-secondary text-sm mt-2">{currentCourse.description}</p>
            )}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="text-xs text-muted">
                {currentCourse.files?.length || 0} top files
                {currentCourse.addedBy?.name && ` · by ${currentCourse.addedBy.name}`}
              </span>
              {/* Progress pill */}
              <div className="flex items-center gap-2 bg-surface px-3 py-1 rounded-full border border-subtle">
                <span className="text-xs text-secondary font-medium">
                  {completedFiles.length} completed ({courseProgress.progress}%)
                </span>
                {courseProgress.completed && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <IoCheckmarkCircle size={12} /> Finished
                  </span>
                )}
              </div>
            </div>

            {/* Course Progress bar */}
            <div className="w-full max-w-md mt-3">
              <div className="w-full h-2 rounded-full bg-surface border border-subtle overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#ff5722] to-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, courseProgress.progress || 0))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isOwner && (
              isSavedInLibrary ? (
                <button
                  onClick={handleToggleLibrary}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-400 bg-surface border border-emerald-500/30 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all cursor-pointer group/unsave shadow-sm"
                  title="Click to unsave from your courses"
                >
                  <IoBookmark className="group-hover/unsave:hidden text-emerald-400" size={14} />
                  <IoCloseOutline className="hidden group-hover/unsave:inline text-red-400" size={15} />
                  <span className="group-hover/unsave:hidden">Saved</span>
                  <span className="hidden group-hover/unsave:inline">Unsave</span>
                </button>
              ) : (
                <button
                  onClick={handleToggleLibrary}
                  className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-sm cursor-pointer"
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
                className="btn-secondary flex items-center gap-2 cursor-pointer"
              >
                <IoOpenOutline size={16} /> Open in Drive
              </a>
            )}
            {canManage && (
              <button
                onClick={() => setShowImport(true)}
                className="btn-primary flex items-center gap-2 cursor-pointer"
              >
                <IoCloudDownloadOutline size={18} /> Import from Drive
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Content */}
      {!hasFiles && !hasFolders ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <IoSchoolOutline className="mx-auto text-muted mb-4" size={48} />
          <h3 className="text-lg font-medium text-secondary mb-2">No files yet</h3>
          <p className="text-sm text-muted mb-4">Import content from Google Drive to get started</p>
          {canManage && (
            <button
              onClick={() => setShowImport(true)}
              className="btn-primary inline-flex items-center gap-2 cursor-pointer"
            >
              <IoCloudDownloadOutline size={18} /> Import from Drive
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 border border-subtle"
        >
          {/* Folder tree */}
          {hasFolders && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-secondary px-3 mb-2">Folders</h4>
              {currentCourse.folders.map((folder, i) => (
                <FolderTree
                  key={folder.driveFileId || i}
                  folder={folder}
                  completedFiles={completedFiles}
                  onToggleComplete={handleToggleComplete}
                  onFileClick={setSelectedFile}
                />
              ))}
            </div>
          )}

          {/* Root-level files (flat list) */}
          {hasFiles && (
            <div>
              <h4 className="text-sm font-medium text-secondary px-3 mb-2">
                {hasFolders ? 'All Files' : 'Files'}
              </h4>
              <div className="space-y-0.5">
                {currentCourse.files.map((file) => {
                  const isDone = completedFiles.includes(file.driveFileId || file._id);
                  return (
                    <div
                      key={file._id}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-surface-raised transition-colors group cursor-pointer"
                      onClick={() => setSelectedFile(file)}
                    >
                      {FILE_ICONS[file.fileType] || FILE_ICONS.other}
                      <span className={`text-sm truncate flex-1 ${isDone ? 'line-through text-muted' : 'text-primary'}`}>
                        {file.name}
                      </span>
                      {isDone && (
                        <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          <IoCheckmarkCircle size={13} /> Done
                        </span>
                      )}
                      {file.path && file.path.includes('/') && (
                        <span className="text-xs text-muted truncate max-w-[200px]">{file.path}</span>
                      )}
                      {file.size && (
                        <span className="text-xs text-muted">
                          {file.size > 1048576
                            ? `${(file.size / 1048576).toFixed(1)} MB`
                            : `${(file.size / 1024).toFixed(0)} KB`}
                        </span>
                      )}
                      {canManage && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(file._id);
                          }}
                          className="p-1 rounded hover:bg-red-500/10 text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        >
                          <IoTrashOutline size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Drive Import Modal */}
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
