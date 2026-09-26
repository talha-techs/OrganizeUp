import { useState, useRef, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoTrashOutline,
  IoCreateOutline,
  IoCheckmarkOutline,
  IoCloseOutline,
  IoChevronDown,
  IoChevronForward,
  IoAddOutline,
  IoCopyOutline,
  IoOpenOutline,
  IoCloudUploadOutline,
  IoImageOutline,
  IoSparklesOutline,
  IoRefreshOutline,
  IoVideocamOutline,
  IoTvOutline,
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import WorkspaceVideoCard from './WorkspaceVideoCard';
import {
  isVideoLink,
  detectLinkMediaInfo,
  getPlatformBadge,
  getInstagramEmbedUrl,
  getFacebookEmbedUrl,
} from '../../utils/linkMediaUtils';
import {
  updateSubSection,
  deleteSubSection,
  addTodoItem,
  bulkAddTodos,
  updateTodoItem,
  deleteTodoItem,
  addBoardItem,
  updateBoardItem,
  deleteBoardItem,
  addLink,
  removeLink,
  uploadSectionImage,
} from '../../redux/slices/sectionSlice';

// ─── Config ───────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  note:    { icon: '📝', label: 'Note',     color: 'accent' },
  todo:    { icon: '✅', label: 'To-Do',    color: 'emerald' },
  board:   { icon: '📋', label: 'Board',    color: 'purple' },
  links:   { icon: '🔗', label: 'Links',    color: 'accent' },
  snippet: { icon: '</>', label: 'Snippet', color: 'amber' },
  image:   { icon: '🖼️', label: 'Image',    color: 'rose' },
};

const PRIORITY_DOT = { low: 'bg-emerald-500', medium: 'bg-amber-500', high: 'bg-red-500' };
const PRIORITY_TXT = { low: 'text-emerald-400', medium: 'text-amber-400', high: 'text-red-400' };
const COL_CLS = {
  zinc:    'text-secondary border-subtle',
  slate:   'text-secondary border-subtle',
  amber:   'text-amber-400 border-amber-600/50',
  emerald: 'text-emerald-400 border-emerald-600/50',
  red:     'text-red-400 border-red-600/50',
  coral:   'text-accent border-accent/50',
  blue:    'text-accent border-accent/50',
  purple:  'text-purple-400 border-purple-600/50',
};

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c', 'cpp', 'csharp',
  'php', 'ruby', 'swift', 'kotlin', 'shell', 'sql', 'html', 'css', 'json', 'yaml', 'markdown', 'other',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDue = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const diff = Math.floor((d - now) / 86400000);
  if (diff < 0)  return { label: 'Overdue',  cls: 'bg-red-500/15 text-red-400' };
  if (diff === 0) return { label: 'Today',    cls: 'bg-amber-500/15 text-amber-400' };
  if (diff === 1) return { label: 'Tomorrow', cls: 'bg-accent-subtle text-accent' };
  return { label: d.toLocaleDateString(), cls: 'bg-surface-raised text-secondary' };
};

const getDomain = (url) => { try { return new URL(url).hostname; } catch { return url; } };

// ─── Note ─────────────────────────────────────────────────────────────────────
const NoteEditor = ({ block, sectionId, canEdit, onFocusBlock, onBlurBlock, onConflict }) => {
  const dispatch = useDispatch();
  const [local, setLocal] = useState(block.content || '');
  const [saving, setSaving] = useState(false);
  const isFocusedRef = useRef(false);
  const lastSavedVersionRef = useRef(block.version || 1);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocal(block.content || '');
    }
    if (block.version) {
      lastSavedVersionRef.current = block.version;
    }
  }, [block.content, block.version]);

  const handleFocus = () => {
    isFocusedRef.current = true;
    onFocusBlock?.(block._id);
  };

  const handleBlur = async () => {
    isFocusedRef.current = false;
    onBlurBlock?.(block._id, 1500);
    if (local === block.content) return;
    if (saving) return; // Prevent duplicate concurrent saves

    setSaving(true);
    const versionToSend = lastSavedVersionRef.current || block.version || 1;
    const res = await dispatch(
      updateSubSection({
        sectionId,
        subId: block._id,
        content: local,
        version: versionToSend,
      }),
    );
    if (res.meta.requestStatus === 'fulfilled') {
      if (res.payload?.subSection?.version) {
        lastSavedVersionRef.current = res.payload.subSection.version;
      }
    } else if (res.error) {
      if (res.payload?.isConflict) {
        if (onConflict) {
          onConflict({
            block,
            localDraft: local,
            remoteBlock: res.payload.currentBlock,
          });
        } else {
          toast.error('Block was modified by another collaborator. Synced with latest version.');
          if (res.payload?.currentBlock?.content !== undefined) {
            setLocal(res.payload.currentBlock.content);
            lastSavedVersionRef.current = res.payload.currentBlock.version || 1;
          }
        }
      } else {
        toast.error(
          typeof res.payload === 'string'
            ? res.payload
            : res.payload?.message || 'Failed to save note',
        );
      }
    }
    setSaving(false);
  };

  const words = local.trim() ? local.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-2">
      {canEdit ? (
        <textarea
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Start writing your note…"
          rows={6}
          className="w-full bg-surface border border-subtle rounded-xl px-4 py-3 text-sm text-primary placeholder-muted resize-y focus:outline-none focus:border-accent transition-colors font-mono leading-relaxed"
        />
      ) : (
        <div className="px-4 py-3 text-sm text-secondary whitespace-pre-wrap leading-relaxed min-h-[80px]">
          {block.content || <span className="text-muted italic">No content yet</span>}
        </div>
      )}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-muted">{words} word{words !== 1 ? 's' : ''}</span>
        {saving && <span className="text-xs text-accent animate-pulse">Saving…</span>}
      </div>
    </div>
  );
};

// ─── Todo ─────────────────────────────────────────────────────────────────────
const TodoEditor = ({ block, sectionId, canEdit, onFocusBlock, onBlurBlock }) => {
  const dispatch = useDispatch();
  const [newText, setNewText]         = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDue, setNewDue]           = useState('');
  const [adding, setAdding]           = useState(false);
  const inputRef = useRef(null);

  const todos = block.todos || [];
  const done  = todos.filter((t) => t.checked).length;
  const pct   = todos.length ? Math.round((done / todos.length) * 100) : 0;

  const handleToggle = (todo) =>
    dispatch(
      updateTodoItem({
        sectionId,
        subId: block._id,
        todoId: todo._id,
        checked: !todo.checked,
      }),
    );

  const handleAdd = async () => {
    if (!newText.trim() || !canEdit) return;
    await dispatch(
      addTodoItem({
        sectionId,
        subId: block._id,
        text: newText.trim(),
        priority: newPriority,
        dueDate: newDue || null,
      }),
    );
    setNewText('');
    setNewDue('');
    setNewPriority('medium');
    inputRef.current?.focus();
  };

  const handlePasteInTodo = async (e) => {
    if (!canEdit) return;
    const text = e.clipboardData?.getData('text/plain');
    if (text && (text.includes('\n') || /[-*•]/.test(text))) {
      const lines = text
        .split('\n')
        .map((l) =>
          l
            .replace(/^[-*•+]\s*(\[[ xX]\]\s*)?/, '')
            .replace(/^\d+[\.\)]\s*/, '')
            .trim(),
        )
        .filter(Boolean);
      if (lines.length > 1) {
        e.preventDefault();
        const todosToAdd = lines.map((line) => ({
          text: line,
          priority: newPriority,
          dueDate: newDue || null,
        }));
        await dispatch(
          bulkAddTodos({ sectionId, subId: block._id, todos: todosToAdd }),
        );
        setNewText('');
        setAdding(false);
        toast.success(`Added ${todosToAdd.length} tasks!`);
      }
    }
  };

  return (
    <div>
      {todos.length > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted mb-1.5">
            <span>{done}/{todos.length} done</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-0.5">
        {todos.map((todo) => {
          const due = formatDue(todo.dueDate);
          return (
            <div
              key={todo._id}
              className={`flex items-start gap-3 px-2 py-2 rounded-lg group hover:bg-surface-raised transition-colors ${
                todo.checked ? 'opacity-50' : ''
              }`}
            >
              <button
                disabled={!canEdit}
                onClick={() => canEdit && handleToggle(todo)}
                className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                  canEdit ? 'cursor-pointer' : 'cursor-default'
                } ${
                  todo.checked
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-subtle hover:border-strong'
                }`}
              >
                {todo.checked && <IoCheckmarkOutline size={10} className="text-white" />}
              </button>
              <span
                className={`flex-1 text-sm leading-snug ${
                  todo.checked ? 'line-through text-muted' : 'text-primary'
                }`}
              >
                {todo.text}
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div
                  className={`w-2 h-2 rounded-full ${PRIORITY_DOT[todo.priority]}`}
                  title={todo.priority}
                />
                {due && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${due.cls}`}>
                    {due.label}
                  </span>
                )}
                {canEdit && (
                  <button
                    onClick={() =>
                      dispatch(
                        deleteTodoItem({
                          sectionId,
                          subId: block._id,
                          todoId: todo._id,
                        }),
                      )
                    }
                    className="p-1 rounded text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <IoTrashOutline size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {todos.length === 0 && !adding && (
        <p className="text-sm text-muted italic text-center py-4">No tasks yet</p>
      )}

      {canEdit && (
        <div className="mt-3">
          {adding ? (
            <div className="bg-surface border border-subtle rounded-xl p-3 space-y-2">
              <input
                ref={inputRef}
                autoFocus
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onFocus={() => onFocusBlock?.(block._id)}
                onBlur={() => onBlurBlock?.(block._id, 1500)}
                onPaste={handlePasteInTodo}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                  if (e.key === 'Escape') setAdding(false);
                }}
                placeholder="Task description (paste multi-line checklist supported)…"
                className="w-full bg-transparent text-sm text-primary placeholder-muted focus:outline-none"
              />
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {['low', 'medium', 'high'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setNewPriority(p)}
                      className={`w-4 h-4 rounded-full ${PRIORITY_DOT[p]} ${
                        newPriority === p ? 'ring-2 ring-accent' : 'opacity-40'
                      } transition-all cursor-pointer`}
                      title={p}
                    />
                  ))}
                </div>
                <input
                  type="date"
                  value={newDue}
                  onChange={(e) => setNewDue(e.target.value)}
                  className="text-xs bg-transparent text-secondary border-none focus:outline-none"
                />
                <div className="ml-auto flex gap-3">
                  <button
                    onClick={() => {
                      setAdding(false);
                      setNewText('');
                    }}
                    className="text-xs text-muted hover:text-primary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    className="text-xs text-accent hover:underline font-medium cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setAdding(true);
                setTimeout(() => inputRef.current?.focus(), 40);
              }}
              className="flex items-center gap-2 text-sm text-secondary hover:text-primary px-2 py-1.5 rounded-lg hover:bg-surface-raised transition-colors w-full cursor-pointer"
            >
              <IoAddOutline size={14} /> Add task
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Board ────────────────────────────────────────────────────────────────────
const BoardEditor = ({ block, sectionId, canEdit, onFocusBlock, onBlurBlock }) => {
  const dispatch = useDispatch();
  const [addingInCol, setAddingInCol] = useState(null);
  const [newTitle, setNewTitle]       = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [editingCard, setEditingCard] = useState(null);
  const [editTitle, setEditTitle]     = useState('');
  const [editDesc, setEditDesc]       = useState('');

  const columns = block.boardColumns || [];
  const items   = block.boardItems   || [];
  const colItems = (colId) => items.filter((i) => i.status === colId);

  const handleAddCard = async (colId) => {
    if (!newTitle.trim() || !canEdit) return;
    await dispatch(
      addBoardItem({
        sectionId,
        subId: block._id,
        title: newTitle.trim(),
        status: colId,
        priority: newPriority,
      }),
    );
    setAddingInCol(null);
    setNewTitle('');
    setNewPriority('medium');
    onBlurBlock?.(block._id, 1500);
  };

  const openEdit = (item) => {
    setEditingCard(item);
    setEditTitle(item.title);
    setEditDesc(item.description);
    onFocusBlock?.(block._id);
  };

  const handleSaveCard = async () => {
    if (!editTitle.trim() || !canEdit) return;
    await dispatch(
      updateBoardItem({
        sectionId,
        subId: block._id,
        itemId: editingCard._id,
        title: editTitle.trim(),
        description: editDesc.trim(),
      }),
    );
    setEditingCard(null);
    onBlurBlock?.(block._id, 1500);
  };

  const handleMove = (item, newStatus) => {
    if (!canEdit) return;
    dispatch(
      updateBoardItem({
        sectionId,
        subId: block._id,
        itemId: item._id,
        status: newStatus,
      }),
    );
    setEditingCard(null);
    onBlurBlock?.(block._id, 1500);
  };

  const handleDeleteCard = (itemId) => {
    if (!canEdit) return;
    dispatch(deleteBoardItem({ sectionId, subId: block._id, itemId }));
    if (editingCard?._id === itemId) setEditingCard(null);
    onBlurBlock?.(block._id, 1500);
  };

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-4" style={{ minWidth: `${columns.length * 256}px` }}>
        {columns.map((col) => {
          const cls = COL_CLS[col.color] || COL_CLS.slate;
          return (
            <div key={col.id} className="w-60 flex-shrink-0">
              <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${cls}`}>
                <span className={`text-[11px] font-bold uppercase tracking-widest ${cls.split(' ')[0]}`}>
                  {col.name}
                </span>
                <span className="text-xs text-muted ml-auto">{colItems(col.id).length}</span>
              </div>
              <div className="space-y-2">
                {colItems(col.id).map((item) => (
                  <div
                    key={item._id}
                    className={`glass-card p-3 cursor-pointer group border-l-2 hover:border-l-4 transition-all border border-subtle ${
                      item.priority === 'high'
                        ? 'border-l-red-500'
                        : item.priority === 'low'
                        ? 'border-l-emerald-500'
                        : 'border-l-amber-500'
                    }`}
                    onClick={() => openEdit(item)}
                  >
                    <p className="text-sm text-primary font-medium leading-snug">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted mt-1 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[10px] font-medium ${PRIORITY_TXT[item.priority]}`}>
                        {item.priority}
                      </span>
                      {item.dueDate && (
                        <span className="text-[10px] text-muted">
                          {new Date(item.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {canEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCard(item._id);
                          }}
                          className="ml-auto text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        >
                          <IoTrashOutline size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {canEdit &&
                  (addingInCol === col.id ? (
                    <div className="glass-card p-3 space-y-2 border border-subtle">
                      <input
                        autoFocus
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onFocus={() => onFocusBlock?.(block._id)}
                        onBlur={() => onBlurBlock?.(block._id, 1500)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddCard(col.id);
                          if (e.key === 'Escape') setAddingInCol(null);
                        }}
                        placeholder="Card title…"
                        className="w-full bg-transparent text-sm text-primary placeholder-muted focus:outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {['low', 'medium', 'high'].map((p) => (
                            <button
                              key={p}
                              onClick={() => setNewPriority(p)}
                              className={`w-3 h-3 rounded-full ${PRIORITY_DOT[p]} ${
                                newPriority === p ? 'ring-2 ring-accent' : 'opacity-40'
                              } cursor-pointer`}
                              title={p}
                            />
                          ))}
                        </div>
                        <button
                          onClick={() => setAddingInCol(null)}
                          className="text-xs text-muted ml-auto cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleAddCard(col.id)}
                          className="text-xs text-accent font-medium cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setAddingInCol(col.id);
                        setNewTitle('');
                      }}
                      className="flex items-center gap-2 text-xs text-secondary hover:text-primary px-2 py-1.5 rounded-lg hover:bg-surface-raised transition-colors w-full cursor-pointer"
                    >
                      <IoAddOutline size={12} /> Add card
                    </button>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Card detail modal */}
      <AnimatePresence>
        {editingCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={() => setEditingCard(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95 }}
              className="glass-card p-5 w-full max-w-sm space-y-4 border border-strong bg-surface-raised"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                {canEdit ? (
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 bg-transparent text-primary font-semibold focus:outline-none border-b border-subtle pb-1"
                  />
                ) : (
                  <h4 className="text-primary font-semibold">{editingCard.title}</h4>
                )}
                <button
                  onClick={() => setEditingCard(null)}
                  className="text-muted hover:text-primary flex-shrink-0 cursor-pointer"
                >
                  <IoCloseOutline size={18} />
                </button>
              </div>

              {canEdit ? (
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Add a description…"
                  rows={3}
                  className="w-full bg-surface border border-subtle rounded-lg px-3 py-2 text-sm text-primary placeholder-muted resize-none focus:outline-none focus:border-accent transition-colors"
                />
              ) : (
                editingCard.description && (
                  <p className="text-sm text-secondary">{editingCard.description}</p>
                )
              )}

              {canEdit && (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted mb-2">Move to</p>
                    <div className="flex gap-2 flex-wrap">
                      {columns
                        .filter((c) => c.id !== editingCard.status)
                        .map((col) => (
                          <button
                            key={col.id}
                            onClick={() => handleMove(editingCard, col.id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-raised text-secondary hover:text-primary transition-colors border border-subtle cursor-pointer"
                          >
                            → {col.name}
                          </button>
                        ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => handleDeleteCard(editingCard._id)}
                      className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <IoTrashOutline size={12} /> Delete card
                    </button>
                    <button
                      onClick={handleSaveCard}
                      className="btn-primary text-xs px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Links ────────────────────────────────────────────────────────────────────
const LinksEditor = ({ block, sectionId, canEdit, onFocusBlock, onBlurBlock }) => {
  const dispatch = useDispatch();
  const [adding, setAdding]                   = useState(false);
  const [newUrl, setNewUrl]                   = useState('');
  const [newTitle, setNewTitle]               = useState('');
  const [newDesc, setNewDesc]                 = useState('');
  const [isInspecting, setIsInspecting]       = useState(false);
  const [inspectedMeta, setInspectedMeta]     = useState(null);
  const [selectedDisplayMode, setSelectedDisplayMode] = useState('wide');
  const [selectedRatio, setSelectedRatio]     = useState('16/9');
  const inspectDebounceRef = useRef(null);

  const links = block.links || [];

  // Instant client-side detection based on input URL
  const detectedPreview = useMemo(() => {
    return detectLinkMediaInfo(newUrl);
  }, [newUrl]);

  // Inspect URL using the Quick Capture inspection engine (calls /api/captures/scrape)
  const inspectUrl = async (inputUrl) => {
    const trimmed = (inputUrl || '').trim();
    if (!trimmed) {
      setInspectedMeta(null);
      return;
    }

    // Immediate client-side fallback detection
    const clientDetected = detectLinkMediaInfo(trimmed);
    if (clientDetected?.aspectRatio) {
      setSelectedRatio(clientDetected.aspectRatio);
    }

    setIsInspecting(true);
    try {
      const res = await api.post('/captures/scrape', { url: trimmed });
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        setInspectedMeta(d);

        // Auto-fill title if user hasn't typed one
        if (d.title && (!newTitle || newTitle === 'Saved Link')) {
          setNewTitle(d.title);
        }
        // Auto-fill description if empty
        if (d.description && !newDesc) {
          setNewDesc(d.description);
        }
        // Auto-select aspect ratio for vertical shorts / reels
        if (d.platform === 'instagram' && trimmed.includes('/reel')) {
          setSelectedRatio('9/16');
        } else if (d.platform === 'youtube' && trimmed.includes('/shorts')) {
          setSelectedRatio('9/16');
        } else if (d.platform === 'tiktok') {
          setSelectedRatio('9/16');
        }
      }
    } catch (err) {
      console.warn('URL inspection warning:', err?.response?.data?.message || err.message);
    } finally {
      setIsInspecting(false);
    }
  };

  const handleUrlChange = (val) => {
    setNewUrl(val);
    const clientDetected = detectLinkMediaInfo(val);
    if (clientDetected?.aspectRatio) {
      setSelectedRatio(clientDetected.aspectRatio);
    }

    if (inspectDebounceRef.current) {
      clearTimeout(inspectDebounceRef.current);
    }

    if (val.trim() && val.trim().startsWith('http')) {
      inspectDebounceRef.current = setTimeout(() => {
        inspectUrl(val);
      }, 500);
    } else {
      setInspectedMeta(null);
    }
  };

  const handleAdd = async () => {
    const trimmedUrl = newUrl.trim();
    if (!trimmedUrl || !canEdit) return;

    // Resolve title fallback
    let resolvedTitle = newTitle.trim();
    if (!resolvedTitle) {
      if (inspectedMeta?.title) {
        resolvedTitle = inspectedMeta.title;
      } else if (detectedPreview?.label) {
        resolvedTitle = detectedPreview.label;
      } else {
        try {
          resolvedTitle = new URL(trimmedUrl).hostname.replace(/^www\./, '');
        } catch {
          resolvedTitle = 'Saved Link';
        }
      }
    }

    const resolvedPlatform = inspectedMeta?.platform || detectedPreview?.platform || 'web';
    let resolvedEmbedUrl = inspectedMeta?.embedUrl || detectedPreview?.embedUrl || '';
    let resolvedMediaUrl = inspectedMeta?.mediaUrl || detectedPreview?.mediaUrl || '';

    // Direct embeds for Meta videos (Instagram & Facebook) to prevent expired CDN URLs
    if (resolvedPlatform === 'instagram') {
      resolvedEmbedUrl = getInstagramEmbedUrl(trimmedUrl, resolvedEmbedUrl);
      resolvedMediaUrl = '';
    } else if (resolvedPlatform === 'facebook') {
      resolvedEmbedUrl = getFacebookEmbedUrl(trimmedUrl, resolvedEmbedUrl);
      resolvedMediaUrl = '';
    }

    await dispatch(
      addLink({
        sectionId,
        subId: block._id,
        url: trimmedUrl,
        title: resolvedTitle,
        description: newDesc.trim() || (inspectedMeta?.description || ''),
        platform: resolvedPlatform,
        mediaType: inspectedMeta?.mediaType || detectedPreview?.mediaType || 'article',
        embedUrl: resolvedEmbedUrl,
        embedId: inspectedMeta?.embedId || detectedPreview?.embedId || '',
        mediaUrl: resolvedMediaUrl,
        thumbnailUrl: inspectedMeta?.thumbnailUrl || detectedPreview?.thumbnailUrl || '',
        authorName: inspectedMeta?.authorName || detectedPreview?.authorName || '',
        siteName: inspectedMeta?.siteName || '',
        rawContent: inspectedMeta?.rawContent || '',
        displayMode: selectedDisplayMode,
        aspectRatio: selectedRatio,
      }),
    );

    setNewUrl('');
    setNewTitle('');
    setNewDesc('');
    setInspectedMeta(null);
    setAdding(false);
    onBlurBlock?.(block._id, 1500);
  };

  const activeDetectedBadge = inspectedMeta?.platform
    ? getPlatformBadge(inspectedMeta.platform)
    : detectedPreview?.platform
    ? getPlatformBadge(detectedPreview.platform)
    : null;

  return (
    <div className="space-y-3">
      {links.map((link, idx) => {
        if (!link) return null;
        if (isVideoLink(link)) {
          return (
            <WorkspaceVideoCard
              key={link._id || link.url || idx}
              link={link}
              sectionId={sectionId}
              subId={block._id}
              canEdit={canEdit}
              onDelete={(linkId) =>
                dispatch(removeLink({ sectionId, subId: block._id, linkId }))
              }
            />
          );
        }

        // Standard Web Link Card
        return (
          <div
            key={link._id || link.url || idx}
            className="flex items-start gap-3 p-3.5 rounded-xl bg-surface hover:bg-surface-raised border border-subtle transition-colors group shadow-sm"
          >
            <img
              src={`https://www.google.com/s2/favicons?domain=${getDomain(link.url || '')}&sz=32`}
              alt=""
              className="w-5 h-5 mt-0.5 flex-shrink-0 rounded"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary">{link.title || link.url || 'Saved Link'}</p>
              <p className="text-xs text-muted truncate">{link.url || ''}</p>
              {link.description && <p className="text-xs text-muted mt-1 leading-relaxed">{link.description}</p>}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {link.url && (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-secondary hover:text-accent hover:bg-accent-subtle transition-colors"
                  title="Open in new tab"
                >
                  <IoOpenOutline size={15} />
                </a>
              )}
              {link.url && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(link.url);
                    toast.success('Copied to clipboard!');
                  }}
                  className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer"
                  title="Copy URL"
                >
                  <IoCopyOutline size={15} />
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() =>
                    dispatch(removeLink({ sectionId, subId: block._id, linkId: link._id }))
                  }
                  className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  title="Remove link"
                >
                  <IoTrashOutline size={15} />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {links.length === 0 && !adding && (
        <div className="text-center py-6 px-4 rounded-xl border border-dashed border-subtle bg-surface/50">
          <IoVideocamOutline size={28} className="mx-auto text-muted mb-2 opacity-50" />
          <p className="text-sm font-medium text-secondary">No links or videos added yet</p>
          <p className="text-xs text-muted mt-0.5">
            Add YouTube, Instagram, Facebook, X (Twitter), or any web link.
          </p>
        </div>
      )}

      {canEdit && (
        <div className="mt-2">
          {adding ? (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface border border-accent/30 rounded-2xl p-4 space-y-3 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                  <IoSparklesOutline size={13} /> Add Video or Link
                </span>
                {isInspecting && (
                  <span className="text-[11px] text-accent flex items-center gap-1.5 animate-pulse font-medium">
                    <IoRefreshOutline size={12} className="animate-spin" /> Inspecting link…
                  </span>
                )}
              </div>

              {/* URL Input */}
              <div className="relative">
                <input
                  autoFocus
                  value={newUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  onFocus={() => onFocusBlock?.(block._id)}
                  onBlur={() => onBlurBlock?.(block._id, 1500)}
                  placeholder="Paste URL (e.g. YouTube, Instagram Reel, Facebook Video, X post, direct video, or article)…"
                  className="w-full bg-surface-raised border border-subtle rounded-xl px-3.5 py-2.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* Live Detected Media Badge & Aspect Ratio Options */}
              {(activeDetectedBadge || detectedPreview) && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-raised border border-subtle">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                        activeDetectedBadge?.bgCls || 'bg-accent/10 text-accent border-accent/20'
                      }`}
                    >
                      {activeDetectedBadge?.icon || <IoVideocamOutline size={14} />}
                      <span>{detectedPreview?.label || activeDetectedBadge?.label || 'Video Resource Detected'}</span>
                    </span>
                    <span className="text-[11px] text-muted hidden sm:inline">
                      Playable in-app video card
                    </span>
                  </div>

                  {/* Size & Ratio selector */}
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-subtle text-[11px]">
                      <span className="text-muted px-1">Ratio:</span>
                      {['16/9', '9/16', '21/9'].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setSelectedRatio(r)}
                          className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                            selectedRatio === r
                              ? 'bg-accent text-white shadow-sm'
                              : 'text-muted hover:text-primary'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-subtle text-[11px]">
                      <span className="text-muted px-1">Size:</span>
                      {['wide', 'theater'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setSelectedDisplayMode(m)}
                          className={`px-2 py-0.5 rounded capitalize font-medium transition-colors cursor-pointer ${
                            selectedDisplayMode === m
                              ? 'bg-accent text-white shadow-sm'
                              : 'text-muted hover:text-primary'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Title Input */}
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onFocus={() => onFocusBlock?.(block._id)}
                onBlur={() => onBlurBlock?.(block._id, 1500)}
                placeholder="Title (auto-detected from link or enter custom title)"
                className="w-full bg-surface-raised border border-subtle rounded-xl px-3.5 py-2 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent transition-colors"
              />

              {/* Description Input */}
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                onFocus={() => onFocusBlock?.(block._id)}
                onBlur={() => onBlurBlock?.(block._id, 1500)}
                placeholder="Description or notes (optional)"
                className="w-full bg-surface-raised border border-subtle rounded-xl px-3.5 py-2 text-xs text-secondary placeholder-muted focus:outline-none focus:border-accent transition-colors"
              />

              {/* Buttons */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setInspectedMeta(null);
                    setNewUrl('');
                    setNewTitle('');
                    setNewDesc('');
                  }}
                  className="text-xs text-muted hover:text-primary cursor-pointer px-3 py-1.5 rounded-lg hover:bg-surface-raised transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!newUrl.trim()}
                  className="btn-primary text-xs px-4 py-2 rounded-xl font-semibold shadow-md shadow-accent/20 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <IoSparklesOutline size={13} />
                  <span>Save Link & Video</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 text-sm text-secondary hover:text-primary px-3 py-2 rounded-xl hover:bg-surface-raised transition-colors w-full cursor-pointer border border-dashed border-subtle hover:border-accent/40 font-medium"
            >
              <IoAddOutline size={16} className="text-accent" /> Add link or video
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Snippet ──────────────────────────────────────────────────────────────────
const SnippetEditor = ({ block, sectionId, canEdit, onFocusBlock, onBlurBlock, onConflict }) => {
  const dispatch = useDispatch();
  const [localCode, setLocalCode] = useState(block.code || '');
  const [localLang, setLocalLang] = useState(block.language || 'javascript');
  const [saving, setSaving]       = useState(false);
  const isFocusedRef = useRef(false);
  const lastSavedVersionRef = useRef(block.version || 1);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalCode(block.code || '');
      setLocalLang(block.language || 'javascript');
    }
    if (block.version) {
      lastSavedVersionRef.current = block.version;
    }
  }, [block.code, block.language, block.version]);

  const handleFocus = () => {
    isFocusedRef.current = true;
    onFocusBlock?.(block._id);
  };

  const handleBlur = async () => {
    isFocusedRef.current = false;
    onBlurBlock?.(block._id, 1500);
    if (localCode === block.code && localLang === block.language) return;
    if (saving) return;

    setSaving(true);
    const versionToSend = lastSavedVersionRef.current || block.version || 1;
    const res = await dispatch(
      updateSubSection({
        sectionId,
        subId: block._id,
        code: localCode,
        language: localLang,
        version: versionToSend,
      }),
    );
    if (res.meta.requestStatus === 'fulfilled') {
      if (res.payload?.subSection?.version) {
        lastSavedVersionRef.current = res.payload.subSection.version;
      }
    } else if (res.error) {
      if (res.payload?.isConflict) {
        if (onConflict) {
          onConflict({
            block,
            localDraft: localCode,
            remoteBlock: res.payload.currentBlock,
          });
        } else {
          toast.error('Block was modified by another collaborator. Synced with latest code.');
          if (res.payload?.currentBlock) {
            setLocalCode(res.payload.currentBlock.code || '');
            setLocalLang(res.payload.currentBlock.language || 'javascript');
            lastSavedVersionRef.current = res.payload.currentBlock.version || 1;
          }
        }
      } else {
        toast.error(
          typeof res.payload === 'string'
            ? res.payload
            : res.payload?.message || 'Failed to save code',
        );
      }
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <select
          value={localLang}
          onChange={(e) => setLocalLang(e.target.value)}
          onBlur={handleBlur}
          disabled={!canEdit}
          className="text-xs bg-surface border border-subtle text-secondary rounded-lg px-2 py-1 focus:outline-none focus:border-accent"
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-accent animate-pulse">Saving…</span>}
          <button
            onClick={() => {
              navigator.clipboard.writeText(localCode);
              toast.success('Copied!');
            }}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-surface-raised cursor-pointer"
          >
            <IoCopyOutline size={12} /> Copy
          </button>
        </div>
      </div>
      {canEdit ? (
        <textarea
          value={localCode}
          onChange={(e) => setLocalCode(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={`// ${localLang} code here…`}
          rows={10}
          spellCheck={false}
          className="w-full bg-surface border border-subtle rounded-xl px-4 py-3 text-sm text-emerald-400 placeholder-muted resize-y focus:outline-none focus:border-accent transition-colors font-mono leading-relaxed"
        />
      ) : (
        <pre className="bg-surface border border-subtle rounded-xl px-4 py-3 text-sm text-emerald-400 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
          {block.code || <span className="text-muted italic">No code yet</span>}
        </pre>
      )}
    </div>
  );
};

// ─── Image ────────────────────────────────────────────────────────────────────
// Helper: convert data URI (base64) to a File object for clean multipart upload
const dataUriToFile = (dataUri, filename = 'pasted_image.png') => {
  try {
    const arr = dataUri.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch {
    return null;
  }
};

const ImageEditor = ({ block, sectionId, canEdit, onFocusBlock, onBlurBlock }) => {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const lastSavedVersionRef = useRef(block.version || 1);
  const [localUrl, setLocalUrl]         = useState(block.imageUrl || '');
  const [localCaption, setLocalCaption] = useState(block.imageCaption || '');
  const [saving, setSaving]             = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [imgError, setImgError]         = useState(false);
  const [isDragOver, setIsDragOver]     = useState(false);

  useEffect(() => {
    setLocalUrl(block.imageUrl || '');
    setLocalCaption(block.imageCaption || '');
    if (block.version) {
      lastSavedVersionRef.current = block.version;
    }
  }, [block.imageUrl, block.imageCaption, block.version]);

  const handleSave = async (newUrl = localUrl, newCaption = localCaption) => {
    // If user pasted a base64 data URI into the URL input, automatically upload it as a file to prevent payload limit errors
    if (typeof newUrl === 'string' && newUrl.startsWith('data:image/')) {
      const file = dataUriToFile(newUrl);
      if (file) {
        await handleUploadFile(file);
        return true;
      }
    }

    if (newUrl === block.imageUrl && newCaption === block.imageCaption) return true;
    setSaving(true);
    const versionToSend = lastSavedVersionRef.current || block.version || 1;
    const res = await dispatch(
      updateSubSection({
        sectionId,
        subId: block._id,
        imageUrl: newUrl,
        imageCaption: newCaption,
        version: versionToSend,
      }),
    );
    let success = false;
    if (res.meta.requestStatus === 'fulfilled') {
      success = true;
      if (res.payload?.subSection?.version) {
        lastSavedVersionRef.current = res.payload.subSection.version;
      }
    } else if (res.error) {
      if (res.payload?.isConflict) {
        toast.error('Block was modified by another collaborator. Synced with latest image.');
        if (res.payload?.currentBlock) {
          setLocalUrl(res.payload.currentBlock.imageUrl || '');
          setLocalCaption(res.payload.currentBlock.imageCaption || '');
          if (res.payload.currentBlock.version) {
            lastSavedVersionRef.current = res.payload.currentBlock.version;
          }
        }
      } else {
        toast.error(
          typeof res.payload === 'string'
            ? res.payload
            : res.payload?.message || 'Failed to save image',
        );
      }
    }
    setSaving(false);
    onBlurBlock?.(block._id, 1500);
    return success;
  };

  const handleUploadFile = async (file) => {
    if (!file || !file.type.startsWith('image/') || !canEdit) {
      if (!file?.type.startsWith('image/')) toast.error('Please select a valid image file');
      return;
    }
    try {
      setUploading(true);
      const result = await dispatch(uploadSectionImage({ sectionId, file }));
      if (result.meta.requestStatus === 'fulfilled' && result.payload?.imageUrl) {
        const url = result.payload.imageUrl;
        setLocalUrl(url);
        setImgError(false);
        const saveOk = await handleSave(url, localCaption);
        if (saveOk) {
          toast.success('Image uploaded successfully');
        }
      } else {
        toast.error(result.payload || 'Failed to upload image');
      }
    } catch (_) {
      toast.error('Upload error');
    } finally {
      setUploading(false);
    }
  };

  const handlePasteImage = async (e) => {
    if (!canEdit) return;
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          e.preventDefault();
          e.stopPropagation();
          const file = items[i].getAsFile();
          if (file) {
            await handleUploadFile(file);
            return;
          }
        }
      }
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (!canEdit) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onPaste={handlePasteImage}
      onDragOver={(e) => {
        e.preventDefault();
        if (canEdit) setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`space-y-3 rounded-xl transition-colors ${
        isDragOver ? 'ring-2 ring-accent bg-accent-subtle/30' : ''
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleUploadFile(e.target.files[0]);
        }}
      />

      {canEdit && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={localUrl}
              onChange={(e) => {
                setLocalUrl(e.target.value);
                setImgError(false);
              }}
              onFocus={() => onFocusBlock?.(block._id)}
              onBlur={() => handleSave()}
              placeholder="Paste image URL (https://…) or upload below"
              className="flex-1 bg-surface border border-subtle rounded-xl px-4 py-2 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Upload image from computer"
            >
              <IoCloudUploadOutline size={15} />
              <span>{uploading ? 'Uploading…' : 'Upload'}</span>
            </button>
          </div>
          <input
            value={localCaption}
            onChange={(e) => setLocalCaption(e.target.value)}
            onFocus={() => onFocusBlock?.(block._id)}
            onBlur={() => handleSave()}
            placeholder="Caption (optional)"
            className="w-full bg-surface border border-subtle rounded-xl px-4 py-2 text-xs text-secondary placeholder-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      )}

      {localUrl && !imgError ? (
        <div className="rounded-xl overflow-hidden border border-subtle relative group">
          <img
            src={localUrl}
            alt={localCaption || block.name}
            className="w-full max-h-[500px] object-contain bg-canvas"
            onError={() => setImgError(true)}
          />
          {(localCaption || block.imageCaption) && (
            <p className="text-xs text-muted text-center py-2 bg-surface">
              {localCaption || block.imageCaption}
            </p>
          )}
          {canEdit && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-md bg-surface/90 backdrop-blur-sm cursor-pointer"
              >
                <IoCloudUploadOutline size={13} />
                <span>Replace</span>
              </button>
            </div>
          )}
        </div>
      ) : localUrl && imgError ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <IoCloseOutline size={24} className="mx-auto text-red-400 mb-2" />
          <p className="text-sm text-red-400">Failed to load image</p>
          <p className="text-xs text-muted mt-1 truncate">{localUrl}</p>
        </div>
      ) : (
        <div
          onClick={() => canEdit && fileInputRef.current?.click()}
          className={`rounded-xl border border-dashed border-subtle bg-surface p-8 text-center transition-all ${
            canEdit ? 'cursor-pointer hover:border-accent hover:bg-surface-raised' : ''
          }`}
        >
          <span className="text-3xl mb-2 block">🖼️</span>
          <p className="text-sm font-medium text-secondary">
            {canEdit ? 'Click to upload or drag & drop image here' : 'No image added yet'}
          </p>
          {canEdit && (
            <p className="text-xs text-muted mt-1">
              Supports screenshots via Ctrl+V paste or direct PNG, JPG, WebP upload
            </p>
          )}
        </div>
      )}

      {(saving || uploading) && (
        <span className="text-xs text-accent animate-pulse">
          {uploading ? 'Uploading image to GridFS…' : 'Saving…'}
        </span>
      )}
    </div>
  );
};

// ─── SubSectionBlock (main export) ───────────────────────────────────────────
const SubSectionBlock = ({
  block,
  sectionId,
  canManage,
  canEdit = true,
  myRole = 'viewer',
  isActive = false,
  onSelectBlock,
  remoteFocusUser = null,
  onFocusBlock,
  onBlurBlock,
  onConflict,
}) => {
  const dispatch = useDispatch();
  const [collapsed, setCollapsed]         = useState(true);
  const [renaming, setRenaming]           = useState(false);
  const [nameInput, setNameInput]         = useState(block.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setNameInput(block.name);
  }, [block.name]);

  const cfg = TYPE_CONFIG[block.type] || TYPE_CONFIG.note;

  const handleRename = async () => {
    if (nameInput.trim() && nameInput.trim() !== block.name) {
      const res = await dispatch(
        updateSubSection({
          sectionId,
          subId: block._id,
          name: nameInput.trim(),
          version: block.version,
        }),
      );
      if (res.error) {
        if (res.payload?.isConflict) {
          toast.error('Block was modified by another collaborator. Synced with latest changes.');
          setNameInput(res.payload?.currentBlock?.name || block.name);
        } else {
          toast.error(
            typeof res.payload === 'string'
              ? res.payload
              : res.payload?.message || 'Failed to rename block',
          );
          setNameInput(block.name);
        }
      }
    }
    setRenaming(false);
    onBlurBlock?.(block._id, 1500);
  };

  const handleDelete = async () => {
    await dispatch(deleteSubSection({ sectionId, subId: block._id }));
    toast.success('Block deleted');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={() => {
        if (canEdit) onSelectBlock?.(block._id);
      }}
      className={`glass-card overflow-hidden border transition-all duration-200 ${
        remoteFocusUser
          ? 'border-purple-500/80 ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/10'
          : canEdit && isActive
          ? 'border-accent shadow-lg shadow-accent/5 ring-1 ring-accent/40'
          : 'border-subtle hover:border-strong'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-subtle flex-wrap sm:flex-nowrap">
        <span className="text-base select-none">{cfg.icon}</span>

        {renaming ? (
          <input
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onFocus={() => onFocusBlock?.(block._id)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setNameInput(block.name);
                setRenaming(false);
              }
            }}
            className="flex-1 bg-transparent text-primary text-sm font-medium focus:outline-none border-b border-accent pb-0.5"
          />
        ) : (
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex-1 flex items-center gap-2 text-left min-w-0 cursor-pointer flex-wrap sm:flex-nowrap"
          >
            <span className="text-sm font-semibold text-primary truncate">{block.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-raised text-secondary flex-shrink-0">
              {cfg.label}
            </span>

            {/* Remote Focus / Typing Indicator Pill */}
            {remoteFocusUser && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/40 text-purple-300 text-[11px] font-medium animate-pulse flex-shrink-0">
                {remoteFocusUser.avatar ? (
                  <img
                    src={remoteFocusUser.avatar}
                    alt=""
                    className="w-3.5 h-3.5 rounded-full object-cover"
                  />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full bg-purple-500/30 text-purple-200 text-[9px] font-bold flex items-center justify-center">
                    {(remoteFocusUser.name || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
                <span>{remoteFocusUser.name} is editing…</span>
              </span>
            )}

            {/* Last edited attribution */}
            {block.lastEditedBy && !remoteFocusUser && (
              <span
                className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-muted flex-shrink-0 ml-1"
                title={`Last edited by ${block.lastEditedBy.name || 'collaborator'}`}
              >
                {block.lastEditedBy.avatar ? (
                  <img
                    src={block.lastEditedBy.avatar}
                    alt={block.lastEditedBy.name}
                    className="w-3.5 h-3.5 rounded-full object-cover"
                  />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full bg-accent/20 text-accent text-[9px] flex items-center justify-center font-bold">
                    {(block.lastEditedBy.name || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="truncate max-w-[80px]">
                  {block.lastEditedBy.name}
                </span>
              </span>
            )}

            {canEdit && isActive && (
              <span className="text-[10px] text-accent font-medium px-1.5 py-0.5 rounded bg-accent-subtle hidden md:inline-block">
                Active Target
              </span>
            )}
          </button>
        )}

        <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
          {canEdit && !renaming && !confirmDelete && (
            <button
              onClick={() => setRenaming(true)}
              className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer"
              title="Rename"
            >
              <IoCreateOutline size={14} />
            </button>
          )}
          {canEdit && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Delete"
            >
              <IoTrashOutline size={14} />
            </button>
          )}
          {confirmDelete && (
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs text-red-500">Delete?</span>
              <button
                onClick={handleDelete}
                className="text-xs text-red-500 hover:text-red-400 font-medium px-2 py-0.5 rounded bg-red-500/10 cursor-pointer"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-muted hover:text-primary px-2 py-0.5 rounded bg-surface cursor-pointer"
              >
                No
              </button>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer"
            title={collapsed ? 'Expand section' : 'Collapse section'}
          >
            {collapsed ? <IoChevronForward size={14} /> : <IoChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="p-4">
              {block.type === 'note' && (
                <NoteEditor
                  block={block}
                  sectionId={sectionId}
                  canEdit={canEdit}
                  onFocusBlock={onFocusBlock}
                  onBlurBlock={onBlurBlock}
                  onConflict={onConflict}
                />
              )}
              {block.type === 'todo' && (
                <TodoEditor
                  block={block}
                  sectionId={sectionId}
                  canEdit={canEdit}
                  onFocusBlock={onFocusBlock}
                  onBlurBlock={onBlurBlock}
                />
              )}
              {block.type === 'board' && (
                <BoardEditor
                  block={block}
                  sectionId={sectionId}
                  canEdit={canEdit}
                  onFocusBlock={onFocusBlock}
                  onBlurBlock={onBlurBlock}
                />
              )}
              {block.type === 'links' && (
                <LinksEditor
                  block={block}
                  sectionId={sectionId}
                  canEdit={canEdit}
                  onFocusBlock={onFocusBlock}
                  onBlurBlock={onBlurBlock}
                />
              )}
              {block.type === 'snippet' && (
                <SnippetEditor
                  block={block}
                  sectionId={sectionId}
                  canEdit={canEdit}
                  onFocusBlock={onFocusBlock}
                  onBlurBlock={onBlurBlock}
                  onConflict={onConflict}
                />
              )}
              {block.type === 'image' && (
                <ImageEditor
                  block={block}
                  sectionId={sectionId}
                  canEdit={canEdit}
                  onFocusBlock={onFocusBlock}
                  onBlurBlock={onBlurBlock}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SubSectionBlock;
