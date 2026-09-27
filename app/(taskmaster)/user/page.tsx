'use client'

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@/app/hooks/useUser";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { redirect } from 'next/navigation'

import NotificationToggle from "@/app/components/NotificationToggle";

export default function page() {
   const router = useRouter();
    const { userId, isAuthenticated, userImage, userName } = useUser();
  
    useEffect(() => {
      if (!userId) {
        redirect('/login')
      }
    }, [userId, isAuthenticated, router])
  return (
    <div className='w-full min-h-dvh text-dark bg-app-main p-6 font-manrope'>
      <h1 className="text-3xl font-black text-[#3b0764] mb-8">Settings</h1>
      
      <div className="space-y-4">
        <NotificationToggle />
      </div>
      
      <button
          onClick={async () => {
            localStorage.removeItem('taskmaster-auth');
            localStorage.removeItem('taskmaster-cache');
            localStorage.removeItem('taskmaster-outbox');
            await signOut({ callbackUrl: '/login' });
          }} 
          className="mt-8 flex items-center gap-2 p-3 w-full justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-bold"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
    </div>
  )
}
