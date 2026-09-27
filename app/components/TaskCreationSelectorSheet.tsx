"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mic, Keyboard, Sparkles } from "lucide-react";
import { useEffect } from "react";

interface TaskCreationSelectorSheetProps {
  open: boolean;
  onClose: () => void;
  onSelectManual: () => void;
  onSelectAI: () => void;
}

export default function TaskCreationSelectorSheet({
  open,
  onClose,
  onSelectManual,
  onSelectAI,
}: TaskCreationSelectorSheetProps) {
  // Mobile scroll lock when sheet is open
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

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[9980] max-w-md mx-auto w-full"
          />

          {/* Selector Bottom Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 30, mass: 0.9 }}
            className="fixed bottom-0 inset-x-0 mx-auto max-w-md w-full z-[9985] bg-white rounded-t-3xl p-6 pb-[calc(env(safe-area-inset-bottom,24px)+24px)] shadow-[0_-8px_40px_rgba(135,40,198,0.12)] font-manrope flex flex-col gap-4"
          >
            {/* Grab handle bar */}
            <div className="w-10 h-1 bg-purple-100 rounded-full mx-auto mb-2 shrink-0" />

            {/* Header Title */}
            <div className="mb-1">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400">
                New Task
              </p>
              <h3 className="text-lg font-bold text-[#3b0764] leading-none mt-1">
                Choose Creation Method
              </h3>
            </div>

            {/* Options container (Vertically Stacked, AI top, Manual bottom) */}
            <div className="flex flex-col gap-3.5 w-full">
              {/* Option 1: AI Quick Capture (Standout Sparkle design) */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  onSelectAI();
                  onClose();
                }}
                className="w-full text-left py-4 px-5 rounded-2xl bg-gradient-to-r from-[#8728c6] to-[#7c3aed] text-white border-none cursor-pointer flex items-center justify-between shadow-[0_6px_20px_rgba(124,58,237,0.25)] hover:brightness-105 transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
                    <Mic className="w-5.5 h-5.5 text-white animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                      AI Quick Capture
                      <Sparkles className="w-3.5 h-3.5 fill-white" />
                    </h4>
                    <p className="text-[11px] text-purple-100 mt-0.5 leading-none">
                      Type or speak your tasks instantly
                    </p>
                  </div>
                </div>
                <span className="text-white/60 text-lg font-medium pr-1">→</span>
              </motion.button>

              {/* Option 2: Manual Task */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  onSelectManual();
                  onClose();
                }}
                className="w-full text-left py-4 px-5 rounded-2xl bg-purple-50 hover:bg-purple-100 text-[#3b0764] border border-purple-200/50 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Keyboard className="w-5.5 h-5.5 text-[#8728c6]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm leading-tight text-[#3b0764]">
                      Manual Task
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-none">
                      Define title, time slot, and details manually
                    </p>
                  </div>
                </div>
                <span className="text-[#8728c6]/60 text-lg font-medium pr-1">→</span>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
