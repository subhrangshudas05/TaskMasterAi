"use client";

import { useState, useEffect } from "react";

export default function YearProgress() {
  const [isMounted, setIsMounted] = useState(false);
  const [progressData, setProgressData] = useState({ percent: 0, daysLeft: 0, year: 2026 });

useEffect(() => {
    // 1. Force the current time to IST
    const nowIST = getISTTime(); 
    
    const year = nowIST.getFullYear();
    const start = new Date(year, 0, 1).getTime();
    const end = new Date(year + 1, 0, 1).getTime();
    const currentTimeMs = nowIST.getTime();
    
    // Exact percentage calculation
    const exactPercent = ((currentTimeMs - start) / (end - start)) * 100;
    const percent = Number(exactPercent.toFixed(1));

    // Integer days left
    const totalDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.floor((currentTimeMs - start) / (1000 * 60 * 60 * 24));
    const daysLeft = totalDays - daysPassed;

    setProgressData({ percent, daysLeft, year });
    setIsMounted(true);
  }, []);

  const { percent, daysLeft, year } = progressData;

  // --- SVG Ring Math ---
  const size = 64; // Size of the circular progress
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  // Prevent UI flashing before calculation is done
  if (!isMounted) return <div className="h-[90px] mb-4 rounded-2xl bg-slate-100 animate-pulse" />;

  return (
    <div className="mb-4 relative overflow-hidden bg-slate-900 rounded-2xl p-5 flex items-center justify-between shadow-lg border border-slate-800">
      
      {/* Subtle background glow effect */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Left Text Content */}
      <div className="relative z-10">
         <h2 className="text-slate-300/80 text-[11px] font-bold uppercase tracking-[0.15em] mb-1.5 font-['DM_Mono']">
           Time Remaining
         </h2>
         <p className="text-white text-lg font-medium tracking-tight">
           <span className="text-orange-500 font-bold">{daysLeft}</span> days left in {year}
         </p>
      </div>
      
      {/* Right Circular Progress */}
      <div className="relative flex items-center justify-center z-10" style={{ width: size, height: size }}>
        
        <svg className="absolute inset-0 transform -rotate-90" width={size} height={size}>
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-slate-800"
          />
          {/* Active Progress Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="text-orange-500 transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Percentage inside the ring */}
        <span className="text-white text-[11px] font-bold relative z-10 font-manrope">
          {percent}%
        </span>
      </div>

    </div>
  );
}


export const getISTTime = () => {
  // Returns a string or Date object strictly in Asia/Kolkata time
  const options = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric' as const,
    month: 'numeric' as const,
    day: 'numeric' as const,
    hour: 'numeric' as const,
    minute: 'numeric' as const,
    second: 'numeric' as const,
  };
  
  const formatter = new Intl.DateTimeFormat('en-US', options);
  return new Date(formatter.format(new Date()));
};