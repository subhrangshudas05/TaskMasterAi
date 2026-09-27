import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription';

if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
  console.warn("VAPID keys are not fully configured in environment variables.");
} else {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function sendPushSafely(subscription: any, payload: any, options?: { urgency?: 'very-low' | 'low' | 'normal' | 'high'; TTL?: number }) {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth
        }
      },
      JSON.stringify(payload),
      {
        urgency: options?.urgency || 'high',
        TTL: options?.TTL !== undefined ? options.TTL : 86400 // 24 hours
      }
    );
    return true;
  } catch (err: any) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      // The subscription is dead/unsubscribed, remove it from DB
      await PushSubscription.deleteOne({ _id: subscription._id });
      console.log(`Removed dead subscription for user: ${subscription.userId}`);
    } else {
      console.error(`Error sending push to ${subscription.userId}:`, err);
    }
    return false;
  }
}
