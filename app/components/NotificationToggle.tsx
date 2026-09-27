'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationToggle() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isIOSWeb, setIsIOSWeb] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
      if (isIOS && !isStandalone) {
        setIsIOSWeb(true);
      }
    }

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      
      // Ensure service worker is registered
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        return registration.pushManager.getSubscription();
      }).then(subscription => {
        setIsSubscribed(!!subscription);
      }).catch(err => {
        console.error('ServiceWorker registration error:', err);
      });
    }
  }, []);

  const getVapidPublicKey = async (): Promise<string | null> => {
    if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    }
    try {
      const res = await fetch('/api/notifications/vapid-public-key');
      const data = await res.json();
      return data.publicKey || null;
    } catch {
      return null;
    }
  };

  const subscribeUser = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permResult = await Notification.requestPermission();
        setPermission(permResult);
        if (permResult !== 'granted') {
          await fetch('/api/notifications/permission', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ permission: permResult })
          });
          setLoading(false);
          return;
        }
      }

      // Ensure registration is active
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
      }
      await navigator.serviceWorker.ready;

      const vapidPublicKey = await getVapidPublicKey();
      
      if (!vapidPublicKey) {
         console.error('VAPID public key not found');
         alert('VAPID public key not found. Please verify environment variables.');
         setLoading(false);
         return;
      }
      
      let subscription: PushSubscription | null = null;
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      } catch (subError: any) {
        console.warn('Initial subscribe failed, attempting recovery...', subError);
        // Recovery for Android Chrome "push service error"
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          await existingSub.unsubscribe().catch(() => {});
        }
        await registration.unregister().catch(() => {});
        
        registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      // Send to backend
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.toJSON().keys?.p256dh,
            auth: subscription.toJSON().keys?.auth,
          }
        })
      });

      if (res.ok) {
        setIsSubscribed(true);
        setPermission('granted');
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('Failed to save subscription:', errData);
        alert('Could not save notification subscription on server: ' + (errData.error || 'Server error'));
      }
    } catch (error: any) {
      console.error('Failed to subscribe the user:', error);
      alert('Notification setup error: ' + (error?.message || error));
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        setPermission('denied');
        await fetch('/api/notifications/permission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permission: 'denied' })
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeUser = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Send to backend to remove
        await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });

        await subscription.unsubscribe();
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error('Failed to unsubscribe the user:', error);
    }
  };

  const toggleSubscription = () => {
    if (permission === 'denied') {
      alert("Notifications are blocked by your browser. Please enable them in your browser settings for this site.");
      return;
    }

    if (isSubscribed) {
      unsubscribeUser();
    } else {
      subscribeUser();
    }
  };

  if (!isSupported) {
    if (isIOSWeb) {
      return (
        <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl w-full text-xs text-purple-900 font-manrope space-y-1">
          <p className="font-semibold text-sm">Enable iPhone Notifications</p>
          <p>
            To receive notifications on iOS, tap the <strong>Share</strong> button in Safari and tap <strong>Add to Home Screen</strong>, then open the app from your home screen.
          </p>
        </div>
      );
    }
    return null; // Don't show if not supported
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-100 shadow-sm rounded-2xl w-full">
      <div>
        <h3 className="font-semibold text-gray-900 font-manrope">Task Reminders</h3>
        <p className="text-xs text-gray-500 font-manrope">
          {permission === 'denied' 
             ? "Notifications are blocked in browser" 
             : "Get notified before your tasks begin"}
        </p>
      </div>

      <button
        onClick={toggleSubscription}
        className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none ${
          isSubscribed ? 'bg-purple-500' : 'bg-gray-200'
        }`}
      >
        <motion.div
          animate={{ x: isSubscribed ? 24 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
        />
      </button>
    </div>
  );
}
