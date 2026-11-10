import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import {
  IoArrowBack,
  IoCloudDownloadOutline,
  IoFolderOutline,
  IoFolderOpenOutline,
  IoDocumentOutline,
  IoImageOutline,
  IoVideocamOutline,
  IoCodeSlashOutline,
  IoDocumentTextOutline,
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
  IoAddOutline,
} from 'react-icons/io5';
import {
  fetchCourse,
  fetchCategories,
  importToCourse,
  removeFileFromCourse,
  removeFolderFromCourse,
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
  pdf: <IoDocumentOutline size={18} className="text-red-400" />,
  html: <IoCodeSlashOutline size={18} className="text-orange-400" />,
  text: <IoDocumentOutline size={18} className="text-secondary" />,
  image: <IoImageOutline size={18} className="text-emerald-400" />,
  video: <IoVideocamOutline size={18} className="text-rose-400" />,
  gdoc: <IoDocumentOutline size={18} className="text-amber-400" />,
  gsheet: <IoDocumentOutline size={18} className="text-emerald-400" />,
  gslides: <IoDocumentOutline size={18} className="text-yellow-400" />,
  other: <IoDocumentOutline size={18} className="text-muted" />,
};

const FILE_TYPE_BADGES = {
  video: { label: 'VIDEO', badge: 'bg-rose-500/15 text-rose-400 border-rose-500/20' },
  pdf: { label: 'PDF', badge: 'bg-red-500/15 text-red-400 border-red-500/20' },
  image: { label: 'IMAGE', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  gslides: { label: 'SLIDES', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  gdoc: { label: 'DOC', badge: 'bg-sky-500/15 text-sky-400 border-sky-500/20' },
  gsheet: { label: 'SHEET', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  html: { label: 'CODE', badge: 'bg-orange-500/15 text-orange-400 border-orange-500/20' },
  text: { label: 'TEXT', badge: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/20' },
  other: { label: 'FILE', badge: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20' },
};

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return null;
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Visual Thumbnail Component for files inside folders and dropdowns
 */
const FileThumbnail = ({ file }) => {
  const [imgError, setImgError] = useState(false);
  const isVideo = file.fileType === 'video';

  const thumbUrl = file.driveFileId
    ? `https://drive.google.com/thumbnail?id=${file.driveFileId}&sz=w200`
    : null;

  return (
    <div className="w-13 h-9 sm:w-14 sm:h-10 rounded-lg overflow-hidden bg-surface-raised border border-subtle/70 flex items-center justify-center shrink-0 relative shadow-xs">
      {thumbUrl && !imgError ? (
        <>
          <img
            src={thumbUrl}
            alt={file.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
          {isVideo && (
            <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
              <div className="w-4.5 h-4.5 rounded-full bg-black/60 flex items-center justify-center text-white">
                <IoPlay size={9} className="ml-0.5" />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-surface-raised">
          {FILE_ICONS[file.fileType] || FILE_ICONS.other}
        </div>
      )}
    </div>
  );
};

/**
 * Optimized file item with visual preview, badge, completion toggle & quick actions
 */
const CourseFileItem = ({
  file,
  isCompleted,
  onToggleComplete,
  onClick,
  onRemove,
  canManage,
}) => {
  const typeConfig = FILE_TYPE_BADGES[file.fileType] || FILE_TYPE_BADGES.other;
  const sizeLabel = formatBytes(file.size);

  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer ${
        isCompleted
          ? 'bg-surface/40 border-subtle/40 hover:bg-surface hover:border-subtle'
          : 'bg-surface-raised/35 border-subtle/50 hover:bg-surface-raised hover:border-accent/40 shadow-xs'
      }`}
    >
      {/* Complete toggle checkbox */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(file);
        }}
        className={`p-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
          isCompleted
            ? 'text-emerald-400 hover:text-emerald-300'
            : 'text-muted hover:text-emerald-400 hover:bg-surface-raised'
        }`}
        title={isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
      >
        {isCompleted ? (
          <IoCheckmarkCircle size={20} className="text-emerald-400" />
        ) : (
          <IoCheckmarkCircleOutline size={20} />
        )}
      </button>

      {/* Visual Thumbnail Preview */}
      <FileThumbnail file={file} />

      {/* File Info */}
      <div className="flex-1 min-w-0 pr-1 sm:pr-2">
        <p
          className={`text-sm font-medium truncate transition-colors ${
            isCompleted
              ? 'line-through text-muted'
              : 'text-primary group-hover:text-accent'
          }`}
          title={file.name}
        >
          {file.name}
        </p>

        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span
            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${typeConfig.badge}`}
          >
            {typeConfig.label}
          </span>
          {sizeLabel && (
            <span className="text-[11px] text-muted font-mono">
              {sizeLabel}
            </span>
          )}
          {file.path && file.path.includes('/') && (
            <span className="text-[11px] text-muted truncate max-w-[140px] hidden md:inline">
              {file.path}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons on the right */}
      <div
        className="flex items-center gap-1.5 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {isCompleted && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md mr-1">
            <IoCheckmarkCircle size={12} /> Done
          </span>
        )}

        {file.driveFileId && (
          <a
            href={`https://drive.google.com/file/d/${file.driveFileId}/view`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-raised transition-colors"
            title="Open in Google Drive"
          >
            <IoOpenOutline size={16} />
          </a>
        )}

        {canManage && onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(file._id || file.driveFileId);
            }}
            className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
            title="Remove file"
          >
            <IoTrashOutline size={15} />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Preserved directory structure folder tree with collapsible dropdowns & optimized files inside
 */
const FolderTree = ({
  folder,
  onFileClick,
  completedFiles = [],
  onToggleComplete,
  onRemoveFile,
  onRemoveFolder,
  canManage,
  depth = 0,
}) => {
  const [expanded, setExpanded] = useState(true);

  const folderFiles = folder.files || [];
  const completedCount = folderFiles.filter((f) =>
    completedFiles.includes(f.driveFileId || f._id)
  ).length;

  return (
    <div className="mb-2.5">
      {/* Folder Header / Collapsible Dropdown */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
        className="flex items-center gap-2.5 py-2.5 px-3 w-full rounded-xl bg-surface/60 hover:bg-surface-raised border border-subtle/50 transition-all cursor-pointer text-left group select-none"
        style={{ marginLeft: `${depth * 16}px`, width: `calc(100% - ${depth * 16}px)` }}
      >
        <span className="text-secondary group-hover:text-primary transition-transform duration-200">
          {expanded ? <IoChevronDown size={14} /> : <IoChevronForward size={14} />}
        </span>

        {expanded ? (
          <IoFolderOpenOutline size={18} className="text-accent shrink-0" />
        ) : (
          <IoFolderOutline size={18} className="text-accent shrink-0" />
        )}

        <span className="text-sm font-semibold text-primary truncate flex-1">
          {folder.name}
        </span>

        <div className="flex items-center gap-2 ml-auto text-xs shrink-0">
          {folderFiles.length > 0 && (
            <span className="text-muted bg-surface-raised px-2 py-0.5 rounded-md font-mono text-[11px] border border-subtle/40">
              {folderFiles.length} {folderFiles.length === 1 ? 'file' : 'files'}
            </span>
          )}
          {completedCount > 0 && (
            <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-medium text-[11px] flex items-center gap-1">
              <IoCheckmarkCircle size={11} /> {completedCount}/{folderFiles.length}
            </span>
          )}
          {canManage && onRemoveFolder && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFolder(folder);
              }}
              className="p-1 rounded-md text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Delete folder and contents"
            >
              <IoTrashOutline size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Folder Content (Subfolders and Files) */}
      {expanded && (
        <div
          className="space-y-1.5 mt-2 pl-3 border-l-2 border-subtle/40"
          style={{ marginLeft: `${depth * 16 + 14}px` }}
        >
          {/* Files inside this folder */}
          {folderFiles.map((file) => {
            const isDone = completedFiles.includes(file.driveFileId || file._id);
            return (
              <CourseFileItem
                key={file._id || file.driveFileId}
                file={file}
                isCompleted={isDone}
                onToggleComplete={onToggleComplete}
                onClick={() => onFileClick(file)}
                onRemove={onRemoveFile}
                canManage={canManage}
              />
            );
          })}

          {/* Subfolders with recursive structure */}
          {folder.subfolders?.map((sub, i) => (
            <FolderTree
              key={sub.driveFileId || sub._id || i}
              folder={sub}
              onFileClick={onFileClick}
              completedFiles={completedFiles}
              onToggleComplete={onToggleComplete}
              onRemoveFile={onRemoveFile}
              onRemoveFolder={onRemoveFolder}
              canManage={canManage}
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
      setShowImport(false);
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

  const handleRemoveFolder = async (folder) => {
    const folderId = folder.driveFileId || folder._id || folder.path || folder.name;
    if (!folderId) return;
    if (
      !window.confirm(
        `Are you sure you want to delete folder "${folder.name}" and all its contents?`
      )
    ) {
      return;
    }
    try {
      await dispatch(
        removeFolderFromCourse({ courseId: id, folderId })
      ).unwrap();
      toast.success(`Folder "${folder.name}" removed`);
      dispatch(fetchCourse(id));
    } catch (err) {
      toast.error(err || 'Failed to remove folder');
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

  const handleShareResource = async () => {
    const shareUrl = window.location.href;
    const shareTitle = currentCourse?.title ? `${currentCourse.title} — OrganizeUp` : 'Course — OrganizeUp';
    const shareText = `Check out "${currentCourse?.title || 'this course'}" on OrganizeUp!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Web Share failed, fallback to copy:', err);
        } else {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Course link copied to clipboard! Anyone opening it can view this course.', { icon: '🔗' });
    } catch {
      toast.error('Failed to copy link to clipboard');
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
            <button
              type="button"
              onClick={handleShareResource}
              className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3 shadow-sm cursor-pointer hover:border-accent/40"
              title="Share this course link"
            >
              <IoShareSocialOutline size={15} />
              <span>Share</span>
            </button>

            {!isOwner && (
              isSavedInLibrary ? (
                <button
                  onClick={handleToggleLibrary}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-400 bg-surface border border-emerald-500/30 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all cursor-pointer group-unsave shadow-sm"
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
                  className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-sm cursor-pointer"
                >
                  <IoBookmarkOutline size={14} />
                  <span>Save to Courses</span>
                </button>
              )
            )}
            {currentCourse.externalUrl && (
              <a
                href={currentCourse.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-semibold shadow-sm"
                title="Open course at external source"
              >
                <IoOpenOutline size={16} /> Open at source
              </a>
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
            {/* Show Import from Drive button only in initial empty course state */}
            {canManage && !hasFiles && !hasFolders && !currentCourse.externalUrl && (
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

      {/* Content: Directory Structure Preserved */}
      {!hasFiles && !hasFolders ? (
        currentCourse.externalUrl ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 sm:p-10 border border-subtle text-center flex flex-col items-center justify-center my-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center mb-4">
              <IoSchoolOutline size={32} />
            </div>
            {currentCourse.category?.name && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-accent-subtle text-accent border border-accent/20 mb-3">
                {currentCourse.category.name}
              </span>
            )}
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-2 max-w-xl font-display">
              {currentCourse.title}
            </h2>
            {currentCourse.description && (
              <p className="text-sm text-secondary max-w-xl mb-6 leading-relaxed whitespace-pre-line">
                {currentCourse.description}
              </p>
            )}
            {currentCourse.seedMeta && (
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                {currentCourse.seedMeta.license && (
                  <span className="px-3 py-1 text-xs rounded-lg bg-surface border border-subtle text-secondary font-medium">
                    ⚖️ {currentCourse.seedMeta.license}
                  </span>
                )}
                {currentCourse.seedMeta.level && (
                  <span className="px-3 py-1 text-xs rounded-lg bg-surface border border-subtle text-secondary font-medium">
                    🎯 {currentCourse.seedMeta.level}
                  </span>
                )}
                {currentCourse.seedMeta.cost && (
                  <span className="px-3 py-1 text-xs rounded-lg bg-surface border border-subtle text-emerald-400 font-medium">
                    🏷️ {currentCourse.seedMeta.cost}
                  </span>
                )}
              </div>
            )}
            <a
              href={currentCourse.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2.5 px-6 py-3 text-sm font-semibold rounded-xl shadow-lg cursor-pointer"
            >
              <span>Open at source</span>
              <IoOpenOutline size={18} />
            </a>
          </motion.div>
        ) : (
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
        )
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 sm:p-6 border border-subtle"
        >
          {/* Header of Content with optional Add Files for manager */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-subtle">
            <div>
              <h3 className="text-base font-semibold text-primary">Course Content</h3>
              <p className="text-xs text-muted">Browse directory folders and lectures below</p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 text-xs text-secondary hover:text-accent font-medium px-2.5 py-1 rounded-lg hover:bg-surface-raised transition-colors cursor-pointer"
                title="Import additional files from Google Drive"
              >
                <IoAddOutline size={16} /> Add Files
              </button>
            )}
          </div>

          {/* Folder tree with collapsible dropdowns */}
          {hasFolders && (
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider px-1 mb-2.5">
                Folders & Modules
              </h4>
              <div className="space-y-1">
                {currentCourse.folders.map((folder, i) => (
                  <FolderTree
                    key={folder.driveFileId || folder._id || i}
                    folder={folder}
                    completedFiles={completedFiles}
                    onToggleComplete={handleToggleComplete}
                    onRemoveFile={handleRemoveFile}
                    onRemoveFolder={handleRemoveFolder}
                    onFileClick={setSelectedFile}
                    canManage={canManage}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Root-level files (flat list) */}
          {hasFiles && (
            <div className={hasFolders ? 'pt-4 border-t border-subtle/60' : ''}>
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider px-1 mb-2.5">
                {hasFolders ? 'Root Files' : 'Files'}
              </h4>
              <div className="space-y-1.5">
                {currentCourse.files.map((file) => {
                  const isDone = completedFiles.includes(file.driveFileId || file._id);
                  return (
                    <CourseFileItem
                      key={file._id || file.driveFileId}
                      file={file}
                      isCompleted={isDone}
                      onToggleComplete={handleToggleComplete}
                      onClick={() => setSelectedFile(file)}
                      onRemove={handleRemoveFile}
                      canManage={canManage}
                    />
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
