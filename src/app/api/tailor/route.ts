import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: Request) {
  try {
    const { resumeData, jobDescription } = await request.json();

    if (!resumeData || !jobDescription) {
      return NextResponse.json({ error: "Missing data or JD" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
    });

    const prompt = `
You are a professional recruiter and resume consultant. 

I am providing my current resume data in JSON format AND a Job Description.
Perform PHASE 3 (Tailor to Job) and PHASE 4 (Enhancement Pass).

PHASE 3 — Tailor to Job
- Analyze the role, tone, and key requirements from the JD.
- Map them to my resume's skills and experience.
- Suggest targeted edits to align my CV with the job naturally.
- DO NOT invent experience — only reframe what is true.

PHASE 4 — Enhancement Pass
- Tighten weak verbs into action-focused language.
- Quantify achievements where possible.
- Remove fluff words.

CRITICAL FORMATTING RULE:
For any 'description' field in 'experience', 'projects', or 'education', you MUST format the 'newText' as a newline-separated list using bullet points (e.g., "- Achieved X by doing Y\\n- Managed Z...").

REQUIRED JSON OUTPUT:
{
  "matchStrategy": {
    "priorities": ["Array of Strings: Key Hiring Priorities from JD"],
    "emphasis": "String: Brief strategy on what aspects of the resume to emphasize"
  },
  "suggestedRewrites": [
    {
      "section": "String: exact section key",
      "itemId": "String: the exact 'id' from the provided JSON item",
      "field": "String: the specific field to change (e.g., 'description')",
      "oldText": "String: the original text",
      "newText": "String: your suggested tailored text (use bullet points with '-' for descriptions)",
      "reasoning": "String: brief explanation of why this aligns with the JD"
    }
  ]
}

JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME DATA:
${JSON.stringify(resumeData, null, 2)}
`;

    const result = await model.generateContent(prompt);
    const parsedResponse = JSON.parse(result.response.text());
    return NextResponse.json(parsedResponse, { status: 200 });

  } catch (error) {
    console.error("Tailoring error:", error);
    return NextResponse.json({ error: "Failed to tailor resume." }, { status: 500 });
  }
}