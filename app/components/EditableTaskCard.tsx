"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Trash2, Clock, Folder } from "lucide-react";

export interface ReviewTask {
  id: string;
  title: string;
  time: string | null; // HH:MM 24-hour format or null
  category: string;
}

interface EditableTaskCardProps {
  task: ReviewTask;
  onChange: (updatedTask: ReviewTask) => void;
  onDelete: () => void;
}

export default function EditableTaskCard({
  task,
  onChange,
  onDelete,
}: EditableTaskCardProps) {
  const timeInputRef = useRef<HTMLInputElement>(null);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...task, title: e.target.value });
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // HH:MM
    onChange({ ...task, time: val ? val : null });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...task, category: e.target.value });
  };

  const handleTimeBoxClick = () => {
    try {
      timeInputRef.current?.showPicker();
    } catch (e) {
      timeInputRef.current?.focus();
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className="bg-white p-4 rounded-2xl shadow-sm border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all duration-200 flex flex-col gap-3 group"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Task Title Input */}
        <input
          type="text"
          value={task.title}
          onChange={handleTitleChange}
          placeholder="Task title..."
          className="w-full bg-transparent border-none outline-none font-bold text-[#3b0764] placeholder-[#3b0764]/30 focus:bg-purple-50/50 rounded-xl px-2 py-1 transition-all text-base focus:ring-0 leading-tight"
        />

        {/* Delete Action */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          onClick={onDelete}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors shrink-0 cursor-pointer border-none"
          title="Remove task"
        >
          <Trash2 className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Meta Properties: Time Selector & Category Dropdown */}
      <div className="flex items-center justify-between gap-2 border-t border-purple-200/50 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Picker block */}
          <div
            onClick={handleTimeBoxClick}
            className="flex items-center gap-1.5 bg-slate-50 border border-purple-200 rounded-xl px-2.5 py-1 text-slate-500 focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-400 transition-all cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              ref={timeInputRef}
              type="time"
              value={task.time || ""}
              onChange={handleTimeChange}
              className="bg-transparent border-none outline-none text-xs text-slate-600 font-medium cursor-pointer w-[94px] h-4 leading-none focus:ring-0 p-0"
              title="Set time slot"
            />
          </div>

          {/* Category Dropdown select block */}
          <div className="flex items-center justify-center gap-1.5 bg-slate-50 border border-purple-200 rounded-xl px-2.5 py-1 text-slate-500 focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-400 transition-all">
            <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={task.category}
              onChange={handleCategoryChange}
              className="bg-transparent border-none outline-none text-xs text-slate-600 font-medium cursor-pointer focus:ring-0 p-0 py-0 leading-none pr-3"
              title="Choose category"
            >
              <option value="No Category">No Category</option>
              <option value="Personal">Personal</option>
              <option value="Work">Work</option>
              <option value="Study">Study</option>
              <option value="Health">Health</option>
            </select>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
