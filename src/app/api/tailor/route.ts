import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

function extractJSON(text: string) {
  // 1. Strip out Qwen/DeepSeek <think> blocks entirely
  let cleanText = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  try { 
    return JSON.parse(cleanText); 
  } catch (e) {
    // 2. Try to find markdown JSON blocks
    const match = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      try { return JSON.parse(match[1]); } catch (e2) {} // Fall through if it fails
    }
    
    // 3. Last resort: Find the first { and last }
    const start = cleanText.indexOf('{');
    const end = cleanText.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      let jsonString = cleanText.substring(start, end + 1);
      
      // 🔧 AI Hallucination Fix: Remove illegal trailing commas right before brackets
      jsonString = jsonString.replace(/,\s*([\]}])/g, '$1');
      
      // 🔧 AI Hallucination Fix: Attempt to fix unescaped internal quotes (basic pass)
      // This is a complex regex that tries to escape quotes inside values, but leaves structural quotes alone.
      jsonString = jsonString.replace(/(?<=:\s*)"(.*?)"(?=\s*[,}])/g, (match, innerText) => {
        return '"' + innerText.replace(/"/g, '\\"') + '"';
      });

      return JSON.parse(jsonString);
    }
    throw new Error("Could not extract JSON");
  }
}

async function fetchWithFallback(prompt: string) {
  const fallbackModels = [
    "qwen/qwen3-vl-30b-a3b-thinking",
    "qwen/qwen3-vl-235b-a22b-thinking",
    "qwen/qwen3-235b-a22b-thinking-2507"
  ];

  for (const modelName of fallbackModels) {
    try {
      console.log(`Attempting tailor with ${modelName}...`);
      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });
      return completion; 
    } catch (error: any) {
      if (error?.status === 429 || error?.status === 529 || error?.status === 502) {
        console.warn(`[Overload] ${modelName} is busy. Trying next...`);
        continue;
      }
      throw error;
    }
  }
  throw new Error("All Qwen models are currently overloaded. Please try again later.");
}

export async function POST(request: Request) {
  try {
    const { resumeData, jobDescription } = await request.json();
    if (!resumeData || !jobDescription) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const prompt = `
You are an expert technical recruiter and ATS software algorithm. 

I am providing my current resume data in JSON format AND a target Job Description.
Your task is to perform PHASE 3 (Tailor to Job) and PHASE 4 (Enhancement Pass) to make my resume the perfect match for this specific role.

PHASE 3 — Tailor to Job
- Analyze the exact terminology, tone, and core requirements from the Job Description.
- Map those requirements directly to my existing skills and experience.
- Re-write my experience descriptions to heavily emphasize the skills the employer is asking for, naturally injecting their keywords.

PHASE 4 — Enhancement Pass
- Tighten all language. Remove fluff.
- Transform passive language into hard-hitting action verbs.

CRITICAL FORMATTING RULE:
For any 'description' field in 'experience', 'projects', or 'education', you MUST format the 'newText' as a newline-separated list using bullet points. 
Example:
- Engineered X using Y, resulting in Z.
- Managed...

STRICT RULES:
- DO NOT invent fake experience or skills I do not have.
- Output ONLY valid JSON. No markdown wrappers outside the JSON, no conversational text.
- ESCAPE all internal double quotes inside your string values using a backslash (\").
- Do NOT output trailing commas at the end of JSON arrays or objects.

REQUIRED JSON OUTPUT:
{
  "matchStrategy": {
    "priorities": ["Array of Strings: Top 3 technical or soft skill priorities from the JD"],
    "emphasis": "String: Brief strategy on what aspects of this specific resume to emphasize for this role"
  },
  "suggestedRewrites": [
    {
      "section": "String: exact section key",
      "itemId": "String: the exact 'id' from the provided JSON item",
      "field": "String: the specific field to change (e.g., 'description')",
      "oldText": "String: the original text",
      "newText": "String: your targeted, tailored text (MUST use bullet points with '-' for descriptions)",
      "reasoning": "String: brief explanation of why this aligns perfectly with the JD"
    }
  ]
}

JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME DATA:
${JSON.stringify(resumeData, null, 2)}
    `;

    const completion = await fetchWithFallback(prompt);
    const parsedResponse = extractJSON(completion.choices[0]?.message?.content || "");
    return NextResponse.json(parsedResponse, { status: 200 });

  } catch (error) {
    console.error("Tailoring error:", error);
    return NextResponse.json({ error: "Failed to tailor resume." }, { status: 500 });
  }
}