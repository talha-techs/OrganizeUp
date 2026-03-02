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
} from 'react-icons/io5';
import {
  fetchCourse,
  fetchCategories,
  importToCourse,
  removeFileFromCourse,
  clearCurrentCourse,
} from '../redux/slices/courseSlice';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import DriveImportModal from '../components/forms/DriveImportModal';
import FileViewer from '../components/ui/FileViewer';
import toast from 'react-hot-toast';

const FILE_ICONS = {
  pdf: <IoDocumentOutline size={16} className="text-red-400" />,
  html: <IoCodeSlashOutline size={16} className="text-orange-400" />,
  text: <IoDocumentOutline size={16} className="text-slate-400" />,
  image: <IoImageOutline size={16} className="text-emerald-400" />,
  video: <IoVideocamOutline size={16} className="text-purple-400" />,
  gdoc: <IoDocumentOutline size={16} className="text-blue-400" />,
  gsheet: <IoDocumentOutline size={16} className="text-green-400" />,
  gslides: <IoDocumentOutline size={16} className="text-yellow-400" />,
  other: <IoDocumentOutline size={16} className="text-slate-500" />,
};

const FolderTree = ({ folder, onFileClick, depth = 0 }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 py-2 px-3 w-full rounded-lg hover:bg-white/5 transition-colors"
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {expanded ? <IoChevronDown size={12} /> : <IoChevronForward size={12} />}
        <IoFolderOutline size={16} className="text-cyan-400" />
        <span className="text-sm font-medium text-white">{folder.name}</span>
        <span className="text-xs text-slate-500 ml-auto">{folder.files?.length || 0} files</span>
      </button>

      {expanded && (
        <div>
          {folder.files?.map((file) => (
            <button
              key={file._id || file.driveFileId}
              onClick={() => onFileClick(file)}
              className="flex items-center gap-2 py-2 px-3 w-full rounded-lg hover:bg-white/5 transition-colors"
              style={{ paddingLeft: `${(depth + 1) * 16 + 24}px` }}
            >
              {FILE_ICONS[file.fileType] || FILE_ICONS.other}
              <span className="text-sm text-slate-300 truncate">{file.name}</span>
            </button>
          ))}

          {folder.subfolders?.map((sub, i) => (
            <FolderTree
              key={sub.driveFileId || i}
              folder={sub}
              onFileClick={onFileClick}
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
  const { currentCourse, isLoading, categories } = useSelector((state) => state.courses);
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  const [showImport, setShowImport] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    dispatch(fetchCourse(id));
    dispatch(fetchCategories());
    return () => {
      dispatch(clearCurrentCourse());
    };
  }, [dispatch, id]);

  const isOwner =
    !!(user?._id && currentCourse?.addedBy &&
      String(currentCourse.addedBy?._id ?? currentCourse.addedBy) === String(user._id));
  const canManage = isAdmin || isOwner;

  const handleImport = async (data) => {
    const result = await dispatch(
      importToCourse({
        courseId: id,
        importData: data,
      }),
    );
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success(result.payload.message || 'Files imported');
    } else {
      toast.error(result.payload || 'Import failed');
      throw new Error('Import failed');
    }
  };

  const handleRemoveFile = async (fileId) => {
    if (!window.confirm('Remove this file?')) return;
    const result = await dispatch(removeFileFromCourse({ courseId: id, fileId }));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('File removed');
      if (selectedFile?._id === fileId) setSelectedFile(null);
    }
  };

  if (isLoading || !currentCourse) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <LoadingSpinner text="Loading course..." />
      </div>
    );
  }

  // If a file is selected, show the file viewer full screen
  if (selectedFile) {
    return (
      <div className="h-[calc(100vh-64px)] flex flex-col">
        <FileViewer file={selectedFile} onBack={() => setSelectedFile(null)} />
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
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4 transition-colors"
        >
          <IoArrowBack size={14} /> All Courses
        </button>

        {/* Banner image */}
        {currentCourse.bannerImage && (
          <div className="w-full h-48 rounded-2xl overflow-hidden mb-6">
            <img
              src={currentCourse.bannerImage}
              alt={currentCourse.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white font-display">
              {currentCourse.title}
            </h1>
            {currentCourse.category?.name && (
              <span className="inline-block mt-2 px-3 py-1 text-xs font-medium rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {currentCourse.category.name}
              </span>
            )}
            {currentCourse.description && (
              <p className="text-slate-400 text-sm mt-2">{currentCourse.description}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              {currentCourse.files?.length || 0} files
              {currentCourse.addedBy?.name && ` · by ${currentCourse.addedBy.name}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {currentCourse.driveLink && (
              <a
                href={currentCourse.driveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center gap-2"
              >
                <IoOpenOutline size={16} /> Open in Drive
              </a>
            )}
            {canManage && (
              <button
                onClick={() => setShowImport(true)}
                className="btn-primary flex items-center gap-2"
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
          <IoSchoolOutline className="mx-auto text-slate-600 mb-4" size={48} />
          <h3 className="text-lg font-medium text-slate-400 mb-2">No files yet</h3>
          <p className="text-sm text-slate-500 mb-4">Import content from Google Drive to get started</p>
          {canManage && (
            <button
              onClick={() => setShowImport(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <IoCloudDownloadOutline size={18} /> Import from Drive
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4"
        >
          {/* Folder tree */}
          {hasFolders && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-slate-300 px-3 mb-2">Folders</h4>
              {currentCourse.folders.map((folder, i) => (
                <FolderTree
                  key={folder.driveFileId || i}
                  folder={folder}
                  onFileClick={setSelectedFile}
                />
              ))}
            </div>
          )}

          {/* Root-level files (flat list) */}
          {hasFiles && (
            <div>
              <h4 className="text-sm font-medium text-slate-300 px-3 mb-2">
                {hasFolders ? 'All Files' : 'Files'}
              </h4>
              <div className="space-y-0.5">
                {currentCourse.files.map((file) => (
                  <div
                    key={file._id}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer"
                    onClick={() => setSelectedFile(file)}
                  >
                    {FILE_ICONS[file.fileType] || FILE_ICONS.other}
                    <span className="text-sm text-white truncate flex-1">{file.name}</span>
                    {file.path && file.path.includes('/') && (
                      <span className="text-xs text-slate-600 truncate max-w-[200px]">{file.path}</span>
                    )}
                    {file.size && (
                      <span className="text-xs text-slate-600">
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
                        className="p-1 rounded hover:bg-red-500/10 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <IoTrashOutline size={14} />
                      </button>
                    )}
                  </div>
                ))}
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
