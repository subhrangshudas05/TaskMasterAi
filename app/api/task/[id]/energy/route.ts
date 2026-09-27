import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, SchemaType, Schema } from "@google/generative-ai";

import Task from '@/app/models/Task';
import { connectToDB } from '@/app/lib/mongoose';


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);


type Params = Promise<{ id: string }>;

export async function PATCH(req: Request, { params }: { params: Params }) {
    try {
        // 1. Security Check
        const session = await getServerSession();
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // 2. Parse the request (you can pass the abort signal from the frontend if needed)
        const body = await req.json();
        const { title, detail } = body;
        const signal = req.signal;

        await connectToDB();

        // 3. Define the strict JSON Schema for Energy Level
        const energySchema: Schema = {
            type: SchemaType.OBJECT,
            properties: {
                energyLevel: {
                    type: SchemaType.STRING,
                    format: "enum",
                    enum: ["HIGH", "MEDIUM", "LOW"],
                    description: "The calculated mental energy level required for the task."
                }
            },
            required: ["energyLevel"]
        };

        // 4. Initialize the Bulletproof Model
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: energySchema,
            },
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ],
            systemInstruction: `You are a productivity AI that categorizes the mental energy required for tasks.
            CRITICAL RULES:
            1. Always return valid JSON matching the exact schema requested.
            2. HIGH: Deep work, coding, complex problem-solving, learning hard concepts, intense focus.
            3. MEDIUM: Routine execution, moderate focus, standard chores, organized study.
            4. LOW: Administrative work, easy tasks, passive reading, simple emails.`
        });

        // 5. Build context and call the API
        const taskContext = detail ? `Task: ${title} | Details: ${detail}` : `Task: ${title}`;
        const prompt = `Classify the mental energy for this task context:\n${taskContext}`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }, { signal });

        // 6. Parse the guaranteed JSON
        const responseText = result.response.text();
        const parsedData = JSON.parse(responseText);
        // parsedData looks exactly like: { "energyLevel": "HIGH" }

        // 7. Update the task in the database (ensuring ownership)
        const updatedTask = await Task.findOneAndUpdate(
            { _id: id, userEmail: session.user.email },
            { $set: { energyLevel: parsedData.energyLevel } },
            { returnDocument: 'after' }
        );

        if (!updatedTask) {
            return NextResponse.json({ error: 'Task not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: updatedTask }, { status: 200 });

    } catch (error: any) {
        if (error.name === 'AbortError' || error.message === 'AbortError') {
            console.log('Energy check aborted by client.');
            return NextResponse.json({ success: false, error: 'Aborted by user' }, { status: 499 });
        }
        console.error('Gemini Energy Check Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}