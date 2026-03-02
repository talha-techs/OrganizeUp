import { useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { IoPersonCircleOutline, IoMail, IoCalendar, IoShieldCheckmark, IoCameraOutline, IoTrashOutline } from 'react-icons/io5';
import { updateProfile } from '../redux/slices/authSlice';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [name, setName] = useState(user?.name || '');
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

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
      setAvatarFile(null);
      setAvatarPreview(null);
    } else {
      toast.error(result.payload || 'Failed to update avatar');
    }
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);
    const formData = new FormData();
    formData.append('removeAvatar', 'true');
    const result = await dispatch(updateProfile(formData));
    setUploading(false);
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Profile picture removed');
      setAvatarPreview(null);
      setAvatarFile(null);
    }
  };

  const handleSave = async () => {
    const formData = new FormData();
    formData.append('name', name);
    const result = await dispatch(updateProfile(formData));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Profile updated');
      setIsEditing(false);
    }
  };

  const completedVideos = user?.videoProgress?.filter((vp) => vp.completed)?.length || 0;
  const totalNotes = user?.videoProgress?.filter((vp) => vp.note)?.length || 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white font-display mb-8">Profile</h1>

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

              {/* Camera overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer"
              >
                <IoCameraOutline size={24} className="text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
              />

              {/* Upload / Remove buttons */}
              {(avatarFile || user?.avatar) && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {avatarFile && (
                    <button
                      onClick={handleAvatarUpload}
                      disabled={uploading}
                      className="px-2.5 py-1 text-[10px] font-medium rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {uploading ? '...' : 'Save'}
                    </button>
                  )}
                  {avatarFile && (
                    <button
                      onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}
                      className="px-2 py-1 text-[10px] font-medium rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                  {!avatarFile && user?.avatar && (
                    <button
                      onClick={handleRemoveAvatar}
                      disabled={uploading}
                      className="p-1.5 rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition-colors opacity-0 group-hover/avatar:opacity-100 disabled:opacity-50"
                      title="Remove photo"
                    >
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
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-dark flex-1"
                />
                <button onClick={handleSave} className="btn-primary">Save</button>
                <button onClick={() => { setIsEditing(false); setName(user?.name); }} className="btn-secondary">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-white">{user?.name}</span>
                <button onClick={() => setIsEditing(true)} className="btn-secondary text-sm py-1.5 px-4">
                  Edit
                </button>
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
                <div className="text-2xl font-bold gradient-text">
                  {user?.readingProgress?.length || 0}
                </div>
                <div className="text-xs text-slate-500 mt-1">Books Reading</div>
              </div>
            </div>
          </div>

          {/* Learning Notes */}
          {user?.videoProgress?.filter((vp) => vp.note)?.length > 0 && (
            <div className="border-t border-white/5 pt-6 mt-6">
              <h3 className="text-sm font-medium text-slate-300 mb-4">Your Learning Notes</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {user.videoProgress
                  .filter((vp) => vp.note)
                  .map((vp, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-900/50 border border-white/5">
                      <p className="text-sm text-slate-300">{vp.note}</p>
                      <p className="text-xs text-slate-500 mt-1.5">
                        {new Date(vp.lastWatched).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ProfilePage;
