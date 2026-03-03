import { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoPersonCircleOutline,
  IoMail,
  IoCalendar,
  IoShieldCheckmark,
  IoCameraOutline,
  IoTrashOutline,
  IoBookOutline,
  IoSchoolOutline,
  IoBulbOutline,
  IoFolderOutline,
  IoLogoYoutube,
  IoChevronDownOutline,
  IoChevronForwardOutline,
  IoDocumentTextOutline,
  IoVideocamOutline,
  IoGlobeOutline,
  IoLockClosedOutline,
  IoTimeOutline,
  IoLinkOutline,
  IoWarningOutline,
  IoBookmarkOutline,} from 'react-icons/io5';
import { updateProfile } from '../redux/slices/authSlice';
import { fetchBooks, deleteBook, removeVideoFromBook } from '../redux/slices/bookSlice';
import { fetchCourses, deleteCourse, removeFileFromCourse } from '../redux/slices/courseSlice';
import { fetchTools, deleteTool, removeFileFromTool } from '../redux/slices/toolSlice';
import { fetchSections, deleteSection, removeFileFromSection } from '../redux/slices/sectionSlice';
import { fetchPlaylists, deletePlaylist } from '../redux/slices/youtubePlaylistSlice';
import toast from 'react-hot-toast';

/* ── small helpers ──────────────────────────────────────── */
const VisiBadge = ({ v }) => {
  const map = {
    public: { cls: 'text-emerald-400 bg-emerald-500/10', icon: <IoGlobeOutline size={10} />, label: 'Public' },
    pending: { cls: 'text-orange-400 bg-orange-500/10', icon: <IoTimeOutline size={10} />, label: 'Pending' },
    private: { cls: 'text-slate-400 bg-slate-500/10', icon: <IoLockClosedOutline size={10} />, label: 'Private' },
  };
  const cfg = map[v] || map.private;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

/** Expand/collapse section wrapper */
const Section = ({ icon, title, count, color, children }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/2 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center`}>{icon}</div>
          <span className="text-white font-semibold">{title}</span>
          <span className="text-xs text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full">{count}</span>
        </div>
        {open ? <IoChevronDownOutline size={16} className="text-slate-400" /> : <IoChevronForwardOutline size={16} className="text-slate-400" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/5 divide-y divide-white/5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/** Row for a top-level item (book/course/tool/section/playlist) */
const ItemRow = ({ title, meta, visib, onDelete, expandable, children }) => {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-3 px-5 py-3 group hover:bg-white/2 transition-colors">
        {expandable && (
          <button onClick={() => setOpen((p) => !p)} className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0">
            {open ? <IoChevronDownOutline size={14} /> : <IoChevronForwardOutline size={14} />}
          </button>
        )}
        {!expandable && <div className="w-3.5 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium truncate">{title}</p>
          {meta && <p className="text-xs text-slate-500 truncate mt-0.5">{meta}</p>}
        </div>
        {visib && <VisiBadge v={visib} />}
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all flex-shrink-0"
            title="Delete"
          >
            <IoTrashOutline size={14} />
          </button>
        ) : (
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <IoWarningOutline size={12} className="text-orange-400" /> Sure?
            </span>
            <button onClick={() => { onDelete(); setConfirming(false); }} className="text-[10px] px-2 py-0.5 rounded-md bg-red-500 text-white hover:bg-red-400">Yes</button>
            <button onClick={() => setConfirming(false)} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600">No</button>
          </div>
        )}
      </div>
      {expandable && open && (
        <div className="bg-slate-950/40 border-t border-white/5">{children}</div>
      )}
    </div>
  );
};

/** Sub-row for a file/video inside an item */
const SubRow = ({ name, onDelete }) => {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex items-center gap-3 pl-12 pr-5 py-2 group hover:bg-white/2 transition-colors">
      <IoDocumentTextOutline size={13} className="text-slate-600 flex-shrink-0" />
      <p className="flex-1 text-xs text-slate-400 truncate">{name}</p>
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-all flex-shrink-0"
          title="Remove file"
        >
          <IoTrashOutline size={12} />
        </button>
      ) : (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => { onDelete(); setConfirming(false); }} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white hover:bg-red-400">Del</button>
          <button onClick={() => setConfirming(false)} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600">✕</button>
        </div>
      )}
    </div>
  );
};

/* ── main component ─────────────────────────────────────── */
const ProfilePage = () => {
  const { user } = useSelector((state) => state.auth);
  const { books } = useSelector((state) => state.books);
  const { courses } = useSelector((state) => state.courses);
  const { tools } = useSelector((state) => state.tools);
  const { sections } = useSelector((state) => state.sections);
  const { playlists } = useSelector((state) => state.playlists);
  const dispatch = useDispatch();

  const [name, setName] = useState(user?.name || '');
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [tab, setTab] = useState('profile'); // profile | work

  useEffect(() => {
    if (tab === 'work') {
      dispatch(fetchBooks({ mine: true }));
      dispatch(fetchCourses({ mine: true }));
      dispatch(fetchTools({ mine: true }));
      dispatch(fetchSections({ mine: true }));
      dispatch(fetchPlaylists({ mine: true }));
    }
  }, [tab, dispatch]);

  // Filter to only this user's own items.
  // Server returns the correct set via ?mine=true, but we also filter client-side
  // as a defensive layer in case stale Redux state (from a non-mine fetch on another page)
  // hasn't been replaced yet when the tab first renders.
  const ownerId = String(user?._id);
  const isOwn = (item) => {
    const itemOwner = String(item?.addedBy?._id ?? item?.addedBy);
    return itemOwner === ownerId;
  };
  const myBooks = (books || []).filter(isOwn);
  const myCourses = (courses || []).filter(isOwn);
  const myTools = (tools || []).filter(isOwn);
  const mySections = (sections || []).filter(isOwn);
  const myPlaylists = (playlists || []).filter(isOwn);

  /* avatar handlers */
  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('avatar', avatarFile);
    const result = await dispatch(updateProfile(formData));
    setUploading(false);
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Profile picture updated');
      setAvatarFile(null); setAvatarPreview(null);
    } else toast.error(result.payload || 'Failed to update avatar');
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);
    const formData = new FormData();
    formData.append('removeAvatar', 'true');
    const result = await dispatch(updateProfile(formData));
    setUploading(false);
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Profile picture removed');
      setAvatarPreview(null); setAvatarFile(null);
    }
  };

  const handleSave = async () => {
    const formData = new FormData();
    formData.append('name', name);
    const result = await dispatch(updateProfile(formData));
    if (result.meta.requestStatus === 'fulfilled') { toast.success('Profile updated'); setIsEditing(false); }
  };

  /* delete helpers */
  const confirmDelete = async (action, label) => {
    const result = await dispatch(action);
    if (result.meta.requestStatus === 'fulfilled') toast.success(`${label} deleted`);
    else toast.error(result.payload || `Failed to delete ${label}`);
  };

  const confirmRemoveFile = async (action, label) => {
    const result = await dispatch(action);
    if (result.meta.requestStatus === 'fulfilled') toast.success(`${label} removed`);
    else toast.error(result.payload || `Failed to remove ${label}`);
  };

  const completedVideos = user?.videoProgress?.filter((vp) => vp.completed)?.length || 0;
  const totalNotes = user?.videoProgress?.filter((vp) => vp.note)?.length || 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Tab switcher */}
        <div className="flex gap-2 mb-8">
          {[
            { id: 'profile', label: 'Profile' },
            { id: 'work', label: 'My Uploads' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  : 'bg-slate-800/50 text-slate-400 border border-white/5 hover:bg-slate-700/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── Profile Tab ── */}
          {tab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="glass-card p-8">
                {/* Avatar & Info */}
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
                  <div className="relative group/avatar">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-xl shadow-indigo-500/20 overflow-hidden">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : user?.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl font-bold text-white">{user?.name?.charAt(0)?.toUpperCase()}</span>
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer"
                    >
                      <IoCameraOutline size={24} className="text-white" />
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                    {(avatarFile || user?.avatar) && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {avatarFile && (
                          <button onClick={handleAvatarUpload} disabled={uploading} className="px-2.5 py-1 text-[10px] font-medium rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 transition-colors disabled:opacity-50 whitespace-nowrap">
                            {uploading ? '...' : 'Save'}
                          </button>
                        )}
                        {avatarFile && (
                          <button onClick={() => { setAvatarFile(null); setAvatarPreview(null); }} className="px-2 py-1 text-[10px] font-medium rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">✕</button>
                        )}
                        {!avatarFile && user?.avatar && (
                          <button onClick={handleRemoveAvatar} disabled={uploading} className="p-1.5 rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition-colors opacity-0 group-hover/avatar:opacity-100 disabled:opacity-50" title="Remove photo">
                            <IoTrashOutline size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-center sm:text-left mt-2">
                    <h2 className="text-xl font-bold text-white">{user?.name}</h2>
                    <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                      <IoMail size={14} /> {user?.email}
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      {user?.role === 'admin' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full">
                          <IoShieldCheckmark size={12} /> Admin
                        </span>
                      )}
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <IoCalendar size={12} /> Joined {new Date(user?.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Edit Name */}
                <div className="border-t border-white/5 pt-6 mb-6">
                  <h3 className="text-sm font-medium text-slate-300 mb-3">Display Name</h3>
                  {isEditing ? (
                    <div className="flex gap-3">
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-dark flex-1" />
                      <button onClick={handleSave} className="btn-primary">Save</button>
                      <button onClick={() => { setIsEditing(false); setName(user?.name); }} className="btn-secondary">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-white">{user?.name}</span>
                      <button onClick={() => setIsEditing(true)} className="btn-secondary text-sm py-1.5 px-4">Edit</button>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="border-t border-white/5 pt-6">
                  <h3 className="text-sm font-medium text-slate-300 mb-4">Learning Stats</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="glass-card p-4 text-center">
                      <div className="text-2xl font-bold gradient-text">{completedVideos}</div>
                      <div className="text-xs text-slate-500 mt-1">Videos Completed</div>
                    </div>
                    <div className="glass-card p-4 text-center">
                      <div className="text-2xl font-bold gradient-text">{totalNotes}</div>
                      <div className="text-xs text-slate-500 mt-1">Notes Written</div>
                    </div>
                    <div className="glass-card p-4 text-center">
                      <div className="text-2xl font-bold gradient-text">{user?.readingProgress?.length || 0}</div>
                      <div className="text-xs text-slate-500 mt-1">Books Reading</div>
                    </div>
                  </div>
                </div>

                {/* Learning Notes */}
                {user?.videoProgress?.filter((vp) => vp.note)?.length > 0 && (
                  <div className="border-t border-white/5 pt-6 mt-6">
                    <h3 className="text-sm font-medium text-slate-300 mb-4">Your Learning Notes</h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {user.videoProgress.filter((vp) => vp.note).map((vp, i) => (
                        <div key={i} className="p-3 rounded-xl bg-slate-900/50 border border-white/5">
                          <p className="text-sm text-slate-300">{vp.note}</p>
                          <p className="text-xs text-slate-500 mt-1.5">{new Date(vp.lastWatched).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── My Work Tab ── */}
          {tab === 'work' && (
            <motion.div key="work" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Books */}
              <Section
                icon={<IoBookOutline size={16} className="text-cyan-400" />}
                title="Books"
                count={myBooks.length}
                color="bg-cyan-500/10"
              >
                {myBooks.length === 0 && <p className="px-5 py-4 text-sm text-slate-500">No books uploaded yet.</p>}
                {myBooks.map((book) => {
                  const hasVideos = book.type === 'video' && book.videos?.length > 0;
                  return (
                    <ItemRow
                      key={book._id}
                      title={book.title}
                      meta={`${book.type} · ${book.author}`}
                      visib={book.visibility}
                      expandable={hasVideos}
                      onDelete={() => confirmDelete(deleteBook(book._id), book.title)}
                    >
                      {hasVideos && book.videos.map((v) => (
                        <SubRow
                          key={v._id}
                          name={v.title || `Episode`}
                          onDelete={() => confirmRemoveFile(removeVideoFromBook({ bookId: book._id, videoId: v._id }), v.title || 'Video')}
                        />
                      ))}
                    </ItemRow>
                  );
                })}
              </Section>

              {/* Courses */}
              <Section
                icon={<IoSchoolOutline size={16} className="text-purple-400" />}
                title="Courses"
                count={myCourses.length}
                color="bg-purple-500/10"
              >
                {myCourses.length === 0 && <p className="px-5 py-4 text-sm text-slate-500">No courses uploaded yet.</p>}
                {myCourses.map((course) => {
                  const allFiles = [
                    ...(course.files || []),
                    ...(course.folders || []).flatMap((f) => f.files || []),
                  ];
                  return (
                    <ItemRow
                      key={course._id}
                      title={course.title}
                      meta={course.category?.name || 'No category'}
                      visib={course.visibility}
                      expandable={allFiles.length > 0}
                      onDelete={() => confirmDelete(deleteCourse(course._id), course.title)}
                    >
                      {/* top-level files */}
                      {(course.files || []).map((f) => (
                        <SubRow
                          key={f._id}
                          name={f.name}
                          onDelete={() => confirmRemoveFile(removeFileFromCourse({ courseId: course._id, fileId: f._id }), f.name)}
                        />
                      ))}
                      {/* folder files */}
                      {(course.folders || []).map((folder) => (
                        <div key={folder._id || folder.name}>
                          <div className="flex items-center gap-2 pl-8 pr-5 py-1.5 bg-indigo-500/5 border-y border-white/5">
                            <IoFolderOutline size={12} className="text-indigo-400 flex-shrink-0" />
                            <span className="text-xs text-slate-300 font-medium truncate">{folder.name}</span>
                          </div>
                          {(folder.files || []).map((f) => (
                            <SubRow
                              key={f._id}
                              name={f.name}
                              onDelete={() => confirmRemoveFile(removeFileFromCourse({ courseId: course._id, fileId: f._id }), f.name)}
                            />
                          ))}
                        </div>
                      ))}
                    </ItemRow>
                  );
                })}
              </Section>

              {/* Tricks / Tools */}
              <Section
                icon={<IoBulbOutline size={16} className="text-amber-400" />}
                title="Tricks"
                count={myTools.length}
                color="bg-amber-500/10"
              >
                {myTools.length === 0 && <p className="px-5 py-4 text-sm text-slate-500">No tricks uploaded yet.</p>}
                {myTools.map((tool) => {
                  const allFiles = [
                    ...(tool.files || []),
                    ...(tool.folders || []).flatMap((f) => f.files || []),
                  ];
                  return (
                    <ItemRow
                      key={tool._id}
                      title={tool.title}
                      meta={tool.link || tool.description?.slice(0, 50)}
                      visib={tool.visibility}
                      expandable={allFiles.length > 0}
                      onDelete={() => confirmDelete(deleteTool(tool._id), tool.title)}
                    >
                      {(tool.files || []).map((f) => (
                        <SubRow
                          key={f._id}
                          name={f.name}
                          onDelete={() => confirmRemoveFile(removeFileFromTool({ toolId: tool._id, fileId: f._id }), f.name)}
                        />
                      ))}
                      {(tool.folders || []).map((folder) => (
                        <div key={folder._id || folder.name}>
                          <div className="flex items-center gap-2 pl-8 pr-5 py-1.5 bg-amber-500/5 border-y border-white/5">
                            <IoFolderOutline size={12} className="text-amber-400 flex-shrink-0" />
                            <span className="text-xs text-slate-300 font-medium truncate">{folder.name}</span>
                          </div>
                          {(folder.files || []).map((f) => (
                            <SubRow
                              key={f._id}
                              name={f.name}
                              onDelete={() => confirmRemoveFile(removeFileFromTool({ toolId: tool._id, fileId: f._id }), f.name)}
                            />
                          ))}
                        </div>
                      ))}
                    </ItemRow>
                  );
                })}
              </Section>

              {/* Sections */}
              <Section
                icon={<IoFolderOutline size={16} className="text-emerald-400" />}
                title="Sections"
                count={mySections.length}
                color="bg-emerald-500/10"
              >
                {mySections.length === 0 && <p className="px-5 py-4 text-sm text-slate-500">No sections created yet.</p>}
                {mySections.map((section) => {
                  const allFiles = [
                    ...(section.files || []),
                    ...(section.folders || []).flatMap((f) => f.files || []),
                  ];
                  return (
                    <ItemRow
                      key={section._id}
                      title={section.title}
                      meta={`${allFiles.length} files`}
                      visib={section.visibility}
                      expandable={allFiles.length > 0}
                      onDelete={() => confirmDelete(deleteSection(section._id), section.title)}
                    >
                      {(section.files || []).map((f) => (
                        <SubRow
                          key={f._id}
                          name={f.name}
                          onDelete={() => confirmRemoveFile(removeFileFromSection({ sectionId: section._id, fileId: f._id }), f.name)}
                        />
                      ))}
                      {(section.folders || []).map((folder) => (
                        <div key={folder._id || folder.name}>
                          <div className="flex items-center gap-2 pl-8 pr-5 py-1.5 bg-emerald-500/5 border-y border-white/5">
                            <IoFolderOutline size={12} className="text-emerald-400 flex-shrink-0" />
                            <span className="text-xs text-slate-300 font-medium truncate">{folder.name}</span>
                          </div>
                          {(folder.files || []).map((f) => (
                            <SubRow
                              key={f._id}
                              name={f.name}
                              onDelete={() => confirmRemoveFile(removeFileFromSection({ sectionId: section._id, fileId: f._id }), f.name)}
                            />
                          ))}
                        </div>
                      ))}
                    </ItemRow>
                  );
                })}
              </Section>

              {/* YouTube Playlists */}
              <Section
                icon={<IoLogoYoutube size={16} className="text-red-400" />}
                title="YouTube Playlists"
                count={myPlaylists.length}
                color="bg-red-500/10"
              >
                {myPlaylists.length === 0 && <p className="px-5 py-4 text-sm text-slate-500">No playlists added yet.</p>}
                {myPlaylists.map((pl) => (
                  <ItemRow
                    key={pl._id}
                    title={pl.title}
                    meta={`${pl.videos?.length || 0} videos`}
                    visib={pl.visibility}
                    expandable={false}
                    onDelete={() => confirmDelete(deletePlaylist(pl._id), pl.title)}
                  />
                ))}
              </Section>

              {myBooks.length + myCourses.length + myTools.length + mySections.length + myPlaylists.length === 0 && (
                <div className="text-center py-20 glass-card">
                  <IoDocumentTextOutline className="mx-auto text-slate-600 mb-4" size={48} />
                  <p className="text-slate-400 font-medium">You haven't uploaded anything yet.</p>
                  <p className="text-slate-500 text-sm mt-1">Head to Books, Courses, or Tricks to add your first resource.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ProfilePage;
