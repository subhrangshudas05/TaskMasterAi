import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Clock, Check, Lock, AlertCircle } from "lucide-react";

interface TaskCardProps {
  task: any; // Using your ITask type here
  onToggle: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => Promise<void>; // Added the onDelete prop
  isPast?: boolean; // NEW
  isFuture?: boolean; // NEW
}

export default function TaskCard({ task, onToggle, onDelete, isPast, isFuture }: TaskCardProps) {
  const springConfig = { type: "tween", duration: 0.2 } as const;

  // Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(task._id);
    
    setIsDeleting(false); 
    setShowDeleteModal(false);
  };

  const isPendingPast = isPast && !task.isCompleted;

  const marathonTask:Boolean = task.marathonName !== undefined;
  
  const cardBorder = task.isCompleted
    ? "border-purple-100"
    : isPendingPast
    ? "border-orange-200"
    : isFuture
    ? "border-slate-100"
    : "border-slate-100";

  const cardBg = task.isCompleted
    ? "bg-white"
    : isPendingPast
    ? "bg-orange-50/40"
    : isFuture
    ? "bg-slate-50/60"
    : "bg-white";

  // ── radio button per state ─────────────────────────────────────
  const radioBorder = task.isCompleted
    ? "border-purple-500 bg-purple-500"
    : isPendingPast
    ? "border-orange-300 hover:border-orange-500 bg-white"
    : isFuture
    ? "border-slate-200 bg-slate-100 cursor-not-allowed"
    : "border-slate-200 hover:border-purple-400 bg-white group-hover:border-purple-300";

  // ── tag label color ────────────────────────────────────────────
  const tagColor = task.isCompleted
    ? "text-purple-300"
    : isPendingPast
    ? "text-orange-400"
    : isFuture
    ? "text-slate-300"
    : "text-slate-400";

  // ── title color ───────────────────────────────────────────────
  const titleColor = task.isCompleted
    ? "text-purple-900/40 line-through"
    : isPendingPast
    ? "text-orange-950"
    : isFuture
    ? "text-slate-400"
    : "text-[#3b0764]";
  return (
    <>
      <div  // ← plain div, not motion.div
  className={`
          relative p-4 rounded-2xl border shadow-sm
          flex items-start gap-4 group
          transition-all duration-300
          ${cardBg} ${cardBorder}
          ${!isFuture && !task.isCompleted ? "hover:shadow-lg hover:shadow-slate-500/10 hover:-translate-y-0.5" : ""}
          ${task.isCompleted ? "z-0" : "z-10"}
        `}
      >
        {/* ── Future lock icon top-right ── */}
        {isFuture && (
          <div className="absolute bottom-4 px-1.5 right-4 text-slate-400">
            <Lock className="w-3.5 h-3.5" />
          </div>
        )}

        {/* ── Delete button top-right (only non-future, non-completed) ── */}
        {!task.isCompleted && !marathonTask && (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="absolute top-4 right-4 text-slate-300 hover:text-red-400 transition-colors z-20 opacity-100 sm:opacity-50 sm:group-hover:opacity-100 p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* ── Checkbox ── */}
        <div
          onClick={() => onToggle(task._id, task.isCompleted)}
          className={`mt-1 relative z-20 ${isFuture ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          <motion.div
            animate={
              task.isCompleted
                ? { scale: [1, 1.25, 1], backgroundColor: "#a855f7" }
                : { scale: 1, backgroundColor: "transparent" }
            }
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-200 shadow-sm ${radioBorder}`}
          >
            <AnimatePresence>
              {task.isCompleted && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 min-w-0 relative z-0 pr-6">

          {/* Marathon / category tag */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-widest font-['DM_Mono'] ${tagColor}`}>
              {task.marathonName || task.category || "No category"}
            </span>
            {isPendingPast && (
              <span className="text-[10px] font-bold uppercase tracking-widest font-['DM_Mono'] text-orange-400">
                · Pending
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className={`font-medium text-base leading-tight truncate transition-all duration-300 ${titleColor}`}>
            {task.title}
          </h3>

          {/* Meta row — varies by state */}
          <div className="mt-2">

            {/* COMPLETED */}
            {task.isCompleted && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex items-center gap-1.5 text-purple-400"
              >
                <Check className="w-3 h-3" strokeWidth={2.5} />
                <span className="text-[11px] font-medium">Done · great work</span>
              </motion.div>
            )}

            {/* PENDING PAST — missed regular task */}
            {!task.isCompleted && isPendingPast && (
              <div className="flex items-center gap-1.5 text-orange-500">
                <AlertCircle className="w-3 h-3" />
                <span className="text-[11px] font-medium">
                  Take action
                </span>
                {task.originalDate && (
                  <span className="text-[11px] text-orange-400">
                    · Carried over {task.originalDate}
                  </span>
                )}
              </div>
            )}

            {/* FUTURE — locked */}
            {!task.isCompleted && isFuture && (
              <div className="flex items-center gap-1.5 text-slate-400">
                <Lock className="w-3 h-3" />
                <span className="text-[11px] font-medium">
                  {task.timeSlot ? `Unlocks · ${task.timeSlot}` : "Scheduled for later"}
                </span>
              </div>
            )}

            {/* ACTIVE — normal today task */}
            {!task.isCompleted && !isPendingPast && !isFuture && (
              <div className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3 h-3" />
                <span className="text-[11px] font-medium">
                  {task.timeSlot || "Anytime today"}
                </span>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Dark blurred backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setShowDeleteModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 overflow-hidden z-10 font-manrope"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Delete Task?</h3>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                Are you sure you want to delete this task? It will be permanently removed from your list.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors flex justify-center items-center disabled:bg-red-400"
                >
                  {isDeleting ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}