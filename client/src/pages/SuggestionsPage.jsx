import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoBulbOutline,
  IoSparklesOutline,
  IoCheckmarkCircle,
  IoTimeOutline,
  IoFolderOutline,
  IoBookOutline,
  IoSchoolOutline,
  IoFlashOutline,
  IoChatbubblesOutline,
  IoCompassOutline,
  IoConstructOutline,
  IoLayersOutline,
  IoPaperPlaneOutline,
  IoAlertCircleOutline,
  IoChevronDown,
  IoChevronUp,
  IoCreateOutline,
  IoTrashOutline,
  IoShieldCheckmarkOutline,
} from 'react-icons/io5';
import {
  submitSuggestion,
  fetchMySuggestions,
  updateMySuggestion,
  deleteSuggestion,
} from '../redux/slices/suggestionSlice';
import Modal from '../components/ui/Modal';
import CustomSelect from '../components/ui/CustomSelect';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';

const TARGET_MODULES = [
  {
    id: 'workspaces',
    label: 'Workspaces',
    desc: 'Blocks, notes, to-dos & boards',
    icon: IoFolderOutline,
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  },
  {
    id: 'books',
    label: 'Book Reader',
    desc: 'PDF canvas, video & audiobooks',
    icon: IoBookOutline,
    color: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  },
  {
    id: 'courses',
    label: 'Courses & Drive',
    desc: 'Drive imports & study roadmaps',
    icon: IoSchoolOutline,
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  },
  {
    id: 'captures',
    label: 'Vault Captures',
    desc: 'WhatsApp, reels & web scraps',
    icon: IoFlashOutline,
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  },
  {
    id: 'inboxes',
    label: 'Telegram & Discord',
    desc: 'Direct community message libraries',
    icon: IoChatbubblesOutline,
    color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
  },
  {
    id: 'explore',
    label: 'Explore & Library',
    desc: 'Discovering community items',
    icon: IoCompassOutline,
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  },
  {
    id: 'tools',
    label: 'Tools & Tricks',
    desc: 'Widgets, calculators & aids',
    icon: IoConstructOutline,
    color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  },
  {
    id: 'general',
    label: 'General UX / PWA',
    desc: 'Mobile, speeds & UI navigation',
    icon: IoSparklesOutline,
    color: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
  },
  {
    id: 'other',
    label: 'Other Idea',
    desc: 'Brand new concept',
    icon: IoBulbOutline,
    color: 'text-zinc-400 border-zinc-500/30 bg-zinc-500/10',
  },
];

const IMPACT_LEVELS = [
  {
    id: 'low',
    label: 'Nice to Have',
    desc: 'A neat polish or minor quality of life addition',
    badge: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  },
  {
    id: 'medium',
    label: 'Workflow Booster',
    desc: 'Would noticeably accelerate everyday studying',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  {
    id: 'high',
    label: 'Critical Need',
    desc: 'Solves an essential bottleneck or key missing feature',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  },
];

const STATUS_BADGES = {
  pending: {
    label: 'Pending Review',
    color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: IoTimeOutline,
  },
  under_review: {
    label: 'Under Consideration',
    color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    icon: IoSparklesOutline,
  },
  planned: {
    label: 'Planned for Roadmap',
    color: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    icon: IoBulbOutline,
  },
  completed: {
    label: 'Shipped & Implemented',
    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: IoCheckmarkCircle,
  },
  dismissed: {
    label: 'Declined',
    color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
    icon: IoAlertCircleOutline,
  },
};

const SuggestionsPage = () => {
  useDocumentTitle('Feature Suggestions & Feedback');
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { mySuggestions, isLoading, isSubmitting } = useSelector(
    (state) => state.suggestions,
  );

  const [activeTab, setActiveTab] = useState('submit'); // 'submit' | 'my_list'
  const [title, setTitle] = useState('');
  const [targetArea, setTargetArea] = useState('workspaces');
  const [problemStatement, setProblemStatement] = useState('');
  const [proposedSolution, setProposedSolution] = useState('');
  const [impact, setImpact] = useState('medium');
  const [expandedSuggestionId, setExpandedSuggestionId] = useState(null);

  // Edit suggestion modal state
  const [editingItem, setEditingItem] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTargetArea, setEditTargetArea] = useState('workspaces');
  const [editProblemStatement, setEditProblemStatement] = useState('');
  const [editProposedSolution, setEditProposedSolution] = useState('');
  const [editImpact, setEditImpact] = useState('medium');
  const [isUpdatingMySub, setIsUpdatingMySub] = useState(false);

  // Delete suggestion modal state
  const [deleteItemModal, setDeleteItemModal] = useState(null);
  const [isDeletingMySub, setIsDeletingMySub] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') {
      dispatch(fetchMySuggestions());
    }
  }, [dispatch, user]);

  // Admin account notice: Admins manage suggestions in Admin panel rather than submitting here
  if (user?.role === 'admin') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/5">
          <IoShieldCheckmarkOutline size={32} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-primary">
            Admin Suggestions Dashboard
          </h1>
          <p className="text-secondary text-sm max-w-md mx-auto leading-relaxed">
            As the administrator and owner, you review and implement suggestions submitted by users rather than submitting ideas from this form.
          </p>
        </div>
        <div className="pt-2">
          <Link
            to="/admin"
            className="btn-primary inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 cursor-pointer shadow-lg shadow-accent/20"
          >
            <IoShieldCheckmarkOutline size={16} />
            <span>Open Admin Panel &amp; Suggestions Cockpit</span>
          </Link>
        </div>
      </div>
    );
  }

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditTargetArea(item.targetArea || 'workspaces');
    setEditProblemStatement(item.problemStatement);
    setEditProposedSolution(item.proposedSolution);
    setEditImpact(item.impact || 'medium');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!editProblemStatement.trim()) {
      toast.error('Please enter the problem description');
      return;
    }
    if (!editProposedSolution.trim()) {
      toast.error('Please enter the proposed solution');
      return;
    }

    setIsUpdatingMySub(true);
    const res = await dispatch(
      updateMySuggestion({
        id: editingItem._id,
        title: editTitle.trim(),
        targetArea: editTargetArea,
        problemStatement: editProblemStatement.trim(),
        proposedSolution: editProposedSolution.trim(),
        impact: editImpact,
      }),
    );
    setIsUpdatingMySub(false);

    if (res.meta.requestStatus === 'fulfilled') {
      toast.success('Your suggestion has been updated');
      setEditingItem(null);
    } else {
      toast.error(res.payload || 'Failed to update suggestion');
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteItemModal) return;
    setIsDeletingMySub(true);
    const res = await dispatch(deleteSuggestion(deleteItemModal._id));
    setIsDeletingMySub(false);

    if (res.meta.requestStatus === 'fulfilled') {
      toast.success('Suggestion deleted');
      setDeleteItemModal(null);
    } else {
      toast.error(res.payload || 'Failed to delete suggestion');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a brief title for your suggestion');
      return;
    }
    if (!problemStatement.trim()) {
      toast.error('Please tell us the problem you are experiencing');
      return;
    }
    if (!proposedSolution.trim()) {
      toast.error(
        'Please describe where and how OrganizeUp can solve this for you',
      );
      return;
    }

    const res = await dispatch(
      submitSuggestion({
        title: title.trim(),
        targetArea,
        problemStatement: problemStatement.trim(),
        proposedSolution: proposedSolution.trim(),
        impact,
      }),
    );

    if (res.meta.requestStatus === 'fulfilled') {
      toast.success(
        'Thank you! Your suggestion has been delivered to the team.',
      );
      setTitle('');
      setProblemStatement('');
      setProposedSolution('');
      setTargetArea('workspaces');
      setImpact('medium');
      setActiveTab('my_list');
    } else {
      toast.error(res.payload || 'Failed to submit suggestion');
    }
  };

  const getModuleConfig = (moduleId) => {
    return (
      TARGET_MODULES.find((m) => m.id === moduleId) ||
      TARGET_MODULES[TARGET_MODULES.length - 1]
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface via-surface-raised to-accent/10 border border-subtle p-6 sm:p-10 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-subtle border border-accent/30 text-accent text-xs font-semibold">
            <IoSparklesOutline size={14} />
            <span>Community Voice & Product Evolution</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-primary font-display tracking-tight leading-tight">
            Suggest New Features to <span className="gradient-text">OrganizeUp</span>
          </h1>

          <p className="text-secondary text-sm sm:text-base leading-relaxed">
            Hit a friction point or have an idea? Tell us the problem you&apos;re
            having and where in OrganizeUp we can solve it for you. Every submission
            is directly reviewed by our engineering and product team.
          </p>

          <div className="pt-2 flex items-center gap-4 text-xs text-muted">
            <span>💡 100% human-reviewed</span>
            <span>•</span>
            <span>🚀 Regular roadmap updates</span>
            <span>•</span>
            <span>🔒 Direct to founders</span>
          </div>
        </div>

        {/* Ambient glow accent in background */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center justify-between border-b border-subtle pb-px">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('submit')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'submit'
                ? 'bg-accent text-white shadow-md shadow-accent/20'
                : 'text-secondary hover:text-primary hover:bg-surface'
            }`}
          >
            <IoPaperPlaneOutline size={16} />
            <span>Submit a Feature Idea</span>
          </button>

          <button
            onClick={() => setActiveTab('my_list')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'my_list'
                ? 'bg-accent text-white shadow-md shadow-accent/20'
                : 'text-secondary hover:text-primary hover:bg-surface'
            }`}
          >
            <IoLayersOutline size={16} />
            <span>My Submitted Suggestions</span>
            {mySuggestions.length > 0 && (
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'my_list'
                    ? 'bg-white/20 text-white'
                    : 'bg-surface-raised text-primary'
                }`}
              >
                {mySuggestions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab 1: Suggestion Form */}
      {activeTab === 'submit' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 sm:p-8 border border-subtle rounded-3xl space-y-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-primary flex items-center justify-between">
                <span>1. Feature Title / Core Idea *</span>
                <span className="text-xs text-muted">
                  {title.length}/150 chars
                </span>
              </label>
              <input
                type="text"
                value={title}
                maxLength={150}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Split-screen reading mode or Markdown export in workspaces"
                className="w-full px-4 py-3 rounded-2xl bg-surface border border-subtle text-primary placeholder-muted text-sm focus:outline-none focus:border-accent transition-colors"
                required
              />
            </div>

            {/* Target App Area Selector */}
            <div className="space-y-2.5">
              <label className="text-sm font-semibold text-primary block">
                2. Where in the existing app should this live? *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {TARGET_MODULES.map((mod) => {
                  const Icon = mod.icon;
                  const isSelected = targetArea === mod.id;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setTargetArea(mod.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-accent bg-accent-subtle shadow-md shadow-accent/10 ring-1 ring-accent'
                          : 'border-subtle bg-surface hover:bg-surface-raised hover:border-strong'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon
                          size={18}
                          className={isSelected ? 'text-accent' : 'text-secondary'}
                        />
                        <span
                          className={`text-xs font-bold truncate ${
                            isSelected ? 'text-primary' : 'text-secondary'
                          }`}
                        >
                          {mod.label}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted line-clamp-1">
                        {mod.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* The Problem Statement */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-primary block">
                3. What problem are you experiencing? *
              </label>
              <p className="text-xs text-secondary leading-normal">
                Describe the specific hurdle, friction, or limitation you encounter
                when using OrganizeUp. Why is it painful or slowing you down?
              </p>
              <textarea
                rows={4}
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                placeholder="e.g. Whenever I read long academic papers in PDF mode, I constantly have to switch back and forth to another document to summarize key formulas, which breaks my focus..."
                className="w-full p-4 rounded-2xl bg-surface border border-subtle text-primary placeholder-muted text-sm leading-relaxed focus:outline-none focus:border-accent transition-colors resize-y min-h-[110px]"
                required
              />
            </div>

            {/* Proposed Solution / Where we can solve it */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-primary block">
                4. Where and how can OrganizeUp solve that for you? *
              </label>
              <p className="text-xs text-secondary leading-normal">
                Tell us your vision. What buttons, UI flows, or behavior should we
                introduce in our existing interface to solve this problem?
              </p>
              <textarea
                rows={4}
                value={proposedSolution}
                onChange={(e) => setProposedSolution(e.target.value)}
                placeholder="e.g. Add a dockable sidebar or split-view toggle right inside the workspace or book viewer so we can write takeaway notes while looking at the exact page..."
                className="w-full p-4 rounded-2xl bg-surface border border-subtle text-primary placeholder-muted text-sm leading-relaxed focus:outline-none focus:border-accent transition-colors resize-y min-h-[110px]"
                required
              />
            </div>

            {/* Impact / Priority */}
            <div className="space-y-2.5">
              <label className="text-sm font-semibold text-primary block">
                5. How important is this for your workflow?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {IMPACT_LEVELS.map((lvl) => {
                  const isSelected = impact === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setImpact(lvl.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-accent bg-accent-subtle shadow-md shadow-accent/10 ring-1 ring-accent'
                          : 'border-subtle bg-surface hover:bg-surface-raised'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-primary">
                          {lvl.label}
                        </span>
                        {isSelected && (
                          <IoCheckmarkCircle className="text-accent" size={16} />
                        )}
                      </div>
                      <span className="text-[11px] text-muted block leading-snug">
                        {lvl.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User Attribution Notice */}
            <div className="p-3.5 rounded-2xl bg-surface-raised/60 border border-subtle flex items-center justify-between text-xs text-muted">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>
                  Submitting as{' '}
                  <strong className="text-primary font-medium">
                    {user?.name || 'Scholar'}
                  </strong>{' '}
                  ({user?.email})
                </span>
              </div>
              <span className="text-[11px] hidden sm:inline text-secondary">
                Our founders will be notified directly
              </span>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary px-8 py-3.5 text-sm font-bold flex items-center gap-2 shadow-xl shadow-accent/25 hover:shadow-accent/40 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Submitting to OrganizeUp Team...</span>
                  </>
                ) : (
                  <>
                    <IoPaperPlaneOutline size={18} />
                    <span>Send Suggestion to Company</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Tab 2: My Submissions */}
      {activeTab === 'my_list' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {isLoading ? (
            <div className="glass-card p-12 text-center border border-subtle rounded-3xl">
              <LoadingSpinner text="Fetching your submitted suggestions..." />
            </div>
          ) : mySuggestions.length === 0 ? (
            <div className="glass-card p-12 text-center border border-subtle rounded-3xl space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center mx-auto">
                <IoBulbOutline size={28} />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-primary font-display">
                  No Suggestions Submitted Yet
                </h3>
                <p className="text-xs text-secondary leading-relaxed">
                  Have an idea on how we can improve OrganizeUp for your workflow?
                  Submit your first suggestion and track our development progress
                  here.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('submit')}
                className="btn-primary text-xs px-5 py-2.5 cursor-pointer font-bold inline-flex items-center gap-1.5"
              >
                <IoPaperPlaneOutline size={14} />
                <span>Submit Your First Suggestion</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {mySuggestions.map((item) => {
                const statusCfg =
                  STATUS_BADGES[item.status] || STATUS_BADGES.pending;
                const moduleCfg = getModuleConfig(item.targetArea);
                const isExpanded = expandedSuggestionId === item._id;
                const StatusIcon = statusCfg.icon;

                return (
                  <div
                    key={item._id}
                    className="glass-card p-5 sm:p-6 border border-subtle rounded-2xl transition-all space-y-4"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusCfg.color}`}
                          >
                            <StatusIcon size={13} />
                            <span>{statusCfg.label}</span>
                          </span>

                          <span className="px-2 py-0.5 rounded-lg bg-surface border border-subtle text-[11px] text-secondary font-medium">
                            {moduleCfg.label}
                          </span>

                          {item.impact === 'high' && (
                            <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold">
                              Critical
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-primary font-display">
                          {item.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-muted font-mono mr-1">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-secondary hover:text-accent hover:bg-surface border border-subtle transition-colors cursor-pointer"
                          title="Edit your suggestion"
                        >
                          <IoCreateOutline size={15} />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => setDeleteItemModal(item)}
                          className="p-1.5 rounded-lg text-secondary hover:text-red-400 hover:bg-red-500/10 border border-subtle transition-colors cursor-pointer"
                          title="Delete this suggestion"
                        >
                          <IoTrashOutline size={15} />
                        </button>

                        {/* Toggle Details */}
                        <button
                          onClick={() =>
                            setExpandedSuggestionId(
                              isExpanded ? null : item._id,
                            )
                          }
                          className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface border border-subtle transition-colors cursor-pointer"
                          title="Toggle details"
                        >
                          {isExpanded ? (
                            <IoChevronUp size={16} />
                          ) : (
                            <IoChevronDown size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Preview / Detailed Breakdown */}
                    <div className="space-y-3 pt-2 border-t border-subtle text-xs">
                      <div>
                        <span className="font-semibold text-secondary uppercase text-[10px] tracking-wider block mb-1">
                          Problem Encountered:
                        </span>
                        <p className="text-primary leading-relaxed whitespace-pre-line bg-surface/60 p-3 rounded-xl border border-subtle/60">
                          {isExpanded
                            ? item.problemStatement
                            : item.problemStatement.slice(0, 180) +
                              (item.problemStatement.length > 180 ? '…' : '')}
                        </p>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3 overflow-hidden pt-1"
                          >
                            <div>
                              <span className="font-semibold text-secondary uppercase text-[10px] tracking-wider block mb-1">
                                Where & How OrganizeUp Can Solve It:
                              </span>
                              <p className="text-primary leading-relaxed whitespace-pre-line bg-surface/60 p-3 rounded-xl border border-subtle/60">
                                {item.proposedSolution}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Admin Response Note */}
                      {item.adminNotes && (
                        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-accent/15 via-orange-500/10 to-transparent border border-accent/30 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-accent">
                            <IoSparklesOutline size={14} />
                            <span>OrganizeUp Team Update</span>
                          </div>
                          <p className="text-xs text-primary leading-relaxed whitespace-pre-line">
                            {item.adminNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Edit Suggestion Modal */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="Edit Your Feature Suggestion"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 pt-1">
          <div>
            <label className="text-xs font-semibold text-secondary block mb-1">
              Feature Title
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-surface border border-subtle text-xs text-primary focus:outline-none focus:border-accent"
              required
            />
          </div>

          {/* Target Module Custom Dropdown */}
          <CustomSelect
            label="Target Module / Where in OrganizeUp"
            value={editTargetArea}
            onChange={(val) => setEditTargetArea(val)}
            options={TARGET_MODULES.map((m) => ({
              value: m.id,
              label: m.label,
              desc: m.desc,
              icon: m.icon,
              color: m.color,
            }))}
          />

          <div>
            <label className="text-xs font-semibold text-secondary block mb-1">
              Problem Description
            </label>
            <textarea
              rows={3}
              value={editProblemStatement}
              onChange={(e) => setEditProblemStatement(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-surface border border-subtle text-xs text-primary focus:outline-none focus:border-accent leading-relaxed"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-secondary block mb-1">
              Where &amp; How To Solve in Existing App
            </label>
            <textarea
              rows={3}
              value={editProposedSolution}
              onChange={(e) => setEditProposedSolution(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-surface border border-subtle text-xs text-primary focus:outline-none focus:border-accent leading-relaxed"
              required
            />
          </div>

          {/* Impact Level Custom Dropdown */}
          <CustomSelect
            label="Impact & Criticality Level"
            value={editImpact}
            onChange={(val) => setEditImpact(val)}
            options={[
              {
                value: 'low',
                label: 'Nice to Have',
                desc: 'Aesthetic polish or nice-to-have tweak',
                badge: 'Low Priority',
              },
              {
                value: 'medium',
                label: 'Helpful Improvement',
                desc: 'Meaningful boost to daily workflow',
                badge: 'Recommended',
              },
              {
                value: 'high',
                label: 'Critical / High Impact',
                desc: 'Blocks core workflow or high demand',
                badge: 'High Priority',
              },
            ]}
          />

          <div className="flex justify-end gap-2.5 pt-3 border-t border-subtle">
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="btn-secondary text-xs px-4 py-2 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdatingMySub}
              className="btn-primary text-xs px-5 py-2 cursor-pointer font-bold disabled:opacity-50"
            >
              {isUpdatingMySub ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Suggestion Modal */}
      <Modal
        isOpen={!!deleteItemModal}
        onClose={() => setDeleteItemModal(null)}
        title="Delete Your Suggestion"
      >
        <div className="space-y-4">
          <p className="text-secondary text-xs leading-relaxed">
            Are you sure you want to permanently delete your feature suggestion?
          </p>
          <p className="text-primary font-semibold text-xs px-3 py-2 bg-surface rounded-xl border border-subtle">
            &ldquo;{deleteItemModal?.title}&rdquo;
          </p>
          <div className="flex justify-end gap-2.5 pt-2 border-t border-subtle">
            <button
              type="button"
              onClick={() => setDeleteItemModal(null)}
              className="btn-secondary text-xs px-4 py-2 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteItem}
              disabled={isDeletingMySub}
              className="btn-primary bg-red-500 hover:bg-red-600 text-xs px-5 py-2 cursor-pointer font-bold disabled:opacity-50"
            >
              {isDeletingMySub ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SuggestionsPage;
