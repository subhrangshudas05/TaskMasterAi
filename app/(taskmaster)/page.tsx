'use client'

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "../hooks/useUser";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { redirect } from 'next/navigation'
import Link from "next/link";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { ITask } from "../models/Task";
import { ProgressCard, ProgressCardSkeleton } from "../components/ProgressCard";
import Marathons from "../components/Marathons";
import useSWR from "swr";
import YearProgress from "../components/YearProgress";



export default function Home() {

  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [localAuth, setLocalAuth] = useState<{ id: string; name: string; image: string } | null>(null);

  // Live Auth Hook
  const { userId, userImage, userName, isLoading: authIsLoading } = useUser();

  // --- STEP 1: Boot Up & Check Hard Drive ---
  useEffect(() => {
    const savedUser = localStorage.getItem('taskmaster-auth');
    if (savedUser) {
      setLocalAuth(JSON.parse(savedUser));
    }
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (userId) {
      const activeUser = { id: userId, name: userName || "", image: userImage || "" };
      localStorage.setItem('taskmaster-auth', JSON.stringify(activeUser));
      setLocalAuth(activeUser);
    }
  }, [userId, userName, userImage]); // 👈 localAuth is NOT in here, so it's perfectly safe!

  // --- STEP 3: The Smart Auth Guard (Your working code, upgraded) ---
  useEffect(() => {
    if (isMounted && !authIsLoading && !userId) {

      // Are we offline with a cached profile? If yes, bypass the kick!
      if (!navigator.onLine && localStorage.getItem('taskmaster-auth')) {
        console.log("✈️ Airplane Mode: Using local auth cache.");
        return;
      }

      // Otherwise, kick to login
      router.push('/login');
    }
  }, [isMounted, authIsLoading, userId, router]);

  // --- STEP 3: Setup UI Variables ---
  // Use live data if available, otherwise fallback to our offline cache
  const displayProfileName = (userName || localAuth?.name || "There").split(" ")[0];
  const displayImage = userImage || localAuth?.image || "/useric.png";
  const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const { data: tasks, isLoading: taskIsLoading } = useSWR(
    dateKey ? `/api/task?date=${dateKey}` : null
  );

  const tasksArray = Array.isArray(tasks) ? tasks : [];
  const totalTasks = tasksArray.length;
  const completedTasks = tasksArray.filter(t => t.isCompleted).length;

  // 4. THE JITTER SHIELD 
  if (!isMounted || (authIsLoading && !localAuth)) {
    return <div className="min-h-dvh bg-app-main w-full" />;
  }

  return (
    <div className="relative flex flex-col min-h-screen font-manrope py-6 px-6 bg-app-main w-full mx-auto ">

      {/* floating button */}
      <motion.div
        onClick={() => { router.push('/new?step=1') }}
        className="fixed z-50 flex items-center justify-center w-18 aspect-square rounded-full right-4 bottom-24 md:right-1/2 md:translate-x-50  text-3xl font-light text-lighter hover:scale-105 transition-all duration-200  ">

        <motion.div
          animate={{ width: ["48px", "80px", "80px", "48px", '48px'] }}
          transition={{
            duration: 3.5,
            repeat: Infinity,

            times: [0, 0.5, 0.6, 0.9, 1],

            ease: ["easeOut", "easeIn"],
          }}
          className="absolute z-2 w-20 aspect-square  rounded-full bffg-[#F0C4BB] bg-[radial-gradient(circle_at_center,#7e69e8_20%,transparent_73%)]
          "
        // bg-[radial-gradient(circle_at_center,#7e69e87e_45%,transparent_80%)] 


        />

        <div className="relative z-10 flex items-center justify-center w-12 aspect-square rounded-full bg-[#8728c6]">
          <Plus className="w-6 h-6" strokeWidth={2.5} />
        </div>

      </motion.div>

      {/* login info */}
      <div className="flex mb-6 justify-between h-auto  w-full items-center gap-3">

        <div className="flex gap-3 items-center">
          <div className="relative overflow-hidden w-12 h-12 rounded-full border bg-black/30 border-white">
            <Image
              src={displayImage}
              alt="Profile"
              fill
              className="object-cover"
              loading="eager"
            />
          </div>
          <div className="flex flex-col gap-0  ">
            <p className="text-sm  text-black/50 font-funnel-sans font-semibold leading-none">Hello!</p>
            <p className="text-base  font-manrope font-semibold tracking-tight text-black/70 leading-[1.2]">{displayProfileName}</p>
          </div>
        </div>

        <button
          onClick={async () => {
            // 1. Wipe the offline hard drive completely
            localStorage.removeItem('taskmaster-auth');
            localStorage.removeItem('taskmaster-cache');
            localStorage.removeItem('taskmaster-outbox');

            // 2. Tell the server to kill the session
            await signOut({ callbackUrl: '/login' });
          }} className="group flex items-center gap-2 p-2.5 rounded-lg bg-black/8 hover:bg-red-500/10  hover:border-black/40 transition-all text-sm font-medium text-black/70 hover:text-black/85"
        >
          <LogOut className="w-4 h-4" />

        </button>
      </div>

      <YearProgress />

      {taskIsLoading ? (
        <ProgressCardSkeleton />
      ) : (
        <ProgressCard
          totalTasks={totalTasks}
          completedTasks={completedTasks}
          onViewClick={() => router.push('/tasks')}
        />
      )}

      <Marathons />

    </div>
  );
}


