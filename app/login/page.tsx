'use client'

import React from 'react'
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { useUser } from '../hooks/useUser';
import { useEffect } from 'react';
import { redirect } from 'next/navigation'


export default function page() {

    const { data: session, status } = useSession();
    const { userId } = useUser();

    useEffect(() => {
        if (userId) {
            redirect('/')
        }
    }, [userId])


    return (
        <div className='w-full h-dvh text-dark  bg-white flex flex-col items-center justify-center gap-8 pb-8'>
            <div className="relative w-[85%] aspect-square">
                <Image src="/loginscreen.jpg" alt="toolkit" fill className="object-cover" />
            </div>
            <div className="flex flex-col items-center justify-center px-8">
                <h1 className="text-2xl font-bold font-syne text-darker text-center mb-4 tracking-tight">
                    Task Master
                </h1>
                <p className="text-[15px]  font-poppins text-black/60 text-center leading-normal max-w-sm">
                    This productivity tool is designed to help<br />
                    you better manage your task<br />
                    project-wise conveniently!
                </p>
            </div>

            <button
                onClick={() => signIn('google', { callbackUrl: '/' })}
                className="flex cursor-pointer hover:scale-103 duration-200 text-base font-sans items-center justify-center w-[70%] gap-2 px-6 py-3 rounded-xl bg-light text-black hover:bg-[#dbc2df] transition-all font-semibold shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-[0.98]"
            >
                Sign In to Begin
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
            </button>

            {userId && (
                <div className="flex items-center gap-3">
                    <div className="relative overflow-hidden w-8 h-8 rounded-full border border-white/10">
                        <Image
                            src={session?.user?.image || ""}
                            alt="Profile"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="group flex items-center gap-2 px-4 py-2 rounded-full bg-light hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 transition-all text-sm font-medium text-black/70 hover:text-red-400"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                    </button>
                </div>
            )}


        </div>
    )
}
