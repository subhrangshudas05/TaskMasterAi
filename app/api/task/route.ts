
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { connectToDB } from '@/app/lib/mongoose';
import Task from '@/app/models/Task';
import { getServerSession } from 'next-auth/next';
import { getISTDayBoundaries, isDateTodayInIST } from '@/app/lib/IstTime';
import Marathon, { IMarathon } from '@/app/models/Marathon';


// GET: Fetch all tasks for a specific user
export async function GET(req: Request) {
    try {
        const session = await getServerSession();
        if (!session || !session.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userEmail = session.user.email;

        await connectToDB();

        // 1. Extract the Date from the URL (e.g., ?date=2026-04-03)
        const { searchParams } = new URL(req.url);
        let queryDate = searchParams.get('date');

        if (!queryDate) {
            // 'en-CA' safely outputs the format YYYY-MM-DD
            queryDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
        }

        // 2. Get boundaries for that specific date
        const { startOfDay, endOfDay } = getISTDayBoundaries(queryDate);

        // 3. The Security Check: Is this actually Today?
        const isToday = isDateTodayInIST(queryDate);

        const targetDateIsPast = !isToday && new Date(startOfDay) < new Date();
        
        if (targetDateIsPast) {
            await Task.deleteMany({
                userEmail,
                date: { $gte: startOfDay, $lte: endOfDay },
                type: 'MARATHON',
                isCompleted: false // Only delete the ones they didn't do!
            });
        }
        

        // 4. ONLY run Marathon Upsert if the user is looking at TODAY
        if (isToday) {
            const activeMarathons = await Marathon.find({ userEmail, status: 'active' });

            const upsertPromises = activeMarathons.map(async (marathon: IMarathon) => {

                const stepCompletedToday = marathon.steps.some((step: any) => {
                    if (!step.completedAt) return false;
                    const compDate = new Date(step.completedAt);
                    return compDate >= startOfDay && compDate <= endOfDay;
                });

                if (stepCompletedToday) {
                    return null; // Stop! They did their step for today. Don't inject the next one.
                }

                const nextStep = marathon.steps.find((step: any) => !step.isCompleted);
                if (!nextStep) return null;

                return Task.findOneAndUpdate(
                    {
                        userEmail,
                        marathonId: marathon._id,
                        stepId: nextStep._id,
                        date: { $gte: startOfDay, $lte: endOfDay }
                    },
                    {
                        $setOnInsert: {
                            title: nextStep.title,
                            type: 'MARATHON',
                            energyLevel: 'UNASSIGNED',
                            category: marathon.category || 'Personal',
                            date: new Date(),
                            stepId: nextStep._id,
                            marathonName: marathon.title,
                            detail: nextStep.detail
                        }
                    },
                    { upsert: true, returnDocument: 'after' }
                );
            });
            await Promise.all(upsertPromises);
        }

        // 5. Fetch tasks for the requested date (Works for past, present, and future)
        const requestedTasks = await Task.find({
            userEmail,
            date: { $gte: startOfDay, $lte: endOfDay }
        }).sort({ createdAt: -1 });

        return NextResponse.json(requestedTasks, { status: 200 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch tasks for date' }, { status: 500 });
    }
}


export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDB();
        const body = await req.json();

        const newTask = await Task.create({
            ...body, // Spreads title, category, type, etc.
            userEmail: session.user.email,
            date: body.date ? new Date(body.date) : new Date(),
            
        });

        return NextResponse.json(newTask, { status: 201 });

    } catch (error) {
        console.error("Task Creation Error:", error);
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }
}


