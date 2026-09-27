'use client'

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@/app/hooks/useUser";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { redirect } from 'next/navigation'
export default function page() {
  const router = useRouter();
  const { userId, isLoading: authIsLoading } = useUser();

  useEffect(() => {
    if (!authIsLoading && !userId) {
      if (typeof navigator !== 'undefined' && !navigator.onLine && localStorage.getItem('taskmaster-auth')) return;
      router.replace('/login');
    }
  }, [userId, authIsLoading, router]);

  if (authIsLoading || !userId) {
    return <div className="w-full h-dvh bg-app-main" />;
  }

  return (
    <div className='w-full h-dvh text-dark text-4xl bg-app-main'>
      chatbot
    </div>
  );
}
