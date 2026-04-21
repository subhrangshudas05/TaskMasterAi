// app/api/generate-path/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, SchemaType, Schema } from "@google/generative-ai";


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
    try {
        const { formData } = await req.json();
        const signal = req.signal; // 1. Catch the abort signal

        if (signal.aborted) throw new Error('AbortError');

        console.log("inside the api wprking FORM DATA:", formData);

        // Add ": Schema" right here, and remove "as const" from the end!
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

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            // Force JSON output
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: marathonSchema, // <--- THIS IS THE MAGIC LINE
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
      
        });

        const prompt = `
      Analyze this goal and create a high-impact marathon plan:
      - Goal: ${formData.destination}
      - Deadline: ${formData.deadline}
      - Daily Capacity: ${formData.dailyMinutes} minutes
      - Current Level: ${formData.level}
      - Extra Context: ${formData.additionalInfo || "None"}

      Remember: Exactly one task per day. If the goal is too big, provide a "Simplified Version" that fits this timeframe.
    `;

        // 2. Pass the signal to the Gemini SDK
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }, { signal });

        const responseText = result.response.text();
        const parsedData = JSON.parse(responseText);

        return NextResponse.json({ success: true, data: parsedData });

    } catch (error: any) {
        if (error.name === 'AbortError' || error.message === 'AbortError') {
            console.log('API call aborted by client.');
            return NextResponse.json({ success: false, error: 'Aborted by user' }, { status: 499 });
        }
        console.error('Gemini API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}




// Return ONLY a JSON object with this exact structure:
//       {
//         "marathonTitle": "A catchy, motivating 3-5 word title for this goal",
//         "tasks": [
//           {
//             "id": "task-1",
//             "day": 1,
//             "title": "Short actionable title",
//             "detail": "1-2 sentences of specific instructions or practical learning steps",
//             "estimatedMinutes": (Must be <= daily capacity)
//           }
//         ]
//       }