import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, Schema } from "@google/generative-ai";
import { getServerSession } from 'next-auth/next';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { text } = await req.json();
        if (!text || !text.trim()) {
            return NextResponse.json({ error: 'No text provided' }, { status: 400 });
        }

        const responseSchema: Schema = {
            type: SchemaType.ARRAY,
            description: "List of extracted tasks with optional time slots",
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    title: {
                        type: SchemaType.STRING,
                        description: "Actionable, simple, and concise title of the task in English. Split compound tasks (e.g. 'buy eggs and call dad' -> 'Buy eggs', 'Call dad')"
                    },
                    time: {
                        type: SchemaType.STRING,
                        description: "Time in 24-hour HH:MM format. Return null if no specific time or period is mentioned. Set default times: Morning -> '08:00', Afternoon -> '14:00', Evening -> '18:00', Night -> '21:00'.",
                        nullable: true
                    }
                },
                required: ["title"]
            }
        };

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.1 // Low temperature for factual extraction
            },
            systemInstruction: `You are an elite productivity assistant. Your only job is to extract separate, actionable tasks from the user's text input.
Rules:
1. Return ONLY valid JSON matching the requested schema. Never include markdown wrappers like \`\`\`json.
2. Split combined tasks into separate tasks.
3. Remove unnecessary words. Convert natural language into concise, professional task titles.
4. Ignore conversational filler or explanations.
5. Assign default times based on time periods mentioned: Morning -> "08:00", Afternoon -> "14:00", Evening -> "18:00", Night -> "21:00". If no time is mentioned, set "time" to null.
6. Ignore date references like "tomorrow", "next week", "Friday", "yesterday". All tasks are considered for today.`
        });

        const result = await model.generateContent(`Extract tasks from this user text: "${text}"`);
        const responseText = result.response.text();
        
        try {
            const extractedTasks = JSON.parse(responseText);
            return NextResponse.json(extractedTasks, { status: 200 });
        } catch (parseError) {
            console.error("Failed to parse Gemini response as JSON:", responseText, parseError);
            return NextResponse.json({ error: "Couldn't understand your request. Please edit your text and try again." }, { status: 422 });
        }

    } catch (err: any) {
        console.error("Gemini task extraction error:", err);
        return NextResponse.json({ error: err.message || "Failed to extract tasks" }, { status: 500 });
    }
}
