import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import PDFParser from "pdf2json";

// 🔧 Type definitions for PDFParser data structure
interface PDFTextObject {
  T: string;
}

interface PDFTextLine {
  R: PDFTextObject[];
}

interface PDFPage {
  Texts: PDFTextLine[];
}

interface PDFData {
  Pages: PDFPage[];
}

export const runtime = "nodejs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// 🔧 Utility: Inject UUIDs into array sections
function injectUUIDs(data: any) {
  const arraySections = [
    "experience",
    "education",
    "projects",
    "skills",
    "languages",
    "interests",
    "awards",
    "certifications",
    "publications",
    "volunteer",
    "references",
  ];

  arraySections.forEach((section) => {
    if (Array.isArray(data[section])) {
      data[section] = data[section].map((item: any) => {
        // Strip out the empty "id" from Gemini so it doesn't overwrite our UUID
        const { id, ...rest } = item; 
        return {
          id: crypto.randomUUID(),
          ...rest,
        };
      });
    }
  });

  return data;
}

// 🔥 Safe PDF text extraction using pdf2json
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser();

    parser.on("pdfParser_dataError", (err: any) => reject(err.parserError));
    parser.on("pdfParser_dataReady", () => {
      let rawText = "";

      // ✅ Safe: check if parser.data exists before accessing
      if (parser.data && (parser.data as PDFData).Pages) {
        (parser.data as PDFData).Pages.forEach((page: PDFPage) => {
          page.Texts.forEach((textObj: PDFTextLine) => {
            textObj.R.forEach((t: PDFTextObject) => {
              // ✅ Safe: skip decodeURIComponent
              rawText += t.T + " ";
            });
          });
          rawText += "\n\n";
        });
      }

      // Optional: normalize whitespace for AI parsing
      const cleanedText = rawText.replace(/\s+/g, " ").replace(/\n\s+/g, "\n").trim();
      resolve(cleanedText);
    });

    parser.parseBuffer(buffer);
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 🔥 Extract PDF text safely
    const rawText = await extractTextFromPDF(buffer);

    if (!rawText) {
      return NextResponse.json({ error: "Failed to extract text from PDF" }, { status: 400 });
    }

    // 🔹 Prepare Gemini AI
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const prompt = `
You are an expert resume data extractor.

Convert the raw resume text into JSON matching this structure.
DO NOT invent data.
If missing, use empty string or empty array.
Leave all "id" fields empty — they will be generated server-side.

Required Structure:
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

Raw Resume Text:
${rawText}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    if (!responseText) {
      return NextResponse.json({ error: "Gemini returned empty response" }, { status: 500 });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (err) {
      console.error("Invalid JSON from Gemini:", responseText);
      return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 500 });
    }

    // 🔥 Inject real UUIDs
    const finalData = injectUUIDs(parsedData);

    return NextResponse.json(finalData, { status: 200 });
  } catch (error) {
    console.error("Resume parsing error:", error);
    return NextResponse.json({ error: "Failed to parse resume" }, { status: 500 });
  }
}
