import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import {
  IoAddOutline,
  IoSearchOutline,
  IoCloseOutline,
  IoBookmark,
  IoBookmarkOutline,
  IoArchiveOutline,
  IoTrashOutline,
  IoRefreshOutline,
  IoDownloadOutline,
  IoEyeOutline,
  IoCodeOutline,
  IoCheckmarkCircleOutline,
  IoCloudOfflineOutline,
  IoAlertCircleOutline,
  IoChevronBackOutline,
  IoEllipsisVertical,
  IoJournalOutline,
  IoPencilOutline,
} from 'react-icons/io5';

import {
  fetchNotes,
  fetchNoteById,
  updateNote,
  softDeleteNote,
  restoreNote,
  permanentDeleteNote,
  setActiveNote,
  setActiveNoteId,
  updateActiveNoteDraft,
  upsertNoteInList,
  removeNoteFromList,
  setSaveStatus,
  setViewFilter,
  setSearchQuery,
  setSelectedTag,
} from '../../redux/slices/noteSlice';
import { notesSyncManager } from '../../services/notesSyncService';
import { notesDb } from '../../services/notesDb';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const MAX_BYTES = 50 * 1024; // 50 KB limit

// Helper: Highlight matching query text safely
const highlightMatch = (text, query) => {
  if (!query || !query.trim() || !text) return text;
  const escaped = query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-accent/25 text-primary rounded px-0.5 font-medium">
        {part}
      </mark>
    ) : (
      part
    )
  );
};

// Helper: Calculate byte size of string
const getByteLength = (str) => {
  return new Blob([str || '']).size;
};

// Helper: Extract #hashtags from text
const extractTags = (text) => {
  if (!text) return [];
  const matches = text.match(/#([a-zA-Z0-9_-]+)/g);
  if (!matches) return [];
  const set = new Set(matches.map((t) => t.slice(1).toLowerCase()));
  return Array.from(set).slice(0, 20);
};

// Helper: Auto-derive title from first non-empty line
const deriveTitle = (body) => {
  if (!body) return 'Untitled note';
  const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    return lines[0].replace(/^[#*-\s]+/, '').slice(0, 80) || 'Untitled note';
  }
  return 'Untitled note';
};

// Helper: Extract clean first line segment with ..... for note list preview
const getFirstLineSegment = (body, snippet, displayTitle) => {
  const content = (body || snippet || '').trim();
  if (!content) return '';
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^[#*-\s]+/, ''))
    .filter(Boolean);
  if (lines.length === 0) return '';

  let seg = lines[0];
  // If line 1 was identical to displayTitle and line 2 exists, show line 2
  if (lines.length > 1 && displayTitle && seg.toLowerCase() === displayTitle.trim().toLowerCase()) {
    seg = lines[1];
  }

  // Strip markdown formatting for clean snippet
  seg = seg
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .trim();

  if (!seg) return '';
  const cleanSeg = seg.length > 65 ? `${seg.slice(0, 65).trim()}` : seg;
  return cleanSeg.endsWith('.....') ? cleanSeg : `${cleanSeg.replace(/\.+$/, '')}.....`;
};

// Helper: Toggle checkbox in markdown body by sequential index
const toggleChecklistAt = (text, targetIndex) => {
  let count = 0;
  const regex = /([*-]\s+\[)([ xX])(\])/g;
  return text.replace(regex, (match, prefix, checkState, suffix) => {
    if (count === targetIndex) {
      count++;
      const newState = checkState === ' ' ? 'x' : ' ';
      return `${prefix}${newState}${suffix}`;
    }
    count++;
    return match;
  });
};

const NotesPage = () => {
  const dispatch = useDispatch();
  const location = useLocation();

  const { user } = useSelector((state) => state.auth);
  const {
    notes,
    activeNote,
    activeNoteId,
    isLoading,
    saveStatus,
    statusMessage,
    viewFilter,
    searchQuery,
    selectedTag,
  } = useSelector((state) => state.notes);

  const [localTitle, setLocalTitle] = useState('');
  const [localBody, setLocalBody] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showMobileEditor, setShowMobileEditor] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const searchInputRef = useRef(null);
  const titleInputRef = useRef(null);
  const editorTextareaRef = useRef(null);
  const activeNoteRef = useRef(activeNote);
  activeNoteRef.current = activeNote;

  // Memoized sorted notes list with pinned items permanently sorted to the top
  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      const aPin = Boolean(a.pinned);
      const bPin = Boolean(b.pinned);
      if (aPin !== bPin) {
        return aPin ? -1 : 1;
      }
      return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
    });
  }, [notes]);

  // Resume sync after login / mount
  useEffect(() => {
    const uid = user?._id || user?.id;
    if (uid) {
      notesSyncManager.processSyncQueue(uid);
    }
  }, [user]);

  // Load initial notes when viewFilter or selectedTag changes
  useEffect(() => {
    const params = {};
    if (viewFilter === 'trash') {
      params.deleted = 'true';
    } else if (viewFilter === 'archived') {
      params.archived = 'true';
    } else {
      params.deleted = 'false';
      params.archived = 'false';
    }

    if (searchQuery.trim()) {
      params.q = searchQuery.trim();
    }
    if (selectedTag) {
      params.tag = selectedTag;
    }

    dispatch(fetchNotes(params));
  }, [dispatch, viewFilter, searchQuery, selectedTag]);

  // Handle URL query ?new=true or ?id=...
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('new') === 'true') {
      handleCreateNewNote();
      window.history.replaceState({}, '', '/notes');
    } else if (params.get('id')) {
      const id = params.get('id');
      handleSelectNote(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Synchronize localTitle and localBody when activeNote changes
  useEffect(() => {
    if (activeNote) {
      setLocalTitle(activeNote.title || '');
      setLocalBody(activeNote.body || '');
      // If we are selecting an existing note on mobile, display the editor
      if (window.innerWidth < 768) {
        setShowMobileEditor(true);
      }
    } else {
      setLocalTitle('');
      setLocalBody('');
    }
  }, [activeNote]);

  // Keyboard shortcut listeners (Ctrl+F or / for search, N for new note)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const targetTag = e.target.tagName?.toLowerCase();
      const isInput = targetTag === 'input' || targetTag === 'textarea' || e.target.isContentEditable;

      // Search shortcut: '/' or Ctrl+F / Cmd+F
      if (!isInput && e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Instant new note: 'N' or 'n' when not typing
      if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        handleCreateNewNote();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Collect all unique tags across currently loaded notes
  const availableTags = useMemo(() => {
    const set = new Set();
    notes.forEach((n) => {
      if (Array.isArray(n.tags)) {
        n.tags.forEach((t) => set.add(t));
      }
    });
    return Array.from(set);
  }, [notes]);

  // Select a note
  const handleSelectNote = async (noteId) => {
    // If current note is blank local draft, discard it before switching
    if (activeNoteRef.current && activeNoteRef.current._id?.startsWith('local-')) {
      if (!localTitle.trim() && !localBody.trim()) {
        dispatch(removeNoteFromList(activeNoteRef.current._id));
        dispatch(setActiveNote(null));
      }
    }

    dispatch(setActiveNoteId(noteId));

    // Check if Dexie has an offline draft with full body first (keyed by userId)
    try {
      const uid = user?._id || user?.id || 'default';
      const draftKey = `${uid}:${noteId}`;
      const localDraft = (await notesDb.drafts.get(draftKey)) || (await notesDb.drafts.get(noteId));
      if (localDraft && (localDraft.body || localDraft.title)) {
        dispatch(
          setActiveNote({
            _id: localDraft.id,
            title: localDraft.title,
            body: localDraft.body,
            pinned: localDraft.pinned,
            archived: localDraft.archived,
            tags: localDraft.tags,
            version: localDraft.version,
            updatedAt: new Date(localDraft.updatedAt).toISOString(),
          })
        );
      }
    } catch {
      // Ignore Dexie read errors
    }

    // Fetch full note from API
    try {
      const result = await dispatch(fetchNoteById(noteId)).unwrap();
      if (result) {
        // Save to Dexie for offline reading
        notesSyncManager.saveDraftLocally({
          id: result._id,
          title: result.title,
          body: result.body,
          pinned: result.pinned,
          archived: result.archived,
          tags: result.tags,
          version: result.version,
        });
      }
    } catch {
      // Handled in extraReducers
    }

    if (window.innerWidth < 768) {
      setShowMobileEditor(true);
    }
  };

  // Instant New Note (QN-1)
  const handleCreateNewNote = () => {
    // If currently on an empty local note, keep focusing it
    if (
      activeNoteRef.current &&
      activeNoteRef.current._id?.startsWith('local-') &&
      !localTitle.trim() &&
      !localBody.trim()
    ) {
      titleInputRef.current?.focus();
      if (window.innerWidth < 768) setShowMobileEditor(true);
      return;
    }

    const clientId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const blank = {
      _id: `local-${clientId}`,
      clientId,
      title: '',
      body: '',
      pinned: false,
      archived: false,
      tags: [],
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isLocalDraft: true,
    };

    // Instantly add to notes list so it is immediately visible
    dispatch(upsertNoteInList(blank));
    dispatch(setActiveNote(blank));
    setLocalTitle('');
    setLocalBody('');
    setIsPreviewMode(false);

    if (window.innerWidth < 768) {
      setShowMobileEditor(true);
    }

    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 50);
  };

  // Handle Title Input Change
  const handleTitleChange = (newTitle) => {
    setLocalTitle(newTitle);

    // Update Redux state immediately so list item updates in real-time
    dispatch(
      updateActiveNoteDraft({
        title: newTitle,
      })
    );

    const currentNote = activeNoteRef.current;
    if (!currentNote) return;

    const isNew = currentNote._id?.startsWith('local-');
    const noteId = isNew ? null : currentNote._id;
    const clientId = currentNote.clientId;
    const baseVersion = currentNote.version || 1;

    notesSyncManager.scheduleDebouncedSync({
      noteId,
      clientId,
      draftData: {
        title: newTitle,
        body: localBody,
        pinned: currentNote.pinned,
        archived: currentNote.archived,
        tags: extractTags(localBody),
      },
      baseVersion,
      onStatusChange: (statusObj) => {
        dispatch(setSaveStatus(statusObj));
      },
      onSuccess: (savedNote) => {
        dispatch(upsertNoteInList(savedNote));
        dispatch(setActiveNote(savedNote));
      },
    });
  };

  // Handle Textarea Body Change
  const handleBodyChange = (newBody) => {
    // Check 50 KB limit
    const byteLength = getByteLength(newBody);
    if (byteLength > MAX_BYTES) {
      toast.error('Note exceeds 50 KB limit. Further text was not added.');
      return;
    }

    setLocalBody(newBody);

    const derivedTitle = localTitle.trim() || deriveTitle(newBody) || 'Untitled note';
    const extractedTags = extractTags(newBody);

    // Update Redux state immediately for responsive title/snippet updates
    dispatch(
      updateActiveNoteDraft({
        body: newBody,
        title: derivedTitle,
        tags: extractedTags,
      })
    );

    const currentNote = activeNoteRef.current;
    if (!currentNote) return;

    const isNew = currentNote._id?.startsWith('local-');
    const noteId = isNew ? null : currentNote._id;
    const clientId = currentNote.clientId;
    const baseVersion = currentNote.version || 1;

    // Trigger debounced autosave pipeline
    notesSyncManager.scheduleDebouncedSync({
      noteId,
      clientId,
      draftData: {
        title: derivedTitle,
        body: newBody,
        pinned: currentNote.pinned,
        archived: currentNote.archived,
        tags: extractedTags,
      },
      baseVersion,
      onStatusChange: (statusObj) => {
        dispatch(setSaveStatus(statusObj));
      },
      onSuccess: (savedNote) => {
        dispatch(upsertNoteInList(savedNote));
        dispatch(setActiveNote(savedNote));
      },
    });
  };

  // Toggle checklist checkbox from markdown preview (QN-12)
  const handleToggleChecklist = (checkboxIndex) => {
    if (!activeNote || viewFilter === 'trash') return;
    const updated = toggleChecklistAt(localBody, checkboxIndex);
    handleBodyChange(updated);
  };

  // Toggle Pin for Active Note
  const handleTogglePin = async () => {
    if (!activeNote) return;
    const newPinned = !activeNote.pinned;
    const updated = {
      ...activeNote,
      pinned: newPinned,
      updatedAt: new Date().toISOString(),
    };
    dispatch(setActiveNote(updated));
    dispatch(upsertNoteInList(updated));

    if (!activeNote._id.startsWith('local-')) {
      try {
        await dispatch(
          updateNote({
            id: activeNote._id,
            data: { pinned: newPinned },
            baseVersion: activeNote.version,
          })
        ).unwrap();
        toast.success(newPinned ? 'Note pinned to top' : 'Note unpinned');
      } catch {
        toast.error('Failed to update pin status');
        const rollback = { ...activeNote, pinned: !newPinned };
        dispatch(setActiveNote(rollback));
        dispatch(upsertNoteInList(rollback));
      }
    }
  };

  // Toggle Pin directly from Note Card in List
  const handleTogglePinForNote = async (note) => {
    const newPinned = !note.pinned;
    const updated = {
      ...note,
      pinned: newPinned,
      updatedAt: new Date().toISOString(),
    };
    if (activeNote && (activeNote._id === note._id || activeNote.clientId === note.clientId)) {
      dispatch(setActiveNote({ ...activeNote, pinned: newPinned }));
    }
    dispatch(upsertNoteInList(updated));

    if (!note._id.startsWith('local-')) {
      try {
        await dispatch(
          updateNote({
            id: note._id,
            data: { pinned: newPinned },
            baseVersion: note.version,
          })
        ).unwrap();
        toast.success(newPinned ? 'Note pinned to top' : 'Note unpinned');
      } catch {
        toast.error('Failed to update pin status');
        const rollback = { ...note, pinned: !newPinned };
        dispatch(upsertNoteInList(rollback));
      }
    }
  };

  // Toggle Archive
  const handleToggleArchive = async () => {
    if (!activeNote) return;
    const newArchived = !activeNote.archived;
    const updated = { ...activeNote, archived: newArchived };
    dispatch(setActiveNote(updated));

    if (viewFilter === 'active' && newArchived) {
      dispatch(removeNoteFromList(activeNote._id));
    } else if (viewFilter === 'archived' && !newArchived) {
      dispatch(removeNoteFromList(activeNote._id));
    } else {
      dispatch(upsertNoteInList(updated));
    }

    if (!activeNote._id.startsWith('local-')) {
      try {
        await dispatch(
          updateNote({
            id: activeNote._id,
            data: { archived: newArchived },
            baseVersion: activeNote.version,
          })
        ).unwrap();
        toast.success(newArchived ? 'Note archived' : 'Note unarchived');
      } catch {
        toast.error('Failed to update archive status');
      }
    }
  };

  // Soft Delete Note (moves to trash)
  const handleDeleteNote = async () => {
    if (!activeNote) return;

    if (activeNote._id.startsWith('local-')) {
      // Local draft not yet saved on server
      dispatch(removeNoteFromList(activeNote._id));
      dispatch(setActiveNote(null));
      setLocalTitle('');
      setLocalBody('');
      setShowMobileEditor(false);
      return;
    }

    try {
      await dispatch(softDeleteNote(activeNote._id)).unwrap();
      dispatch(removeNoteFromList(activeNote._id));
      setShowMobileEditor(false);
    } catch {
      toast.error('Failed to move note to trash');
    }
  };

  // Restore Note from Trash
  const handleRestoreNote = async () => {
    if (!activeNote) return;
    try {
      await dispatch(restoreNote(activeNote._id)).unwrap();
      // Refresh trash view
      dispatch(fetchNotes({ deleted: 'true' }));
    } catch {
      toast.error('Failed to restore note');
    }
  };

  // Permanent Delete Note
  const handlePermanentDelete = async () => {
    if (!activeNote) return;
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete this note? This action cannot be undone.'
    );
    if (!confirmed) return;

    try {
      await dispatch(permanentDeleteNote(activeNote._id)).unwrap();
      setShowMobileEditor(false);
      // Remove from Dexie as well
      await notesDb.drafts.delete(activeNote._id).catch(() => {});
    } catch {
      toast.error('Failed to permanently delete note');
    }
  };

  // Export Note as .md or .txt (QN-17)
  const handleExportNote = (format = 'md') => {
    if (!activeNote) return;
    const title = localTitle.trim() || activeNote.title || 'Untitled note';
    const cleanTitle = title
      .split('')
      .filter((ch) => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) !== 127 && !'<>/\\|?*:"'.includes(ch))
      .join('')
      .replace(/\s+/g, '-')
      .slice(0, 60)
      .trim() || 'note';
    const filename = `${cleanTitle}.${format}`;
    const content = format === 'txt' ? `${title}\n\n${localBody}` : localBody;

    const blob = new Blob([content], {
      type: format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
    toast.success(`Exported as ${filename}`);
  };

  // Format relative timestamp
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const currentByteLength = getByteLength(localBody);
  const isNearLimit = currentByteLength > 45 * 1024; // Near 50 KB limit
  const isTrashView = viewFilter === 'trash';

  // Checkbox counter reset on each render pass for GFM tasks
  let checkboxCounter = 0;

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-[calc(100vh-1rem)] max-w-7xl mx-auto overflow-hidden bg-canvas">
      {/* ======================================================== */}
      {/* LEFT PANE: Note List, Search, Filters, Tabs              */}
      {/* ======================================================== */}
      <section
        aria-label="Notes navigation"
        className={`w-full md:w-80 lg:w-96 flex flex-col flex-shrink-0 border-r border-subtle bg-surface/50 backdrop-blur-sm ${
          showMobileEditor ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header */}
        <div className="p-3.5 border-b border-subtle flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center text-accent">
              <IoJournalOutline size={18} />
            </div>
            <div>
              <h1 className="text-base font-semibold text-primary leading-tight">Quick Notes</h1>
              <p className="text-[11px] text-muted">
                {notes.length} {notes.length === 1 ? 'note' : 'notes'}
              </p>
            </div>
          </div>
          <button
            onClick={handleCreateNewNote}
            title="Create new note (N)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover active:scale-95 transition-all text-xs font-medium cursor-pointer shadow-sm"
          >
            <IoAddOutline size={16} />
            <span>New Note</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <IoSearchOutline
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => dispatch(setSearchQuery(e.target.value))}
              placeholder="Search notes (Ctrl+F or /)"
              className="w-full bg-surface-raised border border-subtle rounded-lg pl-9 pr-8 py-1.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => dispatch(setSearchQuery(''))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary cursor-pointer"
              >
                <IoCloseOutline size={14} />
              </button>
            )}
          </div>
        </div>

        {/* View Tabs: All, Archived, Trash */}
        <div className="px-3 pb-2 flex items-center gap-1 border-b border-subtle/50 text-xs">
          <button
            onClick={() => dispatch(setViewFilter('active'))}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              viewFilter === 'active'
                ? 'bg-accent/15 text-accent'
                : 'text-muted hover:text-primary hover:bg-surface-raised'
            }`}
          >
            All Notes
          </button>
          <button
            onClick={() => dispatch(setViewFilter('archived'))}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              viewFilter === 'archived'
                ? 'bg-accent/15 text-accent'
                : 'text-muted hover:text-primary hover:bg-surface-raised'
            }`}
          >
            Archived
          </button>
          <button
            onClick={() => dispatch(setViewFilter('trash'))}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              viewFilter === 'trash'
                ? 'bg-accent/15 text-accent'
                : 'text-muted hover:text-primary hover:bg-surface-raised'
            }`}
          >
            Trash
          </button>
        </div>

        {/* Tags horizontal filter bar */}
        {availableTags.length > 0 && viewFilter !== 'trash' && (
          <div className="px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-subtle/30 text-[11px]">
            <button
              onClick={() => dispatch(setSelectedTag(null))}
              className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                !selectedTag
                  ? 'bg-primary text-canvas font-semibold'
                  : 'bg-surface-raised text-muted hover:text-primary'
              }`}
            >
              All
            </button>
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => dispatch(setSelectedTag(selectedTag === tag ? null : tag))}
                className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                  selectedTag === tag
                    ? 'bg-accent text-white font-medium'
                    : 'bg-surface-raised text-muted hover:text-primary'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Note List Scrollable */}
        <div className="flex-1 overflow-y-auto divide-y divide-subtle/30">
          {isLoading && notes.length === 0 ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner size="sm" text="Loading notes..." />
            </div>
          ) : notes.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center text-muted">
              <IoJournalOutline size={36} className="text-muted/40 mb-2" />
              <p className="text-xs font-medium text-secondary">
                {viewFilter === 'trash'
                  ? 'Trash is empty'
                  : viewFilter === 'archived'
                  ? 'No archived notes'
                  : searchQuery
                  ? 'No notes match your search'
                  : 'No notes yet'}
              </p>
              <p className="text-[11px] mt-1 text-muted max-w-[200px]">
                {viewFilter === 'active' && !searchQuery
                  ? 'Start typing lecture snippets, formulas or quick checklists.'
                  : ''}
              </p>
              {viewFilter === 'active' && !searchQuery && (
                <button
                  onClick={handleCreateNewNote}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-accent/15 text-accent hover:bg-accent/25 text-xs font-medium cursor-pointer"
                >
                  Create your first note
                </button>
              )}
            </div>
          ) : (
            sortedNotes.map((note) => {
              const isSelected =
                activeNote?._id === note._id ||
                activeNoteId === note._id ||
                (activeNote?.clientId && note.clientId && activeNote.clientId === note.clientId);
              const displayTitle =
                note.title?.trim() || deriveTitle(note.body || note.snippet) || 'Untitled note';
              const firstLineSegment = getFirstLineSegment(note.body, note.snippet, displayTitle);

              return (
                <div
                  key={note._id || note.id || note.clientId}
                  onClick={() => handleSelectNote(note._id || note.id)}
                  className={`p-3 cursor-pointer transition-colors border-l-4 group relative ${
                    isSelected
                      ? 'bg-surface-raised border-accent'
                      : 'border-transparent hover:bg-surface-raised/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <h3
                      className={`text-xs font-semibold truncate flex-1 ${
                        isSelected ? 'text-primary' : 'text-primary/90'
                      }`}
                    >
                      {highlightMatch(displayTitle, searchQuery)}
                    </h3>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePinForNote(note);
                        }}
                        className={`p-0.5 rounded transition-colors cursor-pointer ${
                          note.pinned
                            ? 'text-accent hover:text-accent/80'
                            : 'text-muted/40 hover:text-primary opacity-0 group-hover:opacity-100'
                        }`}
                        title={note.pinned ? 'Unpin note' : 'Pin note to top'}
                      >
                        {note.pinned ? <IoBookmark size={13} /> : <IoBookmarkOutline size={13} />}
                      </button>
                      <span className="text-[10px] text-muted">
                        {formatTimeAgo(note.updatedAt || note.createdAt)}
                      </span>
                    </div>
                  </div>

                  {firstLineSegment && (
                    <p className="text-[11px] text-muted line-clamp-1 mt-1 leading-relaxed break-words">
                      {highlightMatch(firstLineSegment, searchQuery)}
                    </p>
                  )}

                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {note.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.2 rounded bg-surface border border-subtle text-muted"
                        >
                          #{tag}
                        </span>
                      ))}
                      {note.tags.length > 3 && (
                        <span className="text-[9px] text-muted">
                          +{note.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ======================================================== */}
      {/* RIGHT PANE: Note Editor / Markdown Preview               */}
      {/* ======================================================== */}
      <main
        aria-label="Note editor"
        className={`flex-1 flex flex-col bg-surface overflow-hidden ${
          !showMobileEditor && !activeNote ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeNote ? (
          <>
            {/* Top Toolbar */}
            <div className="h-13 px-4 border-b border-subtle flex items-center justify-between gap-2 bg-surface flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {/* Mobile Back button */}
                <button
                  onClick={() => setShowMobileEditor(false)}
                  className="md:hidden p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-raised cursor-pointer"
                  title="Back to notes list"
                >
                  <IoChevronBackOutline size={18} />
                </button>

                {/* Status Indicator with aria-live (QN-5) */}
                <div
                  aria-live="polite"
                  className="flex items-center gap-1.5 text-[11px] text-muted truncate"
                >
                  {saveStatus === 'saving' && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                      <span>Saving…</span>
                    </>
                  )}
                  {saveStatus === 'saved' && (
                    <>
                      <IoCheckmarkCircleOutline size={14} className="text-success" />
                      <span>Saved</span>
                    </>
                  )}
                  {saveStatus === 'offline' && (
                    <>
                      <IoCloudOfflineOutline size={14} className="text-warning" />
                      <span>Offline, will sync</span>
                    </>
                  )}
                  {saveStatus === 'error' && (
                    <>
                      <IoAlertCircleOutline size={14} className="text-danger" />
                      <span>{statusMessage || "Couldn't save, retrying"}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-1 sm:gap-1.5">
                {/* Size Indicator */}
                <span
                  className={`hidden sm:inline-block text-[10px] px-2 py-0.5 rounded ${
                    isNearLimit
                      ? 'text-danger bg-danger/10 font-medium'
                      : 'text-muted bg-surface-raised'
                  }`}
                  title="Note byte size (Max 50 KB)"
                >
                  {(currentByteLength / 1024).toFixed(1)} KB / 50 KB
                </span>

                {/* Markdown Preview Toggle */}
                <button
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isPreviewMode
                      ? 'bg-accent/15 text-accent'
                      : 'text-muted hover:text-primary hover:bg-surface-raised'
                  }`}
                  title={isPreviewMode ? 'Switch to Edit mode' : 'Preview Markdown'}
                >
                  {isPreviewMode ? <IoCodeOutline size={15} /> : <IoEyeOutline size={15} />}
                  <span className="hidden sm:inline">{isPreviewMode ? 'Edit' : 'Preview'}</span>
                </button>

                {/* Pin Button */}
                {!isTrashView && (
                  <button
                    onClick={handleTogglePin}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      activeNote.pinned
                        ? 'text-accent bg-accent/10'
                        : 'text-muted hover:text-primary hover:bg-surface-raised'
                    }`}
                    title={activeNote.pinned ? 'Unpin note' : 'Pin note'}
                  >
                    {activeNote.pinned ? <IoBookmark size={16} /> : <IoBookmarkOutline size={16} />}
                  </button>
                )}

                {/* Archive Button */}
                {!isTrashView && (
                  <button
                    onClick={handleToggleArchive}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      activeNote.archived
                        ? 'text-accent bg-accent/10'
                        : 'text-muted hover:text-primary hover:bg-surface-raised'
                    }`}
                    title={activeNote.archived ? 'Unarchive note' : 'Archive note'}
                  >
                    <IoArchiveOutline size={16} />
                  </button>
                )}

                {/* Export Dropdown (QN-17) */}
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer"
                    title="Export note"
                  >
                    <IoDownloadOutline size={16} />
                  </button>

                  {showExportMenu && (
                    <div className="absolute right-0 top-full mt-1 w-44 rounded-lg bg-surface border border-subtle shadow-lg py-1 z-30 text-xs">
                      <button
                        onClick={() => handleExportNote('md')}
                        className="w-full text-left px-3 py-1.5 hover:bg-surface-raised text-primary transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <span>Markdown (.md)</span>
                      </button>
                      <button
                        onClick={() => handleExportNote('txt')}
                        className="w-full text-left px-3 py-1.5 hover:bg-surface-raised text-primary transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <span>Plain text (.txt)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Delete / Move to Trash */}
                {!isTrashView ? (
                  <button
                    onClick={handleDeleteNote}
                    className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                    title="Move to trash"
                  >
                    <IoTrashOutline size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handlePermanentDelete}
                    className="p-1.5 rounded-lg text-danger hover:bg-danger/15 transition-colors cursor-pointer"
                    title="Delete forever"
                  >
                    <IoTrashOutline size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Trash View Restore Banner */}
            {isTrashView && (
              <div className="px-4 py-2 bg-warning/10 border-b border-warning/20 flex items-center justify-between text-xs text-warning">
                <span>This note is in Recently deleted. Notes older than 30 days are permanently purged.</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRestoreNote}
                    className="px-2.5 py-1 rounded bg-warning text-black font-medium hover:bg-warning/90 transition-colors cursor-pointer"
                  >
                    Restore
                  </button>
                  <button
                    onClick={handlePermanentDelete}
                    className="px-2.5 py-1 rounded bg-danger text-white font-medium hover:bg-danger/90 transition-colors cursor-pointer"
                  >
                    Delete forever
                  </button>
                </div>
              </div>
            )}

            {/* Editor Textarea vs Markdown Preview */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {isPreviewMode ? (
                <div className="max-w-3xl mx-auto text-primary leading-relaxed">
                  {localTitle.trim() && (
                    <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-4 pb-2 border-b border-subtle">
                      {localTitle}
                    </h1>
                  )}
                  {localBody.trim() ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ ...props }) => (
                          <h1 className="text-2xl font-bold mt-4 mb-2 text-primary" {...props} />
                        ),
                        h2: ({ ...props }) => (
                          <h2 className="text-xl font-semibold mt-3 mb-2 text-primary" {...props} />
                        ),
                        h3: ({ ...props }) => (
                          <h3 className="text-lg font-semibold mt-2 mb-1 text-primary" {...props} />
                        ),
                        p: ({ ...props }) => (
                          <p className="mb-2 leading-relaxed text-primary/90" {...props} />
                        ),
                        ul: ({ ...props }) => (
                          <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />
                        ),
                        ol: ({ ...props }) => (
                          <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />
                        ),
                        li: ({ ...props }) => (
                          <li className="leading-relaxed" {...props} />
                        ),
                        a: ({ ...props }) => (
                          <a
                            className="text-accent underline hover:opacity-80"
                            target="_blank"
                            rel="noreferrer"
                            {...props}
                          />
                        ),
                        code: ({ inline, ...props }) =>
                          inline ? (
                            <code
                              className="bg-surface-raised px-1.5 py-0.5 rounded text-xs font-mono text-accent"
                              {...props}
                            />
                          ) : (
                            <pre className="bg-surface-raised p-3 rounded-lg overflow-x-auto text-xs font-mono my-2 border border-subtle">
                              <code {...props} />
                            </pre>
                          ),
                        blockquote: ({ ...props }) => (
                          <blockquote
                            className="border-l-4 border-accent pl-3 italic my-2 text-secondary"
                            {...props}
                          />
                        ),
                        // Interactive GFM checklist checkbox (QN-12)
                        input: ({ ...props }) => {
                          if (props.type === 'checkbox') {
                            const thisIdx = checkboxCounter++;
                            return (
                              <input
                                type="checkbox"
                                checked={Boolean(props.checked)}
                                onChange={() => handleToggleChecklist(thisIdx)}
                                className="cursor-pointer accent-accent w-4 h-4 rounded align-middle mr-2"
                              />
                            );
                          }
                          return <input {...props} />;
                        },
                      }}
                    >
                      {localBody}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-muted italic text-sm">Empty note</p>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col max-w-3xl mx-auto">
                  {/* Note Title on top */}
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={localTitle}
                    disabled={isTrashView}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        editorTextareaRef.current?.focus();
                      }
                    }}
                    placeholder="Note title..."
                    className="w-full text-xl sm:text-2xl font-bold text-primary bg-transparent focus:outline-none placeholder:text-muted/40 pb-2 mb-3 border-b border-subtle/50 disabled:opacity-50 transition-colors focus:border-accent"
                  />

                  {/* Note Body Textarea */}
                  <textarea
                    ref={editorTextareaRef}
                    value={localBody}
                    disabled={isTrashView}
                    onChange={(e) => handleBodyChange(e.target.value)}
                    placeholder="Start typing your note here...&#10;&#10;Tips:&#10;• First line becomes the title automatically if title is blank&#10;• Write #tags to organize (e.g. #exam #ideas)&#10;• Use - [ ] for interactive checklists&#10;• Full markdown formatting supported"
                    className="w-full flex-1 resize-none bg-transparent text-primary text-sm sm:text-base leading-relaxed placeholder:text-muted/60 focus:outline-none border-none p-0 disabled:opacity-50 font-sans"
                    autoFocus={!localTitle}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty state when no note is selected on desktop */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted">
            <div className="w-16 h-16 rounded-2xl bg-surface-raised flex items-center justify-center text-muted/60 mb-4 border border-subtle">
              <IoJournalOutline size={32} />
            </div>
            <h2 className="text-base font-semibold text-primary mb-1">OrganizeUp Quick Notes</h2>
            <p className="text-xs text-muted max-w-sm mb-4 leading-relaxed">
              Capture lectures, ideas, code snippets or checklists instantly. Everything saves locally first and syncs reliably.
            </p>
            <button
              onClick={handleCreateNewNote}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover text-xs font-semibold cursor-pointer transition-transform active:scale-95 shadow-sm"
            >
              <IoAddOutline size={18} />
              <span>New Note (N)</span>
            </button>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MOBILE FLOATING ACTION BUTTON (QN-1)                      */}
      {/* ======================================================== */}
      {!showMobileEditor && (
        <button
          onClick={handleCreateNewNote}
          className="md:hidden fixed right-4 bottom-20 z-40 w-13 h-13 rounded-full bg-accent text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer"
          title="New Note"
          aria-label="New Note"
        >
          <IoAddOutline size={26} />
        </button>
      )}
    </div>
  );
};

export default NotesPage;
