import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Task from '@/app/models/Task';
import { connectToDB } from '@/app/lib/mongoose';
import { getServerSession } from 'next-auth/next';



// Type definition for Next.js async params
type Params = Promise<{ id: string }>;

// PATCH: Update a specific task
export async function PATCH(req: Request, { params }: { params: Params }) {
    try {
        const session = await getServerSession();
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
        }

        await connectToDB();

        // Await the promise to extract the ID safely
        const { id } = await params;

        const body = await req.json();
        const { ...updateData } = body;

        

        // Find by BOTH id and userEmail to ensure the user owns this task
        const updatedTask = await Task.findOneAndUpdate(
            { _id: id, userEmail: session.user.email },
            { $set: updateData },
            { returnDocument: 'after', runValidators: true }
        );

        if (!updatedTask) {
            return NextResponse.json({ error: 'Task not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json(updatedTask, { status: 200 });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }
}

// DELETE: Remove a specific task
export async function DELETE(req: Request, { params }: { params: Params }) {
    try {

        const session = await getServerSession();
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
        }

        await connectToDB();

        // Await the promise to extract the ID safely
        const { id } = await params;



        // Delete ONLY if the ID matches AND the userEmail matches
        const deletedTask = await Task.findOneAndDelete({
            _id: id,
            userEmail: session.user.email
        });

        if (!deletedTask) {
            return NextResponse.json({ error: 'Task not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Task deleted successfully' }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }
}