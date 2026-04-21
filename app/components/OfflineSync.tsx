"use client";

import { useEffect } from 'react';
import { processOutbox } from '../lib/Offline-sync';

export default function OfflineSync() {
  useEffect(() => {
    if (navigator.onLine) processOutbox();
    window.addEventListener('online', processOutbox);
    return () => window.removeEventListener('online', processOutbox);
  }, []);

  return null; // This component is invisible!
}