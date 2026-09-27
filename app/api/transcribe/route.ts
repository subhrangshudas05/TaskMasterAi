import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            console.error('GROQ_API_KEY environment variable is not defined.');
            return NextResponse.json(
                { error: 'Speech-to-text API is not configured on the server. Please add GROQ_API_KEY.' },
                { status: 500 }
            );
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;
        if (!file) {
            return NextResponse.json({ error: 'No audio file provided in the request.' }, { status: 400 });
        }

        // Create a new FormData object to forward to Groq Whisper API
        const groqFormData = new FormData();
        groqFormData.append('file', file);
        groqFormData.append('model', 'whisper-large-v3');
        groqFormData.append('response_format', 'json');
        groqFormData.append('language', 'en');

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
            body: groqFormData,
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Groq Whisper API returned an error status:', response.status, errText);
            return NextResponse.json(
                { error: `Groq Speech-to-Text service error: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json({ text: data.text || '' }, { status: 200 });

    } catch (err: any) {
        console.error('Error during audio transcription:', err);
        return NextResponse.json(
            { error: err.message || 'An internal error occurred during transcription.' },
            { status: 500 }
        );
    }
}
