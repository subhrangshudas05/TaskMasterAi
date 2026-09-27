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
    const { userId, isAuthenticated, userImage, userName } = useUser();
  
    useEffect(() => {
      if (!userId) {
        redirect('/login')
      }
    }, [userId, isAuthenticated, router])
  return (
    <div className='w-full h-dvh text-dark text-4xl bg-app-main'>
      user
    </div>
  )
}
