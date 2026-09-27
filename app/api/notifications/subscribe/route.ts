import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import PushSubscription from '@/app/models/PushSubscription';
import User from '@/app/models/User';
import { connectToDB } from '@/app/lib/mongoose';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDB();

    let userId = (session.user as any)?.id;
    if (!userId && session.user.email) {
      const dbUser = await User.findOne({ email: session.user.email });
      userId = dbUser?._id?.toString();
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint, keys } = await req.json();

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
    }

    // Upsert subscription
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId,
        endpoint,
        keys
      },
      { upsert: true, new: true }
    );

    // Update user permission
    await User.findByIdAndUpdate(userId, { notificationPermission: 'granted' });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDB();

    let userId = (session.user as any)?.id;
    if (!userId && session.user.email) {
      const dbUser = await User.findOne({ email: session.user.email });
      userId = dbUser?._id?.toString();
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const endpoint = body?.endpoint;
    const deleteAll = body?.all === true || !endpoint;

    if (deleteAll) {
      // Clear all subscriptions for this user across devices
      await PushSubscription.deleteMany({ userId });
    } else {
      await PushSubscription.deleteOne({ endpoint, userId });
    }

    // Reset user preference so background cron jobs won't notify
    await User.findByIdAndUpdate(userId, { notificationPermission: 'default' });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
