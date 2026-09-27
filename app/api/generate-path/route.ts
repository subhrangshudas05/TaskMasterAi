// app/api/generate-path/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, SchemaType, Schema } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
    try {
        const { formData } = await req.json();
        const signal = req.signal; // Catch the abort signal

        if (signal.aborted) throw new Error('AbortError');

        console.log("inside the api working FORM DATA:", formData);

        const marathonSchema: Schema = {
            type: SchemaType.OBJECT,
            properties: {
                marathonTitle: {
                    type: SchemaType.STRING,
                    description: "A catchy, motivating 3-5 word title for this goal"
                },
                tasks: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            id: { type: SchemaType.STRING, description: "A unique string id like task-1" },
                            day: { type: SchemaType.INTEGER, description: "The chronological day number" },
                            title: { type: SchemaType.STRING, description: "Short actionable title" },
                            detail: { type: SchemaType.STRING, description: "1-2 sentences of specific instructions" },
                            estimatedMinutes: { type: SchemaType.INTEGER, description: "Must be less than or equal to daily capacity" }
                        },
                        required: ["id", "day", "title", "detail", "estimatedMinutes"]
                    }
                }
            },
            required: ["marathonTitle", "tasks"]
        };

        // 1. Extract shared config so both models use the EXACT same brain
        const sharedModelConfig = {
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: marathonSchema,
            },
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ],
            systemInstruction: `You are an elite productivity coach and curriculum designer for people with ADHD. 
      Your job is to break down massive goals into highly actionable, practical, learning-based daily tasks.
      CRITICAL RULES:
      1. Always return valid JSON matching the exact schema requested.
      2. Tasks MUST fit within the user's "dailyMinutes" capacity.
      3. Focus on practical action (e.g., "Write 10 lines of code", "Read 1 chapter") over vague concepts.
      4. Spread the tasks logically across the user's deadline.
      5. STRICTLY ONE TASK PER DAY. Do not ever repeat a "day" number in the tasks array.`
        };

        const prompt = `
      Analyze this goal and create a high-impact marathon plan:
      - Goal: ${formData.destination}
      - Deadline: ${formData.deadline}
      - Daily Capacity: ${formData.dailyMinutes} minutes
      - Current Level: ${formData.level}
      - Extra Context: ${formData.additionalInfo || "None"}

      Remember: Exactly one task per day. If the goal is too big, provide a "Simplified Version" that fits this timeframe.
    `;

        const requestContents = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
        let responseText = "";

        // 2. The Fallback Logic
        try {
            // TRY 1: Primary Model
            const primaryModel = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                ...sharedModelConfig
            });
            
            const result = await primaryModel.generateContent(requestContents, { signal });
            responseText = result.response.text();

        } catch (primaryError: any) {
            // If the user manually aborted, DO NOT retry. Just throw it to the main catch block.
            if (primaryError.name === 'AbortError' || primaryError.message === 'AbortError') {
                throw primaryError;
            }

            // Log the error and announce the 2nd try
            console.log(`⚠️ Gemini 2.5 Flash failed: ${primaryError.message}`);
            console.log("🔄 Initiating Fallback 2nd Try using gemini-2.5-flash-lite...");

            // TRY 2: Lite Model
            const fallbackModel = genAI.getGenerativeModel({
                model: "gemini-2.5-flash-lite",
                ...sharedModelConfig
            });

            // If this one fails, it will skip to the main catch block at the bottom
            const fallbackResult = await fallbackModel.generateContent(requestContents, { signal });
            responseText = fallbackResult.response.text();
        }

        // 3. Parse and Return Success
        const parsedData = JSON.parse(responseText);
        return NextResponse.json({ success: true, data: parsedData });

    } catch (error: any) {
        // Main Error Handler (catches aborts, JSON parsing errors, or if BOTH models fail)
        if (error.name === 'AbortError' || error.message === 'AbortError') {
            console.log('API call aborted by client.');
            return NextResponse.json({ success: false, error: 'Aborted by user' }, { status: 499 });
        }
        
        console.error('Gemini API Error (Both attempts failed):', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}