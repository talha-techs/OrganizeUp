import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoAddOutline,
  IoRemoveOutline,
  IoScanOutline,
  IoMoonOutline,
  IoSunnyOutline,
  IoExpandOutline,
  IoContractOutline,
  IoRefreshOutline,
  IoOpenOutline,
  IoSaveOutline,
  IoAlertCircleOutline,
} from 'react-icons/io5';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// Configure PDF.js worker
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
}

/**
 * Modern In-App PDF Reader
 * Built specifically for seamless PWA, mobile, and desktop reading without external popups.
 */
export default function PdfReader({
  pdfUrl,
  title = 'Book',
  initialPage = 1,
  onPageChange,
  onTotalPages,
  onSaveProgress,
  isSavingProgress = false,
}) {
  const containerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(Math.max(1, parseInt(initialPage) || 1));
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [fitMode, setFitMode] = useState('page'); // 'page' (default fits whole page) | 'width'
  const [isLoading, setIsLoading] = useState(true);
  const [isRendering, setIsRendering] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [nightMode, setNightMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [jumpPageInput, setJumpPageInput] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Sync initial page if changed from outside
  useEffect(() => {
    if (initialPage && initialPage > 0 && initialPage !== currentPage && !isLoading) {
      setCurrentPage(initialPage);
    }
  }, [initialPage]);

  // Load PDF Document
  useEffect(() => {
    if (!pdfUrl) {
      setIsLoading(false);
      setLoadError('No PDF URL provided');
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    const loadPdfData = async () => {
      try {
        let loadingTask;

        // Strip /api prefix if present because api.baseURL already contains /api
        const isRelativeOrApi =
          pdfUrl.startsWith('/') ||
          pdfUrl.startsWith('./') ||
          pdfUrl.includes('/api/books/pdf/') ||
          pdfUrl.includes('/api/');

        if (isRelativeOrApi) {
          try {
            const apiEndpoint = pdfUrl.startsWith('/api/')
              ? pdfUrl.replace(/^\/api/, '')
              : pdfUrl;

            const response = await api.get(apiEndpoint, {
              responseType: 'arraybuffer',
            });
            const data = new Uint8Array(response.data);
            loadingTask = pdfjsLib.getDocument({
              data,
              cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
              cMapPacked: true,
              standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
            });
          } catch (apiErr) {
            console.warn('Axios PDF fetch failed, falling back to direct URL fetch:', apiErr);
            // Fallback to direct URL fetch with credentials
            const fullUrl = pdfUrl.startsWith('/') && !pdfUrl.startsWith('//')
              ? `${window.location.origin}${pdfUrl}`
              : pdfUrl;
            loadingTask = pdfjsLib.getDocument({
              url: fullUrl,
              withCredentials: true,
              cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
              cMapPacked: true,
              standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
            });
          }
        } else {
          // Direct external URL
          loadingTask = pdfjsLib.getDocument({
            url: pdfUrl,
            withCredentials: false,
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
            cMapPacked: true,
            standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
          });
        }

        const doc = await loadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        if (onTotalPages) onTotalPages(doc.numPages);

        const safeInitialPage = Math.min(
          Math.max(1, parseInt(initialPage) || 1),
          doc.numPages
        );
        setCurrentPage(safeInitialPage);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        if (!isMounted) return;
        setLoadError(
          err.message?.includes('Password')
            ? 'This PDF is password protected.'
            : 'Could not load PDF document directly in-app. Check your network or try switching to native embed.'
        );
        setIsLoading(false);
      }
    };

    loadPdfData();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore cancel error
        }
      }
    };
  }, [pdfUrl, reloadKey]);

  // Render Current Page
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || currentPage < 1 || currentPage > totalPages) {
      return;
    }

    try {
      setIsRendering(true);

      // Cancel any ongoing render
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }

      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const containerWidth = containerRef.current?.clientWidth || 0;
      const availableWidth = Math.max(
        260,
        containerWidth > 32 ? containerWidth - 28 : window.innerWidth - 32
      );

      const scrollContainer = scrollContainerRef.current;
      const containerHeight = scrollContainer?.clientHeight || 0;
      const availableHeight = Math.max(
        320,
        containerHeight > 32 ? containerHeight - 32 : window.innerHeight - 200
      );

      // Base unscaled viewport
      const unscaledViewport = page.getViewport({ scale: 1 });

      const widthScale = availableWidth / unscaledViewport.width;
      const heightScale = availableHeight / unscaledViewport.height;

      let effectiveScale = scale;
      if (fitMode === 'page') {
        // Fits whole page comfortably so at 100% default zoom the entire page is visible with no vertical clipping
        const pageScale = Math.min(widthScale, heightScale);
        effectiveScale = pageScale * scale;
      } else {
        // Fit width mode
        effectiveScale = widthScale * scale;
      }

      // Safeguard
      if (effectiveScale <= 0 || isNaN(effectiveScale)) effectiveScale = 1;

      const viewport = page.getViewport({ scale: effectiveScale });
      const context = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;

      // Set physical canvas pixel dimensions (High DPI for crisp text on Retina/OLED mobile)
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);

      // Set CSS display dimensions
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const renderContext = {
        canvasContext: context,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      await renderTask.promise;
      setIsRendering(false);
    } catch (err) {
      // PDF.js throws RenderingCancelledException when page flips before previous render completes
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Page render error:', err);
      }
      setIsRendering(false);
    }
  }, [pdfDoc, currentPage, totalPages, scale, fitMode]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  // Window resize listener to re-fit page
  useEffect(() => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        renderCurrentPage();
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [renderCurrentPage]);

  // Page Navigation Handlers
  const goToPage = useCallback(
    (page) => {
      if (!pdfDoc) return;
      const target = Math.max(1, Math.min(page, totalPages));
      if (target === currentPage) return;

      setCurrentPage(target);
      if (onPageChange) {
        onPageChange(target);
      }
      // Reset scroll position to top of new page
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    },
    [pdfDoc, totalPages, currentPage, onPageChange]
  );

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [goToPage, currentPage]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [goToPage, currentPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Avoid triggering when user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevPage();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        nextPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevPage, nextPage]);

  // Touch Swipe Handlers for Mobile PWA
  const handleTouchStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e) => {
    if (!touchStartXRef.current) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchEndX - touchStartXRef.current;
    const diffY = touchEndY - touchStartYRef.current;

    // Horizontal swipe threshold: at least 50px swipe with minimal vertical drift
    if (Math.abs(diffX) > 50 && Math.abs(diffY) < 60) {
      if (diffX < 0) {
        // Swiped Left -> Next page
        nextPage();
      } else {
        // Swiped Right -> Previous page
        prevPage();
      }
    }

    touchStartXRef.current = 0;
    touchStartYRef.current = 0;
  };

  // Zoom Handlers
  const zoomIn = () => {
    setScale((prev) => Math.min(2.5, +(prev + 0.15).toFixed(2)));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(0.6, +(prev - 0.15).toFixed(2)));
  };

  const resetZoom = () => {
    setScale(1.0);
    setFitMode('page');
  };

  const toggleFitMode = () => {
    setFitMode((prev) => (prev === 'page' ? 'width' : 'page'));
    setScale(1.0);
  };

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPageInput);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      goToPage(pageNum);
      setJumpPageInput('');
    } else {
      toast.error(`Enter page between 1 and ${totalPages}`);
    }
  };

  const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  // Render Error State
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-surface-raised rounded-2xl border border-subtle min-h-[350px] text-center">
        <IoAlertCircleOutline className="text-amber-400 mb-3" size={42} />
        <h4 className="text-primary font-semibold text-base mb-1">Unable to Load PDF In-App</h4>
        <p className="text-muted text-xs sm:text-sm max-w-md mb-5">{loadError}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => {
              setLoadError(null);
              setIsLoading(true);
              setReloadKey((k) => k + 1);
            }}
            className="btn-primary text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <IoRefreshOutline size={16} /> Retry In-App
          </button>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <IoOpenOutline size={16} /> Open External Link
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col w-full bg-surface-raised rounded-2xl border border-subtle overflow-hidden select-none transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none h-screen' : 'min-h-[640px] h-[88vh] lg:h-[calc(100vh-140px)] lg:min-h-[820px]'
      }`}
    >
      {/* Top Header & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-5 sm:py-3 bg-surface/95 backdrop-blur-md border-b border-subtle z-20">
        {/* Left: Book Title & Badge */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse hidden sm:block" />
          <span className="text-xs sm:text-sm font-semibold text-primary truncate max-w-[150px] sm:max-w-[260px] md:max-w-sm">
            {title}
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-accent-subtle text-accent border border-accent/20">
            PDF
          </span>
        </div>

        {/* Center: Page Navigation Indicator */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={prevPage}
            disabled={currentPage <= 1 || isLoading}
            className="p-1.5 sm:p-2 rounded-lg bg-surface border border-subtle text-secondary hover:text-primary hover:border-accent/40 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Previous Page (Left Arrow)"
          >
            <IoChevronBackOutline size={16} />
          </button>

          <form onSubmit={handleJumpSubmit} className="flex items-center gap-1">
            <input
              type="number"
              min="1"
              max={totalPages || 1}
              value={jumpPageInput !== '' ? jumpPageInput : currentPage}
              onFocus={() => setJumpPageInput('')}
              onChange={(e) => setJumpPageInput(e.target.value)}
              onBlur={() => {
                if (jumpPageInput === '') setJumpPageInput('');
              }}
              className="w-12 sm:w-14 px-1 sm:px-2 py-1 text-center text-xs sm:text-sm font-medium bg-canvas border border-subtle rounded-lg text-primary focus:outline-none focus:border-accent"
            />
            <span className="text-xs sm:text-sm text-muted">/ {totalPages || '…'}</span>
          </form>

          <button
            onClick={nextPage}
            disabled={currentPage >= totalPages || isLoading}
            className="p-1.5 sm:p-2 rounded-lg bg-surface border border-subtle text-secondary hover:text-primary hover:border-accent/40 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Next Page (Right Arrow)"
          >
            <IoChevronForwardOutline size={16} />
          </button>

          {/* Reading progress badge */}
          <span className="hidden md:inline-flex text-[11px] font-medium text-accent bg-accent-subtle px-2 py-0.5 rounded-full border border-accent/20">
            {progressPercent}%
          </span>
        </div>

        {/* Right: Zoom & Reader Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Zoom In/Out */}
          <div className="hidden sm:flex items-center bg-surface border border-subtle rounded-lg p-0.5">
            <button
              onClick={zoomOut}
              className="p-1 text-secondary hover:text-primary transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <IoRemoveOutline size={15} />
            </button>
            <button
              onClick={resetZoom}
              className="px-1.5 text-[11px] font-mono text-muted hover:text-primary transition-colors cursor-pointer"
              title="Reset Zoom / Fit Width"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={zoomIn}
              className="p-1 text-secondary hover:text-primary transition-colors cursor-pointer"
              title="Zoom In"
            >
              <IoAddOutline size={15} />
            </button>
          </div>

          {/* Fit Toggle shortcut: Page vs Width */}
          <button
            onClick={toggleFitMode}
            className={`p-1.5 sm:p-2 rounded-lg border transition-colors cursor-pointer ${
              fitMode === 'page'
                ? 'bg-accent/15 text-accent border-accent/30'
                : 'bg-surface border-subtle text-secondary hover:text-primary hover:border-accent/40'
            }`}
            title={fitMode === 'page' ? 'Switch to Fit Width' : 'Switch to Fit Whole Page'}
          >
            <IoScanOutline size={16} />
          </button>

          {/* Night Mode Inversion Toggle */}
          <button
            onClick={() => setNightMode(!nightMode)}
            className={`p-1.5 sm:p-2 rounded-lg border transition-colors cursor-pointer ${
              nightMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-surface border-subtle text-secondary hover:text-primary hover:border-accent/40'
            }`}
            title={nightMode ? 'Day Mode' : 'Night Mode (Invert)'}
          >
            {nightMode ? <IoSunnyOutline size={16} /> : <IoMoonOutline size={16} />}
          </button>

          {/* Save Progress Shortcut Button if handler provided */}
          {onSaveProgress && (
            <button
              onClick={onSaveProgress}
              disabled={isSavingProgress}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent-subtle text-accent hover:bg-accent/20 border border-accent/30 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              title="Save current page progress"
            >
              <IoSaveOutline size={14} />
              <span>{isSavingProgress ? 'Saving…' : 'Save'}</span>
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 sm:p-2 rounded-lg bg-surface border border-subtle text-secondary hover:text-primary hover:border-accent/40 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <IoContractOutline size={16} /> : <IoExpandOutline size={16} />}
          </button>
        </div>
      </div>

      {/* Thin Reading Progress Indicator Bar */}
      <div className="w-full bg-surface h-1 relative overflow-hidden">
        <div
          className="h-full bg-accent transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Canvas Document Area */}
      <div
        ref={scrollContainerRef}
        className="relative flex-1 overflow-auto flex items-start justify-center p-2 sm:p-4 bg-zinc-950/70 custom-scrollbar"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-raised/90 backdrop-blur-xs z-30">
            <div className="w-12 h-12 border-4 border-accent/30 border-t-accent rounded-full animate-spin mb-4" />
            <p className="text-primary text-sm font-semibold">Opening Book In-App…</p>
            <p className="text-muted text-xs mt-1">Preparing high-definition pages</p>
          </div>
        )}

        {/* Rendering Overlay */}
        {isRendering && !isLoading && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-surface/90 border border-subtle px-3 py-1.5 rounded-full backdrop-blur-sm shadow-md animate-fade-in">
            <div className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            <span className="text-[11px] text-secondary font-medium">Rendering…</span>
          </div>
        )}

        {/* PDF Page Canvas */}
        <div
          className={`flex items-center justify-center my-auto transition-transform duration-150 ${
            nightMode ? 'invert brightness-95 contrast-105' : ''
          }`}
          style={{
            maxWidth: '100%',
          }}
        >
          <canvas
            ref={canvasRef}
            className="rounded-lg shadow-2xl bg-white max-w-full block"
          />
        </div>

        {/* Desktop Quick Side Navigation Click Areas */}
        <button
          onClick={prevPage}
          disabled={currentPage <= 1}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-surface/80 hover:bg-surface border border-subtle text-secondary hover:text-primary shadow-lg backdrop-blur-xs hidden md:flex items-center justify-center disabled:opacity-0 transition-opacity cursor-pointer z-10"
          title="Previous Page"
        >
          <IoChevronBackOutline size={20} />
        </button>

        <button
          onClick={nextPage}
          disabled={currentPage >= totalPages}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-surface/80 hover:bg-surface border border-subtle text-secondary hover:text-primary shadow-lg backdrop-blur-xs hidden md:flex items-center justify-center disabled:opacity-0 transition-opacity cursor-pointer z-10"
          title="Next Page"
        >
          <IoChevronForwardOutline size={20} />
        </button>
      </div>

      {/* Floating Bottom Navigation Bar for Mobile PWA */}
      <div className="sm:hidden flex items-center justify-between px-3 py-2 bg-surface/95 backdrop-blur-md border-t border-subtle z-20">
        <button
          onClick={prevPage}
          disabled={currentPage <= 1}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface border border-subtle text-secondary hover:text-primary text-xs font-medium disabled:opacity-30 cursor-pointer"
        >
          <IoChevronBackOutline size={14} />
          <span>Prev</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Quick Slider for Page Scrubbing */}
          <input
            type="range"
            min="1"
            max={totalPages || 1}
            value={currentPage}
            onChange={(e) => goToPage(parseInt(e.target.value))}
            className="w-24 accent-accent h-1.5 rounded-lg bg-surface cursor-pointer"
          />
          <span className="text-[11px] font-mono text-secondary">
            {currentPage}/{totalPages || 1}
          </span>
        </div>

        <button
          onClick={nextPage}
          disabled={currentPage >= totalPages}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface border border-subtle text-secondary hover:text-primary text-xs font-medium disabled:opacity-30 cursor-pointer"
        >
          <span>Next</span>
          <IoChevronForwardOutline size={14} />
        </button>

        {onSaveProgress && (
          <button
            onClick={onSaveProgress}
            disabled={isSavingProgress}
            className="p-2 rounded-xl bg-accent-subtle text-accent border border-accent/30 text-xs font-medium cursor-pointer"
            title="Save reading progress"
          >
            <IoSaveOutline size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
