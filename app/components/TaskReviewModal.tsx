"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Plus, Loader2 } from "lucide-react";
import EditableTaskCard, { ReviewTask } from "./EditableTaskCard";
import { toast } from "sonner";
import { useSWRConfig } from "swr";

interface TaskReviewModalProps {
  open: boolean;
  initialTasks: ReviewTask[];
  onClose: () => void;
  onSuccess: () => void; // To close the capture modal as well
  date: Date;
}

export default function TaskReviewModal({
  open,
  initialTasks,
  onClose,
  onSuccess,
  date,
}: TaskReviewModalProps) {
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { mutate } = useSWRConfig();

  // Load initial tasks when modal opens
  useEffect(() => {
    if (open) {
      setTasks(initialTasks.map((t, idx) => ({
        ...t,
        id: t.id || `ext_${Date.now()}_${idx}`,
        category: t.category || "No Category",
      })));
    }
  }, [open, initialTasks]);

  // Mobile scroll lock
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      document.body.style.touchAction = "auto";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    }

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      document.body.style.touchAction = "auto";
    };
  }, [open]);

  // 12-hour AM/PM converter
  const convertTo12Hour = (time24: string | null): string => {
    if (!time24) return "Anytime";
    const [hourStr, minuteStr] = time24.split(":");
    if (!hourStr || !minuteStr) return "Anytime";
    let hour = parseInt(hourStr, 10);
    const minute = minuteStr;
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    hour = hour ? hour : 12;
    const formattedHour = String(hour).padStart(2, "0");
    return `${formattedHour}:${minute} ${ampm}`;
  };

  const handleTaskChange = (updatedTask: ReviewTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
  };

  const handleTaskDelete = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddTaskInline = () => {
    const newTask: ReviewTask = {
      id: `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: "",
      time: null,
      category: "No Category",
    };
    setTasks((prev) => [...prev, newTask]);
  };

  const handleSaveAll = async () => {
    // Filter out blank tasks
    const validTasks = tasks.filter((t) => t.title.trim() !== "");
    if (validTasks.length === 0) {
      toast.error("Please add at least one task with a title.");
      return;
    }

    setIsSaving(true);

    try {
      // Build API payload
      const formattedDate = new Intl.DateTimeFormat("en-CA").format(date);
      const payload = {
        tasks: validTasks.map((t) => ({
          title: t.title.trim(),
          timeSlot: convertTo12Hour(t.time),
          category: t.category,
          date: formattedDate,
        })),
      };

      const res = await fetch("/api/task/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to bulk save tasks");
      }

      toast.success(`${validTasks.length} task${validTasks.length > 1 ? "s" : ""} created successfully!`);
      
      // Trigger SWR revalidation for the active date's task list
      mutate(`/api/task?date=${formattedDate}`);
      mutate("/api/task/summary"); // update dates selector warning dots

      onSuccess(); // Close capture and review modal
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save tasks. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop-review"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/40 z-[9996] max-w-md mx-auto w-full"
          />

          {/* Fullscreen Modal container */}
          <motion.div
            key="modal-review"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34, mass: 0.95 }}
            className="fixed inset-x-0 bottom-0 top-12 mx-auto max-w-md w-full bg-app-main rounded-t-[32px] shadow-[0_-12px_40px_rgba(91,33,182,0.15)] flex flex-col z-[9999] font-manrope overflow-hidden"
          >
            {/* Top drag handle indicator */}
            <div className="w-10 h-1 bg-neutral-700/30 rounded-full mx-auto mt-3 mb-5 shrink-0" />

            {/* Main content body */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col custom-scrollbar">
              {/* Header */}
              <div className="mb-5 shrink-0">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                  <Sparkles className="w-5 h-5 fill-purple-100 animate-pulse" />
                  <span className="text-[11px] font-extrabold uppercase tracking-widest">
                    AI Review
                  </span>
                </div>
                <h2 className="text-xl font-bold text-[#3b0764] leading-tight">
                  Review Tasks
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Confirm or adjust your extracted tasks before saving.
                </p>
              </div>

              {/* Scrollable list of Editable Cards */}
              <div className="flex-1 flex flex-col gap-4 overflow-y-visible">
                <AnimatePresence mode="popLayout">
                  {tasks.map((task) => (
                    <EditableTaskCard
                      key={task.id}
                      task={task}
                      onChange={handleTaskChange}
                      onDelete={() => handleTaskDelete(task.id)}
                    />
                  ))}
                </AnimatePresence>

                {/* Inline non-floating Add Task button at the bottom of the list */}
                <button
                  type="button"
                  onClick={handleAddTaskInline}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-dashed border-purple-300 bg-purple-50/30 text-purple-600 hover:bg-purple-50 hover:text-purple-700 transition-colors font-semibold text-sm cursor-pointer select-none mb-6 mt-2"
                >
                  <Plus className="w-4 h-4" />
                  Add another task
                </button>
              </div>
            </div>

            {/* Bottom Actions Footer */}
            <div className="border-t border-purple-200/40 bg-white/80 backdrop-blur-md p-5 px-6 flex items-center justify-between gap-4 shrink-0 pb-[calc(env(safe-area-inset-bottom,24px)+20px)] shadow-md">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 py-3.5 px-4 text-center rounded-2xl text-slate-600 hover:text-slate-800 font-semibold text-sm bg-slate-100 hover:bg-slate-200 transition-all border-none cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveAll}
                disabled={isSaving || tasks.length === 0}
                className={`flex-1 py-3.5 px-4 text-center rounded-2xl font-bold text-sm border-none transition-all shadow-sm flex items-center justify-center gap-2 ${
                  tasks.length > 0 && !isSaving
                    ? "bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200/50 cursor-pointer"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save All"
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
