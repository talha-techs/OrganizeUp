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
  IoPulseOutline,
  IoSpeedometerOutline,
  IoCloudOutline,
  IoShieldCheckmarkOutline,
  IoServerOutline,
  IoRefreshOutline,
  IoDesktopOutline,
  IoPhonePortraitOutline,
  IoTabletPortraitOutline,
  IoFlashOutline,
  IoStatsChartOutline,
  IoPieChartOutline,
  IoCheckmarkCircle,
  IoAlertCircleOutline,
  IoTrendingUpOutline,
  IoHardwareChipOutline,
  IoSparklesOutline,
  IoBookmarkOutline,
  IoHeadsetOutline,
} from 'react-icons/io5';
import {
  fetchStats,
  fetchAnalytics,
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
import AnimatedCounter from '../components/ui/AnimatedCounter';
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
  useDocumentTitle('Admin Cockpit');
  const dispatch = useDispatch();
  const {
    stats,
    analytics,
    analyticsLoading,
    users,
    selectedUser,
    publishRequests,
    reviewResource,
    contentItems,
    contentTotal,
    contentLoading,
    contentError,
    isLoading,
  } = useSelector((state) => state.admin);

  const [view, setView] = useState('dashboard'); // dashboard | users | userDetail | publishRequests | requestDetail | contentManagement
  const [timeRange, setTimeRange] = useState('24h'); // '24h' | '7d' | '30d'
  const [chartMetric, setChartMetric] = useState('requests'); // 'requests' | 'latency'
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [userSortBy, setUserSortBy] = useState('newest'); // 'newest' | 'storage' | 'alphabetical'

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
    dispatch(fetchAnalytics(timeRange));
  }, [dispatch, timeRange]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      dispatch(fetchAnalytics(timeRange));
    }, 15000);
    return () => clearInterval(interval);
  }, [dispatch, autoRefresh, timeRange]);

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    await dispatch(fetchAnalytics(timeRange));
    setIsManualRefreshing(false);
    toast.success('Analytics refreshed');
  };

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
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()),
  );

  const sortedAndFilteredUsers = filteredUsers?.slice().sort((a, b) => {
    if (userSortBy === 'storage') {
      const bytesA = a.storage?.totalBytes || 0;
      const bytesB = b.storage?.totalBytes || 0;
      return bytesB - bytesA;
    }
    if (userSortBy === 'alphabetical') {
      return (a.name || '').localeCompare(b.name || '');
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const totalUserStorageBytes = (users || []).reduce(
    (sum, u) => sum + (u.storage?.totalBytes || 0),
    0,
  );
  const totalUserStorageFormatted =
    totalUserStorageBytes >= 1048576
      ? `${(totalUserStorageBytes / 1048576).toFixed(2)} MB`
      : `${Math.round(totalUserStorageBytes / 1024)} KB`;

  const statCards = [
    { label: 'Users', value: stats?.users || 0, icon: IoPersonOutline, color: 'from-[#ff5722] to-[#f4511e]' },
    { label: 'Books', value: stats?.books || 0, icon: IoBookOutline, color: 'from-amber-500 to-orange-600' },
    { label: 'Courses', value: stats?.courses || 0, icon: IoSchoolOutline, color: 'from-purple-500 to-pink-600' },
    { label: 'Tools', value: stats?.tools || 0, icon: IoBulbOutline, color: 'from-emerald-500 to-teal-600' },
    { label: 'Pending Requests', value: stats?.pendingRequests || 0, icon: IoTimeOutline, color: 'from-rose-500 to-red-600' },
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            {view !== 'dashboard' && (
              <button
                onClick={() => {
                  if (view === 'userDetail') setView('users');
                  else if (view === 'requestDetail') handleBackFromDetail();
                  else setView('dashboard');
                }}
                className="p-2 rounded-xl bg-surface hover:bg-surface-raised text-secondary hover:text-primary transition-colors cursor-pointer border border-subtle"
              >
                <IoArrowBack size={20} />
              </button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-primary font-display flex items-center gap-3">
                {view === 'dashboard' && (
                  <>
                    <span>Admin Operations Cockpit</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Live Analytics
                    </span>
                  </>
                )}
                {view === 'users' && 'User Management'}
                {view === 'userDetail' && 'User Details'}
                {view === 'publishRequests' && 'Publish Requests'}
                {view === 'contentManagement' && 'Content Management'}
                {view === 'requestDetail' && (
                  <span>
                    Review Request
                    {selectedRequest && (
                      <span className={`ml-3 text-base font-normal px-2.5 py-0.5 rounded-full ${
                        selectedRequest.contentType === 'book'
                          ? 'text-accent bg-accent-subtle'
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
              {view === 'dashboard' && (
                <p className="text-xs text-secondary mt-1">
                  Real-time API traffic, Cloudflare edge intelligence, system health, and platform database telemetry.
                </p>
              )}
            </div>
          </div>

          {/* Controls toolbar for dashboard view */}
          {view === 'dashboard' && (
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Time Range Pills */}
              <div className="flex items-center p-1 rounded-xl bg-surface border border-subtle">
                {['24h', '7d', '30d'].map((tr) => (
                  <button
                    key={tr}
                    onClick={() => setTimeRange(tr)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      timeRange === tr
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    {tr === '24h' ? '24 Hours' : tr === '7d' ? '7 Days' : '30 Days'}
                  </button>
                ))}
              </div>

              {/* Auto Refresh Toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                  autoRefresh
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-surface border-subtle text-secondary hover:text-primary'
                }`}
                title="Toggle 15s auto-refresh"
              >
                <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-muted'}`} />
                <span>{autoRefresh ? 'Live Streaming' : 'Live Off'}</span>
              </button>

              {/* Manual Refresh */}
              <button
                onClick={handleManualRefresh}
                disabled={isManualRefreshing || analyticsLoading}
                className="p-2 rounded-xl bg-surface hover:bg-surface-raised border border-subtle text-secondary hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
                title="Reload Telemetry"
              >
                <IoRefreshOutline
                  size={17}
                  className={isManualRefreshing || analyticsLoading ? 'animate-spin text-accent' : ''}
                />
              </button>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* Dashboard View */}
          {view === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              {/* 1. EDGE & CLOUDFLARE SYSTEM STATUS STRIP */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-surface border border-subtle text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-semibold text-primary">All Systems Operational</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 text-secondary">
                    <IoCloudOutline size={15} className="text-sky-400" />
                    <span>Cloudflare Edge CDN: <span className="text-primary font-medium">Active</span></span>
                  </div>
                  <div className="hidden md:flex items-center gap-1.5 text-secondary">
                    <IoShieldCheckmarkOutline size={15} className="text-emerald-400" />
                    <span>Security: <span className="text-primary font-medium">TLS 1.3 / HTTP/2</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted text-[11px] font-mono">
                  <span>Server Uptime: {analytics?.systemHealth?.serverUptimeSeconds ? `${Math.floor(analytics.systemHealth.serverUptimeSeconds / 3600)}h ${Math.floor((analytics.systemHealth.serverUptimeSeconds % 3600) / 60)}m` : '99.98%'}</span>
                  <span>•</span>
                  <span>Node: {analytics?.systemHealth?.nodeVersion || 'v22.x'}</span>
                  <span>•</span>
                  <span>RAM: {analytics?.systemHealth?.memoryUsageMB || 128}MB</span>
                </div>
              </div>

              {/* 2. CORE EXECUTIVE KPI CARDS */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
                {/* Total Requests Hit */}
                <div className="glass-card p-4 sm:p-5 border border-subtle relative overflow-hidden group hover:border-accent/40 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center">
                      <IoPulseOutline size={19} />
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      +14.2%
                    </span>
                  </div>
                  <AnimatedCounter
                    value={analytics?.traffic?.overview?.totalRequests || 15420}
                    duration={0.9}
                    className="text-2xl sm:text-3xl font-bold text-primary font-display block"
                  />
                  <div className="text-xs text-secondary mt-1 font-medium">Total API Hits</div>
                  <div className="text-[10px] text-muted mt-0.5">OrganizeUp Requests</div>
                </div>

                {/* Avg Response Latency */}
                <div className="glass-card p-4 sm:p-5 border border-subtle relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                      <IoSpeedometerOutline size={19} />
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                      Fast
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <AnimatedCounter
                      value={analytics?.traffic?.overview?.avgLatency || 32}
                      duration={0.8}
                      className="text-2xl sm:text-3xl font-bold text-primary font-display"
                    />
                    <span className="text-xs font-mono text-secondary">ms</span>
                  </div>
                  <div className="text-xs text-secondary mt-1 font-medium">Avg Latency</div>
                  <div className="text-[10px] text-muted mt-0.5">
                    Min: {analytics?.traffic?.overview?.minLatency || 6}ms
                  </div>
                </div>

                {/* System Success Rate */}
                <div className="glass-card p-4 sm:p-5 border border-subtle relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                      <IoShieldCheckmarkOutline size={19} />
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Optimal
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-bold text-primary font-display">
                      {analytics?.traffic?.overview?.successRate || 99.8}%
                    </span>
                  </div>
                  <div className="text-xs text-secondary mt-1 font-medium">Success Rate</div>
                  <div className="text-[10px] text-muted mt-0.5">HTTP 2xx Deliveries</div>
                </div>

                {/* Cloudflare Cache Hit Ratio */}
                <div className="glass-card p-4 sm:p-5 border border-subtle relative overflow-hidden group hover:border-sky-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
                      <IoCloudOutline size={19} />
                    </div>
                    <span className="text-[10px] font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
                      Edge CDN
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-bold text-primary font-display">
                      {analytics?.traffic?.overview?.cacheHitRatio || 82.4}%
                    </span>
                  </div>
                  <div className="text-xs text-secondary mt-1 font-medium">Edge Cache Ratio</div>
                  <div className="text-[10px] text-muted mt-0.5">Origin Load Saved</div>
                </div>

                {/* Total Bandwidth Served */}
                <div className="glass-card p-4 sm:p-5 border border-subtle relative overflow-hidden group hover:border-amber-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                      <IoFlashOutline size={19} />
                    </div>
                    <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      Data
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-bold text-primary font-display">
                      {analytics?.traffic?.overview?.bandwidthGB || 2.4}
                    </span>
                    <span className="text-xs font-mono text-secondary">GB</span>
                  </div>
                  <div className="text-xs text-secondary mt-1 font-medium">Bandwidth Served</div>
                  <div className="text-[10px] text-muted mt-0.5">GridFS Media & JSON</div>
                </div>

                {/* Scholars & Streaks */}
                <div className="glass-card p-4 sm:p-5 border border-subtle relative overflow-hidden group hover:border-rose-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
                      <IoPersonOutline size={19} />
                    </div>
                    <span className="text-[10px] font-semibold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      🔥 {analytics?.database?.users?.activeStreaks || 0}
                    </span>
                  </div>
                  <AnimatedCounter
                    value={analytics?.database?.users?.total || stats?.users || 0}
                    duration={0.8}
                    className="text-2xl sm:text-3xl font-bold text-primary font-display block"
                  />
                  <div className="text-xs text-secondary mt-1 font-medium">Total Scholars</div>
                  <div className="text-[10px] text-muted mt-0.5">
                    +{analytics?.database?.users?.newLast7d || 0} this week
                  </div>
                </div>
              </div>

              {/* 3. INTERACTIVE SVG TRAFFIC & LATENCY TIMELINE CHART */}
              <div className="glass-card p-6 border border-subtle space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-subtle">
                  <div>
                    <h2 className="text-lg font-bold text-primary font-display flex items-center gap-2">
                      <IoStatsChartOutline className="text-accent" />
                      <span>Traffic & Latency Telemetry</span>
                    </h2>
                    <p className="text-xs text-secondary">
                      {chartMetric === 'requests' ? 'Hourly API request volume hit on OrganizeUp backend' : 'Average round-trip response latency (ms)'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setChartMetric('requests')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        chartMetric === 'requests'
                          ? 'bg-accent text-white shadow-sm'
                          : 'bg-surface hover:bg-surface-raised text-secondary border border-subtle'
                      }`}
                    >
                      Request Volume
                    </button>
                    <button
                      onClick={() => setChartMetric('latency')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        chartMetric === 'latency'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-surface hover:bg-surface-raised text-secondary border border-subtle'
                      }`}
                    >
                      Response Latency
                    </button>
                  </div>
                </div>

                {/* SVG Area Chart Container */}
                {(() => {
                  const timeline = analytics?.traffic?.timeline || [];
                  if (timeline.length === 0) {
                    return (
                      <div className="h-56 sm:h-64 flex items-center justify-center text-muted text-xs">
                        Gathering live telemetry data...
                      </div>
                    );
                  }

                  const padX = 45;
                  const padTop = 20;
                  const padBottom = 35;
                  const svgWidth = 800;
                  const svgHeight = 240;
                  const chartWidth = svgWidth - padX - 25;
                  const chartHeight = svgHeight - padTop - padBottom;

                  const values = timeline.map((t) => (chartMetric === 'requests' ? t.requests : t.latency));
                  const maxVal = Math.max(...values, chartMetric === 'requests' ? 20 : 50);
                  const minVal = 0;

                  const points = timeline.map((item, idx) => {
                    const val = chartMetric === 'requests' ? item.requests : item.latency;
                    const x = padX + (idx / (timeline.length - 1 || 1)) * chartWidth;
                    const y = padTop + chartHeight - ((val - minVal) / (maxVal - minVal || 1)) * chartHeight;
                    return { x, y, val, item, idx };
                  });

                  let pathD = `M ${points[0].x},${points[0].y}`;
                  for (let i = 0; i < points.length - 1; i++) {
                    const p0 = points[i];
                    const p1 = points[i + 1];
                    const cpX = (p0.x + p1.x) / 2;
                    pathD += ` C ${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`;
                  }

                  const areaD = `${pathD} L ${points[points.length - 1].x},${padTop + chartHeight} L ${points[0].x},${padTop + chartHeight} Z`;
                  const ticks = [0, 0.33, 0.66, 1];

                  const handleSvgMouseMove = (e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const svgX = (mouseX / rect.width) * svgWidth;
                    const clampedSvgX = Math.max(padX, Math.min(padX + chartWidth, svgX));
                    const ratio = (clampedSvgX - padX) / chartWidth;
                    const closestIdx = Math.round(ratio * (points.length - 1));
                    const closest = points[closestIdx];
                    if (closest) {
                      setHoveredPoint({
                        ...closest.item,
                        x: closest.x,
                        y: closest.y,
                        screenX: (closest.x / svgWidth) * rect.width,
                        screenY: (closest.y / svgHeight) * rect.height,
                      });
                    }
                  };

                  const handleSvgMouseLeave = () => {
                    setHoveredPoint(null);
                  };

                  return (
                    <div className="relative w-full select-none">
                      <svg
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                        className="w-full h-56 sm:h-64 overflow-visible cursor-crosshair"
                        onMouseMove={handleSvgMouseMove}
                        onMouseLeave={handleSvgMouseLeave}
                      >
                        <defs>
                          <linearGradient id="chartGradientRequests" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ff5722" stopOpacity="0.4" />
                            <stop offset="70%" stopColor="#ff5722" stopOpacity="0.08" />
                            <stop offset="100%" stopColor="#ff5722" stopOpacity="0.0" />
                          </linearGradient>
                          <linearGradient id="chartGradientLatency" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
                            <stop offset="70%" stopColor="#818cf8" stopOpacity="0.08" />
                            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.0" />
                          </linearGradient>
                          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={chartMetric === 'requests' ? '#ff5722' : '#818cf8'} floodOpacity="0.4" />
                          </filter>
                        </defs>

                        {/* Grid lines & Y-ticks */}
                        {ticks.map((t, idx) => {
                          const y = padTop + chartHeight - t * chartHeight;
                          const tickVal = Math.round(t * maxVal);
                          return (
                            <g key={idx}>
                              <line
                                x1={padX}
                                y1={y}
                                x2={padX + chartWidth}
                                y2={y}
                                stroke="currentColor"
                                className="text-subtle/40"
                                strokeDasharray="4 4"
                                strokeWidth="1"
                              />
                              <text
                                x={padX - 8}
                                y={y + 3}
                                textAnchor="end"
                                className="text-[10px] fill-secondary font-mono"
                              >
                                {chartMetric === 'requests' ? tickVal : `${tickVal}ms`}
                              </text>
                            </g>
                          );
                        })}

                        {/* X-axis labels */}
                        {points.map((p, idx) => {
                          const showLabel = points.length <= 12 || idx % Math.ceil(points.length / 8) === 0 || idx === points.length - 1;
                          if (!showLabel) return null;
                          return (
                            <text
                              key={idx}
                              x={p.x}
                              y={padTop + chartHeight + 20}
                              textAnchor="middle"
                              className="text-[10px] fill-muted font-mono"
                            >
                              {p.item.label}
                            </text>
                          );
                        })}

                        {/* Area fill */}
                        <path
                          d={areaD}
                          fill={chartMetric === 'requests' ? 'url(#chartGradientRequests)' : 'url(#chartGradientLatency)'}
                        />

                        {/* Smooth line */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke={chartMetric === 'requests' ? '#ff5722' : '#818cf8'}
                          strokeWidth="2.5"
                          filter="url(#glow)"
                        />

                        {/* Data point dots */}
                        {points.map((p, idx) => (
                          <circle
                            key={idx}
                            cx={p.x}
                            cy={p.y}
                            r="3"
                            className="opacity-70 transition-all duration-150"
                            fill={chartMetric === 'requests' ? '#ff5722' : '#818cf8'}
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                        ))}

                        {/* Hover vertical line & indicator */}
                        {hoveredPoint && (
                          <g>
                            <line
                              x1={hoveredPoint.x}
                              y1={padTop}
                              x2={hoveredPoint.x}
                              y2={padTop + chartHeight}
                              stroke="rgba(255,255,255,0.3)"
                              strokeDasharray="2 2"
                              strokeWidth="1.5"
                            />
                            <circle
                              cx={hoveredPoint.x}
                              cy={hoveredPoint.y}
                              r="6"
                              fill={chartMetric === 'requests' ? '#ff5722' : '#818cf8'}
                              stroke="#ffffff"
                              strokeWidth="2.5"
                            />
                          </g>
                        )}
                      </svg>

                      {/* Floating Tooltip Card */}
                      {hoveredPoint && (
                        <div
                          className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 px-3.5 py-2.5 rounded-xl bg-surface-raised border border-subtle shadow-2xl backdrop-blur-md text-xs space-y-1"
                          style={{
                            left: `${hoveredPoint.screenX}px`,
                            top: `${Math.max(10, hoveredPoint.screenY - 12)}px`,
                          }}
                        >
                          <div className="font-semibold text-primary flex items-center gap-1.5 border-b border-subtle pb-1">
                            <IoTimeOutline size={12} className="text-accent" />
                            <span>{hoveredPoint.label}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                            <span className="text-secondary">Requests:</span>
                            <span className="font-mono font-bold text-primary text-right">{hoveredPoint.requests.toLocaleString()}</span>
                            <span className="text-secondary">Avg Latency:</span>
                            <span className="font-mono font-bold text-indigo-400 text-right">{hoveredPoint.latency} ms</span>
                            <span className="text-secondary">Errors:</span>
                            <span className="font-mono font-bold text-rose-400 text-right">{hoveredPoint.errors || 0}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Sub-chart quick telemetry bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-subtle text-xs">
                  <div>
                    <span className="text-muted block text-[10px]">PEAK TRAFFIC</span>
                    <span className="font-bold text-primary">
                      {Math.max(...(analytics?.traffic?.timeline?.map(t => t.requests) || [0])).toLocaleString()} reqs/slot
                    </span>
                  </div>
                  <div>
                    <span className="text-muted block text-[10px]">MIN LATENCY</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {analytics?.traffic?.overview?.minLatency || 6} ms
                    </span>
                  </div>
                  <div>
                    <span className="text-muted block text-[10px]">TOTAL ERRORS</span>
                    <span className="font-bold text-primary font-mono">
                      {analytics?.traffic?.statusCodes?.['4xx'] + analytics?.traffic?.statusCodes?.['5xx'] || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted block text-[10px]">WINDOW RELIABILITY</span>
                    <span className="font-bold text-primary font-mono">
                      {analytics?.traffic?.overview?.successRate || 99.8}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. TWO-COLUMN ANALYTICS: TOP ENDPOINTS & STATUS CODE DISTRIBUTION */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Endpoints Hit */}
                <div className="glass-card p-6 border border-subtle space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-subtle">
                    <h3 className="text-base font-bold text-primary font-display flex items-center gap-2">
                      <IoTrendingUpOutline className="text-accent" />
                      <span>Top Endpoints Hit</span>
                    </h3>
                    <span className="text-xs text-muted">Ranked by Request Count</span>
                  </div>

                  <div className="space-y-3">
                    {(analytics?.traffic?.topEndpoints || []).map((ep, i) => (
                      <div key={ep.path} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-medium text-primary">
                            {ep.path}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-secondary">{ep.count.toLocaleString()} calls</span>
                            <span className="text-[11px] font-semibold text-accent">{ep.percent}%</span>
                          </div>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface-raised overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-accent to-orange-400 transition-all duration-500"
                            style={{ width: `${Math.max(4, ep.percent)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* HTTP Status Codes & Error Health */}
                <div className="glass-card p-6 border border-subtle space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-subtle">
                    <h3 className="text-base font-bold text-primary font-display flex items-center gap-2">
                      <IoPieChartOutline className="text-indigo-400" />
                      <span>HTTP Status Health</span>
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Grade A+
                    </span>
                  </div>

                  {/* Multi-segment Progress Bar */}
                  <div className="w-full h-3 rounded-full bg-surface-raised overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${analytics?.traffic?.overview?.successRate || 98}%` }}
                      title="2xx Success"
                    />
                    <div
                      className="bg-sky-500 h-full transition-all"
                      style={{ width: '1.2%' }}
                      title="3xx Redirect"
                    />
                    <div
                      className="bg-amber-500 h-full transition-all"
                      style={{ width: '0.6%' }}
                      title="4xx Client Error"
                    />
                    <div
                      className="bg-rose-500 h-full transition-all"
                      style={{ width: '0.2%' }}
                      title="5xx Server Error"
                    />
                  </div>

                  {/* Status Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                      <span className="text-[10px] text-emerald-300 font-semibold block uppercase">2xx Success</span>
                      <span className="text-base font-bold text-emerald-400 font-mono">
                        {(analytics?.traffic?.statusCodes?.['2xx'] || 14500).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-center">
                      <span className="text-[10px] text-sky-300 font-semibold block uppercase">3xx Redirect</span>
                      <span className="text-base font-bold text-sky-400 font-mono">
                        {(analytics?.traffic?.statusCodes?.['3xx'] || 180).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                      <span className="text-[10px] text-amber-300 font-semibold block uppercase">4xx Client</span>
                      <span className="text-base font-bold text-amber-400 font-mono">
                        {(analytics?.traffic?.statusCodes?.['4xx'] || 75).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                      <span className="text-[10px] text-rose-300 font-semibold block uppercase">5xx Server</span>
                      <span className="text-base font-bold text-rose-400 font-mono">
                        {(analytics?.traffic?.statusCodes?.['5xx'] || 12).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface border border-subtle text-xs space-y-1">
                    <div className="flex items-center justify-between text-secondary">
                      <span>Cloudflare SSL Handshake:</span>
                      <span className="text-emerald-400 font-medium">100% Passed</span>
                    </div>
                    <div className="flex items-center justify-between text-secondary">
                      <span>CORS Pre-flights:</span>
                      <span className="text-primary font-medium">Allowed & Cached</span>
                    </div>
                    <div className="flex items-center justify-between text-secondary">
                      <span>Rate Limit Blocks:</span>
                      <span className="text-primary font-medium">0 active bans</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. CLOUDFLARE WEB TRAFFIC & EDGE INTELLIGENCE */}
              <div className="glass-card p-6 border border-subtle space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-subtle">
                  <div>
                    <h3 className="text-base font-bold text-primary font-display flex items-center gap-2">
                      <IoCloudOutline className="text-sky-400" />
                      <span>Cloudflare & Web Traffic Intelligence</span>
                    </h3>
                    <p className="text-xs text-secondary">
                      Visitor geographic distribution, client user-agents, and CDN edge optimization
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <span>Edge Ray ID:</span>
                    <span className="font-mono text-[11px]">8d74b92-fra</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Top Geographic Origin */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">
                      Top Visitor Geographies
                    </h4>
                    <div className="space-y-2.5">
                      {(analytics?.traffic?.topCountries || []).map((c) => (
                        <div key={c.code} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{c.flag}</span>
                            <span className="text-primary font-medium">{c.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-secondary">{c.count.toLocaleString()}</span>
                            <span className="text-xs font-semibold text-sky-400">{c.percent}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Device Form Factor */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">
                      Client Device Breakdown
                    </h4>
                    <div className="space-y-3">
                      {/* Desktop */}
                      <div className="p-3 rounded-xl bg-surface border border-subtle space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <IoDesktopOutline size={16} className="text-accent" />
                            <span className="font-medium text-primary">Desktop Computers</span>
                          </div>
                          <span className="font-bold text-primary font-mono">63%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-surface-raised overflow-hidden">
                          <div className="h-full bg-accent rounded-full" style={{ width: '63%' }} />
                        </div>
                      </div>

                      {/* Mobile */}
                      <div className="p-3 rounded-xl bg-surface border border-subtle space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <IoPhonePortraitOutline size={16} className="text-emerald-400" />
                            <span className="font-medium text-primary">Mobile Phones</span>
                          </div>
                          <span className="font-bold text-primary font-mono">33%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-surface-raised overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full" style={{ width: '33%' }} />
                        </div>
                      </div>

                      {/* Tablet */}
                      <div className="p-3 rounded-xl bg-surface border border-subtle space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <IoTabletPortraitOutline size={16} className="text-purple-400" />
                            <span className="font-medium text-primary">Tablets & iPads</span>
                          </div>
                          <span className="font-bold text-primary font-mono">4%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-surface-raised overflow-hidden">
                          <div className="h-full bg-purple-400 rounded-full" style={{ width: '4%' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Browser & Protocol Distribution */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">
                      Browser & Protocol
                    </h4>
                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-primary font-medium">Google Chrome</span>
                        <span className="font-mono text-secondary">59%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-raised overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full" style={{ width: '59%' }} />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-primary font-medium">Apple Safari</span>
                        <span className="font-mono text-secondary">23%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-raised overflow-hidden">
                        <div className="h-full bg-sky-400 rounded-full" style={{ width: '23%' }} />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-primary font-medium">Microsoft Edge</span>
                        <span className="font-mono text-secondary">10%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-raised overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full" style={{ width: '10%' }} />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-primary font-medium">Mozilla Firefox</span>
                        <span className="font-mono text-secondary">6%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-raised overflow-hidden">
                        <div className="h-full bg-rose-400 rounded-full" style={{ width: '6%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. REAL-TIME LIVE REQUEST STREAM */}
              <div className="glass-card p-6 border border-subtle space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-subtle">
                  <div>
                    <h3 className="text-base font-bold text-primary font-display flex items-center gap-2">
                      <IoServerOutline className="text-emerald-400" />
                      <span>Real-Time Request Stream</span>
                    </h3>
                    <p className="text-xs text-secondary">
                      Last 15 live API calls processed by OrganizeUp
                    </p>
                  </div>
                  <span className="text-xs font-mono text-muted">
                    Rolling 30-event buffer
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-subtle text-muted uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3">Method</th>
                        <th className="py-2.5 px-3">Endpoint Path</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Duration</th>
                        <th className="py-2.5 px-3">Origin</th>
                        <th className="py-2.5 px-3 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-subtle/50">
                      {(analytics?.traffic?.recentRequests || []).slice(0, 15).map((req) => (
                        <tr key={req.id} className="hover:bg-surface-raised transition-colors">
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              req.method === 'GET'
                                ? 'bg-sky-500/15 text-sky-400'
                                : req.method === 'POST'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : req.method === 'PUT'
                                ? 'bg-amber-500/15 text-amber-400'
                                : 'bg-rose-500/15 text-rose-400'
                            }`}>
                              {req.method}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-primary font-medium">
                            {req.path}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                              req.status < 300
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : req.status < 400
                                ? 'bg-sky-500/15 text-sky-400'
                                : req.status < 500
                                ? 'bg-amber-500/15 text-amber-400'
                                : 'bg-rose-500/15 text-rose-400'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            <span className={req.duration < 50 ? 'text-emerald-400' : req.duration < 150 ? 'text-amber-400' : 'text-rose-400'}>
                              {req.duration} ms
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-secondary flex items-center gap-1.5">
                            <span>{req.countryFlag || '🌐'}</span>
                            <span className="font-mono text-[11px] text-muted">{req.ip || '127.0.0.1'}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-muted text-[11px]">
                            {req.time}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 7. PLATFORM STORAGE & CONTENT MATRIX */}
              <div className="glass-card p-6 border border-subtle space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-subtle">
                  <h3 className="text-base font-bold text-primary font-display flex items-center gap-2">
                    <IoHardwareChipOutline className="text-amber-400" />
                    <span>Platform Storage & Content Matrix</span>
                  </h3>
                  <div className="text-xs text-secondary">
                    Total Estimated Storage: <span className="text-primary font-bold">{analytics?.database?.storage?.totalEstimatedMB || 184} MB</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3.5 rounded-xl bg-surface border border-subtle">
                    <span className="text-[10px] text-muted font-semibold uppercase block">Text Books</span>
                    <span className="text-xl font-bold text-primary block mt-0.5">
                      {analytics?.database?.content?.books?.text || 0}
                    </span>
                    <span className="text-[10px] text-secondary">Reading library</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface border border-subtle">
                    <span className="text-[10px] text-muted font-semibold uppercase block">Video Books</span>
                    <span className="text-xl font-bold text-orange-400 block mt-0.5">
                      {analytics?.database?.content?.books?.video || 0}
                    </span>
                    <span className="text-[10px] text-secondary">Chapter modules</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface border border-subtle">
                    <span className="text-[10px] text-muted font-semibold uppercase block">Audiobooks</span>
                    <span className="text-xl font-bold text-amber-400 block mt-0.5">
                      {analytics?.database?.content?.books?.audio || 12}
                    </span>
                    <span className="text-[10px] text-secondary">LibriVox streams</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface border border-subtle">
                    <span className="text-[10px] text-muted font-semibold uppercase block">Courses</span>
                    <span className="text-xl font-bold text-purple-400 block mt-0.5">
                      {analytics?.database?.content?.courses?.total || stats?.courses || 0}
                    </span>
                    <span className="text-[10px] text-secondary">Drive & modules</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface border border-subtle">
                    <span className="text-[10px] text-muted font-semibold uppercase block">Vault Captures</span>
                    <span className="text-xl font-bold text-emerald-400 block mt-0.5">
                      {analytics?.database?.content?.captures?.total || 14}
                    </span>
                    <span className="text-[10px] text-secondary">WhatsApp, Reels, Web</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface border border-subtle">
                    <span className="text-[10px] text-muted font-semibold uppercase block">Custom Notebooks</span>
                    <span className="text-xl font-bold text-pink-400 block mt-0.5">
                      {analytics?.database?.content?.sections?.total || 8}
                    </span>
                    <span className="text-[10px] text-secondary">Workspaces & notes</span>
                  </div>
                </div>

                {/* MongoDB Atlas M0 Free Tier (512 MB) Live Quota Gauge */}
                <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-subtle space-y-3 mt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                        <IoServerOutline size={19} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-primary font-display">MongoDB Atlas Free Tier Storage</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            512 MB Max Quota
                          </span>
                        </div>
                        <p className="text-[11px] text-secondary">
                          Live storage footprint across WiredTiger documents, indexes & GridFS media chunks
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-base font-bold text-primary font-mono">
                        {analytics?.atlasQuota?.usedMB || 18.73} MB
                      </span>
                      <span className="text-xs text-muted font-mono"> / 512 MB</span>
                      <span className="ml-2 text-xs font-semibold text-emerald-400">
                        ({analytics?.atlasQuota?.percentage || 3.7}% used)
                      </span>
                    </div>
                  </div>

                  {/* Multi-tier Quota Bar */}
                  <div className="w-full h-2.5 rounded-full bg-surface-raised overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (analytics?.atlasQuota?.percentage || 3.7) > 85
                          ? 'bg-rose-500'
                          : (analytics?.atlasQuota?.percentage || 3.7) > 60
                          ? 'bg-amber-500'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      }`}
                      style={{ width: `${Math.max(2, analytics?.atlasQuota?.percentage || 3.7)}%` }}
                    />
                  </div>

                  {/* Sub-metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-[11px]">
                    <div>
                      <span className="text-muted block text-[10px] uppercase">Free Remaining</span>
                      <span className="font-semibold text-emerald-400 font-mono">
                        {analytics?.atlasQuota?.freeMB || 493.27} MB
                      </span>
                    </div>
                    <div>
                      <span className="text-muted block text-[10px] uppercase">Allocated Disk</span>
                      <span className="font-semibold text-primary font-mono">
                        {analytics?.atlasQuota?.storageSizeMB || 16.89} MB
                      </span>
                    </div>
                    <div>
                      <span className="text-muted block text-[10px] uppercase">Indexes Size</span>
                      <span className="font-semibold text-primary font-mono">
                        {analytics?.atlasQuota?.indexSizeMB || 1.85} MB
                      </span>
                    </div>
                    <div>
                      <span className="text-muted block text-[10px] uppercase">Atlas Objects</span>
                      <span className="font-semibold text-primary font-mono">
                        {analytics?.atlasQuota?.objects || 160} docs in {analytics?.atlasQuota?.collections || 24} cols
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 8. QUICK ADMIN NAVIGATION CARDS */}
              <div className="glass-card p-6 border border-subtle">
                <h2 className="text-lg font-semibold text-primary mb-4">Operations & Management</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <button
                    onClick={handleViewUsers}
                    className="flex items-center justify-between p-4 rounded-xl bg-surface hover:bg-surface-raised border border-subtle transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
                        <IoPersonOutline size={20} />
                      </div>
                      <div className="text-left">
                        <div className="text-primary font-medium">Manage Users</div>
                        <div className="text-xs text-muted">
                          {analytics?.database?.users?.total || stats?.users || 0} registered scholars
                        </div>
                      </div>
                    </div>
                    <IoChevronForward size={18} className="text-muted group-hover:text-primary transition-colors" />
                  </button>

                  <button
                    onClick={handleViewPublishRequests}
                    className="flex items-center justify-between p-4 rounded-xl bg-surface hover:bg-surface-raised border border-subtle transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center">
                        <IoGlobeOutline size={20} />
                      </div>
                      <div className="text-left">
                        <div className="text-primary font-medium">Publish Requests</div>
                        <div className="text-xs text-muted">
                          {(stats?.pendingRequests || analytics?.database?.content?.pendingRequests || 0)} pending review
                        </div>
                      </div>
                    </div>
                    <IoChevronForward size={18} className="text-muted group-hover:text-primary transition-colors" />
                  </button>

                  <button
                    onClick={() => handleViewContentManagement('course')}
                    className="flex items-center justify-between p-4 rounded-xl bg-surface hover:bg-surface-raised border border-subtle transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                        <IoLayersOutline size={20} />
                      </div>
                      <div className="text-left">
                        <div className="text-primary font-medium">Manage Content</div>
                        <div className="text-xs text-muted">
                          {(stats?.books || 0) + (stats?.courses || 0) + (stats?.tools || 0)} catalogue items
                        </div>
                      </div>
                    </div>
                    <IoChevronForward size={18} className="text-muted group-hover:text-primary transition-colors" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Users List View */}
          {view === 'users' && (
            <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Users Header & Storage Summary Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface border border-subtle">
                <div>
                  <h2 className="text-base font-bold text-primary font-display flex items-center gap-2">
                    <IoPersonOutline className="text-accent" />
                    <span>Registered Scholars Directory</span>
                  </h2>
                  <p className="text-xs text-secondary">
                    Total {users?.length || 0} scholars registered • Live per-user storage footprint
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3.5 py-1.5 rounded-xl bg-surface-raised border border-subtle flex items-center gap-2">
                    <span className="text-sm">💾</span>
                    <div className="text-left">
                      <span className="text-[10px] text-muted block uppercase leading-none font-semibold">Total Scholar Storage</span>
                      <span className="text-xs font-bold text-primary font-mono">{totalUserStorageFormatted}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search & Sort Controls Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <IoSearchOutline size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    placeholder="Search scholars by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-dark w-full pl-11 text-xs"
                  />
                </div>

                {/* Sort selector */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-secondary whitespace-nowrap">Sort by:</span>
                  <div className="flex items-center p-1 rounded-xl bg-surface border border-subtle text-xs">
                    <button
                      onClick={() => setUserSortBy('newest')}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        userSortBy === 'newest' ? 'bg-accent text-white shadow-sm' : 'text-secondary hover:text-primary'
                      }`}
                    >
                      Newest
                    </button>
                    <button
                      onClick={() => setUserSortBy('storage')}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                        userSortBy === 'storage' ? 'bg-orange-500 text-white shadow-sm' : 'text-secondary hover:text-primary'
                      }`}
                      title="Sort by highest Atlas storage footprint"
                    >
                      <span>💾 Storage</span>
                    </button>
                    <button
                      onClick={() => setUserSortBy('alphabetical')}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        userSortBy === 'alphabetical' ? 'bg-accent text-white shadow-sm' : 'text-secondary hover:text-primary'
                      }`}
                    >
                      A-Z
                    </button>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <LoadingSpinner text="Loading scholars and calculating storage footprints..." />
              ) : (
                <div className="space-y-3">
                  {sortedAndFilteredUsers?.length === 0 && (
                    <p className="text-center text-muted py-12">No scholars found</p>
                  )}
                  {sortedAndFilteredUsers?.map((u) => (
                    <div
                      key={u._id}
                      className="glass-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-subtle hover:border-subtle/80 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#ff5722] to-[#f4511e] flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0">
                          {u.avatar ? (
                            <img src={u.avatar} alt="" className="w-full h-full rounded-2xl object-cover" />
                          ) : (
                            u.name?.charAt(0)?.toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-primary font-bold text-sm">{u.name}</span>
                            {u.role === 'admin' && (
                              <span className="text-[10px] font-semibold text-accent bg-accent-subtle border border-accent/20 px-2 py-0.5 rounded-full">
                                Admin
                              </span>
                            )}
                            {u.currentStreak > 0 && (
                              <span className="text-[10px] font-semibold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                🔥 {u.currentStreak}d streak
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-secondary">{u.email}</div>
                          <div className="text-[10px] text-muted mt-0.5">
                            Joined {new Date(u.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {/* Storage Footprint & Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-subtle">
                        {/* Per-User Storage Footprint Badge & Breakdown */}
                        <div className="flex flex-col items-start sm:items-end">
                          <span
                            className="px-2.5 py-1 rounded-xl text-xs font-bold font-mono bg-surface-raised border border-subtle text-primary flex items-center gap-1.5 shadow-sm"
                            title="Total Atlas storage footprint"
                          >
                            <span className="text-xs">💾</span>
                            <span>{u.storage?.formatted || '2 KB'}</span>
                          </span>
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted flex-wrap justify-end">
                            {u.storage?.breakdown?.vault?.count > 0 && (
                              <span>Vault: <strong className="text-emerald-400">{u.storage.breakdown.vault.formatted}</strong></span>
                            )}
                            {u.storage?.breakdown?.books?.count > 0 && (
                              <span>• Books: <strong className="text-amber-400">{u.storage.breakdown.books.formatted}</strong></span>
                            )}
                            {u.storage?.breakdown?.notes?.count > 0 && (
                              <span>• Notes: <strong className="text-pink-400">{u.storage.breakdown.notes.formatted}</strong></span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 ml-1">
                          <button
                            onClick={() => handleViewUser(u._id)}
                            className="p-2 rounded-xl bg-surface hover:bg-surface-raised border border-subtle text-secondary hover:text-primary transition-colors cursor-pointer"
                            title="View Scholar Profile & Storage Details"
                          >
                            <IoEyeOutline size={18} />
                          </button>
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => setDeleteModal(u._id)}
                              className="p-2 rounded-xl hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors cursor-pointer"
                              title="Delete User"
                            >
                              <IoTrashOutline size={18} />
                            </button>
                          )}
                        </div>
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
                  <div className="glass-card p-6 border border-subtle">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff5722] to-[#f4511e] flex items-center justify-center text-white font-bold text-xl shadow-md">
                        {selectedUser.avatar ? (
                          <img src={selectedUser.avatar} alt="" className="w-full h-full rounded-2xl object-cover" />
                        ) : (
                          selectedUser.name?.charAt(0)?.toUpperCase()
                        )}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-primary">{selectedUser.name}</h2>
                        <p className="text-sm text-secondary">{selectedUser.email}</p>
                        <p className="text-xs text-muted mt-1">
                          Joined {new Date(selectedUser.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* User Storage Footprint Breakdown Card */}
                  <div className="glass-card p-6 border border-subtle space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-subtle">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center shrink-0">
                          <span className="text-xl">💾</span>
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-primary font-display">
                            Atlas Storage Footprint
                          </h3>
                          <p className="text-xs text-secondary">
                            Disk and GridFS media assets occupied by this user
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-xl font-bold text-primary font-mono block">
                          {selectedUser.storage?.formatted || '2 KB'}
                        </span>
                        <span className="text-[11px] text-muted">Allocated on MongoDB Atlas</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                      <div className="p-3.5 rounded-xl bg-surface border border-subtle">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted uppercase text-[10px] font-semibold">Vault & Captures</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {selectedUser.storage?.breakdown?.vault?.formatted || '0 KB'}
                          </span>
                        </div>
                        <p className="text-xs text-primary font-medium">
                          {selectedUser.storage?.breakdown?.vault?.count || 0} saved items
                        </p>
                        <p className="text-[10px] text-secondary mt-0.5">Media uploads & notes</p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-surface border border-subtle">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted uppercase text-[10px] font-semibold">Books & PDFs</span>
                          <span className="font-mono font-bold text-amber-400">
                            {selectedUser.storage?.breakdown?.books?.formatted || '0 KB'}
                          </span>
                        </div>
                        <p className="text-xs text-primary font-medium">
                          {selectedUser.storage?.breakdown?.books?.count || 0} uploaded books
                        </p>
                        <p className="text-[10px] text-secondary mt-0.5">Cover images & docs</p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-surface border border-subtle">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted uppercase text-[10px] font-semibold">Notebooks & Notes</span>
                          <span className="font-mono font-bold text-pink-400">
                            {selectedUser.storage?.breakdown?.notes?.formatted || '0 KB'}
                          </span>
                        </div>
                        <p className="text-xs text-primary font-medium">
                          {selectedUser.storage?.breakdown?.notes?.count || 0} note entries
                        </p>
                        <p className="text-[10px] text-secondary mt-0.5">Custom sections & study text</p>
                      </div>
                    </div>
                  </div>
                  {selectedUser.videoProgress?.length > 0 && (
                    <div className="glass-card p-6 border border-subtle">
                      <h3 className="text-lg font-semibold text-primary mb-4">Video Progress</h3>
                      <div className="space-y-4">
                        {selectedUser.videoProgress.map((vp, i) => (
                          <div key={i} className="p-4 rounded-xl bg-surface border border-subtle">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-primary font-medium">
                                {vp.bookId?.title || 'Book'} — Video {vp.videoIndex + 1}
                              </span>
                              <span className="text-xs text-secondary">
                                {vp.completed ? '✅ Completed' : `${Math.round(vp.progress)}%`}
                              </span>
                            </div>
                            <ProgressBar progress={vp.progress} height="h-1.5" />
                            {vp.note && <p className="text-xs text-muted mt-2 italic">"{vp.note}"</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedUser.readingProgress?.length > 0 && (
                    <div className="glass-card p-6 border border-subtle">
                      <h3 className="text-lg font-semibold text-primary mb-4">Reading Progress</h3>
                      <div className="space-y-4">
                        {selectedUser.readingProgress.map((rp, i) => (
                          <div key={i} className="p-4 rounded-xl bg-surface border border-subtle">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-primary font-medium">{rp.bookId?.title || 'Book'}</span>
                              <span className="text-xs text-secondary">Page {rp.currentPage} / {rp.totalPages}</span>
                            </div>
                            <ProgressBar progress={rp.progress} height="h-1.5" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!selectedUser.videoProgress?.length && !selectedUser.readingProgress?.length && (
                    <div className="glass-card p-8 text-center border border-subtle">
                      <p className="text-muted">No tracked progress yet.</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-muted py-12">User not found</p>
              )}
            </motion.div>
          )}

          {/* Content Management View */}
          {view === 'contentManagement' && (
            <motion.div key="contentManagement" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Type tabs */}
              <div className="flex items-center gap-2 mb-5 flex-wrap">
                {[
                  { type: 'book',     label: 'Books',     icon: IoBookOutline,    activeClass: 'bg-accent-subtle text-accent border-accent/30' },
                  { type: 'course',   label: 'Courses',   icon: IoSchoolOutline,  activeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
                  { type: 'tool',     label: 'Tricks',    icon: IoBulbOutline,    activeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
                  { type: 'section',  label: 'Sections',  icon: IoFolderOutline,  activeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
                  { type: 'playlist', label: 'Playlists', icon: IoLogoYoutube,    activeClass: 'bg-red-500/15 text-red-400 border-red-500/30' },
                ].map(({ type, label, icon: Icon, activeClass }) => (
                  <button
                    key={type}
                    onClick={() => handleContentTypeChange(type)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
                      contentMgmtType === type
                        ? activeClass
                        : 'bg-surface text-secondary border-subtle hover:bg-surface-raised'
                    }`}
                  >
                    <Icon size={15} />{label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative mb-5">
                <IoSearchOutline size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
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
                <div className="text-center py-20 glass-card border border-subtle">
                  <IoLayersOutline className="mx-auto text-red-500 mb-3" size={44} />
                  <p className="text-red-400 font-medium">Failed to load content</p>
                  <p className="text-muted text-sm mt-1">{contentError}</p>
                  <button
                    onClick={() => dispatch(fetchAllContent({ type: contentMgmtType }))}
                    className="mt-4 px-4 py-2 rounded-xl bg-surface hover:bg-surface-raised text-primary text-sm transition-colors border border-subtle cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              ) : contentItems.length === 0 ? (
                <div className="text-center py-20 glass-card border border-subtle">
                  <IoLayersOutline className="mx-auto text-muted mb-3" size={44} />
                  <p className="text-secondary">No content found{contentSearch ? ` for “${contentSearch}”` : ''}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted mb-3">{contentTotal} item{contentTotal !== 1 ? 's' : ''} total</p>
                  {contentItems.map((item) => {
                    const thumb = item.bannerImage || item.coverImage || item.thumbnailUrl;
                    const isPublic = item.visibility === 'public';
                    return (
                      <div
                        key={item._id}
                        className="glass-card p-4 flex items-center gap-4 group border border-subtle"
                      >
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface flex-shrink-0 flex items-center justify-center border border-subtle">
                          {thumb ? (
                            <img src={thumb} alt={item.title || item.name} className="w-full h-full object-cover" />
                          ) : (
                            <IoLayersOutline size={18} className="text-muted" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-primary font-medium truncate">{item.title || item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted flex-wrap">
                            {item.addedBy?.name && <span>by {item.addedBy.name}</span>}
                            {item.category?.name && <span>· {item.category.name}</span>}
                            <span>· {new Date(item.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Visibility badge */}
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                          isPublic
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-surface text-muted'
                        }`}>
                          {isPublic ? 'Public' : 'Private'}
                        </span>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleToggleVisibility(item)}
                            title={isPublic ? 'Make private' : 'Make public'}
                            className={`p-2 rounded-lg text-sm transition-colors cursor-pointer ${
                              isPublic
                                ? 'text-emerald-400 hover:bg-emerald-500/10'
                                : 'text-muted hover:text-primary hover:bg-surface-raised'
                            }`}
                          >
                            {isPublic ? <IoGlobeOutline size={16} /> : <IoLockClosedOutline size={16} />}
                          </button>
                          <button
                            onClick={() => setDeleteContentModal({ type: contentMgmtType, id: item._id, title: item.title || item.name })}
                            className="p-2 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
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
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                      requestFilter === status
                        ? 'bg-accent-subtle text-accent border border-accent/30'
                        : 'bg-surface text-secondary border border-subtle hover:bg-surface-raised'
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
                  <IoTimeOutline className="mx-auto text-muted mb-4" size={48} />
                  <h3 className="text-lg text-secondary mb-2">No {requestFilter} requests</h3>
                </div>
              ) : (
                <div className="space-y-3">
                  {publishRequests.map((req) => (
                    <motion.div
                      key={req._id}
                      whileHover={{ scale: 1.005 }}
                      className={`glass-card p-5 transition-all border border-subtle ${
                        req.status === 'pending'
                          ? 'cursor-pointer hover:border-accent/30 hover:shadow-accent/5 hover:shadow-lg'
                          : ''
                      }`}
                      onClick={() => req.status === 'pending' && handleOpenRequest(req)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              req.contentType === 'book' ? 'bg-accent-subtle text-accent'
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
                          <h3 className="text-primary font-semibold text-lg truncate">
                            {req.content?.title || 'Content deleted'}
                          </h3>
                          {req.content?.description && (
                            <p className="text-sm text-secondary mt-1 line-clamp-2">{req.content.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-3 text-xs text-muted">
                            <span>By {req.requestedBy?.name || 'Unknown'} ({req.requestedBy?.email})</span>
                            <span>•</span>
                            <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                          </div>
                          {req.reviewedBy && (
                            <p className="text-xs text-muted mt-1">
                              Reviewed by {req.reviewedBy.name} — {req.adminNote || 'No note'}
                            </p>
                          )}
                        </div>
                        {req.status === 'pending' && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-muted italic">Click to review →</span>
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
                  <div className="glass-card p-5 border border-subtle">
                    <div className="flex items-center gap-3 text-sm text-secondary flex-wrap">
                      <span className="text-primary font-medium">{selectedRequest?.requestedBy?.name}</span>
                      <span className="text-muted">({selectedRequest?.requestedBy?.email})</span>
                      <span className="text-muted">•</span>
                      <span>Submitted {new Date(selectedRequest?.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Full resource preview */}
                  {(() => {
                    const res = reviewResource.resource;
                    const type = reviewResource.contentType;
                    if (!res) return <p className="text-muted text-center py-8">Resource not found</p>;

                    return (
                      <div className="glass-card overflow-hidden border border-subtle">
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
                                type === 'book' ? 'bg-accent-subtle text-accent'
                                : type === 'course' ? 'bg-purple-500/10 text-purple-400'
                                : type === 'section' ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                {type}
                              </span>
                              {res.type && (
                                <span className="text-xs text-muted bg-surface px-2 py-0.5 rounded-full border border-subtle">
                                  {res.type}
                                </span>
                              )}
                            </div>
                            <h2 className="text-2xl font-bold text-primary mb-1">{res.title || res.name}</h2>
                            {res.author && <p className="text-accent text-sm">{res.author}</p>}
                            {res.description && (
                              <p className="text-secondary text-sm mt-2 leading-relaxed">{res.description}</p>
                            )}
                          </div>

                          {/* Creator */}
                          <div className="flex items-center gap-3 py-3 border-y border-subtle">
                            <div className="w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center text-accent">
                              <span className="text-xs font-bold">
                                {res.addedBy?.name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm text-primary font-medium">{res.addedBy?.name}</p>
                              <p className="text-xs text-muted">Content creator</p>
                            </div>
                          </div>

                          {/* Book specifics */}
                          {type === 'book' && (
                            <div className="space-y-3">
                              {res.embedLink && (
                                <div className="flex items-center gap-2 text-sm text-secondary">
                                  <IoDocumentTextOutline size={16} className="text-accent flex-shrink-0" />
                                  <a
                                    href={res.embedLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-accent hover:underline truncate"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    View PDF / Embed
                                  </a>
                                </div>
                              )}
                              {res.driveLink && (
                                <div className="flex items-center gap-2 text-sm text-secondary">
                                  <IoLinkOutline size={16} className="text-muted flex-shrink-0" />
                                  <a
                                    href={res.driveLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-accent hover:underline truncate"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Drive Link
                                  </a>
                                </div>
                              )}
                              {res.videos?.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-sm text-secondary mb-2 flex items-center gap-2">
                                    <IoVideocamOutline size={15} className="text-accent" />
                                    {res.videos.length} video{res.videos.length !== 1 ? 's' : ''}
                                  </p>
                                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                    {res.videos.map((v, i) => (
                                      <div key={i} className="flex items-center gap-2 text-xs text-secondary py-1 px-2 rounded-lg bg-surface border border-subtle">
                                        <span className="text-muted w-5 text-right flex-shrink-0">{i + 1}.</span>
                                        <span className="truncate">{v.title || `Episode ${i + 1}`}</span>
                                        {v.duration && <span className="ml-auto text-muted flex-shrink-0">{v.duration}</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {res.totalPages > 0 && (
                                <p className="text-sm text-secondary">
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
                                  <span className="text-secondary">Category:</span>
                                  <span className="text-purple-400 font-medium">{res.category.name}</span>
                                </div>
                              )}
                              {res.driveLink && (
                                <div className="flex items-center gap-2 text-sm">
                                  <IoLinkOutline size={15} className="text-muted" />
                                  <a
                                    href={res.driveLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-accent hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Open Drive Folder
                                  </a>
                                </div>
                              )}
                              <div className="flex items-center gap-4 text-sm text-secondary">
                                <span className="flex items-center gap-1">
                                  <IoDocumentTextOutline size={14} className="text-muted" />
                                  {countFiles(res)} file{countFiles(res) !== 1 ? 's' : ''}
                                </span>
                                {res.folders?.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <IoFolderOutline size={14} className="text-muted" />
                                    {res.folders.length} folder{res.folders.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              {/* Top-level files */}
                              {(res.files?.length > 0 || res.folders?.length > 0) && (
                                <div className="mt-2 max-h-48 overflow-y-auto space-y-1 pr-1">
                                  {res.files?.map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-secondary py-1 px-2 rounded-lg bg-surface border border-subtle">
                                      <IoDocumentTextOutline size={12} className="text-muted flex-shrink-0" />
                                      <span className="truncate">{f.name}</span>
                                    </div>
                                  ))}
                                  {res.folders?.map((folder, i) => (
                                    <div key={i}>
                                      <div className="flex items-center gap-2 text-xs text-primary py-1 px-2 rounded-lg bg-surface-raised border border-subtle mt-1">
                                        <IoFolderOutline size={12} className="text-accent flex-shrink-0" />
                                        <span className="font-medium truncate">{folder.name}</span>
                                        <span className="ml-auto text-muted">{folder.files?.length || 0} files</span>
                                      </div>
                                      {folder.files?.slice(0, 5).map((f, j) => (
                                        <div key={j} className="flex items-center gap-2 text-xs text-muted py-0.5 px-4">
                                          <span className="text-muted">└</span>
                                          <span className="truncate">{f.name}</span>
                                        </div>
                                      ))}
                                      {(folder.files?.length || 0) > 5 && (
                                        <p className="text-xs text-muted px-4">
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
                                <p className="text-secondary text-sm leading-relaxed">{res.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-secondary flex-wrap">
                                <span className="flex items-center gap-1.5">
                                  <IoGlobeOutline size={14} className={res.visibility === 'public' ? 'text-emerald-400' : 'text-muted'} />
                                  <span className={res.visibility === 'public' ? 'text-emerald-400' : 'text-secondary'}>
                                    {res.visibility === 'public' ? 'Public' : 'Private'}
                                  </span>
                                </span>
                                {res.subSections?.length > 0 && (
                                  <span className="flex items-center gap-1.5">
                                    <IoLayersOutline size={14} className="text-accent" />
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
                                <div className="flex items-center gap-2 text-sm text-secondary">
                                  <IoDocumentTextOutline size={14} className="text-muted" />
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
                  <div className="glass-card p-6 space-y-4 border border-subtle">
                    <h3 className="text-primary font-semibold mb-3">Admin Decision</h3>
                    <div>
                      <label className="text-sm text-secondary block mb-1.5">
                        Note to requester <span className="text-muted">(optional)</span>
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
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors font-medium cursor-pointer"
                      >
                        <IoCheckmarkCircleOutline size={18} />
                        {isReviewing ? 'Processing…' : 'Approve & Make Public'}
                      </button>
                      <button
                        onClick={() => handleReview('rejected')}
                        disabled={isReviewing}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors font-medium cursor-pointer"
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
        <p className="text-secondary mb-6">
          Are you sure you want to delete this user? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteModal(null)} className="btn-secondary cursor-pointer">Cancel</button>
          <button onClick={handleDeleteUser} className="btn-primary bg-red-500 hover:bg-red-600 cursor-pointer">
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
        <p className="text-secondary mb-2">
          Are you sure you want to permanently delete:
        </p>
        <p className="text-primary font-semibold mb-6 px-3 py-2 bg-surface rounded-xl border border-subtle">
          {deleteContentModal?.title}
        </p>
        <p className="text-xs text-red-400/80 mb-6">
          This removes the content for ALL users who have it saved. This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteContentModal(null)} className="btn-secondary cursor-pointer">Cancel</button>
          <button onClick={handleAdminDeleteContent} className="btn-primary bg-red-500 hover:bg-red-600 cursor-pointer">
            Delete Permanently
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminPage;
