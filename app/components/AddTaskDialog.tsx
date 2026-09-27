"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import NativeTimePicker from "./TimePicker";

interface AddTaskDialogProps {
    open: boolean;
    onClose: () => void;
    onSave?: (task: { title: string; category: string; timeslot: TimeValue }, date: Date) => void;
    date: Date;
}

interface TimeValue {
    hour: string;
    minute: string;
    ampm: string;
}

export default function AddTaskDialog({ open, onClose, onSave,date }: AddTaskDialogProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("No Category");
    const [timeslot, setTimeslot] = useState<TimeValue>({ hour: "08", minute: "00", ampm: "AM" });
    

    const handleSave = () => {
        if (!title.trim()) return;
        onSave?.({ title: title.trim(), category, timeslot } , date);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") onClose();
    };

    // autofocus textarea and FREEZE background
    useEffect(() => {
        if (open) {
            // setTimeout(() => textareaRef.current?.focus(), 120);
            setTitle("");
            setCategory("No Category");
            setTimeslot({ hour: "08", minute: "00", ampm: "AM" });

            // --- THE BULLETPROOF MOBILE SCROLL LOCK ---
            // 1. Capture the exact pixel the user is currently scrolled to
            const scrollY = window.scrollY;

            // 2. Nail the body to the viewport using fixed positioning
            document.body.style.position = "fixed";
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = "100%";
            document.body.style.overflow = "hidden";
            document.body.style.touchAction = "none";
        } else {
            // 3. When closing, grab the saved scroll position
            const scrollY = document.body.style.top;

            // 4. Remove all the locks
            document.body.style.position = "";
            document.body.style.top = "";
            document.body.style.width = "";
            document.body.style.overflow = "";
            document.body.style.touchAction = "auto";

            // 5. Instantly teleport the user back to where they were before opening the modal
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || '0') * -1);
            }
        }

        // Cleanup in case the component unexpectedly unmounts
        return () => {
            const scrollY = document.body.style.top;
            document.body.style.position = "";
            document.body.style.top = "";
            document.body.style.width = "";
            document.body.style.overflow = "";
            document.body.style.touchAction = "auto";
            if (scrollY) window.scrollTo(0, parseInt(scrollY || '0') * -1);
        };
    }, [open]);

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-[rgba(0,0,0,0.55)] z-[9990]"
                    />

                    {/* sheet */}
                    <motion.div
                        key="sheet"
                        initial={{ y: "100%", opacity: 0.6 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", stiffness: 340, damping: 36, mass: 0.9 }}
                        onKeyDown={handleKeyDown}
                        className="fixed bottom-0 inset-x-0 mx-auto max-w-md w-full z-9999 bg-white rounded-t-3xl px-5 pt-5 font-manrope
            shadow-[0_-8px_48px_rgba(91,33,182,0.12),0_-1px_0_rgba(139,92,246,0.1)] pb-[env(safe-area-inset-bottom,16px)]"
                    >
                        {/* drag handle */}
                        <div className="w-9 h-1 rounded-[2px] bg-[#e9d5ff] mx-auto mb-[18px]" />

                        {/* title */}
                        <p className="text-[11px] font-bold tracking-wider uppercase text-[#a78bfa] mb-3 ">
                            New Task
                        </p>

                        {/* ── textarea ── */}
                        <div className="bg-[#f5f3ff] tracking-tight rounded-[14px] px-[14px] py-3 mb-[14px] border border-[#ede9fe]">
                            <textarea
                                ref={textareaRef}
                                value={title}
                                placeholder="What needs to be done?"
                                onChange={(e) => {
                                    setTitle(e.target.value);
                                    autoResize(e.target);
                                }}
                                enterKeyHint="done"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        e.currentTarget.blur(); // Hide the keyboard
                                    } else if (e.key === "Escape") {
                                        onClose();
                                    }
                                }}
                                rows={1}
                                className="w-full resize-none border-none  tracking-tight  outline-none bg-transparent text-base  text-[#3b0764] leading-[1.6] min-h-[28px] overflow-y-hidden caret-[#7c3aed] focus:ring-0"
                                onInput={(e) => autoResize(e.currentTarget)}
                            />
                        </div>

                        {/* ── time picker ── */}
                        <div className="mb-4">
                            <p className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#af9cf9] mb-2 font-manrope">
                                Time Slot
                            </p>
                            <NativeTimePicker onChange={(time) => setTimeslot(time)} />
                        </div>

                        {/* ── bottom row: category + save ── */}
                        <div className="flex items-center justify-between pb-5 gap-3">
                            {/* category pill */}
                            <button
                                onClick={() => {/* open category dropdown */ }}
                                className="flex items-center gap-[6px] bg-[#f5f3ff] border border-[#ddd6fe] rounded-[20px] py-2 px-[14px] text-[13px]  text-[#7c3aed] cursor-pointer font-medium"
                            >
                                <span className="text-[14px]">⊞</span>
                                {category}
                                <span className="text-[10px] text-[#a78bfa]">▾</span>
                            </button>

                            {/* save button */}
                            <motion.button
                                whileTap={{ scale: 0.94 }}
                                onClick={handleSave}
                                className={`border-none rounded-[20px] py-[10px] px-6 text-[14px]  font-semibold transition-colors duration-200 tracking-normal ${title.trim()
                                    ? "bg-[#7c3aed] text-white cursor-pointer"
                                    : "bg-[#ede9fe] text-[#a78bfa] cursor-not-allowed"
                                    }`}
                            >
                                Save
                            </motion.button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function autoResize(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
}


//font-['DM_Mono',monospace]