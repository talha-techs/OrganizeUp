import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IoAddOutline,
  IoCheckmark,
  IoCloseOutline,
  IoPencilOutline,
  IoTrashOutline,
  IoListOutline,
} from 'react-icons/io5';
import { addHabit, updateHabit, deleteHabit } from '../../redux/slices/habitSlice';
import { detectHabitIcon, COMMON_EMOJIS } from './habitIcons';
import toast from 'react-hot-toast';

const HabitListCard = () => {
  const dispatch = useDispatch();
  const { profile } = useSelector((state) => state.habits);
  const habits = profile?.habits || [];

  const [isAdding, setIsAdding] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);

  // Auto-detect icon when user types in new habit name
  const handleNameChange = (val) => {
    setNewHabitName(val);
    if (!newHabitIcon || newHabitIcon === '✨') {
      const detected = detectHabitIcon(val);
      setNewHabitIcon(detected);
    }
  };

  const handleCreateHabit = async (e) => {
    if (e) e.preventDefault();
    if (!newHabitName.trim()) return;

    try {
      const finalIcon = newHabitIcon || detectHabitIcon(newHabitName);
      await dispatch(
        addHabit({
          name: newHabitName.trim(),
          icon: finalIcon,
        })
      ).unwrap();

      toast.success('Habit added & table column created!');
      setNewHabitName('');
      setNewHabitIcon('');
      setIsAdding(false);
      setShowEmojiPicker(false);
    } catch (err) {
      toast.error(err || 'Failed to add habit');
    }
  };

  const startEdit = (habit) => {
    setEditingId(habit._id);
    setEditName(habit.name);
    setEditIcon(habit.icon);
    setShowEditEmojiPicker(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditIcon('');
    setShowEditEmojiPicker(false);
  };

  const handleSaveEdit = async (habitId) => {
    if (!editName.trim()) return;
    try {
      await dispatch(
        updateHabit({
          habitId,
          name: editName.trim(),
          icon: editIcon || '✨',
        })
      ).unwrap();
      toast.success('Habit updated');
      cancelEdit();
    } catch (err) {
      toast.error(err || 'Failed to update habit');
    }
  };

  const handleDeleteHabit = async (habit) => {
    if (!window.confirm(`Delete habit "${habit.name}" and remove its column from tables?`)) {
      return;
    }
    try {
      await dispatch(deleteHabit(habit._id)).unwrap();
      toast.success('Habit removed');
    } catch (err) {
      toast.error(err || 'Failed to delete habit');
    }
  };

  return (
    <div className="w-full md:w-72 lg:w-80 shrink-0 bg-surface/80 backdrop-blur-md rounded-2xl border border-subtle p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-subtle">
        <div className="flex items-center gap-2">
          <IoListOutline size={18} className="text-secondary" />
          <h3 className="text-base font-semibold text-primary tracking-tight">Habit List</h3>
        </div>
        {!isAdding && (
          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              setNewHabitName('');
              setNewHabitIcon('');
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent/80 transition-colors p-1 rounded-md hover:bg-surface-raised cursor-pointer"
            title="Add new habit"
          >
            <IoAddOutline size={16} />
            <span>Add</span>
          </button>
        )}
      </div>

      {/* Habits List */}
      <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
        {habits.length === 0 && !isAdding && (
          <p className="text-xs text-muted py-4 text-center">No habits added yet. Click + Add to start!</p>
        )}

        {habits.map((habit) => {
          const isEditing = editingId === habit._id;

          if (isEditing) {
            return (
              <div
                key={habit._id}
                className="p-2.5 rounded-xl bg-surface-raised border border-accent/40 shadow-sm space-y-2"
              >
                <div className="flex items-center gap-2">
                  {/* Emoji selector button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEditEmojiPicker(!showEditEmojiPicker)}
                      className="w-8 h-8 rounded-lg bg-surface border border-subtle flex items-center justify-center text-sm hover:border-accent transition-colors"
                      title="Change icon"
                    >
                      {editIcon || '✨'}
                    </button>
                    {showEditEmojiPicker && (
                      <div className="absolute top-10 left-0 z-50 p-2 bg-surface-raised border border-subtle rounded-xl shadow-xl grid grid-cols-6 gap-1 w-52 max-h-40 overflow-y-auto">
                        {COMMON_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setEditIcon(emoji);
                              setShowEditEmojiPicker(false);
                            }}
                            className="p-1 text-base hover:bg-surface rounded text-center transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(habit._id);
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    autoFocus
                    className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-surface border border-subtle text-primary focus:outline-none focus:border-accent"
                    placeholder="Habit name..."
                  />

                  <button
                    type="button"
                    onClick={() => handleSaveEdit(habit._id)}
                    className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Save"
                  >
                    <IoCheckmark size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="p-1.5 text-muted hover:bg-surface rounded-lg transition-colors cursor-pointer"
                    title="Cancel"
                  >
                    <IoCloseOutline size={15} />
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={habit._id}
              className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-surface-raised transition-colors text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span className="text-secondary shrink-0">•</span>
                <span className="text-primary truncate font-normal">{habit.name}</span>
                <span className="shrink-0 text-sm">{habit.icon}</span>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  type="button"
                  onClick={() => startEdit(habit)}
                  className="p-1 text-muted hover:text-primary hover:bg-surface rounded transition-colors cursor-pointer"
                  title="Edit habit"
                >
                  <IoPencilOutline size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteHabit(habit)}
                  className="p-1 text-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                  title="Delete habit"
                >
                  <IoTrashOutline size={13} />
                </button>
              </div>
            </div>
          );
        })}

        {/* Inline Add Habit Form */}
        {isAdding && (
          <form
            onSubmit={handleCreateHabit}
            className="p-3 rounded-xl bg-surface-raised border border-accent/40 shadow-sm space-y-2.5 mt-2"
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-8 h-8 rounded-lg bg-surface border border-subtle flex items-center justify-center text-sm hover:border-accent transition-colors cursor-pointer"
                  title="Pick icon"
                >
                  {newHabitIcon || '✨'}
                </button>
                {showEmojiPicker && (
                  <div className="absolute top-10 left-0 z-50 p-2 bg-surface-raised border border-subtle rounded-xl shadow-xl grid grid-cols-6 gap-1 w-52 max-h-40 overflow-y-auto">
                    {COMMON_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setNewHabitIcon(emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="p-1 text-base hover:bg-surface rounded text-center transition-colors cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                type="text"
                value={newHabitName}
                onChange={(e) => handleNameChange(e.target.value)}
                autoFocus
                placeholder="New habit (e.g. Read 20 mins)..."
                className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-surface border border-subtle text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-muted italic">Auto-detects icon</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setShowEmojiPicker(false);
                  }}
                  className="px-2 py-1 text-muted hover:text-primary rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newHabitName.trim()}
                  className="px-3 py-1 rounded-md bg-accent text-white font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default HabitListCard;
