import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { connectToDB } from '@/app/lib/mongoose';
import Marathon from '@/app/models/Marathon';
import Task from '@/app/models/Task';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession();
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDB();

        // Await the params safely based on Next.js 15 standards
        const { id } = await params;
        const { day, isCompleted } = await req.json();

        // 1. Find the Marathon
        const marathon = await Marathon.findOne({ _id: id, userEmail: session.user.email });
        if (!marathon) {
            return NextResponse.json({ error: 'Marathon not found' }, { status: 404 });
        }

        // 2. Find the exact step by its Day number
        const stepIndex = marathon.steps.findIndex((s: any) => s.day === day);
        if (stepIndex === -1) {
            return NextResponse.json({ error: 'Step not found' }, { status: 404 });
        }

        const targetStep = marathon.steps[stepIndex];

        // 3. Update the step's completion status & timestamp
        marathon.steps[stepIndex].isCompleted = isCompleted;
        marathon.steps[stepIndex].completedAt = isCompleted ? new Date() : null;

        // 4. Auto-update overall marathon status
        const isAllDone = marathon.steps.every((s: any) => s.isCompleted);
        marathon.status = isAllDone ? 'completed' : 'active';

        // Save the updated marathon
        await marathon.save();

        const updatedTask = await Task.findOneAndUpdate(
            {
                userEmail: session.user.email,
                type: 'MARATHON',
                // Match the step title EXACTLY
                title: targetStep.title,
                // FALLBACK: Look for the new ID system, or fallback to the old Name system
                $or: [
                    { marathonId: marathon._id.toString() }, // Ensure it's a string!
                    { marathonId: marathon._id },            // Just in case it's stored as an ObjectId
                    { marathonName: marathon.title }         // The fallback for older tasks
                ]
            },
            {
                $set: { isCompleted: isCompleted }
            },
            { returnDocument: 'after' }
        );

        if (updatedTask) {
            console.log(`✅ Success: Synced Task '${updatedTask.title}' to isCompleted: ${isCompleted}`);
        } else {
            console.log("❌ Target task NOT found on Today's list (Normal if step is not scheduled for today).");
        }

        return NextResponse.json(marathon, { status: 200 });

    } catch (error) {
        console.error("Marathon Toggle Error:", error);
        return NextResponse.json({ error: 'Failed to toggle step' }, { status: 500 });
    }
}