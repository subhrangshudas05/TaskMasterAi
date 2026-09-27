import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
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

    const { permission } = await req.json();
    if (!permission) {
      return NextResponse.json({ error: 'Permission required' }, { status: 400 });
    }

    await User.findByIdAndUpdate(userId, { notificationPermission: permission });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Permission update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
