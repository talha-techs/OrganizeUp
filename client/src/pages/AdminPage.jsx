import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoPersonOutline,
  IoBookOutline,
  IoSchoolOutline,
  IoBulbOutline,
  IoTrashOutline,
  IoChevronForward,
  IoArrowBack,
  IoEyeOutline,
  IoSearchOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoTimeOutline,
  IoGlobeOutline,
  IoLockClosedOutline,
  IoLinkOutline,
  IoDocumentTextOutline,
  IoFolderOutline,
  IoVideocamOutline,
  IoImageOutline,
  IoLogoYoutube,
  IoLayersOutline,
} from 'react-icons/io5';
import {
  fetchStats,
  fetchUsers,
  fetchUserDetail,
  deleteUser,
  fetchPublishRequests,
  reviewPublishRequest,
  fetchResourceForReview,
  fetchAllContent,
  adminDeleteContent,
  toggleVisibility,
} from '../redux/slices/adminSlice';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import ProgressBar from '../components/ui/ProgressBar';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';
const countFiles = (item) => {
  if (!item) return 0;
  const topLevel = item.files?.length || 0;
  const nested = (item.folders || []).reduce(
    (sum, f) => sum + (f.files?.length || 0),
    0,
  );
  return topLevel + nested;
};

const AdminPage = () => {
  useDocumentTitle('Admin');
  const dispatch = useDispatch();
  const { stats, users, selectedUser, publishRequests, reviewResource, contentItems, contentTotal, contentLoading, contentError, isLoading } =
    useSelector((state) => state.admin);
  const [view, setView] = useState('dashboard'); // dashboard | users | userDetail | publishRequests | requestDetail | contentManagement
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteContentModal, setDeleteContentModal] = useState(null); // { type, id, title }
  const [search, setSearch] = useState('');
  const [requestFilter, setRequestFilter] = useState('pending');
  const [contentMgmtType, setContentMgmtType] = useState('course');
  const [contentSearch, setContentSearch] = useState('');

  useEffect(() => {
    dispatch(fetchStats());
  }, [dispatch]);

  const handleViewUsers = () => {
    dispatch(fetchUsers());
    setView('users');
  };

  const handleViewPublishRequests = () => {
    dispatch(fetchPublishRequests('pending'));
    setView('publishRequests');
  };

  const handleViewContentManagement = (type = 'course') => {
    setContentMgmtType(type);
    setContentSearch('');
    dispatch(fetchAllContent({ type }));
    setView('contentManagement');
  };

  const handleContentTypeChange = (type) => {
    setContentMgmtType(type);
    setContentSearch('');
    dispatch(fetchAllContent({ type }));
  };

  const handleContentSearch = (e) => {
    const q = e.target.value;
    setContentSearch(q);
    dispatch(fetchAllContent({ type: contentMgmtType, search: q }));
  };

  const handleToggleVisibility = async (item) => {
    const newVis = item.visibility === 'public' ? 'private' : 'public';
    const result = await dispatch(toggleVisibility({ contentType: contentMgmtType, contentId: item._id, visibility: newVis }));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success(`Set to ${newVis}`);
      dispatch(fetchAllContent({ type: contentMgmtType, search: contentSearch }));
    } else {
      toast.error(result.payload || 'Failed');
    }
  };

  const handleAdminDeleteContent = async () => {
    if (!deleteContentModal) return;
    const result = await dispatch(adminDeleteContent({ type: deleteContentModal.type, id: deleteContentModal.id }));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Content deleted');
      setDeleteContentModal(null);
      dispatch(fetchStats());
    } else {
      toast.error(result.payload || 'Failed to delete');
    }
  };

  const handleOpenRequest = async (req) => {
    setSelectedRequest(req);
    setAdminNote('');
    setView('requestDetail');
    await dispatch(
      fetchResourceForReview({ contentType: req.contentType, contentId: req.contentId }),
    );
  };

  const handleReview = async (status) => {
    if (!selectedRequest) return;
    setIsReviewing(true);
    const result = await dispatch(
      reviewPublishRequest({ id: selectedRequest._id, status, adminNote }),
    );
    setIsReviewing(false);
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success(`Request ${status}`);
      dispatch(fetchStats());
      setView('publishRequests');
      setSelectedRequest(null);
      setAdminNote('');
    } else {
      toast.error(result.payload || 'Failed to review request');
    }
  };

  const handleViewUser = (userId) => {
    dispatch(fetchUserDetail(userId));
    setView('userDetail');
  };

  const handleDeleteUser = async () => {
    const result = await dispatch(deleteUser(deleteModal));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('User deleted');
      setDeleteModal(null);
      dispatch(fetchUsers());
    }
  };

  const filteredUsers = users?.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const statCards = [
    { label: 'Users', value: stats?.users || 0, icon: IoPersonOutline, color: 'from-indigo-500 to-indigo-600' },
    { label: 'Books', value: stats?.books || 0, icon: IoBookOutline, color: 'from-cyan-500 to-cyan-600' },
    { label: 'Courses', value: stats?.courses || 0, icon: IoSchoolOutline, color: 'from-purple-500 to-purple-600' },
    { label: 'Tools', value: stats?.tools || 0, icon: IoBulbOutline, color: 'from-amber-500 to-amber-600' },
    { label: 'Pending Requests', value: stats?.pendingRequests || 0, icon: IoTimeOutline, color: 'from-orange-500 to-red-600' },
  ];

  const handleBackFromDetail = () => {
    setView('publishRequests');
    setSelectedRequest(null);
  };

  if (isLoading && !stats && !users) return <LoadingSpinner fullScreen text="Loading admin panel..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          {view !== 'dashboard' && (
            <button
              onClick={() => {
                if (view === 'userDetail') setView('users');
                else if (view === 'requestDetail') handleBackFromDetail();
                else setView('dashboard');
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <IoArrowBack size={20} />
            </button>
          )}
          <h1 className="text-3xl font-bold text-white font-display">
            {view === 'dashboard' && 'Admin Panel'}
            {view === 'users' && 'User Management'}
            {view === 'userDetail' && 'User Details'}
            {view === 'publishRequests' && 'Publish Requests'}
            {view === 'contentManagement' && 'Content Management'}
            {view === 'requestDetail' && (
              <span>
                Review Request
                {selectedRequest && (
                  <span className={`ml-3 text-base font-normal px-2 py-0.5 rounded-full ${
                    selectedRequest.contentType === 'book'
                      ? 'text-cyan-400 bg-cyan-500/10'
                      : selectedRequest.contentType === 'course'
                      ? 'text-purple-400 bg-purple-500/10'
                      : 'text-amber-400 bg-amber-500/10'
                  }`}>
                    {selectedRequest.contentType}
                  </span>
                )}
              </span>
            )}
          </h1>
        </div>

        <AnimatePresence mode="wait">
          {/* Dashboard View */}
          {view === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                {statCards.map((card, i) => (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card p-6"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>
                      <card.icon size={20} className="text-white" />
                    </div>
                    <div className="text-3xl font-bold text-white">{card.value}</div>
                    <div className="text-sm text-slate-400 mt-1">{card.label}</div>
                  </motion.div>
                ))}
              </div>

              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={handleViewUsers}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <IoPersonOutline size={20} className="text-indigo-400" />
                      <span className="text-white font-medium">Manage Users</span>
                    </div>
                    <IoChevronForward size={18} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
                  </button>
                  <button
                    onClick={handleViewPublishRequests}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <IoGlobeOutline size={20} className="text-orange-400" />
                      <span className="text-white font-medium">Publish Requests</span>
                      {(stats?.pendingRequests || 0) > 0 && (
                        <span className="text-xs font-medium text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
                          {stats.pendingRequests} pending
                        </span>
                      )}
                    </div>
                    <IoChevronForward size={18} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
                  </button>
                  <button
                    onClick={() => handleViewContentManagement('course')}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <IoLayersOutline size={20} className="text-indigo-400" />
                      <span className="text-white font-medium">Manage Content</span>
                      <span className="text-xs text-slate-500">
                        {(stats?.books || 0) + (stats?.courses || 0) + (stats?.tools || 0)} items
                      </span>
                    </div>
                    <IoChevronForward size={18} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Users List View */}
          {view === 'users' && (
            <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="relative mb-6">
                <IoSearchOutline size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-dark w-full pl-11"
                />
              </div>
              {isLoading ? (
                <LoadingSpinner text="Loading users..." />
              ) : (
                <div className="space-y-3">
                  {filteredUsers?.length === 0 && (
                    <p className="text-center text-slate-500 py-12">No users found</p>
                  )}
                  {filteredUsers?.map((u) => (
                    <div key={u._id} className="glass-card p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm">
                          {u.avatar ? (
                            <img src={u.avatar} alt="" className="w-full h-full rounded-xl object-cover" />
                          ) : (
                            u.name?.charAt(0)?.toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="text-white font-medium">{u.name}</div>
                          <div className="text-sm text-slate-400">{u.email}</div>
                        </div>
                        {u.role === 'admin' && (
                          <span className="text-xs font-medium text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewUser(u._id)}
                          className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        >
                          <IoEyeOutline size={18} />
                        </button>
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => setDeleteModal(u._id)}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <IoTrashOutline size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* User Detail View */}
          {view === 'userDetail' && (
            <motion.div key="userDetail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {isLoading ? (
                <LoadingSpinner text="Loading user details..." />
              ) : selectedUser ? (
                <div className="space-y-6">
                  <div className="glass-card p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xl">
                        {selectedUser.avatar ? (
                          <img src={selectedUser.avatar} alt="" className="w-full h-full rounded-2xl object-cover" />
                        ) : (
                          selectedUser.name?.charAt(0)?.toUpperCase()
                        )}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">{selectedUser.name}</h2>
                        <p className="text-sm text-slate-400">{selectedUser.email}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Joined {new Date(selectedUser.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  {selectedUser.videoProgress?.length > 0 && (
                    <div className="glass-card p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Video Progress</h3>
                      <div className="space-y-4">
                        {selectedUser.videoProgress.map((vp, i) => (
                          <div key={i} className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-white font-medium">
                                {vp.bookId?.title || 'Book'} — Video {vp.videoIndex + 1}
                              </span>
                              <span className="text-xs text-slate-400">
                                {vp.completed ? '✅ Completed' : `${Math.round(vp.progress)}%`}
                              </span>
                            </div>
                            <ProgressBar progress={vp.progress} height="h-1.5" />
                            {vp.note && <p className="text-xs text-slate-400 mt-2 italic">"{vp.note}"</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedUser.readingProgress?.length > 0 && (
                    <div className="glass-card p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Reading Progress</h3>
                      <div className="space-y-4">
                        {selectedUser.readingProgress.map((rp, i) => (
                          <div key={i} className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-white font-medium">{rp.bookId?.title || 'Book'}</span>
                              <span className="text-xs text-slate-400">Page {rp.currentPage} / {rp.totalPages}</span>
                            </div>
                            <ProgressBar progress={rp.progress} height="h-1.5" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!selectedUser.videoProgress?.length && !selectedUser.readingProgress?.length && (
                    <div className="glass-card p-8 text-center">
                      <p className="text-slate-500">No tracked progress yet.</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-12">User not found</p>
              )}
            </motion.div>
          )}

          {/* Content Management View */}
          {view === 'contentManagement' && (
            <motion.div key="contentManagement" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Type tabs */}
              <div className="flex items-center gap-2 mb-5 flex-wrap">
                {[
                  { type: 'book',     label: 'Books',     icon: IoBookOutline,    activeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
                  { type: 'course',   label: 'Courses',   icon: IoSchoolOutline,  activeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
                  { type: 'tool',     label: 'Tricks',    icon: IoBulbOutline,    activeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
                  { type: 'section',  label: 'Sections',  icon: IoFolderOutline,  activeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
                  { type: 'playlist', label: 'Playlists', icon: IoLogoYoutube,    activeClass: 'bg-red-500/15 text-red-400 border-red-500/30' },
                ].map(({ type, label, icon: Icon, activeClass }) => (
                  <button
                    key={type}
                    onClick={() => handleContentTypeChange(type)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                      contentMgmtType === type
                        ? activeClass
                        : 'bg-slate-800/50 text-slate-400 border-white/5 hover:bg-slate-700/50'
                    }`}
                  >
                    <Icon size={15} />{label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative mb-5">
                <IoSearchOutline size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder={`Search ${contentMgmtType}s…`}
                  value={contentSearch}
                  onChange={handleContentSearch}
                  className="input-dark w-full pl-11 text-sm"
                />
              </div>

              {contentLoading ? (
                <LoadingSpinner text="Loading content…" />
              ) : contentError ? (
                <div className="text-center py-20 glass-card">
                  <IoLayersOutline className="mx-auto text-red-700 mb-3" size={44} />
                  <p className="text-red-400 font-medium">Failed to load content</p>
                  <p className="text-slate-500 text-sm mt-1">{contentError}</p>
                  <button
                    onClick={() => dispatch(fetchAllContent({ type: contentMgmtType }))}
                    className="mt-4 px-4 py-2 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 text-sm transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : contentItems.length === 0 ? (
                <div className="text-center py-20 glass-card">
                  <IoLayersOutline className="mx-auto text-slate-700 mb-3" size={44} />
                  <p className="text-slate-400">No content found{contentSearch ? ` for “${contentSearch}”` : ''}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 mb-3">{contentTotal} item{contentTotal !== 1 ? 's' : ''} total</p>
                  {contentItems.map((item) => {
                    const thumb = item.bannerImage || item.coverImage || item.thumbnailUrl;
                    const isPublic = item.visibility === 'public';
                    return (
                      <div
                        key={item._id}
                        className="glass-card p-4 flex items-center gap-4 group"
                      >
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 flex items-center justify-center">
                          {thumb ? (
                            <img src={thumb} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <IoLayersOutline size={18} className="text-slate-500" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{item.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 flex-wrap">
                            {item.addedBy?.name && <span>by {item.addedBy.name}</span>}
                            {item.category?.name && <span>· {item.category.name}</span>}
                            <span>· {new Date(item.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Visibility badge */}
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                          isPublic
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-slate-700/60 text-slate-500'
                        }`}>
                          {isPublic ? 'Public' : 'Private'}
                        </span>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleToggleVisibility(item)}
                            title={isPublic ? 'Make private' : 'Make public'}
                            className={`p-2 rounded-lg text-sm transition-colors ${
                              isPublic
                                ? 'text-emerald-400 hover:bg-emerald-500/10'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                            }`}
                          >
                            {isPublic ? <IoGlobeOutline size={16} /> : <IoLockClosedOutline size={16} />}
                          </button>
                          <button
                            onClick={() => setDeleteContentModal({ type: contentMgmtType, id: item._id, title: item.title })}
                            className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete permanently"
                          >
                            <IoTrashOutline size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* Publish Requests List View */}
          {view === 'publishRequests' && (
            <motion.div key="publishRequests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex gap-2 mb-6">
                {['pending', 'approved', 'rejected'].map((status) => (
                  <button
                    key={status}
                    onClick={() => { setRequestFilter(status); dispatch(fetchPublishRequests(status)); }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      requestFilter === status
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        : 'bg-slate-800/50 text-slate-400 border border-white/5 hover:bg-slate-700/50'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
              {isLoading ? (
                <LoadingSpinner text="Loading requests..." />
              ) : publishRequests.length === 0 ? (
                <div className="text-center py-20">
                  <IoTimeOutline className="mx-auto text-slate-600 mb-4" size={48} />
                  <h3 className="text-lg text-slate-400 mb-2">No {requestFilter} requests</h3>
                </div>
              ) : (
                <div className="space-y-3">
                  {publishRequests.map((req) => (
                    <motion.div
                      key={req._id}
                      whileHover={{ scale: 1.005 }}
                      className={`glass-card p-5 transition-all ${
                        req.status === 'pending'
                          ? 'cursor-pointer hover:border-indigo-500/20 hover:shadow-indigo-500/5 hover:shadow-lg'
                          : ''
                      }`}
                      onClick={() => req.status === 'pending' && handleOpenRequest(req)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              req.contentType === 'book' ? 'bg-cyan-500/10 text-cyan-400'
                              : req.contentType === 'course' ? 'bg-purple-500/10 text-purple-400'
                              : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {req.contentType}
                            </span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              req.status === 'pending' ? 'bg-orange-500/10 text-orange-400'
                              : req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-red-500/10 text-red-400'
                            }`}>
                              {req.status}
                            </span>
                          </div>
                          <h3 className="text-white font-semibold text-lg truncate">
                            {req.content?.title || 'Content deleted'}
                          </h3>
                          {req.content?.description && (
                            <p className="text-sm text-slate-400 mt-1 line-clamp-2">{req.content.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                            <span>By {req.requestedBy?.name || 'Unknown'} ({req.requestedBy?.email})</span>
                            <span>•</span>
                            <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                          </div>
                          {req.reviewedBy && (
                            <p className="text-xs text-slate-500 mt-1">
                              Reviewed by {req.reviewedBy.name} — {req.adminNote || 'No note'}
                            </p>
                          )}
                        </div>
                        {req.status === 'pending' && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-slate-500 italic">Click to review →</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Request Detail / Full Resource Review */}
          {view === 'requestDetail' && (
            <motion.div key="requestDetail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {isLoading || !reviewResource ? (
                <LoadingSpinner text="Loading resource details..." />
              ) : (
                <div className="space-y-6">
                  {/* Request meta */}
                  <div className="glass-card p-5">
                    <div className="flex items-center gap-3 text-sm text-slate-400 flex-wrap">
                      <span className="text-white font-medium">{selectedRequest?.requestedBy?.name}</span>
                      <span className="text-slate-600">({selectedRequest?.requestedBy?.email})</span>
                      <span className="text-slate-600">•</span>
                      <span>Submitted {new Date(selectedRequest?.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Full resource preview */}
                  {(() => {
                    const res = reviewResource.resource;
                    const type = reviewResource.contentType;
                    if (!res) return <p className="text-slate-500 text-center py-8">Resource not found</p>;

                    return (
                      <div className="glass-card overflow-hidden">
                        {/* Banner */}
                        {(res.coverImage || res.bannerImage) && (
                          <img
                            src={res.coverImage || res.bannerImage}
                            alt={res.title}
                            className="w-full h-56 object-cover"
                          />
                        )}

                        <div className="p-6 space-y-5">
                          {/* Title + type */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                                type === 'book' ? 'bg-cyan-500/10 text-cyan-400'
                                : type === 'course' ? 'bg-purple-500/10 text-purple-400'
                                : type === 'section' ? 'bg-green-500/10 text-green-400'
                                : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                {type}
                              </span>
                              {res.type && (
                                <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full">
                                  {res.type}
                                </span>
                              )}
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-1">{res.title || res.name}</h2>
                            {res.author && <p className="text-indigo-400 text-sm">{res.author}</p>}
                            {res.description && (
                              <p className="text-slate-400 text-sm mt-2 leading-relaxed">{res.description}</p>
                            )}
                          </div>

                          {/* Creator */}
                          <div className="flex items-center gap-3 py-3 border-y border-white/5">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                              <span className="text-xs font-bold text-white">
                                {res.addedBy?.name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm text-white font-medium">{res.addedBy?.name}</p>
                              <p className="text-xs text-slate-500">Content creator</p>
                            </div>
                          </div>

                          {/* Book specifics */}
                          {type === 'book' && (
                            <div className="space-y-3">
                              {res.embedLink && (
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                  <IoDocumentTextOutline size={16} className="text-cyan-400 flex-shrink-0" />
                                  <a
                                    href={res.embedLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-cyan-400 hover:underline truncate"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    View PDF / Embed
                                  </a>
                                </div>
                              )}
                              {res.driveLink && (
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                  <IoLinkOutline size={16} className="text-slate-500 flex-shrink-0" />
                                  <a
                                    href={res.driveLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-indigo-400 hover:underline truncate"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Drive Link
                                  </a>
                                </div>
                              )}
                              {res.videos?.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-sm text-slate-400 mb-2 flex items-center gap-2">
                                    <IoVideocamOutline size={15} className="text-indigo-400" />
                                    {res.videos.length} video{res.videos.length !== 1 ? 's' : ''}
                                  </p>
                                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                    {res.videos.map((v, i) => (
                                      <div key={i} className="flex items-center gap-2 text-xs text-slate-400 py-1 px-2 rounded-lg bg-slate-800/40">
                                        <span className="text-slate-600 w-5 text-right flex-shrink-0">{i + 1}.</span>
                                        <span className="truncate">{v.title || `Episode ${i + 1}`}</span>
                                        {v.duration && <span className="ml-auto text-slate-600 flex-shrink-0">{v.duration}</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {res.totalPages > 0 && (
                                <p className="text-sm text-slate-400">
                                  📄 {res.totalPages} pages
                                </p>
                              )}
                            </div>
                          )}

                          {/* Course specifics */}
                          {type === 'course' && (
                            <div className="space-y-3">
                              {res.category?.name && (
                                <div className="flex items-center gap-2 text-sm">
                                  <IoFolderOutline size={15} className="text-purple-400" />
                                  <span className="text-slate-400">Category:</span>
                                  <span className="text-purple-400 font-medium">{res.category.name}</span>
                                </div>
                              )}
                              {res.driveLink && (
                                <div className="flex items-center gap-2 text-sm">
                                  <IoLinkOutline size={15} className="text-slate-500" />
                                  <a
                                    href={res.driveLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-indigo-400 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Open Drive Folder
                                  </a>
                                </div>
                              )}
                              <div className="flex items-center gap-4 text-sm text-slate-400">
                                <span className="flex items-center gap-1">
                                  <IoDocumentTextOutline size={14} className="text-slate-500" />
                                  {countFiles(res)} file{countFiles(res) !== 1 ? 's' : ''}
                                </span>
                                {res.folders?.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <IoFolderOutline size={14} className="text-slate-500" />
                                    {res.folders.length} folder{res.folders.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              {/* Top-level files */}
                              {(res.files?.length > 0 || res.folders?.length > 0) && (
                                <div className="mt-2 max-h-48 overflow-y-auto space-y-1 pr-1">
                                  {res.files?.map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-slate-400 py-1 px-2 rounded-lg bg-slate-800/40">
                                      <IoDocumentTextOutline size={12} className="text-slate-600 flex-shrink-0" />
                                      <span className="truncate">{f.name}</span>
                                    </div>
                                  ))}
                                  {res.folders?.map((folder, i) => (
                                    <div key={i}>
                                      <div className="flex items-center gap-2 text-xs text-slate-300 py-1 px-2 rounded-lg bg-indigo-500/5 mt-1">
                                        <IoFolderOutline size={12} className="text-indigo-400 flex-shrink-0" />
                                        <span className="font-medium truncate">{folder.name}</span>
                                        <span className="ml-auto text-slate-600">{folder.files?.length || 0} files</span>
                                      </div>
                                      {folder.files?.slice(0, 5).map((f, j) => (
                                        <div key={j} className="flex items-center gap-2 text-xs text-slate-500 py-0.5 px-4">
                                          <span className="text-slate-700">└</span>
                                          <span className="truncate">{f.name}</span>
                                        </div>
                                      ))}
                                      {(folder.files?.length || 0) > 5 && (
                                        <p className="text-xs text-slate-600 px-4">
                                          +{folder.files.length - 5} more files
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Section specifics */}
                          {type === 'section' && (
                            <div className="space-y-3">
                              {res.description && (
                                <p className="text-slate-400 text-sm leading-relaxed">{res.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-slate-400 flex-wrap">
                                <span className="flex items-center gap-1.5">
                                  <IoGlobeOutline size={14} className={res.visibility === 'public' ? 'text-green-400' : 'text-slate-500'} />
                                  <span className={res.visibility === 'public' ? 'text-green-400' : 'text-slate-400'}>
                                    {res.visibility === 'public' ? 'Public' : 'Private'}
                                  </span>
                                </span>
                                {res.subSections?.length > 0 && (
                                  <span className="flex items-center gap-1.5">
                                    <IoLayersOutline size={14} className="text-indigo-400" />
                                    {res.subSections.length} sub-section{res.subSections.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Tool specifics */}
                          {type === 'tool' && (
                            <div className="space-y-3">
                              {res.link && (
                                <div className="flex items-center gap-2 text-sm">
                                  <IoLinkOutline size={15} className="text-amber-400" />
                                  <a
                                    href={res.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-amber-400 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {res.link}
                                  </a>
                                </div>
                              )}
                              {countFiles(res) > 0 && (
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                  <IoDocumentTextOutline size={14} className="text-slate-500" />
                                  {countFiles(res)} file{countFiles(res) !== 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Admin action card */}
                  <div className="glass-card p-6 space-y-4">
                    <h3 className="text-white font-semibold mb-3">Admin Decision</h3>
                    <div>
                      <label className="text-sm text-slate-400 block mb-1.5">
                        Note to requester <span className="text-slate-600">(optional)</span>
                      </label>
                      <textarea
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        placeholder="Reason for approval or rejection…"
                        rows={3}
                        className="input-dark w-full resize-none text-sm"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleReview('approved')}
                        disabled={isReviewing}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors font-medium"
                      >
                        <IoCheckmarkCircleOutline size={18} />
                        {isReviewing ? 'Processing…' : 'Approve & Make Public'}
                      </button>
                      <button
                        onClick={() => handleReview('rejected')}
                        disabled={isReviewing}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors font-medium"
                      >
                        <IoCloseCircleOutline size={18} />
                        {isReviewing ? 'Processing…' : 'Reject'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Delete User Confirmation Modal */}
      <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete User">
        <p className="text-slate-300 mb-6">
          Are you sure you want to delete this user? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleDeleteUser} className="btn-primary bg-red-500 hover:bg-red-600">
            Delete User
          </button>
        </div>
      </Modal>

      {/* Delete Content Confirmation Modal */}
      <Modal
        isOpen={!!deleteContentModal}
        onClose={() => setDeleteContentModal(null)}
        title="Delete Content Permanently"
      >
        <p className="text-slate-300 mb-2">
          Are you sure you want to permanently delete:
        </p>
        <p className="text-white font-semibold mb-6 px-3 py-2 bg-slate-800/60 rounded-xl">
          {deleteContentModal?.title}
        </p>
        <p className="text-xs text-red-400/80 mb-6">
          This removes the content for ALL users who have it saved. This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteContentModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleAdminDeleteContent} className="btn-primary bg-red-500 hover:bg-red-600">
            Delete Permanently
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminPage;
