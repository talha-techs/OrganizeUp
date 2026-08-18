import { useState } from 'react';
import { IoDocumentOutline, IoArrowBack, IoOpenOutline, IoRefreshOutline, IoWarningOutline } from 'react-icons/io5';

/**
 * Universal file viewer that dynamically renders files based on type.
 * Supports: PDF, HTML, text, image, video, Google Docs/Sheets/Slides, and more.
 *
 * Props:
 * - file: { driveFileId, name, mimeType, fileType, path }
 * - onBack: () => void
 */
const FileViewer = ({ file, onBack }) => {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

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
        <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <IoWarningOutline size={32} />
          </div>
          <div className="max-w-md">
            <h4 className="text-base font-semibold text-primary mb-1">Preview Unavailable</h4>
            <p className="text-xs text-secondary mb-4">
              Google Drive preview might be blocked by browser privacy settings or requires direct authorization.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setLoadError(false);
                  setIframeLoading(true);
                }}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <IoRefreshOutline size={14} /> Retry
              </button>
              <a
                href={driveViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <IoOpenOutline size={14} /> Open in Google Drive
              </a>
            </div>
          </div>
        </div>
      );
    }

    switch (file.fileType) {
      case 'pdf':
      case 'video':
      case 'gdoc':
      case 'gsheet':
      case 'gslides':
      case 'html':
      case 'text':
        return (
          <div className="relative w-full h-full">
            {iframeLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/50 backdrop-blur-xs z-10">
                <div className="w-8 h-8 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
                <p className="text-xs text-secondary">Loading preview…</p>
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
              className="w-full h-full rounded-xl border-0 bg-surface"
              title={file.name}
              allow="autoplay; encrypted-media"
              allowFullScreen
              onLoad={() => setIframeLoading(false)}
              onError={() => {
                setIframeLoading(false);
                setLoadError(true);
              }}
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          </div>
        );

      case 'image':
        return (
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={`https://drive.google.com/uc?export=view&id=${file.driveFileId}`}
              alt={file.name}
              className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
              onError={() => setLoadError(true)}
            />
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <IoDocumentOutline size={64} className="text-muted" />
            <p className="text-secondary text-center text-sm">
              Preview not available for this file type
            </p>
            <a
              href={driveViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center gap-2 cursor-pointer text-sm"
            >
              <IoOpenOutline size={16} />
              Open in Drive
            </a>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-canvas">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-subtle bg-surface">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-surface-raised text-secondary hover:text-primary transition-colors flex-shrink-0 cursor-pointer"
            >
              <IoArrowBack size={18} />
            </button>
          )}
          <h3 className="text-sm font-medium text-primary truncate">{file.name}</h3>
        </div>

        <a
          href={driveViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg hover:bg-surface-raised text-secondary hover:text-primary transition-colors flex-shrink-0 cursor-pointer"
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
