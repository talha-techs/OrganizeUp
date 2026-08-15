import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoSearchOutline,
  IoBookOutline,
  IoSchoolOutline,
  IoConstructOutline,
  IoGridOutline,
  IoArrowUpOutline,
  IoArrowDownOutline,
  IoChatbubbleOutline,
  IoAddCircleOutline,
  IoRemoveCircleOutline,
  IoTrendingUpOutline,
  IoTimeOutline,
  IoCloseCircleOutline,
  IoFolderOutline,
  IoVideocamOutline,
  IoDocumentTextOutline,
  IoMusicalNotesOutline,
  IoChevronBack,
  IoChevronForward,
  IoSparklesOutline,
} from 'react-icons/io5';
import {
  fetchExploreContent,
  voteContent,
} from '../redux/slices/exploreSlice';
import { addToLibrary, removeFromLibrary, fetchLibrary } from '../redux/slices/librarySlice';
import {
  fetchExploreAudiobooks,
  saveAudiobook,
  unsaveAudiobook,
  setSelectedGenre,
  setAudiobookPage,
  setActivePlayerBook,
  clearActivePlayerBook,
} from '../redux/slices/audiobookSlice';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ResourceCommentPanel from '../components/ui/ResourceCommentPanel';
import AudiobookCard from '../components/ui/AudiobookCard';
import AudiobookPlayerModal from '../components/ui/AudiobookPlayerModal';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';

const AUDIOBOOK_GENRES = [
  'All',
  'Fiction',
  'Philosophy',
  'History',
  'Literature',
  'Science',
  'Mystery',
  'Poetry',
  'Self-Help',
  'Biography',
  'Adventure',
  'Children',
];

const ExplorePage = () => {
  useDocumentTitle('Explore');
  const [activeTab, setActiveTab] = useState('all');
  const [bookSubTab, setBookSubTab] = useState('all'); // 'all' | 'video' | 'text' | 'audio'
  const [sortBy, setSortBy] = useState('latest');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [commentResource, setCommentResource] = useState(null); // { ...item, contentType }
  const [savingAudioId, setSavingAudioId] = useState(null);
  const debounceRef = useRef(null);
  const audiobooksTopRef = useRef(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { results, totals, isLoading } = useSelector((state) => state.explore);
  const { saved } = useSelector((state) => state.library);
  const { user } = useSelector((state) => state.auth);
  const {
    audiobooks,
    page: audioPage,
    hasMore: audioHasMore,
    selectedGenre,
    isLoading: isAudioLoading,
    activePlayerBook,
  } = useSelector((state) => state.audiobooks);

  // Map of contentId (string) → libraryEntryId, rebuilt whenever saved list changes
  const savedMap = useMemo(() => {
    const map = {};
    saved.forEach((s) => {
      map[String(s.contentId)] = s._id;
    });
    return map;
  }, [saved]);

  useEffect(() => {
    dispatch(fetchExploreContent({ type: activeTab, sort: sortBy, search }));
  }, [dispatch, activeTab, sortBy, search]);

  // Populate savedMap on mount so we know which items are already in library
  useEffect(() => {
    dispatch(fetchLibrary());
  }, [dispatch]);

  // Fetch LibriVox audiobooks when book sub-tab is 'audio' or when books tab is selected
  useEffect(() => {
    if (activeTab === 'books' && bookSubTab === 'audio') {
      dispatch(
        fetchExploreAudiobooks({
          page: audioPage,
          limit: 20,
          genre: selectedGenre,
          search,
        }),
      );
    }
  }, [dispatch, activeTab, bookSubTab, audioPage, selectedGenre, search]);

  // Debounce search input → update committed search state after 400ms idle
  const handleSearchInput = (value) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      if (bookSubTab === 'audio') {
        dispatch(setAudiobookPage(1));
      }
    }, 400);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (bookSubTab === 'audio') {
      dispatch(setAudiobookPage(1));
    }
  };

  const handleVote = async (contentType, contentId, value) => {
    await dispatch(voteContent({ contentType, contentId, value }));
  };

  const handleAddToLibrary = async (contentType, contentId) => {
    const result = await dispatch(addToLibrary({ contentType, contentId }));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Added to your library!');
    } else {
      toast.error(result.payload || 'Failed to add');
    }
  };

  const handleRemoveFromLibrary = async (contentId) => {
    const libraryEntryId = savedMap[String(contentId)];
    if (!libraryEntryId) return;
    const result = await dispatch(removeFromLibrary(libraryEntryId));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Removed from library');
    } else {
      toast.error(result.payload || 'Failed to remove');
    }
  };

  const handleSaveAudiobook = async (book) => {
    setSavingAudioId(book.id);
    const result = await dispatch(saveAudiobook(book.id));
    setSavingAudioId(null);
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Audiobook saved to your library!');
      dispatch(fetchLibrary());
    } else {
      toast.error(result.payload || 'Failed to save audiobook');
    }
  };

  const handleUnsaveAudiobook = async (book) => {
    setSavingAudioId(book.id);
    const result = await dispatch(unsaveAudiobook(book.id));
    setSavingAudioId(null);
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Removed from your library');
      dispatch(fetchLibrary());
    } else {
      toast.error(result.payload || 'Failed to remove');
    }
  };

  const handleAudioPageChange = (newPage) => {
    dispatch(setAudiobookPage(newPage));
    if (audiobooksTopRef.current) {
      audiobooksTopRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleGenreChange = (genre) => {
    dispatch(setSelectedGenre(genre));
  };

  const openComments = (item, contentType) => {
    setCommentResource((prev) =>
      prev?._id === item._id ? null : { ...item, contentType },
    );
  };

  const tabs = [
    { key: 'all', label: 'All', icon: <IoGridOutline size={16} /> },
    {
      key: 'books',
      label: 'Books',
      icon: <IoBookOutline size={16} />,
      count: totals.books,
    },
    {
      key: 'courses',
      label: 'Courses',
      icon: <IoSchoolOutline size={16} />,
      count: totals.courses,
    },
    {
      key: 'tools',
      label: 'Tricks',
      icon: <IoConstructOutline size={16} />,
      count: totals.tools,
    },
    {
      key: 'sections',
      label: 'Sections',
      icon: <IoFolderOutline size={16} />,
      count: totals.sections,
    },
  ];

  const bookSubTabs = [
    { key: 'all', label: 'All Formats', icon: <IoBookOutline size={14} /> },
    { key: 'video', label: 'Video Books', icon: <IoVideocamOutline size={14} /> },
    { key: 'text', label: 'Text Books (PDF)', icon: <IoDocumentTextOutline size={14} /> },
    {
      key: 'audio',
      label: 'Audio Books (LibriVox)',
      icon: <IoMusicalNotesOutline size={14} />,
      highlight: true,
    },
  ];

  const detailRouteByType = {
    book: '/books',
    course: '/courses',
    tool: '/tools',
    section: '/sections',
  };

  const ContentCard = ({ item, contentType }) => {
    const isOwn = user?._id && String(item.addedBy?._id) === String(user._id);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="glass-card group hover:border-white/10 transition-all duration-300 flex flex-col h-full overflow-hidden"
      >
        <div className="relative h-40 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden flex-shrink-0">
          {item.coverImage || item.bannerImage ? (
            <img
              src={item.coverImage || item.bannerImage}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              {contentType === 'book' ? (
                <IoBookOutline className="text-slate-600" size={40} />
              ) : contentType === 'course' ? (
                <IoSchoolOutline className="text-slate-600" size={40} />
              ) : contentType === 'section' ? (
                <IoFolderOutline className="text-slate-600" size={40} />
              ) : (
                <IoConstructOutline className="text-slate-600" size={40} />
              )}
            </div>
          )}
          <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur text-xs font-medium text-white capitalize border border-white/10">
            {contentType === 'book'
              ? item.type === 'video'
                ? '📹 Video Book'
                : item.type === 'text'
                ? '📄 PDF Book'
                : item.type === 'audio'
                ? '🎧 Audio Book'
                : 'Book'
              : contentType}
          </div>
        </div>

        <div className="p-4 flex flex-col flex-1">
          <h3
            className="text-sm font-semibold text-white truncate cursor-pointer hover:text-indigo-400 transition-colors"
            onClick={() =>
              navigate(`${detailRouteByType[contentType]}/${item._id}`)
            }
          >
            {item.title}
          </h3>
          {item.author && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{item.author}</p>
          )}
          {item.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {item.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-auto pt-3">
            {item.addedBy?.avatar ? (
              <img
                src={item.addedBy.avatar}
                alt={item.addedBy.name}
                className="w-5 h-5 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-bold text-white">
                  {item.addedBy?.name?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}
            <span className="text-xs text-slate-400 truncate flex-1">
              {item.addedBy?.name || 'Community'}
            </span>
            {item.createdAt && (
              <span className="text-xs text-slate-600 flex-shrink-0 ml-auto">
                {new Date(item.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  handleVote(
                    contentType,
                    item._id,
                    item.userVote === 1 ? 0 : 1,
                  )
                }
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  item.userVote === 1
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/5'
                }`}
              >
                <IoArrowUpOutline size={14} />
              </button>
              <span
                className={`text-xs font-medium min-w-[20px] text-center ${
                  (item.score || 0) > 0
                    ? 'text-emerald-400'
                    : (item.score || 0) < 0
                    ? 'text-red-400'
                    : 'text-slate-500'
                }`}
              >
                {item.score || 0}
              </span>
              <button
                onClick={() =>
                  handleVote(
                    contentType,
                    item._id,
                    item.userVote === -1 ? 0 : -1,
                  )
                }
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  item.userVote === -1
                    ? 'text-red-400 bg-red-500/10'
                    : 'text-slate-500 hover:text-red-400 hover:bg-red-500/5'
                }`}
              >
                <IoArrowDownOutline size={14} />
              </button>
            </div>

            <button
              onClick={() => openComments(item, contentType)}
              className="flex items-center gap-1 text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer"
              title="Open comments"
            >
              <IoChatbubbleOutline size={13} />
              <span className="text-xs">{item.commentCount || 0}</span>
            </button>

            {!isOwn &&
              (savedMap[String(item._id)] ? (
                <button
                  onClick={() => handleRemoveFromLibrary(item._id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-emerald-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  title="Remove from library"
                >
                  <IoRemoveCircleOutline size={14} />
                  Remove
                </button>
              ) : (
                <button
                  onClick={() => handleAddToLibrary(contentType, item._id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-indigo-400 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                  title="Add to my library"
                >
                  <IoAddCircleOutline size={14} />
                  Save
                </button>
              ))}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderSection = (title, items, contentType) => {
    if (!items || items.length === 0) {
      if (!search && activeTab === 'all') return null;
      const typeLabel =
        contentType === 'book'
          ? 'books'
          : contentType === 'course'
          ? 'courses'
          : contentType === 'section'
          ? 'sections'
          : 'tricks';
      return (
        <motion.div
          key={`empty-${contentType}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <IoSearchOutline className="mx-auto text-slate-700 mb-3" size={40} />
          <p className="text-slate-400 font-medium">
            {search
              ? `No ${typeLabel} match “${search}”`
              : `No public ${typeLabel} yet`}
          </p>
          {search && (
            <button
              onClick={handleClearSearch}
              className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              Clear search
            </button>
          )}
        </motion.div>
      );
    }

    return (
      <div className="mb-10">
        <h2 className="text-lg font-bold text-white font-display mb-4 flex items-center gap-2">
          {contentType === 'book' && (
            <IoBookOutline className="text-indigo-400" size={20} />
          )}
          {contentType === 'course' && (
            <IoSchoolOutline className="text-cyan-400" size={20} />
          )}
          {contentType === 'tool' && (
            <IoConstructOutline className="text-emerald-400" size={20} />
          )}
          {contentType === 'section' && (
            <IoFolderOutline className="text-purple-400" size={20} />
          )}
          {title}
          <span className="text-xs text-slate-500 font-normal ml-1">
            (
            {contentType === 'book'
              ? totals.books
              : contentType === 'course'
              ? totals.courses
              : contentType === 'section'
              ? totals.sections
              : totals.tools}
            )
          </span>
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <AnimatePresence>
            {items.map((item) => (
              <ContentCard
                key={item._id}
                item={item}
                contentType={contentType}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  // Filter books by sub-category tab
  const filteredBooks = useMemo(() => {
    if (!results.books) return [];
    if (bookSubTab === 'all') return results.books;
    return results.books.filter((b) => b.type === bookSubTab);
  }, [results.books, bookSubTab]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Title Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white font-display">Explore</h1>
        <p className="text-slate-400 text-sm mt-1">
          Discover public books, courses, audiobooks, tricks, and sections shared
          with the community
        </p>
      </motion.div>

      {/* Search & Sort Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <form onSubmit={(e) => e.preventDefault()} className="flex-1 relative">
          <IoSearchOutline
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500"
            size={18}
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder={
              activeTab === 'books' && bookSubTab === 'audio'
                ? 'Search 18,000+ LibriVox audiobooks by title or author…'
                : 'Search public content…'
            }
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-800/50 border border-white/5 text-white text-sm placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <IoCloseCircleOutline size={16} />
            </button>
          )}
        </form>

        {/* Sort Controls (for DB content) */}
        {!(activeTab === 'books' && bookSubTab === 'audio') && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortBy('latest')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                sortBy === 'latest'
                  ? 'bg-indigo-500/15 text-indigo-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <IoTimeOutline size={15} /> Latest
            </button>
            <button
              onClick={() => setSortBy('popular')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                sortBy === 'popular'
                  ? 'bg-indigo-500/15 text-indigo-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <IoTrendingUpOutline size={15} /> Popular
            </button>
          </div>
        )}
      </div>

      {/* Main Explore Navigation Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              if (tab.key !== 'books') setBookSubTab('all');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'bg-indigo-500/15 text-indigo-400 shadow-lg shadow-indigo-500/5'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon} {tab.label}
            {tab.count !== undefined && (
              <span className="text-xs text-slate-500">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Book Format Sub-Navigation (When Books Tab is Active) */}
      {activeTab === 'books' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 border-b border-white/5"
        >
          {bookSubTabs.map((subTab) => (
            <button
              key={subTab.key}
              onClick={() => setBookSubTab(subTab.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                bookSubTab === subTab.key
                  ? subTab.highlight
                    ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {subTab.icon} {subTab.label}
            </button>
          ))}
        </motion.div>
      )}

      {/* Content Rendering */}
      {isLoading && activeTab !== 'books' ? (
        <LoadingSpinner text="Loading explore content..." />
      ) : (
        <>
          {/* ALL TAB */}
          {activeTab === 'all' && (
            <>
              {renderSection('Books', results.books, 'book')}
              {renderSection('Courses', results.courses, 'course')}
              {renderSection('Tricks & Tools', results.tools, 'tool')}
              {renderSection('Sections', results.sections, 'section')}
              {!search &&
                results.books.length === 0 &&
                results.courses.length === 0 &&
                results.tools.length === 0 &&
                results.sections.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-20"
                  >
                    <IoSearchOutline
                      className="mx-auto text-slate-600 mb-4"
                      size={48}
                    />
                    <h3 className="text-lg font-medium text-slate-400 mb-2">
                      No public content yet
                    </h3>
                    <p className="text-sm text-slate-500">
                      Be the first to share content with the community!
                    </p>
                  </motion.div>
                )}
            </>
          )}

          {/* BOOKS TAB: LIBRIVOX AUDIOBOOKS VIEW */}
          {activeTab === 'books' && bookSubTab === 'audio' && (
            <div ref={audiobooksTopRef} className="space-y-6">
              {/* Header & Genre Filter Chips */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
                      <IoMusicalNotesOutline className="text-indigo-400" size={22} />
                      LibriVox Audiobooks Catalog
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                        Live Feed
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Stream over 18,000 free public-domain classic audiobooks or
                      save them to your personal library.
                    </p>
                  </div>
                </div>

                {/* Genre Selector Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
                  {AUDIOBOOK_GENRES.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => handleGenreChange(genre)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                        selectedGenre === genre
                          ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/30 font-semibold'
                          : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audiobooks 20-per-Page Grid */}
              {isAudioLoading ? (
                <div className="py-20">
                  <LoadingSpinner text="Fetching audiobooks from LibriVox…" />
                </div>
              ) : audiobooks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 glass-card"
                >
                  <IoMusicalNotesOutline
                    className="mx-auto text-slate-600 mb-3"
                    size={48}
                  />
                  <h3 className="text-lg font-medium text-white mb-1">
                    No audiobooks found
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    {search
                      ? `No audiobooks matching “${search}” in ${selectedGenre}`
                      : `No audiobooks available in genre ${selectedGenre}`}
                  </p>
                  <button
                    onClick={() => {
                      handleClearSearch();
                      handleGenreChange('All');
                    }}
                    className="btn-secondary text-xs"
                  >
                    Reset filters
                  </button>
                </motion.div>
              ) : (
                <>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    <AnimatePresence>
                      {audiobooks.map((book) => (
                        <AudiobookCard
                          key={book.id}
                          book={book}
                          onPlay={(b) => dispatch(setActivePlayerBook(b))}
                          onSave={handleSaveAudiobook}
                          onUnsave={handleUnsaveAudiobook}
                          isSaving={savingAudioId === book.id}
                        />
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Pagination Layout (Page 1, 2, 3...) */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 pb-4 border-t border-white/5">
                    <p className="text-xs text-slate-500 font-medium">
                      Showing 20 audiobooks · Page{' '}
                      <span className="text-indigo-400 font-semibold">{audioPage}</span>
                    </p>

                    <div className="flex items-center gap-1.5">
                      {/* Previous Page Button */}
                      <button
                        onClick={() => handleAudioPageChange(Math.max(1, audioPage - 1))}
                        disabled={audioPage === 1}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <IoChevronBack size={14} /> Previous
                      </button>

                      {/* Numbered Page Buttons */}
                      {[
                        Math.max(1, audioPage - 2),
                        Math.max(1, audioPage - 1),
                        audioPage,
                        audioPage + 1,
                        audioPage + 2,
                      ]
                        .filter((p, i, arr) => arr.indexOf(p) === i && p >= 1)
                        .slice(0, 5)
                        .map((p) => (
                          <button
                            key={p}
                            onClick={() => handleAudioPageChange(p)}
                            className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              audioPage === p
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                          >
                            {p}
                          </button>
                        ))}

                      {/* Next Page Button */}
                      <button
                        onClick={() => handleAudioPageChange(audioPage + 1)}
                        disabled={!audioHasMore}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        Next <IoChevronForward size={14} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* BOOKS TAB: VIDEO OR PDF OR ALL BOOKS VIEW */}
          {activeTab === 'books' && bookSubTab !== 'audio' && (
            <div>
              {isLoading ? (
                <LoadingSpinner text="Loading books..." />
              ) : filteredBooks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <IoBookOutline className="mx-auto text-slate-600 mb-4" size={48} />
                  <h3 className="text-lg font-medium text-slate-400 mb-2">
                    No books in this category
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Try switching tabs or exploring our audiobooks library.
                  </p>
                  <button
                    onClick={() => setBookSubTab('audio')}
                    className="btn-primary text-xs flex items-center gap-1.5 mx-auto"
                  >
                    <IoMusicalNotesOutline size={14} /> Explore LibriVox Audiobooks
                  </button>
                </motion.div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  <AnimatePresence>
                    {filteredBooks.map((item) => (
                      <ContentCard
                        key={item._id}
                        item={item}
                        contentType="book"
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {/* COURSES TAB */}
          {activeTab === 'courses' &&
            renderSection('Courses', results.courses, 'course')}

          {/* TRICKS TAB */}
          {activeTab === 'tools' &&
            renderSection('Tricks & Tools', results.tools, 'tool')}

          {/* SECTIONS TAB */}
          {activeTab === 'sections' &&
            renderSection('Sections', results.sections, 'section')}
        </>
      )}

      {/* Global Audiobook Player Modal */}
      <AudiobookPlayerModal
        book={activePlayerBook}
        isOpen={!!activePlayerBook}
        onClose={() => dispatch(clearActivePlayerBook())}
        onSave={handleSaveAudiobook}
        onUnsave={handleUnsaveAudiobook}
      />

      {/* Comment panel – rendered outside card grid so typing doesn't re-render cards */}
      <ResourceCommentPanel
        resource={commentResource}
        contentType={commentResource?.contentType}
        onClose={() => setCommentResource(null)}
      />
    </div>
  );
};

export default ExplorePage;

