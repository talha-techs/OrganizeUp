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
  note:    { icon: '📝', label: 'Note',        color: 'indigo' },
  todo:    { icon: '✅', label: 'To-Do',       color: 'emerald' },
  board:   { icon: '📋', label: 'Board',       color: 'purple' },
  links:   { icon: '🔗', label: 'Links',       color: 'cyan' },
  snippet: { icon: '</>', label: 'Snippet',    color: 'amber' },
};

const PRIORITY_DOT = { low: 'bg-emerald-500', medium: 'bg-amber-500', high: 'bg-red-500' };
const PRIORITY_TXT = { low: 'text-emerald-400', medium: 'text-amber-400', high: 'text-red-400' };
const COL_CLS = {
  slate:   'text-slate-400 border-slate-600',
  amber:   'text-amber-400 border-amber-600/50',
  emerald: 'text-emerald-400 border-emerald-600/50',
  red:     'text-red-400 border-red-600/50',
  blue:    'text-blue-400 border-blue-600/50',
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
  if (diff === 1) return { label: 'Tomorrow',  cls: 'bg-blue-500/15 text-blue-300' };
  return { label: d.toLocaleDateString(), cls: 'bg-slate-700/50 text-slate-400' };
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
          className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 resize-y focus:outline-none focus:border-indigo-500/50 transition-colors font-mono leading-relaxed"
        />
      ) : (
        <div className="px-4 py-3 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed min-h-[80px]">
          {block.content || <span className="text-slate-600 italic">No content yet</span>}
        </div>
      )}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-slate-600">{words} word{words !== 1 ? 's' : ''}</span>
        {saving && <span className="text-xs text-indigo-400 animate-pulse">Saving…</span>}
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
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>{done}/{todos.length} done</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="space-y-0.5">
        {todos.map((todo) => {
          const due = formatDue(todo.dueDate);
          return (
            <div key={todo._id} className={`flex items-start gap-3 px-2 py-2 rounded-lg group hover:bg-white/5 transition-colors ${todo.checked ? 'opacity-50' : ''}`}>
              <button
                onClick={() => canManage && handleToggle(todo)}
                className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                  todo.checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 hover:border-slate-400'
                }`}
              >
                {todo.checked && <IoCheckmarkOutline size={10} className="text-white" />}
              </button>
              <span className={`flex-1 text-sm leading-snug ${todo.checked ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                {todo.text}
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className={`w-2 h-2 rounded-full ${PRIORITY_DOT[todo.priority]}`} title={todo.priority} />
                {due && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${due.cls}`}>{due.label}</span>}
                {canManage && (
                  <button onClick={() => dispatch(deleteTodoItem({ sectionId, subId: block._id, todoId: todo._id }))}
                    className="p-1 rounded text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                    <IoTrashOutline size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {todos.length === 0 && !adding && (
        <p className="text-sm text-slate-600 italic text-center py-4">No tasks yet</p>
      )}

      {canManage && (
        <div className="mt-3">
          {adding ? (
            <div className="bg-slate-800/60 border border-white/5 rounded-xl p-3 space-y-2">
              <input
                ref={inputRef}
                autoFocus
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
                placeholder="Task description…"
                className="w-full bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
              />
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {['low','medium','high'].map((p) => (
                    <button key={p} onClick={() => setNewPriority(p)}
                      className={`w-4 h-4 rounded-full ${PRIORITY_DOT[p]} ${newPriority === p ? 'ring-2 ring-white/40' : 'opacity-40'} transition-all`} title={p} />
                  ))}
                </div>
                <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)}
                  className="text-xs bg-transparent text-slate-400 border-none focus:outline-none" />
                <div className="ml-auto flex gap-3">
                  <button onClick={() => { setAdding(false); setNewText(''); }} className="text-xs text-slate-500 hover:text-slate-300">Cancel</button>
                  <button onClick={handleAdd} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">Add</button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 40); }}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-300 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors w-full">
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
                <span className="text-xs text-slate-600 ml-auto">{colItems(col.id).length}</span>
              </div>
              <div className="space-y-2">
                {colItems(col.id).map((item) => (
                  <div key={item._id}
                    className={`glass-card p-3 cursor-pointer group border-l-2 hover:border-l-4 transition-all ${
                      item.priority === 'high' ? 'border-red-500/60' : item.priority === 'low' ? 'border-emerald-500/60' : 'border-amber-500/40'
                    }`}
                    onClick={() => openEdit(item)}>
                    <p className="text-sm text-white font-medium leading-snug">{item.title}</p>
                    {item.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[10px] font-medium ${PRIORITY_TXT[item.priority]}`}>{item.priority}</span>
                      {item.dueDate && <span className="text-[10px] text-slate-500">{new Date(item.dueDate).toLocaleDateString()}</span>}
                      {canManage && (
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteCard(item._id); }}
                          className="ml-auto text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                          <IoTrashOutline size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {canManage && (
                  addingInCol === col.id ? (
                    <div className="glass-card p-3 space-y-2">
                      <input autoFocus value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddCard(col.id); if (e.key === 'Escape') setAddingInCol(null); }}
                        placeholder="Card title…"
                        className="w-full bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none" />
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {['low','medium','high'].map((p) => (
                            <button key={p} onClick={() => setNewPriority(p)}
                              className={`w-3 h-3 rounded-full ${PRIORITY_DOT[p]} ${newPriority === p ? 'ring-2 ring-white/30' : 'opacity-40'}`} title={p} />
                          ))}
                        </div>
                        <button onClick={() => setAddingInCol(null)} className="text-xs text-slate-500 ml-auto">Cancel</button>
                        <button onClick={() => handleAddCard(col.id)} className="text-xs text-indigo-400 font-medium">Add</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setAddingInCol(col.id); setNewTitle(''); }}
                      className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-300 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors w-full">
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
              className="glass-card p-5 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-3">
                {canManage ? (
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 bg-transparent text-white font-semibold focus:outline-none border-b border-white/10 pb-1" />
                ) : (
                  <h4 className="text-white font-semibold">{editingCard.title}</h4>
                )}
                <button onClick={() => setEditingCard(null)} className="text-slate-500 hover:text-slate-300 flex-shrink-0">
                  <IoCloseOutline size={18} />
                </button>
              </div>

              {canManage ? (
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Add a description…" rows={3}
                  className="w-full bg-slate-900/50 border border-white/5 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:border-slate-600 transition-colors" />
              ) : (
                editingCard.description && <p className="text-sm text-slate-400">{editingCard.description}</p>
              )}

              {canManage && (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Move to</p>
                    <div className="flex gap-2 flex-wrap">
                      {columns.filter((c) => c.id !== editingCard.status).map((col) => (
                        <button key={col.id} onClick={() => handleMove(editingCard, col.id)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
                          → {col.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button onClick={() => handleDeleteCard(editingCard._id)}
                      className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors">
                      <IoTrashOutline size={12} /> Delete card
                    </button>
                    <button onClick={handleSaveCard}
                      className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors font-medium">
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
        <div key={link._id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 transition-colors group">
          <img src={`https://www.google.com/s2/favicons?domain=${getDomain(link.url)}&sz=32`} alt="" className="w-5 h-5 mt-0.5 flex-shrink-0 rounded"
            onError={(e) => { e.target.style.display = 'none'; }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">{link.title}</p>
            <p className="text-xs text-slate-500 truncate">{link.url}</p>
            {link.description && <p className="text-xs text-slate-500 mt-0.5">{link.description}</p>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <a href={link.url} target="_blank" rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors" title="Open">
              <IoOpenOutline size={14} />
            </a>
            <button onClick={() => { navigator.clipboard.writeText(link.url); toast.success('Copied!'); }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors" title="Copy URL">
              <IoCopyOutline size={14} />
            </button>
            {canManage && (
              <button onClick={() => dispatch(removeLink({ sectionId, subId: block._id, linkId: link._id }))}
                className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all" title="Remove">
                <IoTrashOutline size={14} />
              </button>
            )}
          </div>
        </div>
      ))}

      {links.length === 0 && !adding && (
        <p className="text-sm text-slate-600 italic text-center py-4">No links saved yet</p>
      )}

      {canManage && (
        <div className="mt-2">
          {adding ? (
            <div className="bg-slate-800/60 border border-white/5 rounded-xl p-3 space-y-2">
              <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://…"
                className="w-full bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none border-b border-white/5 pb-2" />
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title (required)"
                className="w-full bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none" />
              <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)"
                className="w-full bg-transparent text-xs text-slate-400 placeholder-slate-600 focus:outline-none" />
              <div className="flex gap-2 pt-1">
                <button onClick={() => setAdding(false)} className="text-xs text-slate-500 hover:text-slate-300">Cancel</button>
                <button onClick={handleAdd} disabled={!newUrl.trim() || !newTitle.trim()}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium ml-auto disabled:opacity-40">
                  Save Link
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-300 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors w-full">
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
          className="text-xs bg-slate-800 border border-white/5 text-slate-400 rounded-lg px-2 py-1 focus:outline-none focus:border-slate-600">
          {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-indigo-400 animate-pulse">Saving…</span>}
          <button onClick={() => { navigator.clipboard.writeText(localCode); toast.success('Copied!'); }}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
            <IoCopyOutline size={12} /> Copy
          </button>
        </div>
      </div>
      {canManage ? (
        <textarea value={localCode} onChange={(e) => setLocalCode(e.target.value)} onBlur={handleBlur}
          placeholder={`// ${localLang} code here…`} rows={10} spellCheck={false}
          className="w-full bg-slate-950/70 border border-white/5 rounded-xl px-4 py-3 text-sm text-emerald-300 placeholder-slate-700 resize-y focus:outline-none focus:border-slate-600 transition-colors font-mono leading-relaxed" />
      ) : (
        <pre className="bg-slate-950/70 border border-white/5 rounded-xl px-4 py-3 text-sm text-emerald-300 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
          {block.code || <span className="text-slate-600 italic">No code yet</span>}
        </pre>
      )}
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
      className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <span className="text-base select-none">{cfg.icon}</span>

        {renaming ? (
          <input autoFocus value={nameInput} onChange={(e) => setNameInput(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setNameInput(block.name); setRenaming(false); } }}
            className="flex-1 bg-transparent text-white text-sm font-medium focus:outline-none border-b border-indigo-500/50 pb-0.5" />
        ) : (
          <button onClick={() => setCollapsed((c) => !c)} className="flex-1 flex items-center gap-2 text-left min-w-0">
            <span className="text-sm font-semibold text-white truncate">{block.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/60 text-slate-400 flex-shrink-0">{cfg.label}</span>
          </button>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          {canManage && !renaming && !confirmDelete && (
            <button onClick={() => setRenaming(true)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-colors" title="Rename">
              <IoCreateOutline size={14} />
            </button>
          )}
          {canManage && !confirmDelete && (
            <button onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
              <IoTrashOutline size={14} />
            </button>
          )}
          {confirmDelete && (
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs text-red-400">Delete?</span>
              <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-300 font-medium px-2 py-0.5 rounded bg-red-500/10">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-slate-500 hover:text-slate-300 px-2 py-0.5 rounded bg-white/5">No</button>
            </div>
          )}
          <button onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/5 transition-colors">
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SubSectionBlock;
