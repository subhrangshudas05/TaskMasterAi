'use client'

import { useRouter } from "next/navigation";
import { useMemo, useState, useRef, useEffect, startTransition } from "react";
import { useUser } from "@/app/hooks/useUser";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Clock, Check, Lock, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { redirect } from 'next/navigation'
import AddTaskDialog from "@/app/components/AddTaskDialog";
import useEmblaCarousel from 'embla-carousel-react';
import useSWR, { useSWRConfig } from "swr";
import TaskCard from "@/app/components/TaskCard";
import { addToOutbox } from "@/app/lib/Offline-sync";


export type TaskType = 'REGULAR' | 'MARATHON';

interface ITask {
  _id: string;        // Explicitly string for the frontend
  title: string;
  type: TaskType;
  category: string;
  isCompleted: boolean;
  date: Date | string;
  timeSlot?: string;
  marathonName?: string;
  detail?: string;
  userEmail?: string;
}

export default function page() {

  const { mutate: globalMutate } = useSWRConfig(); // ADD THIS
  const router = useRouter();
  const { userId, isAuthenticated, userImage, userName, userEmail } = useUser();

  const [open, setOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());



  const dates = generateDateRange(); // Assuming this is defined elsewhere
  const { data: pendingDatesList } = useSWR<string[]>(
    isAuthenticated ? '/api/task/summary' : null
  );

  const [pendingLeft, setPendingLeft] = useState(false);
  const [pendingRight, setPendingRight] = useState(false);
  const [showTodayButton, setShowTodayButton] = useState(false);
  const isAutoScrolling = useRef(false);

  // We define todayIndex here so both effects can use it
  const todayIndex = dates.findIndex(d => isSameDay(d, new Date()));

  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'x',
    align: 'center',
    containScroll: 'keepSnaps',
    startIndex: dates.findIndex(d => isSameDay(d, selectedDate)) ?? 0,
  });

  // --- 1. Embla Scroll Logic (Unchanged) ---
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const closestIndex = emblaApi.selectedScrollSnap();
      const targetDate = dates[closestIndex];

      if (targetDate) {
        startTransition(() => {
          setSelectedDate((currentSelected) => {
            if (isSameDay(currentSelected, targetDate)) return currentSelected;
            return targetDate;
          });
        });
      }
    };

    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, dates]);

  //  NEW OFF-SCREEN DETECTION LOGIC ───────────────────
  useEffect(() => {
    if (!emblaApi) return;

    const updateVisibility = () => {
      const visibleIndexes = emblaApi.slidesInView();
      if (visibleIndexes.length === 0) return;

      const firstVisible = Math.min(...visibleIndexes);
      const lastVisible = Math.max(...visibleIndexes);

      if (!isAutoScrolling.current) {
        setShowTodayButton(!visibleIndexes.includes(todayIndex));
      }

      setPendingLeft(
        dates.slice(0, firstVisible).some((d) =>
          pendingDatesList?.includes(toDateString(d))
        )
      );

      setPendingRight(
        dates.slice(lastVisible + 1).some((d) =>
          pendingDatesList?.includes(toDateString(d))
        )
      );
    };

    const onSettle = () => {
      isAutoScrolling.current = false; // 🔓 Release lock when animation stops
      updateVisibility();
    };

    const onInteract = () => {
      isAutoScrolling.current = false; // 🔓 Release lock if user touches/drags the screen
      updateVisibility();
    };

    emblaApi.on("select", updateVisibility);
    emblaApi.on("scroll", updateVisibility);
    emblaApi.on("reInit", updateVisibility);
    emblaApi.on("settle", onSettle);
    emblaApi.on("pointerDown", onInteract); // ✅ NEW TOUCH RELEASE

    updateVisibility();

    return () => {
      emblaApi.off("select", updateVisibility);
      emblaApi.off("scroll", updateVisibility);
      emblaApi.off("reInit", updateVisibility);
      emblaApi.off("settle", onSettle);
      emblaApi.off("pointerDown", onInteract); // ✅ CLEANUP
    };
  }, [emblaApi, dates, pendingDatesList, todayIndex]);

  // The helper to zip back to today
  const goToToday = () => {
    isAutoScrolling.current = true; // Turn on "Do Not Disturb"
    setShowTodayButton(false);      // Hide it instantly

    if (emblaApi) emblaApi.scrollTo(todayIndex);
    startTransition(() => setSelectedDate(new Date()));
  };

  // --- 2. SWR Data Fetching ---

  // Format the date for the API key (e.g., "2026-04-12")
  const formattedDate = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDate]);

  // Fetch tasks. SWR handles caching and loading states automatically!
  const { data: fetchedTasks, mutate, isLoading, error } = useSWR<ITask[]>(
    isAuthenticated ? `/api/task?date=${formattedDate}` : null
  );

  // Safely grab the array and keep it sorted perfectly for the UI
  const tasks = useMemo(() => {
    if (!fetchedTasks) return [];
    return [...fetchedTasks].sort((a, b) => timeToMinutes(a.timeSlot) - timeToMinutes(b.timeSlot));
  }, [fetchedTasks]);


  // --- 3. API ACTIONS (Optimized with Mutate) ---

  const onSaveTask = async (taskData: any, targetDate: Date = new Date()) => {
    const { hour, minute, ampm } = taskData.timeslot;
    const timeString = `${hour}:${minute} ${ampm}`;
    const tempId = `temp_${Date.now()}`;

    // 1. Format date for the API (e.g., "2026-04-15")
    const formattedDateForAPI = new Intl.DateTimeFormat('en-CA').format(targetDate);

    // 2. Create the "Optimistic" Task (What the user sees immediately)
    const optimisticTask: ITask = {
      _id: tempId,
      title: taskData.title,
      type: 'REGULAR',
      category: taskData.category,
      isCompleted: false,
      date: targetDate,
      timeSlot: timeString,
    };

    const currentTasks = fetchedTasks || [];
    const optimisticTasks = [optimisticTask, ...currentTasks];

    // 3. Update the UI instantly
    // This tells SWR: "Show this task right now, don't wait for the server."
    mutate(optimisticTasks, false);

    try {
      // 4. Actually save to the Database
      const res = await fetch('/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: optimisticTask.title,
          category: optimisticTask.category,
          timeSlot: timeString,
          type: 'REGULAR',
          date: formattedDateForAPI // New: Telling the server which day this belongs to
        })
      });

      if (!res.ok) throw new Error("Server rejected save");

      const savedTaskFromDB = await res.json();

      // 5. THE ID SWAP
      // We replace the tempId with the real _id from MongoDB so the user can toggle or delete this task immediately.
      const updatedTasksWithRealId = optimisticTasks.map(t =>
        t._id === tempId ? savedTaskFromDB : t
      );

      mutate(updatedTasksWithRealId, false);

    } catch (err) {
      if (!navigator.onLine) {
        // 🚨 OFFLINE BYPASS: Save to Outbox, DO NOT rollback
        addToOutbox({
          type: 'CREATE_TASK',
          tempId: tempId,
          endpoint: '/api/task',
          method: 'POST',
          body: {
            title: optimisticTask.title,
            category: optimisticTask.category,
            timeSlot: timeString,
            type: 'REGULAR',
            date: formattedDateForAPI 
          }
        });
      } else {
        // Real server error: Rollback
        mutate(currentTasks, false);
      }
    }
  };

  const toggleTaskCompletion = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const currentTasks = fetchedTasks || [];

    // 1. Instant UI & Local Cache Update
    const optimisticTasks = currentTasks.map(t =>
      t._id === id ? { ...t, isCompleted: newStatus } : t
    );
    mutate(optimisticTasks, false);

    const areAllTasksDoneNow = optimisticTasks
      .filter(t => t.type === 'REGULAR')
      .every(t => t.isCompleted);

    // 2. This works perfectly offline because of our SWR localStorage provider!
    if (areAllTasksDoneNow) {
      globalMutate('/api/task/summary', (currentSummary: string[] = []) => {
        return currentSummary.filter(dateStr => dateStr !== formattedDate);
      }, false);
    } else if (!newStatus) {
      globalMutate('/api/task/summary', (currentSummary: string[] = []) => {
        if (!currentSummary.includes(formattedDate)) return [...currentSummary, formattedDate];
        return currentSummary;
      }, false);
    }

    // Prevent toggling tasks that haven't synced their tempId to the server yet
    if (id.startsWith('temp_')) {
      console.warn("Cannot toggle an offline-created task until it syncs!");
      return;
    }

    try {
      const res = await fetch(`/api/task/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: newStatus })
      });

      if (!res.ok) throw new Error("Failed to update");
      mutate();
    } catch (err) {
      if (!navigator.onLine) {
        // 🚨 OFFLINE BYPASS: Save to Outbox
        addToOutbox({
          type: 'TOGGLE_TASK',
          endpoint: `/api/task/${id}/toggle`,
          method: 'PATCH',
          body: { isCompleted: newStatus }
        });
      } else {
        // Real server error: Rollback
        mutate(currentTasks, false);
      }
    }
  };

  // --- NEW: Delete Task Action ---
  const handleDelete = async (id: string) => {
    const currentTasks = fetchedTasks || [];

    // Prevent deleting a task that hasn't synced yet to avoid DB ghosting
    if (id.startsWith('temp_')) {
      // Just remove it from local UI
      mutate(currentTasks.filter(t => t._id !== id), false);
      return;
    }

    // 1. Optimistic UI update (instantly remove it from the screen)
    const optimisticTasks = currentTasks.filter(t => t._id !== id);
    mutate(optimisticTasks, false);

    try {
      const res = await fetch(`/api/task/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error("Failed to delete");

      // 3. Ensure server is perfectly in sync
      mutate();
    } catch (err) {
      if (!navigator.onLine) {
        // 🚨 OFFLINE BYPASS: Save to Outbox
        addToOutbox({
          type: 'DELETE_TASK',
          endpoint: `/api/task/${id}`,
          method: 'DELETE',
          body: null
        });
      } else {
        // Real server error: Rollback
        mutate(currentTasks, false);
      }
    }
  };

  // --- Split tasks into Active and Completed ---
  const activeTasks = tasks.filter(t => !t.isCompleted);
  const completedTasks = tasks.filter(t => t.isCompleted);

  const springConfig = { type: "tween", duration: 0.2 } as const;

  return (
    <div className="relative min-h-screen py-8 px-6 font-manrope  w-full mx-auto pb-32">
      <div className="max-w-md mx-auto">

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 px-2 h-8">
            <h1 className="text-xl tracking-tight font-semibold text-[#3b0764]">
              {isSameDay(selectedDate, new Date())
                ? "Today's Tasks"
                : `${selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} Tasks`}
            </h1>

            {/* Today button — only when today is off screen */}
            <AnimatePresence>
              {showTodayButton && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  onClick={goToToday}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100 text-purple-600 text-xs font-semibold hover:bg-purple-200 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  Today
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Scrollable + side indicators */}
          <div className="relative">

            {/* LEFT pending indicator */}
            <AnimatePresence>
              {pendingLeft && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute left-0 top-0  z-10 flex items-center pointer-events-none"
                >
                  <div className="w-8 h-full bg-gradient-to-r from-app-main to-transparent" />
                  <div className="absolute left-1.5 top-1/2 -translate-y-1/2">
                    <span className="block w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <span className="absolute inset-0 rounded-full bg-orange-400 animate-ping" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* RIGHT pending indicator */}
            <AnimatePresence>
              {pendingRight && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute right-0 top-0 z-10 flex items-center pointer-events-none"
                >
                  <div className="w-8 h-full bg-gradient-to-l from-app-main to-transparent" />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                    <span className="block w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <span className="absolute inset-0 rounded-full bg-orange-400 animate-ping" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Embla Container */}
            <div ref={emblaRef} className="overflow-hidden px-2">
              <div className="flex items-center gap-3 pt-3 pb-5">
                {dates.map((date, i) => {
                  const isSelected = isSameDay(date, selectedDate);
                  const monthStr = date.toLocaleDateString('en-US', { month: 'short' });
                  const dayNum = date.getDate();
                  const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
                  const hasWarning = pendingDatesList?.includes(toDateString(date));

                  return (
                    <button
                      key={i}
                      onClick={() => {
                        isAutoScrolling.current = false;
                        if (emblaApi) emblaApi.scrollTo(i);
                        startTransition(() => { setSelectedDate(date) });
                      }}
                      className={`relative flex flex-col items-center justify-center min-w-[65px] h-[85px] rounded-2xl transition-all duration-200 shadow-sm shrink-0 select-none ${isSelected
                        ? "bg-purple-500 text-white scale-110 shadow-purple-200 shadow-lg" // 1. Selected State
                        : isSameDay(date, new Date())
                          ? "bg-purple-50 ring-1 ring-purple-200 hover:bg-purple-100"         // 2. Unselected "Today" State
                          : "bg-white text-slate-400 hover:bg-purple-50"                      // 3. Normal Unselected State
                        }`}
                    >
                      {/* Top Label: Swaps Month for "TODAY" */}
                      <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isSelected
                        ? "text-purple-200"
                        : isSameDay(date, new Date()) ? "text-purple-500" : "text-slate-400"
                        }`}>
                        {isSameDay(date, new Date()) ? "Today" : monthStr}
                      </span>

                      {/* Day Number */}
                      <span className={`text-xl font-bold mb-1 ${isSelected
                        ? "text-white"
                        : isSameDay(date, new Date()) ? "text-purple-700" : "text-[#3b0764]"
                        }`}>
                        {dayNum}
                      </span>

                      {/* Bottom Label: Day of Week */}
                      <span className={`text-[10px] font-medium ${isSelected
                        ? "text-purple-200"
                        : isSameDay(date, new Date()) ? "text-purple-500" : "text-slate-400"
                        }`}>
                        {dayStr}
                      </span>

                      {/* Pending Warning Dots */}
                      {hasWarning && (
                        <>
                          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500 z-10" />
                          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-400 z-10 animate-ping" />
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>


        {isLoading && <div className="p-6 text-center text-gray-500">Loading your tasks...</div>}
        {!isLoading && tasks.length === 0 && (
          <div className="p-6 text-lg text-center text-gray-700">
            No tasks found for this date.
          </div>
        )}



        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={selectedDate.toISOString().split("T")[0]} // remounts on date change
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >

            <AnimatePresence mode="popLayout" initial={false}>
              {activeTasks.map((task) => (
                <motion.div
                  key={task._id}
                  layout
                  layoutId={`task-${task._id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16, transition: { duration: 0.18, ease: "easeIn" } }}
                  transition={{ type: "spring", stiffness: 380, damping: 38 }}
                  className="z-10"
                >
                  <TaskCard
                    task={task}
                    onToggle={toggleTaskCompletion}
                    onDelete={handleDelete}
                    isPast={isPastDay(selectedDate)}
                    isFuture={isFutureDay(selectedDate)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* completed section header */}
            {completedTasks.length > 0 && (
              <motion.div layout="position" transition={springConfig} className="mt-8 mb-4">
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-sm font-semibold text-slate-400 font-['DM_Mono'] uppercase tracking-wider">
                      Completed ({completedTasks.length})
                    </span>
                    <div className="flex-1 h-[1px] bg-slate-200 rounded-full" />
                    {showCompleted
                      ? <ChevronUp className="w-4 h-4 text-slate-400" />
                      : <ChevronDown className="w-4 h-4 text-slate-400" />
                    }
                  </div>
                </button>
              </motion.div>
            )}

            {/* completed tasks */}
            <motion.div layout transition={springConfig} className="space-y-3">
              <AnimatePresence mode="popLayout" initial={false}>
                {showCompleted && completedTasks.map((task) => (
                  <motion.div
                    key={task._id}
                    layoutId={`task-${task._id}`}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
                    transition={{ type: "spring", stiffness: 380, damping: 40 }}
                    className="z-0"
                  >
                    <TaskCard
                      task={task}
                      onToggle={toggleTaskCompletion}
                      onDelete={handleDelete}
                      isPast={isPastDay(selectedDate)}
                      isFuture={isFutureDay(selectedDate)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </AnimatePresence>


      </div>


      {/* FAB Button */}
      <motion.div
        // 1. Only trigger setOpen if it is currently Today
        onClick={() => !isPastDay(selectedDate) && setOpen(true)}
        // 2. Dynamically apply opacity and pointer events
        className={`fixed z-50 flex items-center justify-center w-18 aspect-square rounded-full right-4 bottom-24 md:right-1/2 md:translate-x-50 transition-all ${!isPastDay(selectedDate)
          ? "cursor-pointer active:scale-90"
          : "opacity-60 cursor-not-allowed pointer-events-none"
          }`}
      >
        <motion.div
          animate={{ width: ["48px", "80px", "80px", "48px", '48px'] }}
          transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.5, 0.6, 0.9, 1], ease: ["easeOut", "easeIn"] }}
          className="absolute z-2 w-20 aspect-square rounded-full bg-[radial-gradient(circle_at_center,#7e69e8_20%,transparent_73%)]"
        />
        <div className="relative z-10 flex items-center justify-center w-12 aspect-square rounded-full bg-[#8728c6] ">
          <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
        </div>
      </motion.div>

      <AddTaskDialog open={open} onClose={() => setOpen(false)} onSave={onSaveTask} date={selectedDate} />
    </div>
  );
}



// Converts "08:30 PM" to minutes so we can do math on it
const timeToMinutes = (timeStr?: string) => {
  if (!timeStr || timeStr === "Anytime") return 9999; // Pushes "Anytime" tasks to the bottom

  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);

  if (hours === 12 && period === 'AM') hours = 0; // Midnight is 0 hours
  if (hours !== 12 && period === 'PM') hours += 12; // 1 PM becomes 13 hours

  return (hours * 60) + minutes;
};


const generateDateRange = () => {
  const dates = [];
  const today = new Date();

  // Start from 30 days ago (Change 30 to however far back you want to go)
  for (let i = -28; i <= 3; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
};

export const toDateString = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const isSameDay = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
};

export const isPastDay = (d: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(d);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
};

export const isFutureDay = (d: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(d);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate > today;
};