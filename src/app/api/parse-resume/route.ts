import { NextResponse } from "next/server";
import OpenAI from "openai";
import PDFParser from "pdf2json";

export const runtime = "nodejs";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// --- BULLETPROOF JSON EXTRACTOR ---
function extractJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      return JSON.parse(match[1]);
    }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      return JSON.parse(text.substring(start, end + 1));
    }
    throw new Error("Could not extract valid JSON from AI response");
  }
}

// 🔧 Inject UUIDs
function injectUUIDs(data: any) {
  const arraySections = ["experience", "education", "projects", "skills", "languages", "interests", "awards", "certifications", "publications", "volunteer", "references"];
  arraySections.forEach((section) => {
    if (Array.isArray(data[section])) {
      data[section] = data[section].map((item: any) => {
        const { id, ...rest } = item;
        return { id: crypto.randomUUID(), ...rest };
      });
    }
  });
  return data;
}

// 🛡️ SAFE DECODE UTILITY
// Prevents malformed PDF character sequences from crashing the server
function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch (e) {
    try {
      // Fallback for older URI encoding
      return unescape(text); 
    } catch (e2) {
      // If all else fails, return the raw text instead of crashing
      return text; 
    }
  }
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser();
    
    parser.on("pdfParser_dataError", (err: any) => reject(err.parserError));
    
    parser.on("pdfParser_dataReady", () => {
      let rawText = "";
      if (parser.data && (parser.data as any).Pages) {
        (parser.data as any).Pages.forEach((page: any) => {
          page.Texts.forEach((textObj: any) => {
            textObj.R.forEach((t: any) => { 
              // 🔥 Apply the safe wrapper here
              rawText += safeDecode(t.T) + " "; 
            });
          });
          rawText += "\n\n";
        });
      }
      resolve(rawText.trim());
    });
    
    parser.parseBuffer(buffer);
  });
}

async function fetchWithFallback(prompt: string) {
  // A list of the best free JSON-capable models on OpenRouter
  const fallbackModels = [
    "qwen/qwen3-vl-30b-a3b-thinking",
    "qwen/qwen3-vl-235b-a22b-thinking",
    "qwen/qwen3-235b-a22b-thinking-2507"
  ];

  for (const modelName of fallbackModels) {
    try {
      console.log(`Attempting parse with ${modelName}...`);
      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });
      return completion; // Success!
    } catch (error: any) {
      // If it's a 429 (Rate Limit) or 529 (Overloaded), log it and loop to the next model
      if (error?.status === 429 || error?.status === 529 || error?.status === 502) {
        console.warn(`[429/Overload] ${modelName} is busy. Falling back to next model...`);
        continue;
      }
      // If it's a different error (like a bad API key), throw it immediately
      throw error;
    }
  }
  throw new Error("All free models are currently overloaded. Please try again later.");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await extractTextFromPDF(buffer);

    if (!rawText.trim()) return NextResponse.json({ error: "Failed to extract text from PDF" }, { status: 400 });

    const prompt = `
You are an expert resume data extractor. Convert the raw resume text into JSON matching this structure. DO NOT invent data. Leave "id" fields empty.
REQUIRED STRUCTURE:
{
  "personalInfo": { "fullName": "", "headline": "", "email": "", "phone": "", "location": "", "website": "" },
  "summary": { "content": "" },
  "profiles": [ { "network": "", "username": "", "website": "" } ],
  "experience": [ { "id": "", "company": "", "position": "", "location": "", "startDate": "", "endDate": "", "description": "", "website": "" } ],
  "education": [ { "id": "", "school": "", "degree": "", "studyArea": "", "grade": "", "location": "", "startDate": "", "endDate": "", "website": "", "description": "" } ],
  "projects": [ { "id": "", "name": "", "startDate": "", "endDate": "", "website": "", "description": "" } ],
  "skills": [ { "id": "", "name": "", "proficiency": "", "keywords": [] } ],
  "languages": [ { "id": "", "language": "", "fluency": "" } ],
  "interests": [ { "id": "", "name": "", "keywords": [] } ],
  "awards": [ { "id": "", "title": "", "awarder": "", "date": "", "website": "", "description": "" } ],
  "certifications": [ { "id": "", "title": "", "issuer": "", "date": "", "website": "", "description": "" } ],
  "publications": [ { "id": "", "title": "", "publisher": "", "date": "", "website": "", "description": "" } ],
  "volunteer": [ { "id": "", "organization": "", "location": "", "startDate": "", "endDate": "", "website": "", "description": "" } ],
  "references": [ { "id": "", "name": "", "position": "", "phone": "", "website": "", "description": "" } ]
}
RAW TEXT:
${rawText}
    `;

    // Use our new resilient fetcher
    const completion = await fetchWithFallback(prompt);

    const responseText = completion.choices[0]?.message?.content || "";
    const parsedData = extractJSON(responseText);
    const finalData = injectUUIDs(parsedData);

    return NextResponse.json(finalData, { status: 200 });
  } catch (error: any) {
    console.error("Resume parsing error:", error?.message || error);
    return NextResponse.json({ error: error?.message || "Failed to parse resume" }, { status: 500 });
  }
}