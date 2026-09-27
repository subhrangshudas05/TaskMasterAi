"use client";

import React, { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE ACTUAL CARD
// ─────────────────────────────────────────────────────────────────────────────
interface ProgressCardProps {
  totalTasks: number;
  completedTasks: number;
  onViewClick?: () => void;
}

export function ProgressCard({ totalTasks, completedTasks, onViewClick }: ProgressCardProps) {
  const [isMounted, setIsMounted] = useState(false);

  // SVG Math
  const radius = 24; // Fits perfectly inside a 56x56 (w-14 h-14) box
  const circumference = 2 * Math.PI * radius;
  
  // Calculate Progress
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const strokeDashoffset = isMounted ? circumference - (progress / 100) * circumference : circumference;
  const tasksLeft = totalTasks - completedTasks;

  // Trigger the animation shortly after mount for a smooth fill-up effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="relative w-full bjg-[#8200DA] bg-purple-700 rounded-3xl p-6 flex items-center justify-between shadow-[0_12px_32px_rgba(91,107,249,0.35)] overflow-hidden">
      
      {/* Background Decorative Blob (Optional, adds that premium iOS feel) */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl -translate-y-10 translate-x-10 pointer-events-none" />

      {/* Left Content */}
      <div className="flex flex-col items-start z-10 max-w-[60%]">
        <h3 className="text-white font-semibold text-lg leading-snug tracking-wide">
          {progress === 100 && totalTasks > 0
            ? `All tasks completed today!`
            : progress > 80
            ? `Your today's task${totalTasks > 1 ? 's' : ''} almost done!`
            : `${tasksLeft} task${tasksLeft > 1 ? 's' : ''} due today`}
        </h3>
        
        <button 
          onClick={onViewClick}
          className="mt-4 bg-white text-[#8200DA] font-bold text-sm px-5 py-2.5 rounded-[12px] active:scale-95 transition-transform hover:scale-102"
        >
          View Task
        </button>
      </div>

      {/* Right Content: Circular Progress */}
      <div className="relative flex items-center justify-center shrink-0 z-10">
        <svg className="w-16 h-16 transform -rotate-90">
          {/* Background Track */}
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke="rgba(255,255,255,0.2)" // Faded white
            strokeWidth="5"
            fill="transparent"
          />
          {/* Progress Indicator */}
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke="white"
            strokeWidth="5"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        
        {/* Percentage Text inside the ring */}
        <span className="absolute text-sm font-bold text-white">
          {progress}%
        </span>
      </div>
      
      {/* The 3-dot menu from your screenshot */}
      {/* <button className="absolute bottom-4 right-5 text-white/70 hover:text-white transition-colors">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
      </button> */}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. THE SKELETON SHIMMER (Matches the exact size of the card)
// ─────────────────────────────────────────────────────────────────────────────
export function ProgressCardSkeleton() {
  return (
    <div className="relative w-full bg-slate-100 rounded-3xl p-6 flex items-center justify-between shadow-sm overflow-hidden animate-pulse">
      
      {/* Left Content Placeholders */}
      <div className="flex flex-col items-start z-10 w-[60%]">
        {/* Text lines */}
        <div className="w-3/4 h-5 bg-slate-200 rounded-md mb-2" />
        {/* <div className="w-1/2 h-5 bg-slate-200 rounded-md" /> */}
        
        {/* Button placeholder */}
        <div className="mt-4 w-24 h-10 bg-slate-200 rounded-[12px]" />
      </div>

      {/* Right Content: Circle Placeholder */}
      <div className="relative flex items-center justify-center shrink-0 z-10">
        <div className="w-16 h-16 rounded-full border-4 border-slate-200 bg-transparent" />
      </div>
      
      {/* Dot menu placeholder */}
      {/* <div className="absolute bottom-5 right-5 flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
      </div> */}
    </div>
  );
}