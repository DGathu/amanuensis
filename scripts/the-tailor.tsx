import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import OpenAI from "openai";
import TelegramBot from "node-telegram-bot-api";
import React from "react";
import { pdf } from "@react-pdf/renderer";
import ResumePDF from "../src/components/ResumePDF";
import CoverLetterPDF from "../src/components/CoverLetterPDF";

const openai = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, {
  polling: false,
});
const chatId = process.env.TELEGRAM_CHAT_ID!;

async function dispatchTailor() {
  console.log(
    `\n🧵 The Tailor is awake. Checking the Forge for pending quests...`,
  );

  try {
    const pendingJob = await prisma.jobApplication.findFirst({
      where: { status: "TAILORING" },
    });

    if (!pendingJob) {
      console.log(`📭 The Forge is empty. Returning to sleep.`);
      return;
    }

    console.log(
      `🔥 Igniting the 70B Forge for: ${pendingJob.role} at ${pendingJob.company}`,
    );
    await bot.sendMessage(
      chatId,
      `⚙️ *Forge Ignited:* Tailoring resume and drafting cover letter for ${pendingJob.company}...`,
      { parse_mode: "Markdown" },
    );

    const masterResume = await prisma.resume.findFirst({
      orderBy: { updatedAt: "desc" },
    });
    if (!masterResume) throw new Error("Master Resume missing!");

    console.log(`🧠 Consulting Llama 3.3 70B Versatile...`);
    const aiResponse = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      max_tokens: 6000,
      messages: [
        {
          role: "system",
          content: `You are an expert technical recruiter and ATS software algorithm.

You are an elite executive resume writer. Tailor the candidate's Master Resume to the provided Job Description.
Your task is to perform STEP 1 (Tailor to Job) and STEP 2 (Enhancement Pass) to make my resume the perfect match for this specific role.

STEP 1 — Tailor to Job
- Analyze the exact terminology, tone, and core requirements from the Job Description.
- Map those requirements directly to my existing skills and experience.
- Re-write my experience descriptions to heavily emphasize the skills the employer is asking for, naturally injecting their keywords.

STEP 2 — Enhancement Pass
- Tighten all language. Remove fluff.
- Transform passive language into hard-hitting action verbs.

CRITICAL FORMATTING RULE:
For any 'description' field in 'experience', 'projects', or 'education', you MUST format the 'newText' as a newline-separated list using bullet points.
Example:
- Engineered X using Y, resulting in Z.
- Managed...

STRICT RULES:
- DO NOT invent fake experience or skills I do not have.
- DO NOT change anything in the personal info and try as much as possible to retain the content of the master resume.
- Output ONLY valid JSON. No markdown wrappers outside the JSON, no conversational text.
- ESCAPE all internal double quotes inside your string values using a backslash (\").
- Do NOT output trailing commas at the end of JSON arrays or objects.

4. Draft a highly professional, concise Cover Letter addressing the specific role.

          Return ONLY a valid JSON object matching this schema:
          {
            "tailoredResume": { <Copy the exact schema of the Master Resume, but tailored> },
            "coverLetterBody": "<The 3-4 paragraph text of the cover letter>"
          }`,
        },
        {
          role: "user",
          content: `MASTER RESUME:\n${masterResume.data}\n\nJOB DESCRIPTION:\n${pendingJob.coverLetterBody}`,
        },
      ],
    });

    const output = JSON.parse(aiResponse.choices[0].message.content || "{}");

    console.log(`💾 Saving tailored artifacts to the Vault...`);
    const newResume = await prisma.resume.create({
      data: {
        userId: masterResume.userId,
        title: `${pendingJob.company} - ${pendingJob.role} (Tailored)`,
        data: JSON.stringify(output.tailoredResume),
      },
    });

    await prisma.jobApplication.update({
      where: { id: pendingJob.id },
      data: {
        status: "PENDING_APPROVAL",
        resumeId: newResume.id,
        coverLetterBody: output.coverLetterBody,
      },
    });

    // --- NEW: COMPILE THE PDFs IN MEMORY ---
    console.log(`🖨️ Compiling PDF documents for Telegram dispatch...`);
    const standardSectionOrder = [
      "summary",
      "experience",
      "education",
      "projects",
      "skills",
      "interests",
      "certifications",
    ];

    // 1. Compile Resume (Force TypeScript to recognize it as a Buffer)
    const resumeDoc = pdf(
      <ResumePDF
        data={output.tailoredResume}
        sectionOrder={standardSectionOrder}
        template="classic"
      />,
    );
    const resumeBuffer = (await resumeDoc.toBuffer()) as Buffer;

    // 2. Compile Cover Letter (Force TypeScript to recognize it as a Buffer)
    const clData = {
      personalInfo: output.tailoredResume.personalInfo,
      jobDetails: { company: pendingJob.company },
      bodyText: output.coverLetterBody,
    };
    const clDoc = pdf(<CoverLetterPDF data={clData} template="classic" />);
    const clBuffer = (await clDoc.toBuffer()) as Buffer;

    // --- STAGE B: THE TELEGRAM DISPATCH ---
    console.log(`📲 Sending documents to your device...`);

    // Send the Resume first quietly
    await bot.sendDocument(
      chatId,
      resumeBuffer,
      {},
      {
        filename: `${pendingJob.company.replace(/\s+/g, "_")}_Resume.pdf`,
        contentType: "application/pdf",
      },
    );

    // Send the Cover Letter attached to the final action buttons!
    const isPortal = pendingJob.applicationType === "PORTAL";
    await bot.sendDocument(
      chatId,
      clBuffer,
      {
        caption: `✅ *Tailoring Complete: ${pendingJob.company}*\n\nReview the attached documents. What are your final orders?`,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              isPortal
                ? {
                    text: "🌐 Apply via Portal",
                    callback_data: `portal_${pendingJob.id}`,
                  }
                : {
                    text: "📮 Send via Email",
                    callback_data: `email_${pendingJob.id}`,
                  },
              { text: "❌ Discard", callback_data: `discard_${pendingJob.id}` },
            ],
          ],
        },
      },
      {
        filename: `${pendingJob.company.replace(/\s+/g, "_")}_CoverLetter.pdf`,
        contentType: "application/pdf",
      },
    );

    console.log(
      `🏁 Tailoring complete. Awaiting your final orders on Telegram.`,
    );
  } catch (error) {
    console.error("❌ The Tailor's needle broke:", error);
    await bot.sendMessage(
      chatId,
      `⚠️ *Tailor Error:* Something went wrong processing the quest. Check logs.`,
      { parse_mode: "Markdown" },
    );
  } finally {
    await prisma.$disconnect();
  }
}

export { dispatchTailor };
