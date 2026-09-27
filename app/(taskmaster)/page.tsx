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

import Marathons from "../components/Marathons";


export default function Home() {

  const router = useRouter();
  const { userId, isAuthenticated, userImage, userName } = useUser();

  useEffect(() => {
    if (!userId) {
      redirect('/login')
    }
  }, [userId, isAuthenticated, router])

  const profileName = userName.split(" ")[0]

  return (
    <div className="relative min-h-dvh  py-8 px-6 bg-app-main w-full mx-auto ">

      {/* floating button */}
      <motion.div
        onClick={() => { router.push('/new?step=1') }}
        className="fixed z-50 flex items-center justify-center w-18 aspect-square rounded-full right-4 bottom-24 md:right-1/2 md:translate-x-50 bg-ligjt text-3xl font-light text-lighter hover:scale-105 transition-all duration-200  ">

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

        <div className="relative z-10 flex items-center justify-center w-12 aspect-square rounded-full bg-dark">
          <Plus className="w-6 h-6" />
        </div>

      </motion.div>

      {/* login info */}
      <div className="flex justify-between h-auto  w-full items-center gap-3">

        <div className="flex gap-3 items-center">
          <div className="relative overflow-hidden w-12 h-12 rounded-full border bg-black/30 border-white">
            <Image
              src={userImage || ""}
              alt="Profile"
              fill
              className="object-cover"
              loading="eager"
            />
          </div>
          <div className="flex flex-col gap-0  ">
            <p className="text-sm  text-black/50 font-funnel-sans font-semibold leading-none">Hello!</p>
            <p className="text-base  font-manrope font-semibold tracking-tight text-black/70 leading-[1.2]">{profileName}</p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="group flex items-center gap-2 p-2.5 rounded-lg bg-black/8 hover:bg-red-500/10  hover:border-black/40 transition-all text-sm font-medium text-black/70 hover:text-black/85"
        >
          <LogOut className="w-4 h-4" />

        </button>
      </div>

      <Marathons />

    </div>
  );
}


