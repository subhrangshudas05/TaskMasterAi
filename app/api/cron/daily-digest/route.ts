import { NextResponse } from 'next/server';
import { connectToDB } from '@/app/lib/mongoose';
import Task from '@/app/models/Task';
import PushSubscription from '@/app/models/PushSubscription';
import { sendPushSafely } from '@/app/lib/webpush';
import { getTaskScheduledDate } from '@/app/lib/taskTimeHelper';
import { getISTDayBoundaries } from '@/app/lib/IstTime';

export async function POST(req: Request) {
  // Protect the route with CRON_SECRET (accepts x-cron-secret header or Bearer token)
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const secret = req.headers.get('x-cron-secret') || bearerToken;

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Support manual testing by passing type in query ?type=morning
  const url = new URL(req.url);
  let type = url.searchParams.get('type');

  const now = new Date();
  const istTimeStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  
  if (!type) {
    // Determine type by current IST hour
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + istOffset);
    const hour = istTime.getUTCHours();
    const minute = istTime.getUTCMinutes();
    
    if (hour === 8) type = 'morning';
    else if (hour === 18) type = 'evening';
    else if (hour === 22) type = 'day_ending';
    else if (hour === 23 && minute < 30) type = 'day_recap';
    else if (hour === 23 && minute >= 30) type = 'tomorrow_planning';
    else if (hour === 1) type = 'good_night';
    else {
      console.log(`[Daily Digest Cron] No digest scheduled for hour ${hour}:${minute} IST.`);
      return NextResponse.json({
        success: true,
        type: null,
        serverTimeUTC: now.toISOString(),
        istTime: istTimeStr,
        sent: 0,
        failed: 0,
        message: 'No digest scheduled for this hour.'
      });
    }
  }

  console.log(`[Daily Digest Cron] Started. Slot/Type: "${type}" | Server UTC: ${now.toISOString()} | Current IST: ${istTimeStr}`);

  try {
    await connectToDB();

    const { startOfDay, endOfDay } = getISTDayBoundaries();

    // Only query users that have an active push subscription
    const subscriptions = await PushSubscription.find({});
    if (subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: 'No active subscriptions.' });
    }

    const User = (await import('@/app/models/User')).default;
    const userIds = [...new Set(subscriptions.map(s => s.userId.toString()))];
    const users = await User.find({ _id: { $in: userIds } });

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      // Find tasks for today
      const tasks = await Task.find({
        userEmail: user.email,
        date: { $gte: startOfDay, $lte: endOfDay }
      });

      const totalTasks = tasks.length;
      if (totalTasks === 0 && type !== 'tomorrow_planning' && type !== 'good_night') continue; // Nothing to report

      const completedCount = tasks.filter(t => t.isCompleted).length;
      const incompleteCount = totalTasks - completedCount;
      const remainingCount = incompleteCount;

      const baseUrl = process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes('localhost')
        ? process.env.NEXTAUTH_URL
        : 'https://taskmasterai-sdas.vercel.app';

      let payload: { title: string; body: string; url: string; icon: string; badge: string } | null = null;

      if (type === 'morning') {
        payload = {
          title: `☀️ Good morning!`,
          body: `You've got ${totalTasks} tasks today. Let's start rolling! 💪💪`,
          icon: `${baseUrl}/sicon.png`,
          badge: `${baseUrl}/sbadge.png`,
          url: '/tasks'
        };
      } 
      else if (type === 'evening') {
        if (incompleteCount > 0) {
           payload = {
              title: `🌇 Evening check-in`,
              body: `You still have ${incompleteCount} tasks left. Keep going!`,
              icon: `${baseUrl}/sicon.png`,
              badge: `${baseUrl}/sbadge.png`,
              url: '/tasks'
           };
        }
      } 
      else if (type === 'day_ending') {
        if (incompleteCount > 0) {
          payload = {
            title: `🌙 Day ending soon...`,
            body: `${incompleteCount} of ${totalTasks} tasks aren't done yet. Why?! 😭 ${remainingCount} left to do.`,
            icon: `${baseUrl}/sicon.png`,
            badge: `${baseUrl}/sbadge.png`,
            url: '/tasks'
          };
        }
      } 
      else if (type === 'day_recap') {
        if (incompleteCount === 0) {
          payload = {
            title: `🌙 Day's done!`,
            body: `You completed ${completedCount} out of ${totalTasks} tasks today.`,
            icon: `${baseUrl}/sicon.png`,
            badge: `${baseUrl}/sbadge.png`,
            url: '/tasks'
          };
        } else {
          payload = {
            title: `Hurry up! Still ${remainingCount} task${remainingCount > 1 ? 's' : ''} left 😭`,
            body: `You completed ${completedCount} out of ${totalTasks} tasks today.`,
            icon: `${baseUrl}/sicon.png`,
            badge: `${baseUrl}/sbadge.png`,
            url: '/tasks'
          };
        }
      } 
      else if (type === 'tomorrow_planning') {
        payload = {
          title: `📝 Plan tomorrow`,
          body: `Take a minute to plan your tasks for tomorrow.`,
          icon: `${baseUrl}/sicon.png`,
          badge: `${baseUrl}/sbadge.png`,
          url: '/tasks'
        };
      } 
      else if (type === 'good_night') {
        payload = {
          title: `🌙 Good night!`,
          body: `New day, new hope. You've done enough for today. Rest up. 😴`,
          icon: `${baseUrl}/sicon.png`,
          badge: `${baseUrl}/sbadge.png`,
          url: '/tasks'
        };
      }

      if (payload) {
        const userSubs = subscriptions.filter(s => s.userId.toString() === user._id.toString());
        for (const sub of userSubs) {
          const success = await sendPushSafely(sub, payload);
          if (success) sent++;
          else failed++;
        }
      }
    }

    console.log(`[Daily Digest Cron] Completed (${type}). Users matched: ${users.length}, Pushes sent: ${sent}, Failed: ${failed}`);

    return NextResponse.json({
      success: true,
      type,
      serverTimeUTC: now.toISOString(),
      istTime: istTimeStr,
      usersMatched: users.length,
      sent,
      failed
    });

  } catch (error) {
    console.error('Daily digest error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
