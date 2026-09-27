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

  try {
    await connectToDB();

    const now = new Date();
    const istTimeStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    console.log(`[Reminders Cron] Started. Server UTC: ${now.toISOString()} | Current IST: ${istTimeStr}`);

    // Get all incomplete tasks for today in IST
    const { startOfDay, endOfDay } = getISTDayBoundaries();

    const incompleteTasks = await Task.find({
      isCompleted: false,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    const userEmails = [...new Set(incompleteTasks.map(t => t.userEmail))];
    if (userEmails.length === 0) {
      console.log(`[Reminders Cron] Incomplete tasks: 0. Finished.`);
      return NextResponse.json({
        success: true,
        serverTimeUTC: now.toISOString(),
        istTime: istTimeStr,
        tasksMatched: 0,
        remindersSent: 0,
        nudgesSent: 0,
        failed: 0,
        message: 'No incomplete tasks to process.'
      });
    }

    // Need to get User IDs from userEmails to fetch their subscriptions
    // because PushSubscription references userId, and Task references userEmail.
    // Let's resolve the userIds:
    const User = (await import('@/app/models/User')).default;
    const users = await User.find({ email: { $in: userEmails } });
    const userEmailToIdMap = new Map();
    users.forEach(u => userEmailToIdMap.set(u.email, u._id.toString()));

    const userIds = users.map(u => u._id);
    const subscriptions = await PushSubscription.find({ userId: { $in: userIds } });
    
    // Group subscriptions by userId for quick lookup
    const subsByUser = new Map();
    subscriptions.forEach(sub => {
      const uId = sub.userId.toString();
      if (!subsByUser.has(uId)) subsByUser.set(uId, []);
      subsByUser.get(uId).push(sub);
    });

    let remindersSent = 0;
    let nudgesSent = 0;
    let failed = 0;

    const baseUrl = process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes('localhost')
      ? process.env.NEXTAUTH_URL
      : 'https://taskmasterai-sdas.vercel.app';

    for (const task of incompleteTasks) {
      const scheduledTime = getTaskScheduledDate(task.date, task.timeSlot);
      if (!scheduledTime) continue; // Skip tasks with no timeSlot or "Anytime"

      const diffMs = now.getTime() - scheduledTime.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 0) continue; // Task is in the future

      let payload = null;
      let updateFields: any = null;

      // Check conditions
      if (!task.reminderSent && !task.reminderFailed) {
        payload = {
          title: `${task.title} — Time to start`,
          body: `It's ${task.timeSlot}. Start with your task.`,
          icon: `${baseUrl}/sicon.png`,
          badge: `${baseUrl}/sbadge.png`,
          taskId: task._id,
          url: '/tasks'
        };
        updateFields = { $inc: { reminderAttempts: 1 }, $set: { reminderSent: true } };
      } 
      else if (diffMins >= 20 && !task.nudge20Sent && !task.nudge20Failed) {
        payload = {
          title: `👀 Have you started ${task.title}?`,
          body: `It's been 20 mins already...`,
          icon: `${baseUrl}/sicon.png`,
          badge: `${baseUrl}/sbadge.png`,
          taskId: task._id,
          url: '/tasks'
        };
        updateFields = { $inc: { nudge20Attempts: 1 }, $set: { nudge20Sent: true } };
      }
      else if (diffMins >= 45 && !task.nudge45Sent && !task.nudge45Failed) {
        payload = {
          title: `👀 ${task.title} — HELLO?`,
          body: `It's been 45 mins. Did you even start? WHERE ARE YOU?!`,
          icon: `${baseUrl}/sicon.png`,
          badge: `${baseUrl}/sbadge.png`,
          taskId: task._id,
          url: '/tasks'
        };
        updateFields = { $inc: { nudge45Attempts: 1 }, $set: { nudge45Sent: true } };
      }
      else if (diffMins >= 120 && !task.nudge2hSent && !task.nudge2hFailed) {
        payload = {
          title: `☢️ ${task.title} ‼️‼️`,
          body: `Are you done? If not... I'm disappointed in you.`,
          icon: `${baseUrl}/sicon.png`,
          badge: `${baseUrl}/sbadge.png`,
          taskId: task._id,
          url: '/tasks'
        };
        updateFields = { $inc: { nudge2hAttempts: 1 }, $set: { nudge2hSent: true } };
      }

      if (payload && updateFields) {
        const uId = userEmailToIdMap.get(task.userEmail);
        const userSubs = subsByUser.get(uId) || [];
        
        let allFailed = true;
        for (const sub of userSubs) {
          const success = await sendPushSafely(sub, payload);
          if (success) allFailed = false;
        }

        if (allFailed && userSubs.length > 0) {
          failed++;
          // If all failed, we might want to mark it as failed if attempts are too high, but let's just 
          // let the DB track attempts. Wait, we set `xxxSent: true` above. 
          // If it failed, we shouldn't set `Sent: true`.
          const attemptField = Object.keys(updateFields.$inc)[0];
          const currentAttempts = task[attemptField as keyof typeof task] as number || 0;
          
          if (currentAttempts + 1 >= 5) {
             const failedField = attemptField.replace('Attempts', 'Failed');
             await Task.updateOne({ _id: task._id }, { $inc: updateFields.$inc, $set: { [failedField]: true } });
          } else {
             await Task.updateOne({ _id: task._id }, { $inc: updateFields.$inc });
          }
        } else if (!allFailed) {
          await Task.updateOne({ _id: task._id }, updateFields);
          if (payload.title.includes('Time to start')) remindersSent++;
          else nudgesSent++;
        }
      }
    }

    console.log(`[Reminders Cron] Completed. Tasks matched: ${incompleteTasks.length}, Reminders sent: ${remindersSent}, Nudges sent: ${nudgesSent}, Failed: ${failed}`);

    return NextResponse.json({
      success: true,
      serverTimeUTC: now.toISOString(),
      istTime: istTimeStr,
      tasksMatched: incompleteTasks.length,
      remindersSent,
      nudgesSent,
      failed
    });
  } catch (error) {
    console.error('Reminders cron error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
