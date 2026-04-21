// Define the shape of a saved action
export interface OfflineAction {
  type: string;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  body: any;
  tempId?: string;
  userId: string;
}

const OUTBOX_KEY = 'taskmaster-outbox';

const getActiveUserId = () => {
  if (typeof window === 'undefined') return null;
  const auth = JSON.parse(localStorage.getItem('taskmaster-auth') || '{}');
  return auth.id || null;
};

// 1. Add an action to the waiting room
export const addToOutbox = (action: Omit<OfflineAction, 'userId'>) => {
  if (typeof window === 'undefined') return;
  
  const userId = getActiveUserId();
  if (!userId) return; // Safety: Don't queue actions if nobody is logged in!

  const outbox = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
  
  // Attach the user signature to the action
  outbox.push({ ...action, userId }); 
  
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
};

// 2. The engine that processes the waiting room
export const processOutbox = async () => {
  if (typeof window === 'undefined') return;
  
  const currentUserId = getActiveUserId();
  if (!currentUserId) return; // Nobody logged in? Do nothing.

  const outbox: OfflineAction[] = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
  if (outbox.length === 0) return;

  console.log("📶 Internet restored! Sending saved actions...");

  const failedActions: OfflineAction[] = [];

  for (const action of outbox) {
    // 🚨 THE SECURITY GUARD 🚨
    // If the action belongs to an old user, skip it entirely (it will be deleted)
    if (action.userId !== currentUserId) {
      console.warn("Blocked cross-account sync! Trashing old user's action.");
      continue; 
    }

    try {
      const res = await fetch(action.endpoint, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.body)
      });
      
      if (!res.ok) {
        if (res.status === 401) {
           console.log("Session expired! Keeping outbox intact for after login.");
           failedActions.push(action);
           continue;
        }
        throw new Error("Server rejected outbox action");
      }
      
    } catch (error) {
      console.error("Failed to sync action:", action.type);
      failedActions.push(action);
    }
  }

  localStorage.setItem(OUTBOX_KEY, JSON.stringify(failedActions));
};