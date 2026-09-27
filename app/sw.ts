/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

// TypeScript now knows exactly what this is!
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache, 
});

serwist.addEventListeners();

self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const origin = self.location.origin;

    const iconUrl = payload.icon
      ? (payload.icon.startsWith("http") ? payload.icon : `${origin}${payload.icon.startsWith('/') ? '' : '/'}${payload.icon}`)
      : `${origin}/sicon.png`;

    const badgeUrl = payload.badge
      ? (payload.badge.startsWith("http") ? payload.badge : `${origin}${payload.badge.startsWith('/') ? '' : '/'}${payload.badge}`)
      : `${origin}/sbadge.png`;

    event.waitUntil(
      self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: iconUrl,
        badge: badgeUrl,
        vibrate: [200, 100, 200],
        tag: payload.tag || `taskmaster-${Date.now()}`,
        renotify: true,
        data: { taskId: payload.taskId, url: payload.url || "/tasks" }
      } as any)
    );
  } catch (err) {
    console.error("Push event handler error:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/tasks";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(urlToOpen);
    })
  );
});