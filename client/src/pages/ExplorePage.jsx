import { useEffect, useState } from 'react';
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
  IoTrendingUpOutline,
  IoTimeOutline,
} from 'react-icons/io5';
import {
  fetchExploreContent,
  voteContent,
} from '../redux/slices/exploreSlice';
import { addToLibrary } from '../redux/slices/librarySlice';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ResourceCommentPanel from '../components/ui/ResourceCommentPanel';
import toast from 'react-hot-toast';

const ExplorePage = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [commentResource, setCommentResource] = useState(null); // { ...item, contentType }

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { results, totals, isLoading } = useSelector((state) => state.explore);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchExploreContent({ type: activeTab, sort: sortBy, search }));
  }, [dispatch, activeTab, sortBy, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
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

  const openComments = (item, contentType) => {
    setCommentResource((prev) =>
      prev?._id === item._id ? null : { ...item, contentType },
    );
  };

  const tabs = [
    { key: 'all', label: 'All', icon: <IoGridOutline size={16} /> },
    { key: 'books', label: 'Books', icon: <IoBookOutline size={16} />, count: totals.books },
    { key: 'courses', label: 'Courses', icon: <IoSchoolOutline size={16} />, count: totals.courses },
    { key: 'tools', label: 'Tricks', icon: <IoConstructOutline size={16} />, count: totals.tools },
  ];

  const detailRouteByType = {
    book: '/books',
    course: '/courses',
    tool: '/tools',
  };

  const ContentCard = ({ item, contentType }) => {
    const isOwn = user?._id && String(item.addedBy?._id) === String(user._id);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="glass-card group hover:border-white/10 transition-all duration-300"
      >
        <div className="relative h-40 bg-gradient-to-br from-slate-800 to-slate-900 rounded-t-2xl overflow-hidden">
          {(item.coverImage || item.bannerImage) ? (
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
              ) : (
                <IoConstructOutline className="text-slate-600" size={40} />
              )}
            </div>
          )}
          <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/50 backdrop-blur text-xs font-medium text-white capitalize">
            {contentType}
          </div>
        </div>

        <div className="p-4">
          <h3
            className="text-sm font-semibold text-white truncate cursor-pointer hover:text-indigo-400 transition-colors"
            onClick={() => navigate(`${detailRouteByType[contentType]}/${item._id}`)}
          >
            {item.title}
          </h3>
          {item.author && (
            <p className="text-xs text-slate-400 mt-0.5">{item.author}</p>
          )}
          {item.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
          )}

          <div className="flex items-center gap-2 mt-3">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
              <span className="text-[9px] font-bold text-white">
                {item.addedBy?.name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <span className="text-xs text-slate-400">{item.addedBy?.name || 'Unknown'}</span>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleVote(contentType, item._id, item.userVote === 1 ? 0 : 1)}
                className={`p-1.5 rounded-lg transition-colors ${
                  item.userVote === 1
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/5'
                }`}
              >
                <IoArrowUpOutline size={14} />
              </button>
              <span className={`text-xs font-medium min-w-[20px] text-center ${
                (item.score || 0) > 0 ? 'text-emerald-400' : (item.score || 0) < 0 ? 'text-red-400' : 'text-slate-500'
              }`}>
                {item.score || 0}
              </span>
              <button
                onClick={() => handleVote(contentType, item._id, item.userVote === -1 ? 0 : -1)}
                className={`p-1.5 rounded-lg transition-colors ${
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
              className="flex items-center gap-1 text-slate-500 hover:text-indigo-400 transition-colors"
              title="Open comments"
            >
              <IoChatbubbleOutline size={13} />
              <span className="text-xs">{item.commentCount || 0}</span>
            </button>

            {!isOwn && (
              <button
                onClick={() => handleAddToLibrary(contentType, item._id)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                title="Add to my library"
              >
                <IoAddCircleOutline size={14} />
                Save
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderSection = (title, items, contentType) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="mb-10">
        <h2 className="text-lg font-bold text-white font-display mb-4 flex items-center gap-2">
          {contentType === 'book' && <IoBookOutline className="text-indigo-400" size={20} />}
          {contentType === 'course' && <IoSchoolOutline className="text-cyan-400" size={20} />}
          {contentType === 'tool' && <IoConstructOutline className="text-emerald-400" size={20} />}
          {title}
          <span className="text-xs text-slate-500 font-normal ml-1">
            ({contentType === 'book' ? totals.books : contentType === 'course' ? totals.courses : totals.tools})
          </span>
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <AnimatePresence>
            {items.map((item) => (
              <ContentCard key={item._id} item={item} contentType={contentType} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white font-display">Explore</h1>
        <p className="text-slate-400 text-sm mt-1">
          Discover public books, courses, and tricks shared by the community
        </p>
      </motion.div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <IoSearchOutline className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search public content..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-white/5 text-white text-sm placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </form>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortBy('latest')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              sortBy === 'latest'
                ? 'bg-indigo-500/15 text-indigo-400'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <IoTimeOutline size={15} /> Latest
          </button>
          <button
            onClick={() => setSortBy('popular')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              sortBy === 'popular'
                ? 'bg-indigo-500/15 text-indigo-400'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <IoTrendingUpOutline size={15} /> Popular
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
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

      {isLoading ? (
        <LoadingSpinner text="Loading explore content..." />
      ) : (
        <>
          {activeTab === 'all' ? (
            <>
              {renderSection('Books', results.books, 'book')}
              {renderSection('Courses', results.courses, 'course')}
              {renderSection('Tricks & Tools', results.tools, 'tool')}
              {results.books.length === 0 && results.courses.length === 0 && results.tools.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <IoSearchOutline className="mx-auto text-slate-600 mb-4" size={48} />
                  <h3 className="text-lg font-medium text-slate-400 mb-2">No public content yet</h3>
                  <p className="text-sm text-slate-500">
                    Be the first to share content with the community!
                  </p>
                </motion.div>
              )}
            </>
          ) : (
            <>
              {activeTab === 'books' && renderSection('Books', results.books, 'book')}
              {activeTab === 'courses' && renderSection('Courses', results.courses, 'course')}
              {activeTab === 'tools' && renderSection('Tricks & Tools', results.tools, 'tool')}
            </>
          )}
        </>
      )}

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
