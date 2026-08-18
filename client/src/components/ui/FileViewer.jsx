import { useState } from 'react';
import {
  IoDocumentOutline,
  IoArrowBack,
  IoOpenOutline,
  IoRefreshOutline,
  IoWarningOutline,
  IoVideocamOutline,
  IoCloseOutline,
} from 'react-icons/io5';

/**
 * Universal file viewer that dynamically renders files based on type.
 * Supports: PDF, HTML, text, image, video, Google Docs/Sheets/Slides, and more.
 *
 * Props:
 * - file: { driveFileId, name, mimeType, fileType, path }
 * - onBack: () => void
 * - onClose: () => void
 */
const FileViewer = ({ file, onBack, onClose }) => {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const handleBack = onBack || onClose;

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted">
        <IoDocumentOutline size={48} className="mb-4" />
        <p>Select a file to view</p>
      </div>
    );
  }

  const drivePreviewUrl = `https://drive.google.com/file/d/${file.driveFileId}/preview`;
  const driveViewUrl = `https://drive.google.com/file/d/${file.driveFileId}/view`;

  const renderContent = () => {
    if (loadError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center gap-4 bg-surface rounded-2xl border border-subtle">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <IoWarningOutline size={32} />
          </div>
          <div className="max-w-md">
            <h4 className="text-base font-semibold text-primary mb-1">Preview Unavailable</h4>
            <p className="text-xs text-secondary mb-4">
              Google Drive preview might be blocked by browser third-party cookie restrictions or requires direct permission.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setLoadError(false);
                  setIframeLoading(true);
                }}
                className="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <IoRefreshOutline size={14} /> Retry
              </button>
              <a
                href={driveViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <IoOpenOutline size={14} /> Open in Google Drive
              </a>
            </div>
          </div>
        </div>
      );
    }

    switch (file.fileType) {
      case 'video':
        return (
          <div className="relative w-full h-full min-h-[550px] lg:min-h-[75vh] flex-1 bg-black rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center border border-subtle">
            {iframeLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 backdrop-blur-sm z-10 text-white">
                <div className="w-10 h-10 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
                <p className="text-xs text-zinc-400 font-medium">Loading video player…</p>
              </div>
            )}
            <iframe
              src={drivePreviewUrl}
              className="w-full h-full min-h-[550px] lg:min-h-[75vh] border-0 bg-black"
              title={file.name}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              onLoad={() => setIframeLoading(false)}
              onError={() => {
                setIframeLoading(false);
                setLoadError(true);
              }}
            />
          </div>
        );

      case 'pdf':
      case 'gdoc':
      case 'gsheet':
      case 'gslides':
      case 'html':
      case 'text':
        return (
          <div className="relative w-full h-full min-h-[550px] lg:min-h-[75vh] flex-1 rounded-2xl overflow-hidden border border-subtle bg-surface shadow-xl">
            {iframeLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/80 backdrop-blur-xs z-10">
                <div className="w-10 h-10 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
                <p className="text-xs text-secondary font-medium">Loading document preview…</p>
              </div>
            )}
            <iframe
              src={
                file.fileType === 'gdoc'
                  ? `https://docs.google.com/document/d/${file.driveFileId}/preview`
                  : file.fileType === 'gsheet'
                  ? `https://docs.google.com/spreadsheets/d/${file.driveFileId}/preview`
                  : file.fileType === 'gslides'
                  ? `https://docs.google.com/presentation/d/${file.driveFileId}/preview`
                  : drivePreviewUrl
              }
              className="w-full h-full min-h-[550px] lg:min-h-[75vh] border-0 bg-surface"
              title={file.name}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              onLoad={() => setIframeLoading(false)}
              onError={() => {
                setIframeLoading(false);
                setLoadError(true);
              }}
            />
          </div>
        );

      case 'image':
        return (
          <div className="w-full h-full min-h-[450px] flex items-center justify-center p-6 bg-surface-raised rounded-2xl border border-subtle">
            <img
              src={`https://drive.google.com/uc?export=view&id=${file.driveFileId}`}
              alt={file.name}
              className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl"
              onError={() => setLoadError(true)}
            />
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 p-8 bg-surface rounded-2xl border border-subtle text-center">
            <IoDocumentOutline size={64} className="text-muted" />
            <p className="text-secondary text-sm max-w-sm">
              In-app preview is not available for this file format. You can view or download it directly on Google Drive.
            </p>
            <a
              href={driveViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center gap-2 cursor-pointer text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-accent/20"
            >
              <IoOpenOutline size={16} /> Open in Google Drive
            </a>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[600px] bg-canvas rounded-2xl overflow-hidden border border-subtle shadow-2xl">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-subtle bg-surface/90 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          {handleBack && (
            <button
              onClick={handleBack}
              className="p-2 rounded-xl bg-surface-raised hover:bg-accent-subtle hover:text-accent text-secondary transition-all flex-shrink-0 cursor-pointer border border-subtle flex items-center gap-1.5 text-xs font-medium"
              title="Back"
            >
              <IoArrowBack size={16} /> <span className="hidden sm:inline">Back</span>
            </button>
          )}
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-primary truncate">{file.name}</h3>
            {file.fileType && (
              <span className="text-[11px] font-medium text-accent uppercase tracking-wider">
                {file.fileType === 'video' ? 'Video Player' : file.fileType}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={driveViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
            title="Open in Google Drive"
          >
            <IoOpenOutline size={15} /> <span className="hidden sm:inline">Open in Drive</span>
          </a>
          {handleBack && (
            <button
              onClick={handleBack}
              className="p-2 rounded-xl hover:bg-surface-raised text-muted hover:text-primary transition-colors cursor-pointer"
              title="Close"
            >
              <IoCloseOutline size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Viewer Content Area */}
      <div className="flex-1 min-h-0 p-3 sm:p-5 flex flex-col">
        {renderContent()}
      </div>
    </div>
  );
};

export default FileViewer;
