import { NextResponse } from "next/server";

export async function GET() {
  // Make sure this matches whatever you named your API key in your .env file
  const apiKey = process.env.GEMINI_API_KEY; 

  if (!apiKey) {
    return NextResponse.json({ error: "Missing API Key" }, { status: 400 });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}