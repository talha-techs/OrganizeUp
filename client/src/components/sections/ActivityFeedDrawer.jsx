import { motion, AnimatePresence } from 'framer-motion';
import {
  IoCloseOutline,
  IoPulseOutline,
  IoCreateOutline,
  IoTrashOutline,
  IoAddOutline,
  IoCheckmarkCircleOutline,
  IoImageOutline,
  IoLinkOutline,
  IoPersonOutline,
  IoTimeOutline,
} from 'react-icons/io5';

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return 'just now';
  const d = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - d) / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getActionIcon = (action) => {
  switch (action) {
    case 'created_block':
      return <IoAddOutline className="text-emerald-400" size={15} />;
    case 'updated_block':
      return <IoCreateOutline className="text-accent" size={14} />;
    case 'deleted_block':
      return <IoTrashOutline className="text-red-400" size={14} />;
    case 'added_todo':
    case 'bulk_added_todos':
      return <IoCheckmarkCircleOutline className="text-emerald-400" size={15} />;
    case 'added_card':
      return <IoCreateOutline className="text-purple-400" size={14} />;
    case 'added_link':
      return <IoLinkOutline className="text-accent" size={14} />;
    case 'updated_banner':
      return <IoImageOutline className="text-amber-400" size={14} />;
    default:
      return <IoPulseOutline className="text-secondary" size={14} />;
  }
};

const formatActionText = (item) => {
  const name = item.user?.name || 'A collaborator';
  switch (item.action) {
    case 'created_block':
      return (
        <span>
          <strong className="text-primary font-semibold">{name}</strong> created{' '}
          <span className="text-accent font-medium">"{item.blockName}"</span>
        </span>
      );
    case 'updated_block':
      return (
        <span>
          <strong className="text-primary font-semibold">{name}</strong> edited{' '}
          <span className="text-primary font-medium">"{item.blockName}"</span>
        </span>
      );
    case 'deleted_block':
      return (
        <span>
          <strong className="text-primary font-semibold">{name}</strong> deleted a workspace block
        </span>
      );
    case 'added_todo':
      return (
        <span>
          <strong className="text-primary font-semibold">{name}</strong> added task{' '}
          {item.detail ? `"${item.detail}"` : ''} in{' '}
          <span className="text-primary font-medium">"{item.blockName}"</span>
        </span>
      );
    case 'bulk_added_todos':
      return (
        <span>
          <strong className="text-primary font-semibold">{name}</strong> added{' '}
          {item.count || 'multiple'} tasks in{' '}
          <span className="text-primary font-medium">"{item.blockName}"</span>
        </span>
      );
    case 'added_card':
      return (
        <span>
          <strong className="text-primary font-semibold">{name}</strong> added card{' '}
          {item.detail ? `"${item.detail}"` : ''} in{' '}
          <span className="text-primary font-medium">"{item.blockName}"</span>
        </span>
      );
    case 'added_link':
      return (
        <span>
          <strong className="text-primary font-semibold">{name}</strong> saved link{' '}
          {item.detail ? `"${item.detail}"` : ''}
        </span>
      );
    case 'updated_banner':
      return (
        <span>
          <strong className="text-primary font-semibold">{name}</strong> changed the workspace banner
        </span>
      );
    case 'role_changed':
      return (
        <span>
          <strong className="text-primary font-semibold">{name}</strong> changed collaborator roles
        </span>
      );
    case 'left_section':
      return (
        <span>
          <strong className="text-primary font-semibold">{name}</strong> left the workspace
        </span>
      );
    case 'removed_collaborator':
      return (
        <span>
          <strong className="text-primary font-semibold">{name}</strong> removed a member
        </span>
      );
    default:
      return (
        <span>
          <strong className="text-primary font-semibold">{name}</strong> performed an action
        </span>
      );
  }
};

const ActivityFeedDrawer = ({
  isOpen,
  onClose,
  activityStream = [],
  activeCollaborators = [],
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-screen max-w-md bg-surface/95 border-l border-subtle backdrop-blur-xl shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="p-5 border-b border-subtle flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-accent-subtle text-accent">
                    <IoPulseOutline size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-primary font-display">
                      Live Workspace Activity
                    </h3>
                    <p className="text-xs text-muted">Real-time team presence & updates</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer"
                >
                  <IoCloseOutline size={20} />
                </button>
              </div>

              {/* Active Now Roster */}
              <div className="px-5 py-3.5 border-b border-subtle bg-surface-raised/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Online in Room ({activeCollaborators.length})
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {activeCollaborators.map((c) => (
                    <div
                      key={c.userId}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface border border-subtle flex-shrink-0"
                    >
                      <div className="relative">
                        {c.avatar ? (
                          <img
                            src={c.avatar}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-accent/20 text-accent text-[10px] font-bold flex items-center justify-center">
                            {(c.name || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-surface" />
                      </div>
                      <span className="text-xs font-medium text-primary truncate max-w-[90px]">
                        {c.name}
                      </span>
                      <span className="text-[10px] text-muted capitalize">({c.role})</span>
                    </div>
                  ))}

                  {activeCollaborators.length === 0 && (
                    <span className="text-xs text-muted italic">Connecting to room…</span>
                  )}
                </div>
              </div>

              {/* Activity Stream List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {activityStream.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-surface border border-subtle flex items-start gap-3 hover:border-strong transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-surface-raised flex-shrink-0 mt-0.5">
                      {getActionIcon(item.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-secondary leading-snug">
                        {formatActionText(item)}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted">
                        <IoTimeOutline size={11} />
                        <span>{formatTimeAgo(item.timestamp)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {activityStream.length === 0 && (
                  <div className="text-center py-12">
                    <IoPulseOutline className="mx-auto text-muted mb-2 opacity-50" size={36} />
                    <p className="text-sm font-medium text-secondary">No activity yet</p>
                    <p className="text-xs text-muted mt-1 max-w-xs mx-auto">
                      Real-time actions, tasks, and edits by your team will appear here live.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ActivityFeedDrawer;
