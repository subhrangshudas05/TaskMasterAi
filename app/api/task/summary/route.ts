import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { connectToDB } from '@/app/lib/mongoose';
import Task from '@/app/models/Task';

export async function GET() {
    try {
        const session = await getServerSession();
        if (!session || !session.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await connectToDB();

        // Get the date 14 days ago, and the start of Today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const fourteenDaysAgo = new Date(today);
        fourteenDaysAgo.setDate(today.getDate() - 28);

        // Fetch ONLY the dates of incomplete REGULAR tasks in the past 14 days
        const pendingTasks = await Task.find({
            userEmail: session.user.email,
            isCompleted: false,
            type: 'REGULAR',
            date: { $gte: fourteenDaysAgo, $lt: today }
        }).select('date -_id'); // Super fast: only grab the date field

        // Extract and format unique dates (YYYY-MM-DD)
        const pendingDates = new Set(
            pendingTasks.map(t => {
                const d = new Date(t.date);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            })
        );

        // Returns an array like: ["2026-04-10", "2026-04-12"]
        return NextResponse.json(Array.from(pendingDates), { status: 200 });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
    }
}