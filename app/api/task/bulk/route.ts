import { NextResponse } from 'next/server';
import { connectToDB } from '@/app/lib/mongoose';
import Task from '@/app/models/Task';
import { getServerSession } from 'next-auth/next';

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userEmail = session.user.email;

        const { tasks } = await req.json();
        if (!Array.isArray(tasks) || tasks.length === 0) {
            return NextResponse.json({ error: 'No tasks provided' }, { status: 400 });
        }

        await connectToDB();

        // Map and validate each task
        const tasksToInsert = tasks.map(task => {
            if (!task.title || !task.title.trim()) {
                throw new Error('Task title is required');
            }
            return {
                userEmail,
                title: task.title.trim(),
                type: 'REGULAR',
                category: task.category || 'No Category',
                isCompleted: false,
                date: new Date(task.date || new Date()), // Parse target date
                timeSlot: task.timeSlot || 'Anytime'
            };
        });

        // Insert all tasks in bulk
        const createdTasks = await Task.insertMany(tasksToInsert);

        return NextResponse.json(createdTasks, { status: 201 });

    } catch (error: any) {
        console.error('Bulk save error:', error);
        return NextResponse.json({ error: error.message || 'Failed to save tasks' }, { status: 500 });
    }
}
