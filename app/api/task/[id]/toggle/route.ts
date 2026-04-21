import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { connectToDB } from '@/app/lib/mongoose';
import Task from '@/app/models/Task';
import Marathon from '@/app/models/Marathon';

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
        const { id } = await params;
        const body = await req.json();

        // 1. Fetch the exact task first (so we can check its type)
        const taskToUpdate = await Task.findOne({ _id: id, userEmail: session.user.email });
        
        if (!taskToUpdate) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // 2. Update the Task's completion status
        // We do this first because whether it's REGULAR or MARATHON, the task needs updating.
        if (typeof body.isCompleted === 'boolean') {
            taskToUpdate.isCompleted = body.isCompleted;
        }
        
        // (Apply any other updates like energyLevel if they exist in the body)
        if (body.energyLevel) taskToUpdate.energyLevel = body.energyLevel;

        await taskToUpdate.save();

        // 3. THE MAGIC: Two-Way Sync for Marathon Tasks
        if (taskToUpdate.type === 'MARATHON' && taskToUpdate.marathonId && typeof body.isCompleted === 'boolean') {
            
            // Find the parent Marathon using the ID, not the name!
            const parentMarathon = await Marathon.findOne({ 
                _id: taskToUpdate.marathonId, 
                userEmail: session.user.email 
            });

            if (parentMarathon) {
                // Find the exact step. 
                // Note: Since we didn't save step.day in the Task, we match by exact Title.
                const stepIndex = parentMarathon.steps.findIndex(
                    (step: any) => step.title === taskToUpdate.title
                );

                if (stepIndex !== -1) {
                    // Sync the boolean
                    parentMarathon.steps[stepIndex].isCompleted = body.isCompleted;
                    // Add/Remove the timestamp
                    parentMarathon.steps[stepIndex].completedAt = body.isCompleted ? new Date() : null;

                    // CHECK: Did completing this step finish the whole marathon?
                    const isAllDone = parentMarathon.steps.every((s: any) => s.isCompleted);
                    
                    // If they unchecked a box, revert to active. If all checked, mark completed.
                    parentMarathon.status = isAllDone ? 'completed' : 'active';

                    // Save the updated marathon back to the database
                    await parentMarathon.save();
                }
            }
        }

        return NextResponse.json(taskToUpdate, { status: 200 });

    } catch (error) {
        console.error("Task Update Error:", error);
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }
}