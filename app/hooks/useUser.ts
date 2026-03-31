'use client'

import { useSession } from "next-auth/react";

export function useUser() {
  const { data: session, status } = useSession();

  return {
    // Basic user data with proper casting
    user: session?.user as any,
    userId: (session?.user as any)?.id as string,
    
    // Status booleans for cleaner conditionals
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    isGuest: status === "unauthenticated",
    
    // Quick helpers
    userImage: session?.user?.image || "",
    userName: session?.user?.name || "Guest",
    userEmail: session?.user?.email || "",
    authStatus: status
  };
}