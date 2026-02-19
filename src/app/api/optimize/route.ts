import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: Request) {
  try {
    const { resumeData } = await request.json();

    if (!resumeData) {
      return NextResponse.json({ error: "No resume data provided" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        // Slightly higher temperature for creative phrasing, but low enough for strict JSON
        temperature: 0.4, 
      },
    });

    const prompt = `
You are a professional recruiter and resume consultant specializing in early-career and technical candidates. Your goal is to help me create a strong, one-page, ATS-optimized resume that feels authentic, confident, and human — not AI-written.

I am providing my current resume data in JSON format.
Perform PHASE 1 (Resume Shortening) and PHASE 2 (ATS Optimization) based on these rules:

PHASE 1 — Resume Shortening
- Identify redundant sections, repetitive lines, or long-winded phrasing.
- Suggest specific edits to fit neatly on one page while preserving meaning and value.
- Preserve my voice, tone, and achievements.

PHASE 2 — ATS Optimization
- Detect issues with ATS readability, formatting, or weak keywords.
- Suggest subtle rewrites to improve keyword hits without losing authenticity.
- Quantify achievements where obvious, or suggest tightening weak verbs.

RULES
- Never use AI-like phrases ("as an AI", "in conclusion", "optimized synergy").
- Keep all language human and natural.
- Do not invent experience — only reframe what is true from the provided data.
- Return ONLY a strict JSON object matching the required structure.

REQUIRED JSON OUTPUT STRUCTURE:
{
  "generalFeedback": {
    "summary": "String: A concise summary of what needs to change across the resume and why.",
    "strengths": ["Array of Strings: List of ✅ Strengths"],
    "fixes": ["Array of Strings: List of ⚠️ Fixes Needed"]
  },
  "suggestedRewrites": [
    {
      "section": "String: exact section key (e.g., 'experience', 'projects', 'summary')",
      "itemId": "String: the exact 'id' from the provided JSON item (leave empty if it's the main summary)",
      "field": "String: the specific field to change (e.g., 'description', 'content', 'headline')",
      "oldText": "String: the original text from the resume",
      "newText": "String: your suggested improved text",
      "reasoning": "String: brief explanation of why this change improves ATS or shortens the resume"
    }
  ]
}

CURRENT RESUME DATA:
${JSON.stringify(resumeData, null, 2)}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    if (!responseText) {
      throw new Error("Empty response from Gemini");
    }

    const parsedResponse = JSON.parse(responseText);
    return NextResponse.json(parsedResponse, { status: 200 });

  } catch (error) {
    console.error("Optimization error:", error);
    return NextResponse.json(
      { error: "Failed to generate optimizations." },
      { status: 500 }
    );
  }
}