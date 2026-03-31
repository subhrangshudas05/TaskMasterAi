import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { connectToDB } from "@/app/lib/mongoose";
import Marathon from '@/app/models/Marathon';

// --- POST: Save the new Marathon ---
export async function POST(req: Request) {
    try {
        // 1. Authenticate Session
        const session = await getServerSession();
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
        }

        await connectToDB();
        const body = await req.json();
        const { finalData, deadline } = body;

        // 2. Map the Gemini 'tasks' into our DB 'steps' format
        const formattedSteps = finalData.tasks.map((task: any) => ({
            day: task.day,
            title: task.title,
            detail: task.detail,
            estimatedMinutes: task.estimatedMinutes,
            isCompleted: false,
            completedAt: null
        }));

        // 3. Create the Database Record
        const newMarathon = await Marathon.create({
            userEmail: session.user.email,
            title: finalData.marathonTitle,
            deadline: deadline,
            steps: formattedSteps
        });

        return NextResponse.json({ success: true, marathonId: newMarathon._id });

    } catch (error: any) {
        console.error("DB Save Error:", error);
        return NextResponse.json({ error: 'Failed to save marathon' }, { status: 500 });
    }
}

// --- GET: Fetch Marathons for Dashboard ---
export async function GET(req: Request) {
    try {
        const session = await getServerSession();
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDB();

        // Fetch all marathons for this specific user, newest first
        const marathons = await Marathon.find({ userEmail: session.user.email })
            .sort({ createdAt: -1 });

        return NextResponse.json({ success: true, marathons });

    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to fetch marathons' }, { status: 500 });
    }
}