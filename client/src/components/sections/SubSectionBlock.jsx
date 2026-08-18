import { useState, useRef } from 'react';
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
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import {
  updateSubSection,
  deleteSubSection,
  addTodoItem,
  updateTodoItem,
  deleteTodoItem,
  addBoardItem,
  updateBoardItem,
  deleteBoardItem,
  addLink,
  removeLink,
} from '../../redux/slices/sectionSlice';

// ─── Config ───────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  note:    { icon: '📝', label: 'Note',        color: 'accent' },
  todo:    { icon: '✅', label: 'To-Do',       color: 'emerald' },
  board:   { icon: '📋', label: 'Board',       color: 'purple' },
  links:   { icon: '🔗', label: 'Links',       color: 'accent' },
  snippet: { icon: '</>', label: 'Snippet',    color: 'amber' },
  image:   { icon: '🖼️', label: 'Image',       color: 'rose' },
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
  'javascript','typescript','python','java','go','rust','c','cpp','csharp',
  'php','ruby','swift','kotlin','shell','sql','html','css','json','yaml','markdown','other',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDue = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const diff = Math.floor((d - now) / 86400000);
  if (diff < 0)  return { label: 'Overdue',   cls: 'bg-red-500/15 text-red-400' };
  if (diff === 0) return { label: 'Today',     cls: 'bg-amber-500/15 text-amber-400' };
  if (diff === 1) return { label: 'Tomorrow',  cls: 'bg-accent-subtle text-accent' };
  return { label: d.toLocaleDateString(), cls: 'bg-surface-raised text-secondary' };
};

const getDomain = (url) => { try { return new URL(url).hostname; } catch { return url; } };

// ─── Note ─────────────────────────────────────────────────────────────────────
const NoteEditor = ({ block, sectionId, canManage }) => {
  const dispatch = useDispatch();
  const [local, setLocal] = useState(block.content || '');
  const [saving, setSaving] = useState(false);

  const handleBlur = async () => {
    if (local === block.content) return;
    setSaving(true);
    await dispatch(updateSubSection({ sectionId, subId: block._id, content: local }));
    setSaving(false);
  };

  const words = local.trim() ? local.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-2">
      {canManage ? (
        <textarea
          value={local}
          onChange={(e) => setLocal(e.target.value)}
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
const TodoEditor = ({ block, sectionId, canManage }) => {
  const dispatch = useDispatch();
  const [newText, setNewText]       = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDue, setNewDue]         = useState('');
  const [adding, setAdding]         = useState(false);
  const inputRef = useRef(null);

  const todos = block.todos || [];
  const done  = todos.filter((t) => t.checked).length;
  const pct   = todos.length ? Math.round((done / todos.length) * 100) : 0;

  const handleToggle = (todo) =>
    dispatch(updateTodoItem({ sectionId, subId: block._id, todoId: todo._id, checked: !todo.checked }));

  const handleAdd = async () => {
    if (!newText.trim()) return;
    await dispatch(addTodoItem({ sectionId, subId: block._id, text: newText.trim(), priority: newPriority, dueDate: newDue || null }));
    setNewText(''); setNewDue(''); setNewPriority('medium');
    inputRef.current?.focus();
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
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="space-y-0.5">
        {todos.map((todo) => {
          const due = formatDue(todo.dueDate);
          return (
            <div key={todo._id} className={`flex items-start gap-3 px-2 py-2 rounded-lg group hover:bg-surface-raised transition-colors ${todo.checked ? 'opacity-50' : ''}`}>
              <button
                onClick={() => canManage && handleToggle(todo)}
                className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
                  todo.checked ? 'bg-emerald-500 border-emerald-500' : 'border-subtle hover:border-strong'
                }`}
              >
                {todo.checked && <IoCheckmarkOutline size={10} className="text-white" />}
              </button>
              <span className={`flex-1 text-sm leading-snug ${todo.checked ? 'line-through text-muted' : 'text-primary'}`}>
                {todo.text}
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className={`w-2 h-2 rounded-full ${PRIORITY_DOT[todo.priority]}`} title={todo.priority} />
                {due && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${due.cls}`}>{due.label}</span>}
                {canManage && (
                  <button onClick={() => dispatch(deleteTodoItem({ sectionId, subId: block._id, todoId: todo._id }))}
                    className="p-1 rounded text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
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

      {canManage && (
        <div className="mt-3">
          {adding ? (
            <div className="bg-surface border border-subtle rounded-xl p-3 space-y-2">
              <input
                ref={inputRef}
                autoFocus
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
                placeholder="Task description…"
                className="w-full bg-transparent text-sm text-primary placeholder-muted focus:outline-none"
              />
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {['low','medium','high'].map((p) => (
                    <button key={p} onClick={() => setNewPriority(p)}
                      className={`w-4 h-4 rounded-full ${PRIORITY_DOT[p]} ${newPriority === p ? 'ring-2 ring-accent' : 'opacity-40'} transition-all cursor-pointer`} title={p} />
                  ))}
                </div>
                <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)}
                  className="text-xs bg-transparent text-secondary border-none focus:outline-none" />
                <div className="ml-auto flex gap-3">
                  <button onClick={() => { setAdding(false); setNewText(''); }} className="text-xs text-muted hover:text-primary cursor-pointer">Cancel</button>
                  <button onClick={handleAdd} className="text-xs text-accent hover:underline font-medium cursor-pointer">Add</button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 40); }}
              className="flex items-center gap-2 text-sm text-secondary hover:text-primary px-2 py-1.5 rounded-lg hover:bg-surface-raised transition-colors w-full cursor-pointer">
              <IoAddOutline size={14} /> Add task
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Board ────────────────────────────────────────────────────────────────────
const BoardEditor = ({ block, sectionId, canManage }) => {
  const dispatch = useDispatch();
  const [addingInCol, setAddingInCol]     = useState(null);
  const [newTitle, setNewTitle]           = useState('');
  const [newPriority, setNewPriority]     = useState('medium');
  const [editingCard, setEditingCard]     = useState(null);
  const [editTitle, setEditTitle]         = useState('');
  const [editDesc, setEditDesc]           = useState('');

  const columns = block.boardColumns || [];
  const items   = block.boardItems   || [];
  const colItems = (colId) => items.filter((i) => i.status === colId);

  const handleAddCard = async (colId) => {
    if (!newTitle.trim()) return;
    await dispatch(addBoardItem({ sectionId, subId: block._id, title: newTitle.trim(), status: colId, priority: newPriority }));
    setAddingInCol(null); setNewTitle(''); setNewPriority('medium');
  };

  const openEdit = (item) => { setEditingCard(item); setEditTitle(item.title); setEditDesc(item.description); };

  const handleSaveCard = async () => {
    if (!editTitle.trim()) return;
    await dispatch(updateBoardItem({ sectionId, subId: block._id, itemId: editingCard._id, title: editTitle.trim(), description: editDesc.trim() }));
    setEditingCard(null);
  };

  const handleMove = (item, newStatus) => {
    dispatch(updateBoardItem({ sectionId, subId: block._id, itemId: item._id, status: newStatus }));
    setEditingCard(null);
  };

  const handleDeleteCard = (itemId) => {
    dispatch(deleteBoardItem({ sectionId, subId: block._id, itemId }));
    if (editingCard?._id === itemId) setEditingCard(null);
  };

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-4" style={{ minWidth: `${columns.length * 256}px` }}>
        {columns.map((col) => {
          const cls = COL_CLS[col.color] || COL_CLS.slate;
          return (
            <div key={col.id} className="w-60 flex-shrink-0">
              <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${cls}`}>
                <span className={`text-[11px] font-bold uppercase tracking-widest ${cls.split(' ')[0]}`}>{col.name}</span>
                <span className="text-xs text-muted ml-auto">{colItems(col.id).length}</span>
              </div>
              <div className="space-y-2">
                {colItems(col.id).map((item) => (
                  <div key={item._id}
                    className={`glass-card p-3 cursor-pointer group border-l-2 hover:border-l-4 transition-all border border-subtle ${
                      item.priority === 'high' ? 'border-l-red-500' : item.priority === 'low' ? 'border-l-emerald-500' : 'border-l-amber-500'
                    }`}
                    onClick={() => openEdit(item)}>
                    <p className="text-sm text-primary font-medium leading-snug">{item.title}</p>
                    {item.description && <p className="text-xs text-muted mt-1 line-clamp-2">{item.description}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[10px] font-medium ${PRIORITY_TXT[item.priority]}`}>{item.priority}</span>
                      {item.dueDate && <span className="text-[10px] text-muted">{new Date(item.dueDate).toLocaleDateString()}</span>}
                      {canManage && (
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteCard(item._id); }}
                          className="ml-auto text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                          <IoTrashOutline size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {canManage && (
                  addingInCol === col.id ? (
                    <div className="glass-card p-3 space-y-2 border border-subtle">
                      <input autoFocus value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddCard(col.id); if (e.key === 'Escape') setAddingInCol(null); }}
                        placeholder="Card title…"
                        className="w-full bg-transparent text-sm text-primary placeholder-muted focus:outline-none" />
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {['low','medium','high'].map((p) => (
                            <button key={p} onClick={() => setNewPriority(p)}
                              className={`w-3 h-3 rounded-full ${PRIORITY_DOT[p]} ${newPriority === p ? 'ring-2 ring-accent' : 'opacity-40'} cursor-pointer`} title={p} />
                          ))}
                        </div>
                        <button onClick={() => setAddingInCol(null)} className="text-xs text-muted ml-auto cursor-pointer">Cancel</button>
                        <button onClick={() => handleAddCard(col.id)} className="text-xs text-accent font-medium cursor-pointer">Add</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setAddingInCol(col.id); setNewTitle(''); }}
                      className="flex items-center gap-2 text-xs text-secondary hover:text-primary px-2 py-1.5 rounded-lg hover:bg-surface-raised transition-colors w-full cursor-pointer">
                      <IoAddOutline size={12} /> Add card
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Card detail modal */}
      <AnimatePresence>
        {editingCard && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={() => setEditingCard(null)}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="glass-card p-5 w-full max-w-sm space-y-4 border border-strong bg-surface-raised" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-3">
                {canManage ? (
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 bg-transparent text-primary font-semibold focus:outline-none border-b border-subtle pb-1" />
                ) : (
                  <h4 className="text-primary font-semibold">{editingCard.title}</h4>
                )}
                <button onClick={() => setEditingCard(null)} className="text-muted hover:text-primary flex-shrink-0 cursor-pointer">
                  <IoCloseOutline size={18} />
                </button>
              </div>

              {canManage ? (
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Add a description…" rows={3}
                  className="w-full bg-surface border border-subtle rounded-lg px-3 py-2 text-sm text-primary placeholder-muted resize-none focus:outline-none focus:border-accent transition-colors" />
              ) : (
                editingCard.description && <p className="text-sm text-secondary">{editingCard.description}</p>
              )}

              {canManage && (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted mb-2">Move to</p>
                    <div className="flex gap-2 flex-wrap">
                      {columns.filter((c) => c.id !== editingCard.status).map((col) => (
                        <button key={col.id} onClick={() => handleMove(editingCard, col.id)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-raised text-secondary hover:text-primary transition-colors border border-subtle cursor-pointer">
                          → {col.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button onClick={() => handleDeleteCard(editingCard._id)}
                      className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition-colors cursor-pointer">
                      <IoTrashOutline size={12} /> Delete card
                    </button>
                    <button onClick={handleSaveCard}
                      className="btn-primary text-xs px-3 py-1.5 rounded-lg transition-colors font-medium">
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
const LinksEditor = ({ block, sectionId, canManage }) => {
  const dispatch = useDispatch();
  const [adding, setAdding] = useState(false);
  const [newUrl, setNewUrl]   = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc]  = useState('');

  const links = block.links || [];

  const handleAdd = async () => {
    if (!newUrl.trim() || !newTitle.trim()) return;
    await dispatch(addLink({ sectionId, subId: block._id, url: newUrl.trim(), title: newTitle.trim(), description: newDesc.trim() }));
    setNewUrl(''); setNewTitle(''); setNewDesc(''); setAdding(false);
  };

  return (
    <div className="space-y-2">
      {links.map((link) => (
        <div key={link._id} className="flex items-start gap-3 p-3 rounded-xl bg-surface hover:bg-surface-raised border border-subtle transition-colors group">
          <img src={`https://www.google.com/s2/favicons?domain=${getDomain(link.url)}&sz=32`} alt="" className="w-5 h-5 mt-0.5 flex-shrink-0 rounded"
            onError={(e) => { e.target.style.display = 'none'; }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary">{link.title}</p>
            <p className="text-xs text-muted truncate">{link.url}</p>
            {link.description && <p className="text-xs text-muted mt-0.5">{link.description}</p>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <a href={link.url} target="_blank" rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-secondary hover:text-accent hover:bg-accent-subtle transition-colors" title="Open">
              <IoOpenOutline size={14} />
            </a>
            <button onClick={() => { navigator.clipboard.writeText(link.url); toast.success('Copied!'); }}
              className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer" title="Copy URL">
              <IoCopyOutline size={14} />
            </button>
            {canManage && (
              <button onClick={() => dispatch(removeLink({ sectionId, subId: block._id, linkId: link._id }))}
                className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer" title="Remove">
                <IoTrashOutline size={14} />
              </button>
            )}
          </div>
        </div>
      ))}

      {links.length === 0 && !adding && (
        <p className="text-sm text-muted italic text-center py-4">No links saved yet</p>
      )}

      {canManage && (
        <div className="mt-2">
          {adding ? (
            <div className="bg-surface border border-subtle rounded-xl p-3 space-y-2">
              <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://…"
                className="w-full bg-transparent text-sm text-primary placeholder-muted focus:outline-none border-b border-subtle pb-2" />
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title (required)"
                className="w-full bg-transparent text-sm text-primary placeholder-muted focus:outline-none" />
              <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)"
                className="w-full bg-transparent text-xs text-secondary placeholder-muted focus:outline-none" />
              <div className="flex gap-2 pt-1">
                <button onClick={() => setAdding(false)} className="text-xs text-muted hover:text-primary cursor-pointer">Cancel</button>
                <button onClick={handleAdd} disabled={!newUrl.trim() || !newTitle.trim()}
                  className="text-xs text-accent hover:underline font-medium ml-auto disabled:opacity-40 cursor-pointer">
                  Save Link
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-2 text-sm text-secondary hover:text-primary px-2 py-1.5 rounded-lg hover:bg-surface-raised transition-colors w-full cursor-pointer">
              <IoAddOutline size={14} /> Add link
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Snippet ──────────────────────────────────────────────────────────────────
const SnippetEditor = ({ block, sectionId, canManage }) => {
  const dispatch = useDispatch();
  const [localCode, setLocalCode]   = useState(block.code || '');
  const [localLang, setLocalLang]   = useState(block.language || 'javascript');
  const [saving, setSaving]         = useState(false);

  const handleBlur = async () => {
    if (localCode === block.code && localLang === block.language) return;
    setSaving(true);
    await dispatch(updateSubSection({ sectionId, subId: block._id, code: localCode, language: localLang }));
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <select value={localLang} onChange={(e) => setLocalLang(e.target.value)} onBlur={handleBlur}
          disabled={!canManage}
          className="text-xs bg-surface border border-subtle text-secondary rounded-lg px-2 py-1 focus:outline-none focus:border-accent">
          {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-accent animate-pulse">Saving…</span>}
          <button onClick={() => { navigator.clipboard.writeText(localCode); toast.success('Copied!'); }}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-surface-raised cursor-pointer">
            <IoCopyOutline size={12} /> Copy
          </button>
        </div>
      </div>
      {canManage ? (
        <textarea value={localCode} onChange={(e) => setLocalCode(e.target.value)} onBlur={handleBlur}
          placeholder={`// ${localLang} code here…`} rows={10} spellCheck={false}
          className="w-full bg-surface border border-subtle rounded-xl px-4 py-3 text-sm text-emerald-400 placeholder-muted resize-y focus:outline-none focus:border-accent transition-colors font-mono leading-relaxed" />
      ) : (
        <pre className="bg-surface border border-subtle rounded-xl px-4 py-3 text-sm text-emerald-400 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
          {block.code || <span className="text-muted italic">No code yet</span>}
        </pre>
      )}
    </div>
  );
};

// ─── Image ────────────────────────────────────────────────────────────────────
const ImageEditor = ({ block, sectionId, canManage }) => {
  const dispatch = useDispatch();
  const [localUrl, setLocalUrl] = useState(block.imageUrl || '');
  const [localCaption, setLocalCaption] = useState(block.imageCaption || '');
  const [saving, setSaving] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleSave = async () => {
    if (localUrl === block.imageUrl && localCaption === block.imageCaption) return;
    setSaving(true);
    await dispatch(updateSubSection({ sectionId, subId: block._id, imageUrl: localUrl, imageCaption: localCaption }));
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="space-y-2">
          <input
            value={localUrl}
            onChange={(e) => { setLocalUrl(e.target.value); setImgError(false); }}
            onBlur={handleSave}
            placeholder="Image URL (https://…)"
            className="w-full bg-surface border border-subtle rounded-xl px-4 py-2.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent transition-colors"
          />
          <input
            value={localCaption}
            onChange={(e) => setLocalCaption(e.target.value)}
            onBlur={handleSave}
            placeholder="Caption (optional)"
            className="w-full bg-surface border border-subtle rounded-xl px-4 py-2 text-xs text-secondary placeholder-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      )}

      {localUrl && !imgError ? (
        <div className="rounded-xl overflow-hidden border border-subtle">
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
        </div>
      ) : localUrl && imgError ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <IoCloseOutline size={24} className="mx-auto text-red-400 mb-2" />
          <p className="text-sm text-red-400">Failed to load image</p>
          <p className="text-xs text-muted mt-1 truncate">{localUrl}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-subtle bg-surface p-8 text-center">
          <span className="text-2xl mb-2 block">🖼️</span>
          <p className="text-sm text-muted">{canManage ? 'Enter an image URL above' : 'No image added yet'}</p>
        </div>
      )}

      {saving && <span className="text-xs text-accent animate-pulse">Saving…</span>}
    </div>
  );
};

// ─── SubSectionBlock (main export) ───────────────────────────────────────────
const SubSectionBlock = ({ block, sectionId, canManage }) => {
  const dispatch = useDispatch();
  const [collapsed, setCollapsed]       = useState(false);
  const [renaming, setRenaming]         = useState(false);
  const [nameInput, setNameInput]       = useState(block.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cfg = TYPE_CONFIG[block.type] || TYPE_CONFIG.note;

  const handleRename = async () => {
    if (nameInput.trim() && nameInput.trim() !== block.name)
      await dispatch(updateSubSection({ sectionId, subId: block._id, name: nameInput.trim() }));
    setRenaming(false);
  };

  const handleDelete = async () => {
    await dispatch(deleteSubSection({ sectionId, subId: block._id }));
    toast.success('Block deleted');
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      className="glass-card overflow-hidden border border-subtle">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-subtle">
        <span className="text-base select-none">{cfg.icon}</span>

        {renaming ? (
          <input autoFocus value={nameInput} onChange={(e) => setNameInput(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setNameInput(block.name); setRenaming(false); } }}
            className="flex-1 bg-transparent text-primary text-sm font-medium focus:outline-none border-b border-accent pb-0.5" />
        ) : (
          <button onClick={() => setCollapsed((c) => !c)} className="flex-1 flex items-center gap-2 text-left min-w-0 cursor-pointer">
            <span className="text-sm font-semibold text-primary truncate">{block.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-raised text-secondary flex-shrink-0">{cfg.label}</span>
          </button>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          {canManage && !renaming && !confirmDelete && (
            <button onClick={() => setRenaming(true)}
              className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer" title="Rename">
              <IoCreateOutline size={14} />
            </button>
          )}
          {canManage && !confirmDelete && (
            <button onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer" title="Delete">
              <IoTrashOutline size={14} />
            </button>
          )}
          {confirmDelete && (
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs text-red-500">Delete?</span>
              <button onClick={handleDelete} className="text-xs text-red-500 hover:text-red-400 font-medium px-2 py-0.5 rounded bg-red-500/10 cursor-pointer">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-muted hover:text-primary px-2 py-0.5 rounded bg-surface cursor-pointer">No</button>
            </div>
          )}
          <button onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer">
            {collapsed ? <IoChevronForward size={14} /> : <IoChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
            <div className="p-4">
              {block.type === 'note'    && <NoteEditor    block={block} sectionId={sectionId} canManage={canManage} />}
              {block.type === 'todo'    && <TodoEditor    block={block} sectionId={sectionId} canManage={canManage} />}
              {block.type === 'board'   && <BoardEditor   block={block} sectionId={sectionId} canManage={canManage} />}
              {block.type === 'links'   && <LinksEditor   block={block} sectionId={sectionId} canManage={canManage} />}
              {block.type === 'snippet' && <SnippetEditor block={block} sectionId={sectionId} canManage={canManage} />}
              {block.type === 'image'   && <ImageEditor   block={block} sectionId={sectionId} canManage={canManage} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SubSectionBlock;
