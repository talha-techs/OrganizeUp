import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { IoArrowBack, IoPlayCircle, IoCheckmarkCircle, IoBookOutline, IoSaveOutline } from 'react-icons/io5';
import { fetchBook, fetchBookProgress, updateVideoProgress, updateReadingProgress, clearCurrentBook } from '../redux/slices/bookSlice';
import { getMe } from '../redux/slices/authSlice';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ProgressBar from '../components/ui/ProgressBar';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

const BookDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentBook, isLoading } = useSelector((state) => state.books);
  const { user } = useSelector((state) => state.auth);

  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [note, setNote] = useState('');
  const [completedVideoIndex, setCompletedVideoIndex] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    dispatch(fetchBook(id));
    dispatch(fetchBookProgress(id));
    return () => dispatch(clearCurrentBook());
  }, [id, dispatch]);

  // Sync reading progress from user data
  useEffect(() => {
    const rp = user?.readingProgress?.find((rp) => rp.bookId === id);
    if (rp) {
      setCurrentPage(rp.currentPage || 1);
      setTotalPages(rp.totalPages || currentBook?.totalPages || 0);
    } else if (currentBook?.totalPages) {
      setTotalPages(currentBook.totalPages);
    }
  }, [user, id, currentBook]);

  const getVideoProgress = (videoIndex) => {
    return user?.videoProgress?.find(
      (vp) => vp.bookId === id && vp.videoIndex === videoIndex
    );
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
    dispatch(
      updateVideoProgress({
        bookId: id,
        progressData: { videoIndex, progress, completed: progress >= 100 },
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

  const isVideoBook = currentBook.type === 'video';
  const isTextBook = currentBook.type === 'text';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate('/books')}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <IoArrowBack size={18} /> Back to Books
      </motion.button>

      {/* Book Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">{currentBook.title}</h1>
        <p className="text-indigo-400 mt-1">{currentBook.author}</p>
        {currentBook.description && (
          <p className="text-slate-400 text-sm mt-3 max-w-2xl">{currentBook.description}</p>
        )}
      </motion.div>

      {/* Video Book View */}
      {isVideoBook && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <div className="glass-card overflow-hidden">
              {selectedVideo !== null ? (
                <>
                  <div className="aspect-video bg-black rounded-t-2xl overflow-hidden">
                    <iframe
                      src={`https://drive.google.com/file/d/${currentBook.videos[selectedVideo]?.driveFileId}/preview`}
                      width="100%"
                      height="100%"
                      allow="autoplay"
                      allowFullScreen
                      className="w-full h-full"
                      onLoad={() => {
                        // Track progress
                        const interval = setInterval(() => {
                          const progress = getVideoProgress(selectedVideo);
                          if (!progress?.completed) {
                            handleVideoProgress(selectedVideo, Math.min((progress?.progress || 0) + 5, 95));
                          }
                        }, 30000); // Update every 30 seconds
                        return () => clearInterval(interval);
                      }}
                    />
                  </div>
                  {/* Progress bar under video */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-white">
                        {currentBook.videos[selectedVideo]?.title || `Video ${selectedVideo + 1}`}
                      </h3>
                      <span className="text-xs text-slate-400">
                        {currentBook.videos[selectedVideo]?.duration || ''}
                      </span>
                    </div>
                    <ProgressBar
                      progress={getVideoProgress(selectedVideo)?.progress || 0}
                      showLabel
                    />
                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={() => handleVideoEnd(selectedVideo)}
                        className="btn-primary text-xs py-2 px-4"
                      >
                        <IoCheckmarkCircle size={14} /> Mark Complete
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="aspect-video flex items-center justify-center bg-slate-900/50 rounded-t-2xl">
                  <div className="text-center">
                    <IoPlayCircle className="text-indigo-500/30 mx-auto mb-3" size={64} />
                    <p className="text-slate-400 text-sm">Select a video to start watching</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Video List */}
          <div className="lg:col-span-1">
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-white mb-3 font-display">
                Videos ({currentBook.videos?.length || 0})
              </h3>
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {currentBook.videos?.map((video, i) => {
                  const progress = getVideoProgress(i);
                  const isActive = selectedVideo === i;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedVideo(i)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                        isActive
                          ? 'bg-indigo-500/15 border border-indigo-500/20'
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        progress?.completed
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isActive
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : 'bg-slate-700/50 text-slate-400'
                      }`}>
                        {progress?.completed ? '✓' : i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                          {video.title || `Video ${i + 1}`}
                        </p>
                        {video.duration && (
                          <p className="text-xs text-slate-500">{video.duration}</p>
                        )}
                        {progress && !progress.completed && (
                          <ProgressBar progress={progress.progress} className="mt-1.5" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Text Book (PDF) View */}
      {isTextBook && (
        <div className="glass-card overflow-hidden">
          {/* Reading progress bar + page tracking */}
          <div className="p-4 border-b border-white/5">
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
                <IoBookOutline className="text-indigo-400" size={16} />
                <span className="text-xs text-slate-400">Page</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages || 99999}
                  value={currentPage}
                  onChange={(e) => setCurrentPage(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-white text-sm text-center focus:border-indigo-500 focus:outline-none transition-colors"
                  placeholder="#"
                />
                <span className="text-slate-500 text-sm">/</span>
                <input
                  type="number"
                  min="1"
                  value={totalPages}
                  onChange={(e) => setTotalPages(parseInt(e.target.value) || 0)}
                  className="w-16 px-2 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-white text-sm text-center focus:border-indigo-500 focus:outline-none transition-colors"
                  placeholder="Total"
                />
                <button
                  onClick={handleSaveReadingProgress}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 text-sm font-medium transition-colors"
                  title="Save reading progress"
                >
                  <IoSaveOutline size={14} />
                  Save
                </button>
              </div>
            </div>
          </div>

          {currentBook.embedLink ? (
            <div className="relative w-full" style={{ height: '85vh' }}>
              {/* Loading overlay */}
              {pdfLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-10">
                  <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
                  <p className="text-slate-300 text-sm font-medium">Loading PDF...</p>
                  <p className="text-slate-500 text-xs mt-1">This may take a moment for large files</p>
                </div>
              )}
              <iframe
                src={`${currentBook.embedLink}#toolbar=1&navpanes=1&scrollbar=1`}
                width="100%"
                height="100%"
                className="border-0 rounded-xl"
                title={currentBook.title}
                onLoad={() => setPdfLoading(false)}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center py-20">
              <p className="text-slate-400">No PDF file uploaded for this book.</p>
            </div>
          )}
        </div>
      )}

      {/* Audio Book Placeholder */}
      {currentBook.type === 'audio' && (
        <div className="glass-card p-16 text-center">
          <p className="text-slate-400 text-lg">Audio book section coming soon!</p>
        </div>
      )}

      {/* Note Modal (after video completion) */}
      <Modal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        title="What did you learn?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Great job completing the video! Write down what you learned.
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="I learned that..."
            className="input-dark min-h-[120px] resize-y"
            rows={4}
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowNoteModal(false);
                handleNoteSubmit();
              }}
              className="btn-secondary"
            >
              Skip
            </button>
            <button onClick={handleNoteSubmit} className="btn-primary">
              Save Note
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BookDetailPage;
