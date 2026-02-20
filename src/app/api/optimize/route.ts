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
  // Your selected Qwen lineup
  const fallbackModels = [
    "qwen/qwen3-vl-30b-a3b-thinking",
    "qwen/qwen3-vl-235b-a22b-thinking",
    "qwen/qwen3-235b-a22b-thinking-2507"
  ];

  for (const modelName of fallbackModels) {
    try {
      console.log(`Attempting optimize with ${modelName}...`);
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
    const { resumeData } = await request.json();
    if (!resumeData) return NextResponse.json({ error: "No resume data" }, { status: 400 });

    const prompt = `
You are a top-tier executive recruiter and technical resume consultant. Your goal is to help me create a strong, ATS-optimized resume that feels authentic, impactful, and human.

I am providing my current resume data in JSON format.
Perform PHASE 1 (Resume Shortening) and PHASE 2 (ATS Optimization) based on these strict rules:

PHASE 1 — Resume Shortening & Impact
- Identify redundant sections, repetitive lines, or long-winded paragraphs.
- Suggest specific, aggressive edits to tighten phrasing while maximizing impact.
- Preserve my core voice and truth, but elevate the professional tone.

PHASE 2 — ATS Optimization & Power Verbs
- Detect issues with weak verbs (e.g., "helped with", "responsible for") and replace them with strong action verbs (e.g., "Architected", "Spearheaded", "Engineered").
- Suggest rewrites to naturally weave in stronger industry keywords.
- Where obvious context exists, suggest ways to quantify achievements (e.g., adding metrics, percentages, or scale).

STRICT RULES:
- Never use generic AI filler phrases ("synergy", "spearheaded a paradigm shift", "as an AI").
- Do not invent experience or fake metrics — only reframe and elevate what is already true.
- If a section is actively harming the resume, suggest "REMOVE_ITEM" as the newText.
- Return ONLY a strict JSON object matching the required structure below.
- ESCAPE all internal double quotes inside your string values using a backslash (\").
- Do NOT output trailing commas at the end of JSON arrays or objects.

REQUIRED JSON OUTPUT:
{
  "generalFeedback": {
    "summary": "String: A concise, blunt summary of what needs to change across the resume and why.",
    "strengths": ["Array of Strings: 2-3 ✅ Strengths of the current resume"],
    "fixes": ["Array of Strings: 2-3 ⚠️ Fixes needed (e.g., weak verbs, lack of metrics)"]
  },
  "suggestedRewrites": [
    {
      "section": "String: exact section key (e.g., 'experience', 'projects', 'summary')",
      "itemId": "String: the exact 'id' from the provided JSON item (leave empty for summary)",
      "field": "String: the specific field to change (e.g., 'description', 'content')",
      "oldText": "String: the original text from the resume",
      "newText": "String: your highly optimized suggested text",
      "reasoning": "String: brief explanation of why this change improves ATS or impact"
    }
  ]
}

CURRENT RESUME DATA:
${JSON.stringify(resumeData, null, 2)}
    `;

    const completion = await fetchWithFallback(prompt);
    const parsedResponse = extractJSON(completion.choices[0]?.message?.content || "");
    return NextResponse.json(parsedResponse, { status: 200 });

  } catch (error) {
    console.error("Optimization error:", error);
    return NextResponse.json({ error: "Failed to generate optimizations." }, { status: 500 });
  }
}