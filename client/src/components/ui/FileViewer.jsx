import { useState, useEffect } from 'react';
import {
  IoDocumentOutline,
  IoArrowBack,
  IoOpenOutline,
  IoRefreshOutline,
  IoWarningOutline,
  IoVideocamOutline,
  IoCloseOutline,
  IoCopyOutline,
  IoCheckmarkOutline,
  IoCodeSlashOutline,
  IoTextOutline,
  IoEyeOutline,
} from 'react-icons/io5';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const TEXT_EXTENSIONS = [
  'txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'js', 'jsx', 'ts', 'tsx',
  'py', 'html', 'css', 'scss', 'sql', 'sh', 'bash', 'log', 'env', 'yml',
  'yaml', 'xml', 'c', 'cpp', 'h', 'java', 'rs', 'go', 'php', 'rb'
];

/**
 * Universal file viewer that dynamically renders files based on type.
 * Supports: Text/Code files, Images, PDF, Video, Google Docs/Sheets/Slides, and more.
 */
const FileViewer = ({ file, onBack, onClose }) => {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [imageSrcIndex, setImageSrcIndex] = useState(0);

  // Text / Code File Viewer State
  const [textContent, setTextContent] = useState(null);
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('formatted'); // 'formatted' | 'iframe'
  const [wrapLines, setWrapLines] = useState(true);

  const handleBack = onBack || onClose;

  const fileExt = file?.name?.split('.').pop()?.toLowerCase() || '';
  const isTextLike =
    file?.fileType === 'text' ||
    file?.fileType === 'html' ||
    TEXT_EXTENSIONS.includes(fileExt);

  const drivePreviewUrl = `https://drive.google.com/file/d/${file?.driveFileId}/preview`;
  const driveViewUrl = `https://drive.google.com/file/d/${file?.driveFileId}/view`;

  // Image source fallback list
  const imageSources = [
    `/api/drive/file/${file?.driveFileId}/image`,
    `https://lh3.googleusercontent.com/d/${file?.driveFileId}`,
    `https://drive.google.com/thumbnail?id=${file?.driveFileId}&sz=w2000`,
    `https://drive.google.com/uc?export=view&id=${file?.driveFileId}`,
  ];

  // Fetch text file content when viewing text-like files
  useEffect(() => {
    if (!file?.driveFileId || !isTextLike) return;

    let isMounted = true;
    setTextLoading(true);
    setTextError(false);

    api
      .get(`/drive/file/${file.driveFileId}/content`)
      .then((res) => {
        if (isMounted) {
          setTextContent(res.data.content || '');
          setTextLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Failed to load raw text from backend, falling back to iframe:', err);
          setTextError(true);
          setTextLoading(false);
          setViewMode('iframe');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [file?.driveFileId, isTextLike]);

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted">
        <IoDocumentOutline size={48} className="mb-4" />
        <p>Select a file to view</p>
      </div>
    );
  }

  const handleCopyText = () => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    toast.success('File content copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImageError = () => {
    if (imageSrcIndex < imageSources.length - 1) {
      setImageSrcIndex((prev) => prev + 1);
    } else {
      setLoadError(true);
    }
  };

  const renderContent = () => {
    if (loadError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[450px] p-8 text-center gap-4 bg-surface rounded-2xl border border-subtle">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <IoWarningOutline size={32} />
          </div>
          <div className="max-w-md">
            <h4 className="text-base font-semibold text-primary mb-1">Preview Blocked or Restricted</h4>
            <p className="text-xs text-secondary mb-4">
              Google Drive preview could not be loaded directly. You can open and view it with full permissions on Google Drive.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setLoadError(false);
                  setImageSrcIndex(0);
                  setIframeLoading(true);
                }}
                className="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <IoRefreshOutline size={14} /> Retry Preview
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

    // 1. Text / Code / Markdown Files
    if (isTextLike && viewMode === 'formatted' && !textError) {
      if (textLoading) {
        return (
          <div className="flex flex-col items-center justify-center h-full min-h-[450px] gap-3 bg-surface rounded-2xl border border-subtle">
            <div className="w-9 h-9 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
            <p className="text-xs text-secondary font-medium">Reading file content…</p>
          </div>
        );
      }

      const lines = (textContent || '').split('\n');

      return (
        <div className="flex flex-col h-full min-h-[550px] lg:min-h-[75vh] flex-1 bg-surface rounded-2xl border border-subtle overflow-hidden shadow-xl">
          {/* Text Controls Sub-header */}
          <div className="flex items-center justify-between px-4 py-2 bg-surface-raised border-b border-subtle text-xs text-secondary">
            <div className="flex items-center gap-3">
              <span className="font-mono text-muted">{lines.length} lines</span>
              <span className="text-muted">·</span>
              <span className="font-mono text-muted">{(textContent || '').length} characters</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWrapLines(!wrapLines)}
                className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer text-xs ${
                  wrapLines ? 'bg-accent-subtle text-accent border-accent/20' : 'bg-surface text-secondary border-subtle'
                }`}
              >
                Word Wrap: {wrapLines ? 'On' : 'Off'}
              </button>
              <button
                onClick={handleCopyText}
                className="btn-secondary px-3 py-1 text-xs rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <IoCheckmarkOutline className="text-emerald-400" /> : <IoCopyOutline />}
                {copied ? 'Copied' : 'Copy All'}
              </button>
              <button
                onClick={() => setViewMode('iframe')}
                className="text-secondary hover:text-primary p-1.5 rounded-lg hover:bg-surface transition-colors cursor-pointer"
                title="Switch to Drive Embedded View"
              >
                <IoEyeOutline size={16} />
              </button>
            </div>
          </div>

          {/* Text Content Area with line numbers */}
          <div className="flex-1 overflow-auto p-4 font-mono text-xs sm:text-sm bg-canvas leading-relaxed custom-scrollbar">
            <div className="flex gap-4">
              {/* Line numbers */}
              <div className="select-none text-muted/50 text-right pr-2 border-r border-subtle min-w-[2.5rem]">
                {lines.map((_, idx) => (
                  <div key={idx}>{idx + 1}</div>
                ))}
              </div>
              {/* Code lines */}
              <div className={`flex-1 text-primary ${wrapLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-x-auto'}`}>
                {textContent || <span className="text-muted italic">Empty file</span>}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 2. Images
    if (file.fileType === 'image') {
      return (
        <div className="relative w-full h-full min-h-[500px] lg:min-h-[75vh] flex-1 flex flex-col items-center justify-center p-4 sm:p-8 bg-surface-raised rounded-2xl border border-subtle overflow-hidden">
          <img
            key={imageSrcIndex}
            src={imageSources[imageSrcIndex]}
            alt={file.name}
            className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl transition-all"
            onError={handleImageError}
          />
          <div className="mt-4 flex items-center gap-3">
            <a
              href={driveViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs px-3.5 py-1.5 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
            >
              <IoOpenOutline size={14} /> Full Resolution
            </a>
          </div>
        </div>
      );
    }

    // 3. Videos
    if (file.fileType === 'video') {
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
    }

    // 4. PDFs, Docs, Sheets, Slides, or iframe fallback
    switch (file.fileType) {
      case 'pdf':
      case 'gdoc':
      case 'gsheet':
      case 'gslides':
      case 'html':
      case 'text':
      default:
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
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-accent uppercase tracking-wider">
                {file.fileType === 'video' ? 'Video Player' : file.fileType === 'image' ? 'Image Viewer' : isTextLike ? 'Code & Text Viewer' : file.fileType || 'File'}
              </span>
              {isTextLike && !textError && (
                <button
                  onClick={() => setViewMode(viewMode === 'formatted' ? 'iframe' : 'formatted')}
                  className="text-[11px] text-muted hover:text-accent transition-colors underline cursor-pointer"
                >
                  {viewMode === 'formatted' ? 'Switch to Drive Frame' : 'Switch to Code View'}
                </button>
              )}
            </div>
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
