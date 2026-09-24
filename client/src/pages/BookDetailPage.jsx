import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoArrowBack,
  IoPlayCircle,
  IoPauseCircle,
  IoCheckmarkCircle,
  IoBookOutline,
  IoSaveOutline,
  IoMusicalNote,
  IoPlaySkipBack,
  IoPlaySkipForward,
  IoVolumeMediumOutline,
  IoTrashOutline,
  IoBookmark,
  IoBookmarkOutline,
  IoCloseOutline,
  IoCreateOutline,
  IoDocumentTextOutline,
  IoClipboardOutline,
  IoDownloadOutline,
  IoListOutline,
  IoTimeOutline,
  IoCodeSlashOutline,
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoOpenOutline,
  IoPlayCircleOutline,
  IoFilmOutline,
  IoRefreshOutline,
  IoContractOutline,
  IoExpandOutline,
} from 'react-icons/io5';
import {
  fetchBook,
  fetchBookProgress,
  updateVideoProgress,
  updateReadingProgress,
  clearCurrentBook,
  removeAudioFromBook,
  deleteBook,
  fetchCombinedBookNotes,
  clearCombinedBookNotes,
} from '../redux/slices/bookSlice';
import { addToLibrary, removeFromLibrary } from '../redux/slices/librarySlice';
import { getMe } from '../redux/slices/authSlice';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ProgressBar from '../components/ui/ProgressBar';
import Modal from '../components/ui/Modal';
import PdfReader from '../components/books/PdfReader';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';

const BookDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentBook, isLoading, combinedNotes, isSavingNotes } = useSelector(
    (state) => state.books,
  );
  const { user } = useSelector((state) => state.auth);
  useDocumentTitle(currentBook?.title || 'Book');

  const [selectedVideo, setSelectedVideo] = useState(0);
  const [localNotes, setLocalNotes] = useState('');
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [showCombinedNotes, setShowCombinedNotes] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [note, setNote] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [completedVideoIndex, setCompletedVideoIndex] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [useNativeEmbed, setUseNativeEmbed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Resizable panes state for Video Book
  const [videoWidth, setVideoWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('video_book_pane_video_width');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 25 && parsed <= 65) return parsed;
      }
    } catch (_) {}
    return 46; // default 46% video
  });

  const [listWidth, setListWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('video_book_pane_list_width');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 16 && parsed <= 35) return parsed;
      }
    } catch (_) {}
    return 24; // default 24% list
  });

  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const [isListCollapsed, setIsListCollapsed] = useState(false);
  const [isNotesCollapsed, setIsNotesCollapsed] = useState(false);
  const [mobileTab, setMobileTab] = useState('notes'); // 'notes' | 'chapters'
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' && window.innerWidth >= 1024,
  );

  const isDragging = isDraggingLeft || isDraggingRight;

  const saveTimeoutRef = useRef(null);
  const notesTextareaRef = useRef(null);
  const cockpitRef = useRef(null);

  // Audio player state
  const audioRef = useRef(null);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioVolume, setAudioVolume] = useState(1);

  // Waveform bar heights (decorative)
  const BAR_HEIGHTS = [4,8,14,22,28,20,12,6,10,18,28,32,24,16,8,6,10,20,30,26,18,12,6,8,16,24,30,22,14,8];

  const fmtTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const totalSecs = Math.floor(s);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    dispatch(fetchBook(id));
  }, [dispatch, id]);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save pane widths to localStorage when not dragging
  useEffect(() => {
    if (!isDragging) {
      try {
        localStorage.setItem('video_book_pane_video_width', String(videoWidth));
        localStorage.setItem('video_book_pane_list_width', String(listWidth));
      } catch (_) {}
    }
  }, [videoWidth, listWidth, isDragging]);

  // Wire up audio element events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setAudioDuration(isFinite(audio.duration) ? audio.duration : 0);
    const onEnded = () => {
      const tracks = currentBook?.audioFiles || [];
      if (currentTrackIdx < tracks.length - 1) {
        setCurrentTrackIdx((i) => i + 1);
      } else {
        setIsPlaying(false);
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [currentBook, currentTrackIdx]);

  // Load new track when index changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentBook?.audioFiles?.length) return;
    const track = currentBook.audioFiles[currentTrackIdx];
    if (!track?.fileId && !track?.audioUrl) return;
    const wasPlaying = isPlaying;
    audio.src = track.audioUrl || `/api/books/audio/${track.fileId}`;
    audio.load();
    setCurrentTime(0);
    setAudioDuration(0);
    if (wasPlaying) audio.play().catch(() => setIsPlaying(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrackIdx, currentBook]);

  // Dynamically update document title when playing audio
  useEffect(() => {
    if (!currentBook) return;
    if (currentBook.type === 'audio' && isPlaying) {
      const track = currentBook.audioFiles?.[currentTrackIdx];
      const trackName = track?.title ? ` · ${track.title}` : '';
      document.title = `▶ ${currentBook.title}${trackName} | OrganizeUp`;
    } else {
      document.title = `${currentBook.title} | OrganizeUp`;
    }
  }, [currentBook, isPlaying, currentTrackIdx]);

  const playTrack = (idx) => {
    if (idx === currentTrackIdx) {
      const audio = audioRef.current;
      if (!audio) return;
      if (isPlaying) audio.pause();
      else audio.play().catch(() => {});
    } else {
      setCurrentTrackIdx(idx);
      setIsPlaying(true);
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play().catch(() => setIsPlaying(false));
  };

  const handleSeek = (e) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = val;
    setCurrentTime(val);
  };

  const handleVolume = (e) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) audioRef.current.volume = val;
    setAudioVolume(val);
  };

  const handleRemoveAudio = async (audioId) => {
    const audio = audioRef.current;
    if (audio) { audio.pause(); setIsPlaying(false); }
    const result = await dispatch(removeAudioFromBook({ bookId: id, audioId }));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Track removed');
      setCurrentTrackIdx(0);
    } else {
      toast.error(result.payload || 'Failed to remove track');
    }
  };

  useEffect(() => {
    dispatch(fetchBookProgress(id));
    return () => {
      dispatch(clearCurrentBook());
      dispatch(clearCombinedBookNotes());
    };
  }, [id, dispatch]);

  // Sync reading progress from user data
  useEffect(() => {
    const rp = user?.readingProgress?.find(
      (rp) => rp.bookId === id || String(rp.bookId?._id || rp.bookId) === String(id)
    );
    if (rp) {
      setCurrentPage(rp.currentPage || 1);
      setTotalPages(rp.totalPages || currentBook?.totalPages || 0);
    } else if (currentBook?.totalPages) {
      setTotalPages(currentBook.totalPages);
    }
  }, [user, id, currentBook]);

  const getVideoProgress = useCallback((videoIndex) => {
    return user?.videoProgress?.find(
      (vp) =>
        (vp.bookId === id || String(vp.bookId?._id || vp.bookId) === String(id)) &&
        vp.videoIndex === videoIndex
    );
  }, [user?.videoProgress, id]);

  // Sync active note when selected video changes or user data loads
  useEffect(() => {
    const existing = getVideoProgress(selectedVideo);
    const existingNote = existing?.note || '';
    setLocalNotes(existingNote);
    setCurrentNote(existingNote);
  }, [selectedVideo, getVideoProgress]);

  // Save notes for current active video
  const handleSaveNotes = useCallback(async (customNotes) => {
    const noteToSave = customNotes !== undefined ? customNotes : localNotes;
    const existing = getVideoProgress(selectedVideo);
    const videoItem = currentBook?.videos?.[selectedVideo];
    const videoTitle = videoItem?.title || `Video ${selectedVideo + 1}`;

    const result = await dispatch(
      updateVideoProgress({
        bookId: id,
        progressData: {
          videoIndex: selectedVideo,
          title: videoTitle,
          progress: existing?.progress || 0,
          completed: !!existing?.completed,
          note: noteToSave,
        },
      })
    );
    if (result.meta.requestStatus === 'fulfilled') {
      setLastSavedTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      dispatch(getMe());
      toast.success('Notes saved to your study log');
    }
  }, [dispatch, id, selectedVideo, localNotes, currentBook, getVideoProgress]);

  // Ctrl+S / Cmd+S shortcut to save notes
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveNotes();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveNotes]);

  // Debounced auto-save (3 seconds of inactivity)
  const handleNotesChange = (e) => {
    const val = e.target.value;
    setLocalNotes(val);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const existing = getVideoProgress(selectedVideo);
      const videoItem = currentBook?.videos?.[selectedVideo];
      const videoTitle = videoItem?.title || `Video ${selectedVideo + 1}`;

      await dispatch(
        updateVideoProgress({
          bookId: id,
          progressData: {
            videoIndex: selectedVideo,
            title: videoTitle,
            progress: existing?.progress || 0,
            completed: !!existing?.completed,
            note: val,
          },
        })
      );
      setLastSavedTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      dispatch(getMe());
    }, 3000);
  };

  // Switch video with auto-saving previous video notes if modified
  const handleSelectVideo = useCallback(
    async (newIndex) => {
      if (newIndex === selectedVideo) return;

      const currentSaved = getVideoProgress(selectedVideo)?.note || '';
      if (localNotes !== currentSaved) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        const existing = getVideoProgress(selectedVideo);
        const videoItem = currentBook?.videos?.[selectedVideo];
        const videoTitle = videoItem?.title || `Video ${selectedVideo + 1}`;

        await dispatch(
          updateVideoProgress({
            bookId: id,
            progressData: {
              videoIndex: selectedVideo,
              title: videoTitle,
              progress: existing?.progress || 0,
              completed: !!existing?.completed,
              note: localNotes,
            },
          })
        );
        dispatch(getMe());
      }

      setSelectedVideo(newIndex);
      const nextSaved = getVideoProgress(newIndex)?.note || '';
      setLocalNotes(nextSaved);
    },
    [selectedVideo, localNotes, getVideoProgress, currentBook, dispatch, id]
  );

  const handleInsertSnippet = (snippet) => {
    const textarea = notesTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = localNotes;
    const updated = current.substring(0, start) + snippet + current.substring(end);
    setLocalNotes(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 0);
  };

  // Toggle completed state for a video
  const handleToggleVideoComplete = useCallback(
    async (videoIndex, e) => {
      if (e) e.stopPropagation();
      const targetIndex = videoIndex !== undefined ? videoIndex : selectedVideo;
      const existing = getVideoProgress(targetIndex);
      const isCompleted = Boolean(existing?.completed);
      const videoItem = currentBook?.videos?.[targetIndex];
      const videoTitle = videoItem?.title || `Video ${targetIndex + 1}`;

      await dispatch(
        updateVideoProgress({
          bookId: id,
          progressData: {
            videoIndex: targetIndex,
            title: videoTitle,
            progress: !isCompleted ? 100 : 0,
            completed: !isCompleted,
            note: targetIndex === selectedVideo ? localNotes : (existing?.note || ''),
          },
        })
      );
      dispatch(getMe());
      toast.success(!isCompleted ? 'Video completed!' : 'Marked as unwatched');
    },
    [dispatch, id, selectedVideo, localNotes, currentBook, getVideoProgress]
  );

  // Combined Notes helper & actions
  const getCompiledNotesText = useCallback(() => {
    if (combinedNotes) return combinedNotes;
    const videos = currentBook?.videos || [];
    const sections = [];
    videos.forEach((v, idx) => {
      const prog = getVideoProgress(idx);
      const noteText = (idx === selectedVideo ? localNotes : prog?.note)?.trim();
      if (noteText) {
        sections.push(`## ${idx + 1}. ${v.title || `Video ${idx + 1}`}\n\n${noteText}`);
      }
    });
    return sections.length > 0
      ? `# ${currentBook?.title || 'Book'} — Study Notes\n\n${sections.join('\n\n---\n\n')}`
      : '';
  }, [combinedNotes, currentBook, getVideoProgress, selectedVideo, localNotes]);

  const handleShowCombinedNotes = () => {
    if (!showCombinedNotes) {
      dispatch(fetchCombinedBookNotes(id));
    }
    setShowCombinedNotes(!showCombinedNotes);
  };

  const handleCopyCombinedNotes = () => {
    const text = getCompiledNotesText();
    if (!text) {
      toast.error('No notes available to copy');
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success('All combined notes copied to clipboard');
  };

  const handleDownloadCombinedNotes = () => {
    const text = getCompiledNotesText();
    if (!text) {
      toast.error('No notes available to download');
      return;
    }
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (currentBook?.title || 'study-notes')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    a.download = `${safeTitle}-all-notes.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded all combined notes as .md');
  };

  const handleCopyCurrentNote = () => {
    if (!localNotes.trim()) {
      toast.error('No notes written for this video yet');
      return;
    }
    navigator.clipboard.writeText(localNotes);
    toast.success('Current video notes copied');
  };

  const handleDownloadCurrentNote = () => {
    if (!localNotes.trim()) {
      toast.error('No notes written for this video yet');
      return;
    }
    const blob = new Blob([localNotes], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const curTitle = currentBook?.videos?.[selectedVideo]?.title || `video-${selectedVideo + 1}`;
    const safeTitle = `${currentBook?.title || 'book'}-${curTitle}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    a.download = `${safeTitle}-note.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded notes as .md');
  };

  const handleResetPanes = () => {
    setVideoWidth(46);
    setListWidth(24);
    setIsListCollapsed(false);
    setIsNotesCollapsed(false);
    toast.success('Reset panes to default 46% : 30% : 24% layout');
  };

  // Draggable Resizer 1 (Between Video and Notes)
  const startResizingLeft = useCallback((mouseDownEvent) => {
    mouseDownEvent.preventDefault();
    setIsDraggingLeft(true);

    const handleMouseMove = (mouseMoveEvent) => {
      if (!cockpitRef.current) return;
      const rect = cockpitRef.current.getBoundingClientRect();
      const currentListW = isListCollapsed ? 0 : listWidth;
      const mouseOffset = mouseMoveEvent.clientX - rect.left;
      const newVideoWidthPercent = (mouseOffset / rect.width) * 100;
      const maxVideoW = 100 - currentListW - 20;
      const clamped = Math.max(26, Math.min(maxVideoW, newVideoWidthPercent));
      setVideoWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [isListCollapsed, listWidth]);

  // Draggable Resizer 2 (Between Notes and Video List)
  const startResizingRight = useCallback((mouseDownEvent) => {
    mouseDownEvent.preventDefault();
    setIsDraggingRight(true);

    const handleMouseMove = (mouseMoveEvent) => {
      if (!cockpitRef.current) return;
      const rect = cockpitRef.current.getBoundingClientRect();
      const currentVideoW = isNotesCollapsed ? 100 - listWidth : videoWidth;
      const rightDistance = rect.right - mouseMoveEvent.clientX;
      const newListWidthPercent = (rightDistance / rect.width) * 100;
      const maxListW = Math.min(38, 100 - currentVideoW - 20);
      const clamped = Math.max(16, Math.min(maxListW, newListWidthPercent));
      setListWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsDraggingRight(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [isNotesCollapsed, videoWidth]);

  // Helper to render links in description text
  const renderDescriptionWithLinks = useCallback((text) => {
    if (!text || typeof text !== 'string') return null;
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        const href = part.startsWith('http') ? part : `https://${part}`;
        return (
          <a
            key={`link-${index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-accent hover:underline underline-offset-2 break-all transition-colors inline-flex items-center gap-0.5 font-medium"
          >
            {part}
            <IoOpenOutline size={11} className="inline opacity-80" />
          </a>
        );
      }
      return part;
    });
  }, []);

  // Audio notes save handler
  const handleSaveNote = async () => {
    setIsSavingNote(true);
    const existing = getVideoProgress(selectedVideo);
    await dispatch(
      updateVideoProgress({
        bookId: id,
        progressData: {
          videoIndex: selectedVideo,
          progress: existing?.progress || 0,
          completed: !!existing?.completed,
          note: currentNote,
        },
      })
    );
    dispatch(getMe());
    setIsSavingNote(false);
    toast.success('Notes saved!');
  };

  const handleVideoEnd = (videoIndex) => {
    setCompletedVideoIndex(videoIndex);
    setShowNoteModal(true);
  };

  const handleNoteSubmit = async () => {
    await dispatch(
      updateVideoProgress({
        bookId: id,
        progressData: {
          videoIndex: completedVideoIndex,
          progress: 100,
          completed: true,
          note,
        },
      })
    );
    dispatch(getMe());
    toast.success('Progress saved!');
    setShowNoteModal(false);
    setNote('');
    setCompletedVideoIndex(null);
  };

  const handleVideoProgress = (videoIndex, progress) => {
    const existing = getVideoProgress(videoIndex);
    dispatch(
      updateVideoProgress({
        bookId: id,
        progressData: {
          videoIndex,
          progress,
          ...(existing?.completed ? { completed: true } : {}),
        },
      })
    );
  };

  const handleSaveReadingProgress = useCallback(async () => {
    if (totalPages <= 0) {
      toast.error('Please set total pages first');
      return;
    }
    const page = Math.max(1, Math.min(currentPage, totalPages));
    const progress = Math.round((page / totalPages) * 100);
    await dispatch(
      updateReadingProgress({
        bookId: id,
        progressData: { currentPage: page, totalPages, progress },
      })
    );
    dispatch(getMe());
    toast.success(`Progress saved: Page ${page}/${totalPages} (${progress}%)`);
  }, [currentPage, totalPages, id, dispatch]);

  if (isLoading || !currentBook) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <LoadingSpinner text="Loading book..." />
      </div>
    );
  }

  const isVideoBook = currentBook.type === 'video' || currentBook.type === 'youtube';
  const isTextBook = currentBook.type === 'text';
  const isAudioBook = currentBook.type === 'audio';
  const isAdmin = user?.role === 'admin';
  const isOwner = user?._id && String(currentBook.addedBy?._id || currentBook.addedBy) === String(user._id);
  const isSavedInLibrary = Boolean(currentBook.isSaved);

  const completedVideosCount = (currentBook?.videos || []).filter(
    (_, idx) => getVideoProgress(idx)?.completed,
  ).length;
  const totalVideos = currentBook?.videos?.length || 0;
  const overallProgressPercent =
    totalVideos > 0 ? Math.round((completedVideosCount / totalVideos) * 100) : 0;
  const isCurrentVideoCompleted = Boolean(getVideoProgress(selectedVideo)?.completed);
  const activeVideo = currentBook?.videos?.[selectedVideo];
  const hasPrevVideo = selectedVideo > 0;
  const hasNextVideo = totalVideos > 0 && selectedVideo < totalVideos - 1;

  // Calculate desktop layout effective pane widths
  let effectiveVideoWidth = videoWidth;
  let effectiveListWidth = listWidth;
  let effectiveNotesWidth = Math.max(20, 100 - videoWidth - listWidth);

  if (isListCollapsed && isNotesCollapsed) {
    effectiveVideoWidth = 100;
    effectiveNotesWidth = 0;
    effectiveListWidth = 0;
  } else if (isListCollapsed) {
    effectiveVideoWidth = Math.max(30, Math.min(75, videoWidth + Math.round(listWidth * 0.5)));
    effectiveNotesWidth = 100 - effectiveVideoWidth;
    effectiveListWidth = 0;
  } else if (isNotesCollapsed) {
    effectiveVideoWidth = 100 - listWidth;
    effectiveNotesWidth = 0;
    effectiveListWidth = listWidth;
  }

  const handleToggleLibrary = async () => {
    if (isSavedInLibrary) {
      const isYt = currentBook.type === 'youtube' || currentBook.source === 'youtube';
      const result = await dispatch(removeFromLibrary(id));
      if (isYt && isOwner) {
        await dispatch(deleteBook(id));
      }
      if (result.meta.requestStatus === 'fulfilled' || isYt) {
        toast.success('Removed from your books');
        if (isYt) {
          navigate('/books');
          return;
        }
        dispatch(fetchBook(id));
      } else {
        toast.error(result.payload || 'Failed to remove from library');
      }
    } else {
      const result = await dispatch(addToLibrary({ contentType: 'book', contentId: id }));
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('Saved to your books!');
        dispatch(fetchBook(id));
      } else {
        toast.error(result.payload || 'Failed to save to library');
      }
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate('/books')}
        className="flex items-center gap-2 text-secondary hover:text-primary transition-colors cursor-pointer text-xs sm:text-sm"
      >
        <IoArrowBack size={16} /> Back to Books
      </motion.button>

      {/* Book Title & Actions */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-subtle pb-5"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent/10 text-accent border border-accent/20 flex items-center gap-1.5">
              <IoFilmOutline size={13} />
              {currentBook.type === 'video' ? 'Video Book' : currentBook.type === 'youtube' ? 'YouTube Course' : 'Book'}
            </span>

            {isVideoBook && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface text-secondary border border-subtle flex items-center gap-1">
                {completedVideosCount} / {totalVideos} completed ({overallProgressPercent}%)
              </span>
            )}

            {isVideoBook && isCurrentVideoCompleted && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <IoCheckmarkCircle size={13} /> Current Episode Completed
              </span>
            )}

            {isVideoBook && activeVideo?.duration && (
              <span className="text-xs text-muted flex items-center gap-1">
                <IoTimeOutline size={13} /> {activeVideo.duration}
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary font-display leading-tight">
            {currentBook.title}
          </h1>
          <p className="text-accent text-xs sm:text-sm font-medium">{currentBook.author}</p>

          {/* Overall progress bar for video books */}
          {isVideoBook && totalVideos > 0 && (
            <div className="pt-1 max-w-md">
              <div className="w-full h-1.5 rounded-full bg-surface border border-subtle overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, overallProgressPercent))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0 self-start sm:self-auto">
          {isVideoBook && (
            <button
              type="button"
              onClick={handleShowCombinedNotes}
              className={`btn-secondary flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer shadow-sm ${
                showCombinedNotes ? 'ring-1 ring-accent' : ''
              }`}
              title="View all combined notes across chapters"
            >
              <IoDocumentTextOutline size={15} />
              <span>All Notes</span>
            </button>
          )}

          {isVideoBook && isDesktop && (
            <button
              type="button"
              onClick={handleResetPanes}
              className="btn-secondary hidden lg:flex items-center gap-1 text-xs cursor-pointer px-2.5 py-2"
              title="Reset adjustable pane widths to default (46% : 30% : 24%)"
            >
              <IoRefreshOutline size={14} />
              <span>Reset Panes</span>
            </button>
          )}

          {!isOwner && (
            <div>
              {isSavedInLibrary ? (
                <button
                  onClick={handleToggleLibrary}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 bg-surface border border-emerald-500/30 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all cursor-pointer group/unsave shadow-sm"
                  title="Click to unsave from your books"
                >
                  <IoBookmark className="group-hover/unsave:hidden text-emerald-400" size={14} />
                  <IoCloseOutline className="hidden group-hover/unsave:inline text-red-400" size={15} />
                  <span className="group-hover/unsave:hidden">Saved</span>
                  <span className="hidden group-hover/unsave:inline">Unsave</span>
                </button>
              ) : (
                <button
                  onClick={handleToggleLibrary}
                  className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3.5 shadow-sm cursor-pointer"
                >
                  <IoBookmarkOutline size={14} />
                  <span>Save to Books</span>
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Combined Notes Modal / Drawer */}
      <AnimatePresence>
        {showCombinedNotes && (
          <Modal
            isOpen={showCombinedNotes}
            onClose={() => setShowCombinedNotes(false)}
            title={`Combined Study Notes — ${currentBook.title}`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-subtle">
                <div>
                  <p className="text-xs text-secondary font-medium">
                    Aggregated notes across all chapters in order
                  </p>
                  <p className="text-[11px] text-muted">
                    {currentBook.author && `By ${currentBook.author}`}
                  </p>
                </div>
                {getCompiledNotesText() && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyCombinedNotes}
                      className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 cursor-pointer"
                    >
                      <IoClipboardOutline size={13} /> Copy All
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadCombinedNotes}
                      className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3 cursor-pointer"
                    >
                      <IoDownloadOutline size={13} /> Download .md
                    </button>
                  </div>
                )}
              </div>

              {getCompiledNotesText() ? (
                <div className="bg-surface rounded-xl p-4 max-h-[60vh] overflow-y-auto border border-subtle custom-scrollbar">
                  <pre className="text-xs sm:text-sm text-secondary whitespace-pre-wrap font-sans leading-relaxed">
                    {getCompiledNotesText()}
                  </pre>
                </div>
              ) : (
                <div className="p-8 text-center bg-surface-raised/40 rounded-xl border border-subtle">
                  <IoDocumentTextOutline size={36} className="mx-auto text-muted mb-2" />
                  <p className="text-sm text-primary font-medium">No notes written yet</p>
                  <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                    Select any video chapter and use the Study Notes workspace to write your key takeaways and notes. They will automatically compile here!
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCombinedNotes(false)}
                  className="btn-secondary text-xs py-1.5 px-4 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. VIDEO BOOK COCKPIT: Responsive Panel Adjustable Panes      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isVideoBook && (
        <div className="space-y-4">
          {/* Mobile Switcher (< 1024px) */}
          <div className="flex lg:hidden items-center justify-between gap-2 p-1.5 bg-surface rounded-xl border border-subtle">
            <button
              type="button"
              onClick={() => setMobileTab('notes')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mobileTab === 'notes'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <IoDocumentTextOutline size={14} />
              <span>Study Notes</span>
              {localNotes.trim() && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('chapters')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mobileTab === 'chapters'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <IoListOutline size={14} />
              <span>Chapters ({totalVideos})</span>
            </button>
          </div>

          {/* Desktop & Responsive Cockpit Container */}
          <div
            ref={cockpitRef}
            className={`flex flex-col lg:flex-row gap-0 relative w-full items-stretch ${
              isDragging ? 'select-none' : ''
            }`}
          >
            {/* ═════════════════════════════════════════════════════════════ */}
            {/* PANE 1: Video Player Section                                 */}
            {/* ═════════════════════════════════════════════════════════════ */}
            <div
              className={`w-full lg:min-w-0 space-y-4 ${
                !isDesktop && mobileTab !== 'notes' && mobileTab !== 'chapters' ? '' : ''
              }`}
              style={{
                width: isDesktop ? `calc(${effectiveVideoWidth}% - ${!isNotesCollapsed && !isListCollapsed ? 16 : !isNotesCollapsed || !isListCollapsed ? 8 : 0}px)` : '100%',
                maxWidth: isDesktop ? `calc(${effectiveVideoWidth}% - ${!isNotesCollapsed && !isListCollapsed ? 16 : !isNotesCollapsed || !isListCollapsed ? 8 : 0}px)` : '100%',
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card overflow-hidden border border-subtle rounded-2xl shadow-xl flex flex-col"
              >
                {/* Embed Video Iframe with aspect-video */}
                <div className="relative w-full aspect-video bg-black">
                  {/* Overlay during drag so iframe doesn't swallow mouse events */}
                  {isDragging && (
                    <div className="absolute inset-0 z-50 cursor-col-resize bg-black/10" />
                  )}

                  {selectedVideo !== null && currentBook.videos?.[selectedVideo] ? (
                    (() => {
                      const videoItem = currentBook.videos[selectedVideo];
                      const videoId = videoItem?.driveFileId || videoItem?.videoId;
                      const isYouTube =
                        currentBook.source === 'youtube' ||
                        (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId));
                      const iframeSrc = isYouTube
                        ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`
                        : `https://drive.google.com/file/d/${videoId}/preview`;

                      return (
                        <iframe
                          key={`${selectedVideo}-${videoId}`}
                          src={iframeSrc}
                          width="100%"
                          height="100%"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full border-0"
                          onLoad={() => {
                            const interval = setInterval(() => {
                              const progress = getVideoProgress(selectedVideo);
                              if (!progress?.completed) {
                                handleVideoProgress(
                                  selectedVideo,
                                  Math.min((progress?.progress || 0) + 5, 95),
                                );
                              }
                            }, 30000);
                            return () => clearInterval(interval);
                          }}
                        />
                      );
                    })()
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-raised">
                      <div className="text-center p-4">
                        <IoPlayCircle className="text-accent/30 mx-auto mb-2" size={48} />
                        <p className="text-secondary text-xs sm:text-sm">Select a video to start watching</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Video Info & Controls under player */}
                <div className="p-4 sm:p-5 space-y-3 bg-surface/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-subtle pb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-surface-raised text-muted border border-subtle">
                          #{selectedVideo + 1}
                        </span>
                        <h3 className="text-sm sm:text-base font-semibold text-primary truncate">
                          {activeVideo?.title || `Video ${selectedVideo + 1}`}
                        </h3>
                      </div>
                      {activeVideo?.duration && (
                        <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                          <IoTimeOutline size={12} /> Duration: {activeVideo.duration}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleVideoComplete(selectedVideo)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          isCurrentVideoCompleted
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-surface text-secondary hover:text-primary border-subtle'
                        }`}
                      >
                        <IoCheckmarkCircle
                          size={14}
                          className={isCurrentVideoCompleted ? 'text-emerald-400' : 'text-muted'}
                        />
                        {isCurrentVideoCompleted ? 'Completed' : 'Mark Complete'}
                      </button>
                    </div>
                  </div>

                  {/* Previous / Next navigation */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => hasPrevVideo && handleSelectVideo(selectedVideo - 1)}
                      disabled={!hasPrevVideo}
                      className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 disabled:opacity-30 cursor-pointer"
                    >
                      <IoPlaySkipBack size={13} /> Prev Video
                    </button>

                    <span className="text-xs text-muted font-medium">
                      {selectedVideo + 1} of {totalVideos}
                    </span>

                    <button
                      type="button"
                      onClick={() => hasNextVideo && handleSelectVideo(selectedVideo + 1)}
                      disabled={!hasNextVideo}
                      className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 disabled:opacity-30 cursor-pointer"
                    >
                      Next Video <IoPlaySkipForward size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Book Overview / Description Card */}
              {currentBook.description && (
                <div className="glass-card p-4 border border-subtle rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">
                      About this Book
                    </h4>
                    {currentBook.description.length > 250 && (
                      <button
                        type="button"
                        onClick={() => setIsDescriptionExpanded((p) => !p)}
                        className="text-xs text-accent hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        {isDescriptionExpanded ? (
                          <>Less <IoChevronUpOutline size={12} /></>
                        ) : (
                          <>More <IoChevronDownOutline size={12} /></>
                        )}
                      </button>
                    )}
                  </div>
                  <div
                    className={`text-xs sm:text-sm text-secondary leading-relaxed ${
                      !isDescriptionExpanded && currentBook.description.length > 250
                        ? 'max-h-20 overflow-hidden line-clamp-3'
                        : ''
                    }`}
                  >
                    {renderDescriptionWithLinks(currentBook.description)}
                  </div>
                </div>
              )}
            </div>

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* RESIZER 1: Draggable Divider between Video and Notes          */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {!isNotesCollapsed && (
              <div
                onMouseDown={startResizingLeft}
                className={`hidden lg:flex items-center justify-center w-3 cursor-col-resize group/resizer relative select-none hover:bg-surface-raised/40 rounded-lg transition-colors flex-shrink-0 ${
                  isDraggingLeft ? 'bg-accent/15' : ''
                }`}
                title="Drag to resize video player & study notes"
              >
                <div
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isDraggingLeft
                      ? 'h-36 bg-accent shadow-md shadow-accent/50 scale-x-125'
                      : 'h-20 bg-subtle group-hover/resizer:bg-accent/80 group-hover/resizer:h-28'
                  }`}
                />
                <div className="absolute flex flex-col gap-1 items-center opacity-0 group-hover/resizer:opacity-100 transition-opacity pointer-events-none">
                  <span className="w-1 h-1 rounded-full bg-white/70" />
                  <span className="w-1 h-1 rounded-full bg-white/70" />
                  <span className="w-1 h-1 rounded-full bg-white/70" />
                </div>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* PANE 2: Study Notes Workspace                                */}
            {/* ═════════════════════════════════════════════════════════════ */}
            <div
              className={`w-full lg:min-w-0 flex-shrink-0 ${
                !isDesktop && mobileTab !== 'notes' ? 'hidden' : 'mt-4 lg:mt-0'
              } ${isNotesCollapsed ? 'hidden' : ''}`}
              style={{
                width: isDesktop ? `${effectiveNotesWidth}%` : '100%',
                maxWidth: isDesktop ? `${effectiveNotesWidth}%` : '100%',
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 sm:p-5 border border-subtle flex flex-col h-full min-h-[520px] rounded-2xl shadow-sm"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-subtle pb-3 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-lg bg-accent/15 text-accent flex-shrink-0">
                      <IoDocumentTextOutline size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-primary truncate">Study Notes</h2>
                        <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono text-muted bg-surface-raised border border-subtle">
                          {Math.round(effectiveNotesWidth)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-muted truncate">
                        {activeVideo?.title || `Video ${selectedVideo + 1}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isSavingNotes ? (
                      <span className="text-[11px] text-accent flex items-center gap-1">
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Saving...
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted hidden sm:inline-block">
                        {lastSavedTime ? `Saved at ${lastSavedTime}` : 'Auto-saves (Ctrl+S)'}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={handleShowCombinedNotes}
                      className="btn-secondary text-[11px] py-1 px-2 flex items-center gap-1 cursor-pointer"
                      title="View all combined notes"
                    >
                      <IoDocumentTextOutline size={12} />
                      <span className="hidden sm:inline">All Notes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsNotesCollapsed(true)}
                      className="hidden lg:flex p-1 rounded hover:bg-surface-raised text-muted hover:text-primary transition-colors cursor-pointer"
                      title="Collapse Notes Panel"
                    >
                      <IoContractOutline size={14} />
                    </button>
                  </div>
                </div>

                {/* Quick Formatting Toolbar */}
                <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('\n- ')}
                    className="px-2 py-1 rounded bg-surface-raised hover:bg-surface border border-subtle text-[11px] text-secondary hover:text-primary flex items-center gap-1 cursor-pointer transition-colors"
                    title="Insert Bullet Point"
                  >
                    <IoListOutline size={12} /> Bullet
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('[00:00] ')}
                    className="px-2 py-1 rounded bg-surface-raised hover:bg-surface border border-subtle text-[11px] text-secondary hover:text-primary flex items-center gap-1 cursor-pointer transition-colors"
                    title="Insert Timestamp"
                  >
                    <IoTimeOutline size={12} /> Timestamp
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('\n```js\n\n```\n')}
                    className="px-2 py-1 rounded bg-surface-raised hover:bg-surface border border-subtle text-[11px] text-secondary hover:text-primary flex items-center gap-1 cursor-pointer transition-colors"
                    title="Insert Code Snippet"
                  >
                    <IoCodeSlashOutline size={12} /> Code
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('\n### ')}
                    className="px-2 py-1 rounded bg-surface-raised hover:bg-surface border border-subtle text-[11px] text-secondary hover:text-primary flex items-center gap-1 cursor-pointer transition-colors"
                    title="Insert Heading"
                  >
                    Heading
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('\n- [ ] ')}
                    className="px-2 py-1 rounded bg-surface-raised hover:bg-surface border border-subtle text-[11px] text-secondary hover:text-primary flex items-center gap-1 cursor-pointer transition-colors"
                    title="Insert Task Checkbox"
                  >
                    Task
                  </button>
                </div>

                {/* Textarea */}
                <div className="flex-1 flex flex-col min-h-0">
                  <textarea
                    ref={notesTextareaRef}
                    value={localNotes}
                    onChange={handleNotesChange}
                    placeholder="Capture key concepts, ideas, code snippets, or timestamps while watching this video... (Auto-saves after 3s, or press Ctrl+S)"
                    className="input-dark w-full flex-1 min-h-[300px] resize-y text-xs sm:text-sm leading-relaxed font-mono p-3 rounded-xl focus:border-accent"
                  />
                </div>

                {/* Notes Actions Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-subtle mt-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyCurrentNote}
                      className="btn-secondary text-xs flex items-center gap-1 cursor-pointer py-1.5 px-2.5"
                      title="Copy Markdown"
                    >
                      <IoClipboardOutline size={13} /> Copy
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadCurrentNote}
                      className="btn-secondary text-xs flex items-center gap-1 cursor-pointer py-1.5 px-2.5"
                      title="Export this note as .md"
                    >
                      <IoDownloadOutline size={13} /> Export .md
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted hidden md:inline">
                      {localNotes ? `${localNotes.length} chars` : 'Empty note'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSaveNotes()}
                      disabled={isSavingNotes}
                      className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer py-1.5 px-3"
                    >
                      <IoSaveOutline size={14} /> Save Notes
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* RESIZER 2: Draggable Divider between Notes and Video List     */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {!isListCollapsed && !isNotesCollapsed && (
              <div
                onMouseDown={startResizingRight}
                className={`hidden lg:flex items-center justify-center w-3 cursor-col-resize group/resizer relative select-none hover:bg-surface-raised/40 rounded-lg transition-colors flex-shrink-0 ${
                  isDraggingRight ? 'bg-accent/15' : ''
                }`}
                title="Drag to resize study notes & video list"
              >
                <div
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isDraggingRight
                      ? 'h-36 bg-accent shadow-md shadow-accent/50 scale-x-125'
                      : 'h-20 bg-subtle group-hover/resizer:bg-accent/80 group-hover/resizer:h-28'
                  }`}
                />
                <div className="absolute flex flex-col gap-1 items-center opacity-0 group-hover/resizer:opacity-100 transition-opacity pointer-events-none">
                  <span className="w-1 h-1 rounded-full bg-white/70" />
                  <span className="w-1 h-1 rounded-full bg-white/70" />
                  <span className="w-1 h-1 rounded-full bg-white/70" />
                </div>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* PANE 3: Video List (Chapters Sidebar)                        */}
            {/* ═════════════════════════════════════════════════════════════ */}
            <div
              className={`w-full lg:min-w-0 flex-shrink-0 ${
                !isDesktop && mobileTab !== 'chapters' ? 'hidden' : 'mt-4 lg:mt-0'
              } ${isListCollapsed ? 'hidden' : ''}`}
              style={{
                width: isDesktop ? `${effectiveListWidth}%` : '100%',
                maxWidth: isDesktop ? `${effectiveListWidth}%` : '100%',
              }}
            >
              <div className="glass-card p-4 border border-subtle rounded-2xl h-full flex flex-col shadow-sm">
                <div className="flex items-center justify-between mb-3 border-b border-subtle pb-2">
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold text-primary">
                      Chapters ({totalVideos})
                    </h3>
                    <p className="text-[11px] text-muted">
                      {completedVideosCount} of {totalVideos} completed
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsListCollapsed(true)}
                    className="hidden lg:flex p-1 rounded hover:bg-surface-raised text-muted hover:text-primary transition-colors cursor-pointer"
                    title="Collapse Video List"
                  >
                    <IoContractOutline size={14} />
                  </button>
                </div>

                {/* Scrollable list of video items */}
                <div className="space-y-1.5 overflow-y-auto flex-1 max-h-[560px] pr-1 custom-scrollbar">
                  {currentBook.videos?.map((video, i) => {
                    const progress = getVideoProgress(i);
                    const isActive = selectedVideo === i;
                    const isDone = Boolean(progress?.completed);
                    const hasNotes = Boolean(progress?.note && progress.note.trim().length > 0);

                    return (
                      <div
                        key={video._id || video.driveFileId || i}
                        onClick={() => handleSelectVideo(i)}
                        className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl transition-all text-left cursor-pointer group ${
                          isActive
                            ? 'bg-accent/15 border border-accent/30 shadow-sm'
                            : 'hover:bg-surface-raised border border-transparent'
                        }`}
                      >
                        {/* Status Icon / Index */}
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                            isDone
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : isActive
                              ? 'bg-accent/20 text-accent'
                              : 'bg-surface text-muted group-hover:text-primary'
                          }`}
                        >
                          {isActive ? (
                            <IoPlayCircleOutline size={15} className="text-accent" />
                          ) : isDone ? (
                            '✓'
                          ) : (
                            i + 1
                          )}
                        </div>

                        {/* Video Info */}
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-xs font-medium truncate ${
                              isActive
                                ? 'text-primary font-semibold'
                                : 'text-secondary group-hover:text-primary'
                            }`}
                          >
                            {video.title || `Video ${i + 1}`}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {video.duration && (
                              <span className="text-[10px] text-muted flex items-center gap-0.5">
                                <IoTimeOutline size={10} /> {video.duration}
                              </span>
                            )}
                            {hasNotes && (
                              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded font-medium flex items-center gap-0.5">
                                <IoDocumentTextOutline size={10} /> Notes
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Completion Checkmark Toggle */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleVideoComplete(i, e)}
                          className={`p-1 rounded-lg transition-colors cursor-pointer flex-shrink-0 ${
                            isDone
                              ? 'text-emerald-400 hover:bg-emerald-500/20'
                              : 'text-muted/40 hover:text-secondary hover:bg-surface'
                          }`}
                          title={isDone ? 'Mark as unwatched' : 'Mark as completed'}
                        >
                          <IoCheckmarkCircle size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Uncollapse Floating Badges on Desktop if a panel is collapsed */}
            {isDesktop && (isNotesCollapsed || isListCollapsed) && (
              <div className="absolute right-0 top-0 z-20 flex items-center gap-2">
                {isNotesCollapsed && (
                  <button
                    type="button"
                    onClick={() => setIsNotesCollapsed(false)}
                    className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 shadow-md bg-surface"
                    title="Expand Notes Panel"
                  >
                    <IoExpandOutline size={13} /> Notes
                  </button>
                )}
                {isListCollapsed && (
                  <button
                    type="button"
                    onClick={() => setIsListCollapsed(false)}
                    className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 shadow-md bg-surface"
                    title="Expand Video List"
                  >
                    <IoExpandOutline size={13} /> Chapters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Text Book (PDF) View */}
      {isTextBook && (
        <div className="glass-card overflow-hidden border border-subtle">
          {/* Reading progress bar + page tracking */}
          <div className="p-4 border-b border-subtle">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Progress bar */}
              <div className="flex-1 w-full">
                <ProgressBar
                  progress={
                    totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0
                  }
                  showLabel
                  height="h-2"
                />
              </div>

              {/* Page tracking inputs */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <IoBookOutline className="text-accent" size={16} />
                <span className="text-xs text-secondary">Page</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages || 99999}
                  value={currentPage}
                  onChange={(e) => setCurrentPage(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1.5 rounded-lg bg-surface border border-subtle text-primary text-sm text-center focus:border-accent focus:outline-none transition-colors"
                  placeholder="#"
                />
                <span className="text-muted text-sm">/</span>
                <input
                  type="number"
                  min="1"
                  value={totalPages}
                  onChange={(e) => setTotalPages(parseInt(e.target.value) || 0)}
                  className="w-16 px-2 py-1.5 rounded-lg bg-surface border border-subtle text-primary text-sm text-center focus:border-accent focus:outline-none transition-colors"
                  placeholder="Total"
                />
                <button
                  onClick={handleSaveReadingProgress}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-subtle text-accent hover:bg-accent/20 text-sm font-medium transition-colors cursor-pointer"
                  title="Save reading progress"
                >
                  <IoSaveOutline size={14} />
                  Save
                </button>
              </div>
            </div>
          </div>

          {currentBook.embedLink ? (
            <div className="w-full">
              {useNativeEmbed ? (
                <div className="relative w-full" style={{ height: '85vh' }}>
                  <div className="flex justify-between items-center p-2.5 bg-surface border-b border-subtle">
                    <span className="text-xs text-secondary font-medium">Browser Native Embed Mode</span>
                    <button
                      onClick={() => setUseNativeEmbed(false)}
                      className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      ← Switch to Mobile / In-App Canvas Reader
                    </button>
                  </div>
                  <iframe
                    src={`${currentBook.embedLink}${currentBook.embedLink.includes('/api/books/pdf/') && !currentBook.embedLink.endsWith('.pdf') ? `/${encodeURIComponent(currentBook.title.replace(/[^a-zA-Z0-9-]/g, '-'))}.pdf` : ''}#toolbar=1&navpanes=1&scrollbar=1`}
                    width="100%"
                    height="100%"
                    className="border-0 rounded-b-xl"
                    title={currentBook.title}
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <PdfReader
                    pdfUrl={currentBook.embedLink}
                    title={currentBook.title}
                    initialPage={currentPage}
                    onPageChange={(page) => setCurrentPage(page)}
                    onTotalPages={(total) => {
                      if (!totalPages || totalPages === 0 || totalPages !== total) {
                        setTotalPages(total);
                      }
                    }}
                    onSaveProgress={handleSaveReadingProgress}
                  />
                  <div className="flex justify-end px-3 py-1.5 bg-surface/40 rounded-b-xl border-t border-subtle">
                    <button
                      onClick={() => setUseNativeEmbed(true)}
                      className="text-xs text-muted hover:text-secondary transition-colors cursor-pointer"
                    >
                      Need browser print or browser PDF toolbar? Switch to native embed
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-20">
              <p className="text-muted">No PDF file uploaded for this book.</p>
            </div>
          )}
        </div>
      )}

      {/* Audio Book Player */}
      {isAudioBook && (
        <>
          {/* Waveform keyframe */}
          <style>{`
            @keyframes audioBar {
              0%   { transform: scaleY(0.25); }
              100% { transform: scaleY(1); }
            }
          `}</style>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Player */}
            <div className="lg:col-span-2">
              <div className="glass-card overflow-hidden border border-subtle">
                {currentBook.audioFiles?.length > 0 ? (
                  <>
                    {/* Waveform + Track info */}
                    <div className="p-6 bg-surface-raised text-center border-b border-subtle">
                      {/* Cover art or waveform */}
                      <div className="flex items-end justify-center gap-[3px] h-20 mb-5">
                        {BAR_HEIGHTS.map((h, i) => (
                          <div
                            key={i}
                            style={{
                              height: `${h * 2.4}px`,
                              animationDelay: `${(i * 0.06) % 0.9}s`,
                              animationDuration: `${0.45 + (i % 6) * 0.1}s`,
                              animation: isPlaying
                                ? `audioBar ${0.45 + (i % 6) * 0.1}s ease-in-out ${(i * 0.06) % 0.9}s infinite alternate`
                                : 'none',
                            }}
                            className={`w-1.5 rounded-full flex-shrink-0 transition-colors duration-300 ${
                              isPlaying ? 'bg-accent' : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <h3 className="text-primary font-semibold text-lg truncate">
                        {currentBook.audioFiles[currentTrackIdx]?.title ||
                          currentBook.audioFiles[currentTrackIdx]?.originalName ||
                          `Track ${currentTrackIdx + 1}`}
                      </h3>
                      <p className="text-accent text-sm mt-1">{currentBook.author}</p>
                      <p className="text-muted text-xs mt-1">
                        Track {currentTrackIdx + 1} of {currentBook.audioFiles.length}
                      </p>
                    </div>

                    {/* Controls */}
                    <div className="p-5 space-y-5">
                      {/* Seek bar */}
                      <div>
                        <div className="relative h-9 flex items-center cursor-pointer">
                          {/* Track background */}
                          <div className="absolute inset-x-0 h-2 rounded-full bg-surface-raised pointer-events-none">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#ff5722] to-[#f4511e]"
                              style={{ width: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}%` }}
                            />
                          </div>
                          {/* Scrubber dot */}
                          <div
                            className="absolute w-4 h-4 rounded-full bg-white shadow-md shadow-accent/40 -translate-x-1/2 pointer-events-none transition-none"
                            style={{ left: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}%` }}
                          />
                          <input
                            type="range"
                            min={0}
                            max={audioDuration || 100}
                            value={currentTime}
                            step={0.1}
                            onChange={handleSeek}
                            className="absolute inset-x-0 w-full opacity-0 cursor-pointer h-2"
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted -mt-1">
                          <span>{fmtTime(currentTime)}</span>
                          <span>{fmtTime(audioDuration)}</span>
                        </div>
                      </div>

                      {/* Play controls */}
                      <div className="flex items-center justify-center gap-8">
                        <button
                          onClick={() => playTrack(Math.max(0, currentTrackIdx - 1))}
                          disabled={currentTrackIdx === 0}
                          className="p-2 text-secondary hover:text-primary disabled:opacity-30 transition-colors cursor-pointer"
                          title="Previous track"
                        >
                          <IoPlaySkipBack size={24} />
                        </button>
                        <button
                          onClick={togglePlay}
                          className="w-16 h-16 rounded-full bg-accent hover:bg-accent/90 active:scale-95 flex items-center justify-center text-white shadow-lg shadow-accent/25 transition-all cursor-pointer"
                        >
                          {isPlaying
                            ? <IoPauseCircle size={36} />
                            : <IoPlayCircle size={36} />}
                        </button>
                        <button
                          onClick={() => playTrack(Math.min((currentBook.audioFiles?.length || 1) - 1, currentTrackIdx + 1))}
                          disabled={currentTrackIdx === (currentBook.audioFiles?.length || 1) - 1}
                          className="p-2 text-secondary hover:text-primary disabled:opacity-30 transition-colors cursor-pointer"
                          title="Next track"
                        >
                          <IoPlaySkipForward size={24} />
                        </button>
                      </div>

                      {/* Volume */}
                      <div className="flex items-center gap-3">
                        <IoVolumeMediumOutline className="text-muted flex-shrink-0" size={18} />
                        <div className="relative flex-1 h-7 flex items-center">
                          <div className="absolute inset-x-0 h-1.5 rounded-full bg-surface-raised pointer-events-none">
                            <div
                              className="h-full rounded-full bg-accent"
                              style={{ width: `${audioVolume * 100}%` }}
                            />
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.02}
                            value={audioVolume}
                            onChange={handleVolume}
                            className="absolute inset-x-0 w-full opacity-0 cursor-pointer h-1.5"
                          />
                        </div>
                        <span className="text-xs text-muted w-9 text-right">{Math.round(audioVolume * 100)}%</span>
                      </div>

                      {/* Take Notes toggle for audio */}
                      <div className="mt-4 pt-4 border-t border-subtle flex justify-end">
                        <button
                          type="button"
                          onClick={() => setShowNotes((prev) => !prev)}
                          className={`btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                            showNotes ? 'border-accent text-accent bg-accent-subtle' : ''
                          }`}
                        >
                          <IoCreateOutline size={14} />
                          {showNotes ? 'Hide Notes' : currentNote ? 'Notes (Saved)' : 'Take Notes'}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-16 text-center">
                    <IoMusicalNote className="mx-auto text-muted mb-3" size={44} />
                    <p className="text-secondary">No audio tracks uploaded yet.</p>
                    <p className="text-muted text-sm mt-1">Edit the book to add audio files.</p>
                  </div>
                )}
              </div>

              {/* Notes Section for Audio */}
              <AnimatePresence>
                {showNotes && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="mt-4 glass-card p-4 sm:p-5 border border-subtle overflow-hidden"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-subtle mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
                          <IoCreateOutline size={16} />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-primary font-display">
                            Audiobook Notes & Reflections
                          </h4>
                          <p className="text-[11px] text-muted truncate max-w-[200px] sm:max-w-xs">
                            {currentBook.audioFiles?.[currentTrackIdx]?.title || currentBook.title}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveNote}
                          disabled={isSavingNote}
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          {isSavingNote ? (
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <IoSaveOutline size={13} />
                          )}
                          <span>{isSavingNote ? 'Saving...' : 'Save Notes'}</span>
                        </button>
                        <button
                          onClick={() => setShowNotes(false)}
                          className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer"
                          title="Hide notes section"
                        >
                          <IoCloseOutline size={18} />
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={currentNote}
                      onChange={(e) => setCurrentNote(e.target.value)}
                      placeholder="Write your notes, key takeaways, and reflections while listening..."
                      className="input-dark w-full min-h-[140px] resize-y text-sm font-sans leading-relaxed p-3 rounded-xl focus:border-accent"
                      rows={5}
                    />

                    <div className="flex items-center justify-between text-xs text-muted mt-2 pt-1">
                      <span>
                        {currentNote ? `${currentNote.length} characters` : 'No notes written yet'}
                      </span>
                      <span className="text-secondary/60">
                        Notes are automatically saved to your private profile
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Track list */}
            <div className="lg:col-span-1">
              <div className="glass-card p-4 border border-subtle">
                <h3 className="text-sm font-semibold text-primary mb-3 font-display flex items-center gap-2">
                  <IoMusicalNote className="text-accent" size={16} />
                  Tracks ({currentBook.audioFiles?.length || 0})
                </h3>
                <div className="space-y-1 max-h-[540px] overflow-y-auto">
                  {currentBook.audioFiles?.map((track, i) => {
                    const isActive = currentTrackIdx === i;
                    return (
                      <div
                        key={track._id || i}
                        className={`group flex items-center gap-3 p-3 rounded-xl transition-all ${
                          isActive
                            ? 'bg-accent-subtle border border-accent/20'
                            : 'hover:bg-surface-raised border border-transparent'
                        }`}
                      >
                        <button
                          onClick={() => playTrack(i)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors cursor-pointer ${
                            isActive && isPlaying
                              ? 'bg-accent text-white'
                              : isActive
                              ? 'bg-accent-subtle text-accent'
                              : 'bg-surface text-muted group-hover:bg-accent-subtle group-hover:text-accent'
                          }`}
                        >
                          {isActive && isPlaying ? '▶' : i + 1}
                        </button>
                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => playTrack(i)}
                        >
                          <p className={`text-sm truncate ${isActive ? 'text-primary font-semibold' : 'text-secondary'}`}>
                            {track.title || track.originalName || `Track ${i + 1}`}
                          </p>
                          {track.size > 0 && (
                            <p className="text-xs text-muted">
                              {track.size < 1024 * 1024
                                ? `${(track.size / 1024).toFixed(0)} KB`
                                : `${(track.size / 1024 / 1024).toFixed(1)} MB`}
                            </p>
                          )}
                        </div>
                        {(isOwner || isAdmin) && (
                          <button
                            onClick={() => handleRemoveAudio(track._id)}
                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                            title="Remove track"
                          >
                            <IoTrashOutline size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Hidden audio element */}
          <audio ref={audioRef} preload="metadata" className="hidden" />
        </>
      )}

      {/* Note Modal (after video completion) */}
      <Modal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        title="What did you learn?"
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Great job completing the video! Write down what you learned.
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="I learned that..."
            className="input-dark min-h-[120px] resize-y w-full"
            rows={4}
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowNoteModal(false);
                handleNoteSubmit();
              }}
              className="btn-secondary cursor-pointer"
            >
              Skip
            </button>
            <button onClick={handleNoteSubmit} className="btn-primary cursor-pointer">
              Save Note
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BookDetailPage;
