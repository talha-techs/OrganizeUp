import { IoDocumentOutline, IoArrowBack, IoOpenOutline } from 'react-icons/io5';

/**
 * Universal file viewer that dynamically renders files based on type.
 * Supports: PDF, HTML, text, image, video, Google Docs/Sheets/Slides, and more.
 *
 * Props:
 * - file: { driveFileId, name, mimeType, fileType, path }
 * - onBack: () => void
 */
const FileViewer = ({ file, onBack }) => {
  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <IoDocumentOutline size={48} className="mb-4" />
        <p>Select a file to view</p>
      </div>
    );
  }

  const drivePreviewUrl = `https://drive.google.com/file/d/${file.driveFileId}/preview`;
  const driveViewUrl = `https://drive.google.com/file/d/${file.driveFileId}/view`;

  const renderContent = () => {
    switch (file.fileType) {
      case 'pdf':
        return (
          <iframe
            src={drivePreviewUrl}
            className="w-full h-full rounded-xl border-0"
            title={file.name}
            allow="autoplay; encrypted-media"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        );

      case 'html':
        return (
          <iframe
            src={drivePreviewUrl}
            className="w-full h-full rounded-xl border-0 bg-white"
            title={file.name}
            sandbox="allow-scripts allow-same-origin"
          />
        );

      case 'text':
        return (
          <iframe
            src={drivePreviewUrl}
            className="w-full h-full rounded-xl border-0"
            title={file.name}
            sandbox="allow-scripts allow-same-origin"
          />
        );

      case 'image':
        return (
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={`https://drive.google.com/uc?export=view&id=${file.driveFileId}`}
              alt={file.name}
              className="max-w-full max-h-full object-contain rounded-xl"
            />
          </div>
        );

      case 'video':
        return (
          <iframe
            src={drivePreviewUrl}
            className="w-full h-full rounded-xl border-0"
            title={file.name}
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        );

      case 'gdoc':
        return (
          <iframe
            src={`https://docs.google.com/document/d/${file.driveFileId}/preview`}
            className="w-full h-full rounded-xl border-0"
            title={file.name}
          />
        );

      case 'gsheet':
        return (
          <iframe
            src={`https://docs.google.com/spreadsheets/d/${file.driveFileId}/preview`}
            className="w-full h-full rounded-xl border-0"
            title={file.name}
          />
        );

      case 'gslides':
        return (
          <iframe
            src={`https://docs.google.com/presentation/d/${file.driveFileId}/preview`}
            className="w-full h-full rounded-xl border-0"
            title={file.name}
          />
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <IoDocumentOutline size={64} className="text-slate-500" />
            <p className="text-slate-400 text-center">
              Preview not available for this file type
            </p>
            <a
              href={driveViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center gap-2"
            >
              <IoOpenOutline size={16} />
              Open in Drive
            </a>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-slate-900/50">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors flex-shrink-0"
            >
              <IoArrowBack size={18} />
            </button>
          )}
          <h3 className="text-sm font-medium text-white truncate">{file.name}</h3>
        </div>

        <a
          href={driveViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors flex-shrink-0"
          title="Open in Drive"
        >
          <IoOpenOutline size={16} />
        </a>
      </div>

      {/* Viewer */}
      <div className="flex-1 min-h-0">
        {renderContent()}
      </div>
    </div>
  );
};

export default FileViewer;
