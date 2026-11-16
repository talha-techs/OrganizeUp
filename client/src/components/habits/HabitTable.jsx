import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IoCalendarOutline,
  IoCheckmark,
  IoCreateOutline,
  IoCloseOutline,
  IoCheckmarkCircle,
} from 'react-icons/io5';
import SegmentedProgressBar from './SegmentedProgressBar';
import {
  toggleHabit,
  toggleHabitOptimistic,
  saveHabitNote,
  setNoteOptimistic,
  reorderColumns,
  setColumnOrderOptimistic,
} from '../../redux/slices/habitSlice';
import toast from 'react-hot-toast';

const HabitTable = ({
  dates = [], // Array of { dateStr: 'YYYY-MM-DD', displayDate: 'November 16, 2026', dayName: 'Mon', isToday: true, monthName: 'November' }
  showMonthColumn = false,
  tableName = 'Table',
}) => {
  const dispatch = useDispatch();
  const { profile, logs } = useSelector((state) => state.habits);

  const habits = profile?.habits?.filter((h) => h.active !== false) || [];
  const columnOrder = profile?.columnOrder || [];

  // Sort habit columns according to columnOrder
  const orderedHabits = [...habits].sort((a, b) => {
    const idxA = columnOrder.indexOf(String(a._id));
    const idxB = columnOrder.indexOf(String(b._id));
    if (idxA === -1 && idxB === -1) return (a.order || 0) - (b.order || 0);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  // Drag and Drop state for table column reordering
  const [draggedHabitId, setDraggedHabitId] = useState(null);
  const [dragOverHabitId, setDragOverHabitId] = useState(null);

  // Note editing state
  const [editingNoteDate, setEditingNoteDate] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');

  const handleDragStart = (e, habitId) => {
    setDraggedHabitId(habitId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', habitId);
  };

  const handleDragOver = (e, habitId) => {
    e.preventDefault();
    if (habitId !== draggedHabitId) {
      setDragOverHabitId(habitId);
    }
  };

  const handleDragLeave = (habitId) => {
    if (dragOverHabitId === habitId) {
      setDragOverHabitId(null);
    }
  };

  const handleDrop = async (e, targetHabitId) => {
    e.preventDefault();
    setDragOverHabitId(null);
    if (!draggedHabitId || draggedHabitId === targetHabitId) return;

    // Build new column order
    const currentOrder = orderedHabits.map((h) => String(h._id));
    const fromIndex = currentOrder.indexOf(draggedHabitId);
    const toIndex = currentOrder.indexOf(targetHabitId);

    if (fromIndex === -1 || toIndex === -1) return;

    const newOrder = [...currentOrder];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);

    // Optimistic dispatch
    dispatch(setColumnOrderOptimistic(newOrder));
    try {
      await dispatch(reorderColumns(newOrder)).unwrap();
    } catch (err) {
      toast.error('Failed to save column order');
    } finally {
      setDraggedHabitId(null);
    }
  };

  const handleToggleHabit = (date, habitId) => {
    // Optimistic toggle
    dispatch(toggleHabitOptimistic({ date, habitId }));
    dispatch(toggleHabit({ date, habitId }));
  };

  const handleOpenNoteEditor = (date, currentNote) => {
    setEditingNoteDate(date);
    setNoteDraft(currentNote || '');
  };

  const handleSaveNote = async (date) => {
    dispatch(setNoteOptimistic({ date, notes: noteDraft }));
    try {
      await dispatch(saveHabitNote({ date, notes: noteDraft })).unwrap();
      toast.success('Note saved');
      setEditingNoteDate(null);
    } catch (err) {
      toast.error('Failed to save note');
    }
  };

  // Compute Averages & Totals
  const totalHabitsCount = orderedHabits.length;
  let totalPercentSum = 0;
  const habitCompletionCounts = {};
  orderedHabits.forEach((h) => {
    habitCompletionCounts[h._id] = 0;
  });

  dates.forEach((d) => {
    const log = logs[d.dateStr];
    const completedList = log?.completedHabits || [];
    const count = completedList.filter((id) =>
      orderedHabits.some((h) => String(h._id) === String(id))
    ).length;

    const percent = totalHabitsCount > 0 ? (count / totalHabitsCount) * 100 : 0;
    totalPercentSum += percent;

    completedList.forEach((id) => {
      if (habitCompletionCounts[id] !== undefined) {
        habitCompletionCounts[id]++;
      }
    });
  });

  const averagePercent =
    dates.length > 0 ? Math.round(totalPercentSum / dates.length) : 0;

  return (
    <div className="w-full overflow-hidden rounded-2xl bg-surface/90 border border-subtle shadow-sm flex flex-col">
      {/* Table Scroll Container */}
      <div className="overflow-x-auto w-full custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse select-none min-w-[700px]">
          {/* Table Header */}
          <thead>
            <tr className="border-b border-subtle bg-surface-raised/80 text-secondary">
              {/* Date Column Header */}
              <th className="py-3 px-4 font-medium min-w-[140px] sticky left-0 z-20 bg-surface-raised/95 backdrop-blur-md border-r border-subtle/50">
                <div className="flex items-center gap-1.5">
                  <IoCalendarOutline size={14} className="text-secondary" />
                  <span>Date</span>
                </div>
              </th>

              {/* Progress Bar Column Header */}
              <th className="py-3 px-4 font-medium min-w-[150px] border-r border-subtle/50">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">◯</span>
                  <span>Progress Bar</span>
                </div>
              </th>

              {/* Dynamic Draggable Habit Columns */}
              {orderedHabits.map((habit) => {
                const habitId = String(habit._id);
                const isDragging = draggedHabitId === habitId;
                const isOver = dragOverHabitId === habitId;

                return (
                  <th
                    key={habitId}
                    draggable
                    onDragStart={(e) => handleDragStart(e, habitId)}
                    onDragOver={(e) => handleDragOver(e, habitId)}
                    onDragLeave={() => handleDragLeave(habitId)}
                    onDrop={(e) => handleDrop(e, habitId)}
                    className={`py-3 px-3 text-center min-w-[44px] w-[44px] border-r border-subtle/50 cursor-grab active:cursor-grabbing transition-all ${
                      isDragging
                        ? 'opacity-30 bg-accent/20'
                        : isOver
                        ? 'bg-accent/15 border-l-2 border-l-accent'
                        : 'hover:bg-surface'
                    }`}
                    title={`${habit.name} (Drag to reorder column)`}
                  >
                    <span className="text-base select-none pointer-events-none">{habit.icon}</span>
                  </th>
                );
              })}

              {/* Notes Column Header */}
              <th className="py-3 px-4 font-medium min-w-[160px] border-r border-subtle/50">
                <div className="flex items-center gap-1.5">
                  <IoCreateOutline size={14} className="text-secondary" />
                  <span>Notes</span>
                </div>
              </th>

              {/* Optional Month Tag Header */}
              {showMonthColumn && (
                <th className="py-3 px-4 font-medium min-w-[100px]">
                  <div className="flex items-center gap-1.5">
                    <IoCalendarOutline size={13} className="text-secondary" />
                    <span>Month</span>
                  </div>
                </th>
              )}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-subtle/60 text-primary">
            {dates.map((item) => {
              const { dateStr, displayDate, isToday, monthName } = item;
              const log = logs[dateStr];
              const completedList = log?.completedHabits || [];
              const noteText = log?.notes || '';

              // Calculate day progress %
              const completedCount = completedList.filter((id) =>
                orderedHabits.some((h) => String(h._id) === String(id))
              ).length;
              const progressPercent =
                totalHabitsCount > 0 ? (completedCount / totalHabitsCount) * 100 : 0;

              return (
                <tr
                  key={dateStr}
                  className={`group transition-colors ${
                    isToday
                      ? 'bg-accent/[0.04] hover:bg-accent/[0.08]'
                      : 'hover:bg-surface-raised/50'
                  }`}
                >
                  {/* Date Cell */}
                  <td className="py-2.5 px-4 font-normal sticky left-0 z-10 bg-surface/95 group-hover:bg-surface-raised/95 backdrop-blur-md border-r border-subtle/50 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={isToday ? 'font-semibold text-primary' : 'text-secondary'}>
                        {displayDate}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/20 text-accent">
                          Today
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Progress Bar Cell */}
                  <td className="py-2.5 px-4 border-r border-subtle/50 whitespace-nowrap">
                    <SegmentedProgressBar percent={progressPercent} totalSegments={10} />
                  </td>

                  {/* Habit Checkboxes Cells */}
                  {orderedHabits.map((habit) => {
                    const habitId = String(habit._id);
                    const isChecked = completedList.includes(habitId);

                    return (
                      <td
                        key={habitId}
                        onClick={() => handleToggleHabit(dateStr, habitId)}
                        className="py-2.5 px-2 text-center border-r border-subtle/50 cursor-pointer hover:bg-surface transition-colors"
                        title={`${habit.name} - ${displayDate}`}
                      >
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            className={`w-4 h-4 rounded-[3px] flex items-center justify-center transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-blue-600 border border-blue-600 text-white shadow-sm'
                                : 'border border-zinc-700 hover:border-zinc-500 bg-transparent'
                            }`}
                          >
                            {isChecked && <IoCheckmark size={12} className="stroke-[2.5]" />}
                          </button>
                        </div>
                      </td>
                    );
                  })}

                  {/* Notes Cell */}
                  <td className="py-2.5 px-4 border-r border-subtle/50 relative">
                    {editingNoteDate === dateStr ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNote(dateStr);
                            if (e.key === 'Escape') setEditingNoteDate(null);
                          }}
                          autoFocus
                          placeholder="Quick note for today..."
                          className="w-full text-xs px-2 py-1 rounded bg-surface border border-accent text-primary focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveNote(dateStr)}
                          className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors cursor-pointer"
                        >
                          <IoCheckmark size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingNoteDate(null)}
                          className="p-1 text-muted hover:bg-surface rounded transition-colors cursor-pointer"
                        >
                          <IoCloseOutline size={14} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleOpenNoteEditor(dateStr, noteText)}
                        className="cursor-pointer text-muted hover:text-primary transition-colors truncate max-w-[200px]"
                        title={noteText || 'Click to add note'}
                      >
                        {noteText ? (
                          <span className="text-secondary">{noteText}</span>
                        ) : (
                          <span className="text-muted/40 italic group-hover:text-muted/70 text-[11px]">
                            + Note
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Optional Month Tag Cell */}
                  {showMonthColumn && (
                    <td className="py-2.5 px-4 text-muted whitespace-nowrap font-medium text-xs">
                      <div className="flex items-center gap-1.5">
                        <IoCalendarOutline size={12} className="text-secondary" />
                        <span>{monthName}</span>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>

          {/* Summary / Average Footer Row */}
          <tfoot>
            <tr className="border-t border-subtle bg-surface-raised/90 text-secondary font-mono text-[11px]">
              {/* Label */}
              <td className="py-2.5 px-4 font-bold tracking-wider uppercase sticky left-0 z-10 bg-surface-raised/95 border-r border-subtle/50">
                AVERAGE
              </td>

              {/* Average Percent */}
              <td className="py-2.5 px-4 font-semibold text-primary border-r border-subtle/50">
                {averagePercent}%
              </td>

              {/* Habit Counts */}
              {orderedHabits.map((habit) => {
                const count = habitCompletionCounts[habit._id] || 0;
                return (
                  <td
                    key={habit._id}
                    className="py-2.5 px-2 text-center font-medium text-secondary border-r border-subtle/50"
                  >
                    {count}
                  </td>
                );
              })}

              {/* Notes empty footer */}
              <td className="py-2.5 px-4 border-r border-subtle/50"></td>

              {showMonthColumn && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default HabitTable;
