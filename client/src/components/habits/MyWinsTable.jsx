import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IoFlame,
  IoGiftOutline,
  IoCalendarOutline,
  IoCreateOutline,
  IoCheckmarkCircle,
  IoAddOutline,
  IoCheckmark,
  IoCloseOutline,
} from 'react-icons/io5';
import { updateWinMilestone, updateHabitProfile } from '../../redux/slices/habitSlice';
import toast from 'react-hot-toast';

const MyWinsTable = () => {
  const dispatch = useDispatch();
  const { profile, stats } = useSelector((state) => state.habits);
  const wins = profile?.wins || [];
  const currentStreak = stats?.currentStreak || 0;
  const longestStreak = stats?.longestStreak || 0;

  const [editingWinId, setEditingWinId] = useState(null);
  const [rewardDraft, setRewardDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [achievedDateDraft, setAchievedDateDraft] = useState('');

  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [newStreak, setNewStreak] = useState('');
  const [newReward, setNewReward] = useState('');

  const startEdit = (win) => {
    setEditingWinId(win._id);
    setRewardDraft(win.reward || '');
    setNotesDraft(win.notes || '');
    setAchievedDateDraft(win.achievedDate || '');
  };

  const handleSaveWin = async (winId) => {
    try {
      await dispatch(
        updateWinMilestone({
          winId,
          reward: rewardDraft,
          notes: notesDraft,
          achievedDate: achievedDateDraft || null,
        })
      ).unwrap();
      toast.success('Milestone updated');
      setEditingWinId(null);
    } catch (err) {
      toast.error(err || 'Failed to update milestone');
    }
  };

  const handleAddCustomMilestone = async (e) => {
    if (e) e.preventDefault();
    const streakNum = parseInt(newStreak, 10);
    if (!streakNum || streakNum <= 0) {
      toast.error('Please enter a valid streak target in days');
      return;
    }

    const updatedWins = [
      ...wins,
      {
        streak: streakNum,
        reward: newReward.trim(),
        notes: '',
        achievedDate: null,
      },
    ].sort((a, b) => a.streak - b.streak);

    try {
      await dispatch(updateHabitProfile({ wins: updatedWins })).unwrap();
      toast.success('New milestone added');
      setIsAddingCustom(false);
      setNewStreak('');
      setNewReward('');
    } catch (err) {
      toast.error(err || 'Failed to add milestone');
    }
  };

  return (
    <div className="space-y-4">
      {/* Title & Guideline Tagline */}
      <div className="p-4 rounded-2xl bg-surface/90 border border-subtle shadow-sm space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-primary tracking-tight">My Wins</h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-secondary">
              <span className="w-1 h-3.5 bg-accent rounded-full inline-block" />
              <span>To Consider it as a Day you should at least do more than 75% of the habits</span>
            </div>
          </div>

          {/* Current & Longest Streak Counters */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <IoFlame size={16} />
              <span className="text-xs font-semibold">Current: {currentStreak} Days</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <IoCheckmarkCircle size={16} />
              <span className="text-xs font-semibold">Best: {longestStreak} Days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Wins Table Container */}
      <div className="overflow-hidden rounded-2xl bg-surface/90 border border-subtle shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-subtle bg-surface-raised/80 text-secondary">
                <th className="py-3 px-4 font-medium min-w-[140px]">
                  <div className="flex items-center gap-1.5">
                    <IoFlame size={14} className="text-orange-400" />
                    <span>The Streak</span>
                  </div>
                </th>
                <th className="py-3 px-4 font-medium min-w-[200px]">
                  <div className="flex items-center gap-1.5">
                    <IoGiftOutline size={14} className="text-accent" />
                    <span>The Reward</span>
                  </div>
                </th>
                <th className="py-3 px-4 font-medium min-w-[130px]">
                  <div className="flex items-center gap-1.5">
                    <IoCalendarOutline size={14} className="text-secondary" />
                    <span>Date</span>
                  </div>
                </th>
                <th className="py-3 px-4 font-medium min-w-[200px]">
                  <div className="flex items-center gap-1.5">
                    <IoCreateOutline size={14} className="text-secondary" />
                    <span>Notes</span>
                  </div>
                </th>
                <th className="py-3 px-4 font-medium min-w-[100px] text-right">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-subtle/60 text-primary">
              {wins.map((win) => {
                const isEditing = editingWinId === win._id;
                const isAchieved =
                  Boolean(win.achievedDate) || longestStreak >= win.streak;

                if (isEditing) {
                  return (
                    <tr key={win._id} className="bg-surface-raised/70">
                      <td className="py-3 px-4 font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-orange-400">
                          <IoFlame size={15} />
                          <span>{win.streak} Days</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={rewardDraft}
                          onChange={(e) => setRewardDraft(e.target.value)}
                          placeholder="Reward (e.g. Dinner out)..."
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-surface border border-accent text-primary focus:outline-none"
                        />
                      </td>

                      <td className="py-3 px-4">
                        <input
                          type="date"
                          value={achievedDateDraft}
                          onChange={(e) => setAchievedDateDraft(e.target.value)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-surface border border-subtle text-primary focus:outline-none"
                        />
                      </td>

                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          placeholder="Notes or thoughts..."
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-surface border border-subtle text-primary focus:outline-none"
                        />
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveWin(win._id)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                            title="Save"
                          >
                            <IoCheckmark size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingWinId(null)}
                            className="p-1.5 rounded-lg text-muted hover:bg-surface transition-colors cursor-pointer"
                            title="Cancel"
                          >
                            <IoCloseOutline size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={win._id}
                    onClick={() => startEdit(win)}
                    className="group hover:bg-surface-raised/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-semibold whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-orange-400">
                        <IoFlame size={15} />
                        <span>{win.streak} Days</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {win.reward ? (
                        <span className="text-primary font-medium">{win.reward}</span>
                      ) : (
                        <span className="text-muted/50 italic group-hover:text-muted/80 text-[11px]">
                          + Set reward
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-secondary whitespace-nowrap">
                      {win.achievedDate || (isAchieved ? 'Achieved' : '—')}
                    </td>

                    <td className="py-3 px-4 text-muted truncate max-w-[220px]">
                      {win.notes || <span className="text-muted/40 italic">—</span>}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {isAchieved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <IoCheckmarkCircle size={13} /> Unlocked
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted font-mono">
                          {currentStreak}/{win.streak}d
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add Milestone Footer Form */}
        <div className="p-3 border-t border-subtle bg-surface-raised/40">
          {!isAddingCustom ? (
            <button
              type="button"
              onClick={() => setIsAddingCustom(true)}
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors cursor-pointer py-1 px-2 rounded hover:bg-surface"
            >
              <IoAddOutline size={15} />
              <span>New Milestone</span>
            </button>
          ) : (
            <form onSubmit={handleAddCustomMilestone} className="flex items-center gap-2 text-xs">
              <input
                type="number"
                value={newStreak}
                onChange={(e) => setNewStreak(e.target.value)}
                placeholder="Streak days (e.g. 180)..."
                className="w-32 px-2.5 py-1.5 rounded-lg bg-surface border border-subtle text-primary focus:outline-none focus:border-accent"
                autoFocus
              />
              <input
                type="text"
                value={newReward}
                onChange={(e) => setNewReward(e.target.value)}
                placeholder="Reward (e.g. New watch)..."
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface border border-subtle text-primary focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors cursor-pointer"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsAddingCustom(false)}
                className="px-2 py-1.5 rounded-lg text-muted hover:text-primary transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyWinsTable;
