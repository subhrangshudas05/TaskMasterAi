"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Trophy, Pause } from 'lucide-react';
import { useMemo } from "react";
import useSWR from "swr";


interface Marathon {
  _id: string;
  title: string;
  status: 'active' | 'completed' | 'paused';
  steps: { isCompleted: boolean }[];
}

export default function Marathons() {

  const router = useRouter();


  const { data: marathonResponse, isLoading: marathonIsLoading } = useSWR<{
    success: boolean;
    marathons: Marathon[];
  }>('/api/marathons');

  // 2. Sort and Copy (useMemo + Spread operator)
  const sortedMarathons = useMemo(() => {
    if (!marathonResponse?.marathons) return [];

    const STATUS_RANK: Record<string, number> = {
      active: 1,
      paused: 2,
      completed: 3,
    };

    // The [...] spread creates a copy so we don't mutate the SWR cache!
    return [...marathonResponse.marathons].sort((a, b) => {
      return (STATUS_RANK[a.status] || 99) - (STATUS_RANK[b.status] || 99);

    });
  }, [marathonResponse]);

  

  if (marathonIsLoading) {
    return <div className="p-6 font-manrope text-center text-gray-500">Loading your marathons...</div>;
  }

  return (
    <div className="h-auto font-manrope mt-6 pb-16 font-manrope mb-16">
      <div className="flex items-center gap-2 mb-3">
        <h1 className="text-xl  tracking-tight font-semibold text-gray-900">Your Marathons</h1>
        <span className="border text-purple-600 text-xs font-bold px-2 py-0.5 rounded-full">
          {sortedMarathons.length}
        </span>
      </div>

      <div className="space-y-3">
        {sortedMarathons.map((marathon) => {
          // Calculate Progress dynamically
          const totalTasks = marathon.steps.length;
          const completedTasks = marathon.steps.filter(step => step.isCompleted).length;
          const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

          return (
            <MarathonCard
              key={marathon._id}
              marathon={marathon}
              totalTasks={totalTasks}
              progress={progressPercentage}
              onClick={() => router.push(`/marathon/${marathon._id}`)}
            />
          );
        })}

        {sortedMarathons.length === 0 && (
          <div className="text-center p-8 bg-white rounded-2xl border border-dashed border-gray-300">
            <p className="text-gray-500">No marathons yet. Start one today!</p>
          </div>
        )}
      </div>
    </div>
  );
}



function MarathonCard({ marathon, totalTasks, progress, onClick }: any) {
  // Math for the SVG Circle Stroke
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // --- DYNAMIC STYLE CONFIGURATION ---
  const getTheme = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          card: "bg-gradient-to-br from-emerald-50 to-white border-emerald-300 shadow-sm shadow-emerald-100/50 hover:shadow-md hover:shadow-emerald-200/50",
          // CHANGED: Light green box, dark green text (Matches the others)
          iconBox: "bg-emerald-100 text-emerald-600 border-emerald-300",
          title: "text-emerald-950",
          text: "text-emerald-600",
          ring: "text-emerald-500",
          track: "text-emerald-100",
          // CHANGED: Removed fill, added strokeWidth
          icon: <Trophy size={22} strokeWidth={2.5} />,
          label: "Completed"
        };
      case 'paused':
        return {
          card: "bg-gray-50 border-gray-200 opacity-80 hover:opacity-100 grayscale-[0.2]",
          iconBox: "bg-gray-200 text-gray-500 border-gray-300",
          title: "text-gray-600",
          text: "text-gray-400",
          ring: "text-gray-400",
          track: "text-gray-200",
          // CHANGED: Removed fill, added strokeWidth
          icon: <Pause size={22} strokeWidth={2.5} />,
          label: "Paused"
        };
      case 'active':
      default:
        return {
          card: "bg-white border-gray-100 hover:border-purple-200 shadow-sm",
          iconBox: "bg-purple-100 text-purple-600 border-purple-300",
          title: "text-gray-900",
          text: "text-gray-400",
          ring: "text-purple-600",
          track: "text-gray-100",
          // CHANGED: Removed fill, added strokeWidth
          icon: <User size={24} strokeWidth={2.5} />,
          label: "Active"
        };
    }
  };

  const theme = getTheme(marathon.status);

  return (
    <div
      onClick={onClick}
      className={`${theme.card} p-3 rounded-3xl border flex items-center gap-4 cursor-pointer transition-all duration-300 active:scale-95`}
    >
      {/* Left Icon (Dynamically swaps based on status) */}
      <div

        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-colors duration-300 ${theme.iconBox}`}>
        {theme.icon}
      </div>

      {/* Center Text */}
      <div className="flex-1 w-auto">
        <h3 className={`font-bold text-base line-clamp-1 transition-colors duration-300 ${theme.title}`}>
          {marathon.title}
        </h3>

        {/* Subtitle with Task Count AND Status Badge */}
        <div className="flex items-center gap-2 mt-0.5">
          <p className={`text-sm font-medium transition-colors duration-300 ${theme.text}`}>
            {totalTasks} Tasks
          </p>
          <span className="text-gray-300 text-xs">•</span>
          <p className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>
            {theme.label}
          </p>
        </div>
      </div>

      {/* Right Progress Ring */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg className="w-14 h-14 transform -rotate-90">
          {/* Background Track */}
          <circle
            cx="28"
            cy="28"
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            className={`transition-colors duration-300 ${theme.track}`}
          />
          {/* Progress Indicator */}
          <circle
            cx="28"
            cy="28"
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`transition-all duration-1000 ease-out ${theme.ring}`}
          />
        </svg>
        {/* Percentage Text inside the ring */}
        <span className={`absolute text-xs font-bold transition-colors duration-300 ${theme.title}`}>
          {progress}%
        </span>
      </div>
    </div>
  );
}