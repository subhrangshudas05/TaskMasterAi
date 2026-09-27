"use client";

import { useEffect, useRef } from "react";

interface TranscriptTextAreaProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function TranscriptTextArea({
  value,
  onChange,
  placeholder = "Type or speak everything you need to do today...",
  disabled = false,
}: TranscriptTextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new transcripts are appended
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [value]);

  return (
    <div className="bg-[#f5f3ff] rounded-2xl p-4 border border-[#ede9fe] w-full h-full flex flex-col  focus-within:border-purple-400 transition-all shadow-inner">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full flex-1 resize-none border-none outline-none focus:outline-none focus-visible:outline-none bg-transparent text-base text-[#3b0764] placeholder-[#3b0764]/40 leading-relaxed caret-[#7c3aed] focus:ring-0 font-manrope disabled:opacity-50 overflow-y-auto custom-scrollbar"
      />
    </div>
  );
}
