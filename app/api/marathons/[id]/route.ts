// app/api/marathons/[id]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { connectToDB } from "@/app/lib/mongoose";
import Marathon from '@/app/models/Marathon';
import { Mongoose } from 'mongoose';
import mongoose from 'mongoose';



export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession();
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDB();

        const { id: marathonId } = await params;

        // Fetch the specific marathon, ensuring it belongs to the logged-in user
        const marathon = await Marathon.findOne({
            _id: marathonId,
            userEmail: session.user.email
        });

        if (!marathon) {
            return NextResponse.json({ error: 'Marathon not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, marathon });

    } catch (error: any) {
        console.error("Fetch single marathon error:", error);
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
}

// --- DELETE: Trash the entire Marathon ---
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession();
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDB();

         const { id: marathonId } = await params;
        // 1. Find and delete in one step. 
        // SECURITY: We check BOTH the ID and the userEmail to ensure users can't delete other people's marathons!
        const deletedMarathon = await Marathon.findOneAndDelete({
            _id: marathonId,
            userEmail: session.user.email
        });

        if (!deletedMarathon) {
            return NextResponse.json({ error: 'Marathon not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Marathon deleted' });

    } catch (error: any) {
        console.error("Delete Error:", error);
        return NextResponse.json({ error: 'Failed to delete marathon' }, { status: 500 });
    }
}

// --- PATCH: Edit a specific task (or the marathon title) ---
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
        const body = await req.json();

        const { id: marathonId } = await params;

        // We use an "action" flag in the body to know WHAT we are editing
        const { action, day, status, newTitle, newDetail, isCompleted } = body;

        // Scenario A: The user is editing a specific daily task
        if (action === 'EDIT_TASK') {
            const updatedMarathon = await Marathon.findOneAndUpdate(
                {
                    _id: marathonId,
                    userEmail: session.user.email,
                    "steps.day": day // Find the exact step inside the array
                },
                {
                    // The '$' operator is Mongoose magic. It means "update the specific item in the array that we just matched above"
                    $set: {
                        "steps.$.isCompleted": isCompleted,
                        "steps.$.title": newTitle,
                        "steps.$.detail": newDetail
                    }
                },
                { new: true } // Return the updated document
            );

            if (!updatedMarathon) return NextResponse.json({ error: 'Not found' }, { status: 404 });
            return NextResponse.json({ success: true, marathon: updatedMarathon });
        }

        // Scenario B: The user is editing the main Marathon Title
        if (action === 'EDIT_TITLE') {
            const updatedMarathon = await Marathon.findOneAndUpdate(
                { _id: marathonId, userEmail: session.user.email },
                { $set: { title: newTitle, status: status } },
                { new: true }
            );
            return NextResponse.json({ success: true, marathon: updatedMarathon });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error("Patch Error:", error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}