"use client";

import { SWRConfig } from "swr";
import { ReactNode } from 'react';


// Define a robust fetcher
const fetcher = async (url: string) => {
  const res = await fetch(url);

  // If the status is not 200-299, throw an error
  if (!res.ok) {
    const info = await res.json();
    const error = new Error(info.message || "An error occurred while fetching data.");
    // You can attach extra info to the error object if needed
    (error as any).status = res.status;
    (error as any).info = info;
    throw error;
  }

  return res.json();
};

const localStorageProvider = () => {
  // 1. Safely initialize (Protects against Vercel SSR crashing)
  const isBrowser = typeof window !== 'undefined';
  const map = new Map<string, any>(
    isBrowser && window.localStorage.getItem('taskmaster-cache')
      ? JSON.parse(window.localStorage.getItem('taskmaster-cache') || '[]')
      : []
  );

  // 2. Custom SET: Saves instantly to hard drive when SWR gets new data
  const set = (key: string, value: any) => {
    map.set(key, value);
    if (isBrowser) {
      const appCache = JSON.stringify(Array.from(map.entries()));
      window.localStorage.setItem('taskmaster-cache', appCache);
    }
  };

  // 3. Custom DELETE: Cleans up hard drive if SWR deletes a key
  const deleteKey = (key: string) => {
    map.delete(key);
    if (isBrowser) {
      const appCache = JSON.stringify(Array.from(map.entries()));
      window.localStorage.setItem('taskmaster-cache', appCache);
    }
  };

  // 4. Return the custom API that SWR expects
  return {
    get: (key: string) => map.get(key),
    keys: () => map.keys(),
    delete: deleteKey,
    set // We pass our upgraded 'set' function here
  };
};

export function SWRprovider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        provider: localStorageProvider, 
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}



