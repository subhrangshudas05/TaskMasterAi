"use client";

import { motion } from "framer-motion";
import { X, Check } from "lucide-react";
import Waveform from "./Waveform";

interface RecordingBarProps {
  analyser: AnalyserNode | null;
  isRecording: boolean;
  onCancel: () => void;
  onDone: () => void;
}

export default function RecordingBar({
  analyser,
  isRecording,
  onCancel,
  onDone,
}: RecordingBarProps) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      className="flex items-center justify-between w-[280px] h-14 bg-[#120b1e] border border-purple-950/50 rounded-full px-3 shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_20px_rgba(124,58,237,0.15)] z-40 mx-auto"
    >
      {/* Cancel button on the left */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        onClick={onCancel}
        className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        title="Cancel recording"
      >
        <X className="w-5 h-5" strokeWidth={2.5} />
      </motion.button>

      {/* Realtime Waveform in the center */}
      <div className="flex-1 flex items-center justify-center px-2">
        <Waveform analyser={analyser} isRecording={isRecording} />
      </div>

      {/* Done button on the right */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        onClick={onDone}
        className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-600 text-white hover:bg-purple-500 transition-colors shadow-lg shadow-purple-500/25 cursor-pointer border-none"
        title="Finish and transcribe"
      >
        <Check className="w-5 h-5" strokeWidth={2.5} />
      </motion.button>
    </motion.div>
  );
}
