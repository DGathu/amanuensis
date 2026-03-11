import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

async function dispatchTailor() {
  console.log(`\n🧙‍♂️ The Clockwork Tailor awakens...`);

  try {
    // 1. Find a pending quest
    const pendingJob = await prisma.jobApplication.findFirst({
      where: { status: 'DRAFT', jdSummary: { startsWith: 'Link:' }, matchScore: null }
    });

    if (!pendingJob) {
      console.log(`✅ No pending drafts require tailoring. The Scribe returns to sleep.`);
      return;
    }

    console.log(`📜 Found pending draft: ${pendingJob.role} at ${pendingJob.company}`);
    const jobUrl = pendingJob.jdSummary?.replace('Link: ', '').trim() || "";
    
    // 2. The Deep Read
    console.log(`👁️ Reading the full parchment from: ${jobUrl}`);
    const response = await fetch(jobUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    const fullJobDescription = $('article, .job-description, main, .description').text().replace(/\s+/g, ' ').trim() || $('body').text().replace(/\s+/g, ' ').trim().substring(0, 3000);
    
    // 3. Fetch the Master Resume
    const masterResume = await prisma.resume.findFirst({ orderBy: { updatedAt: 'desc' } });
    if (!masterResume) return console.log("❌ No master resume found in the Vault to tailor from!");

    console.log(`🧠 Handing the documents to Qwen (OpenRouter) for a full rewrite...`);

    // 4. The Forge: Scoring & Full Resume Rewrite
    const aiResponse = await openai.chat.completions.create({
      model: "qwen/qwen3-vl-30b-a3b-thinking",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an elite technical recruiter and resume tailor. Analyze the Master Resume against the Job Description.
          
          CRITICAL SKILL FORMATTING RULE: 
          To group skills, set the "name" to a broad category (e.g., "Frontend") and put specific technologies in "keywords" as a single comma-separated string (e.g., "React, Next.js"). If standalone, leave "keywords" empty "".

          You must return a strict JSON object with EXACTLY these keys:
          {
            "matchScore": <integer 0-100>,
            "summary": "<2-sentence punchy summary of the role>",
            "coverLetter": "<3-paragraph tailored cover letter body>",
            "tailoredSummary": "<A rewritten professional summary for the resume targeting this specific job>",
            "tailoredSkills": [<Array of skill objects following the formatting rule above to match the JD>],
            "tailoredExperience": [<Array of experience objects. Keep the same structure as the master resume, but slightly rewrite the description/bullet points to emphasize keywords found in the JD>]
          }`
        },
        {
          role: "user",
          content: `MASTER RESUME DATA: ${JSON.stringify(masterResume)}\n\nJOB DESCRIPTION: ${fullJobDescription.substring(0, 4000)}`
        }
      ]
    });

    // 5. Parse the AI's wisdom
    const content = aiResponse.choices[0].message.content;
    if (!content) throw new Error("Qwen returned an empty scroll.");
    const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const tailoredData = JSON.parse(cleanJson);
    
    const finalScore = parseInt(tailoredData.matchScore || tailoredData.MatchScore || "0");
    const finalSummary = tailoredData.summary || tailoredData.Summary || "No summary provided.";
    
    console.log(`\n🎯 Match Score: ${finalScore}%`);
    console.log(`📝 Writing new tailored scroll...`);

    // 6. Clone the Master Resume and Apply the Tailored Ink
    const masterDataObj = JSON.parse(masterResume.data);
    
    // Inject the AI's heavily tailored sections directly into the JSON
    masterDataObj.targetRole = pendingJob.role;
    masterDataObj.summary = tailoredData.tailoredSummary || masterDataObj.summary;
    masterDataObj.skills = tailoredData.tailoredSkills || masterDataObj.skills;
    masterDataObj.experience = tailoredData.tailoredExperience || masterDataObj.experience;

    // Forge the new record perfectly matching your Prisma Schema
    const newlyForgedResume = await prisma.resume.create({
      data: {
        userId: masterResume.userId, // Inherit the exact same user ID
        title: `${pendingJob.company} - ${pendingJob.role}`, // Use the title column for the job name
        data: JSON.stringify(masterDataObj), // Compress the tailored object back into a string!
      }
    });

    // 7. Update the Quest Ledger with the new Resume ID
    await prisma.jobApplication.update({
      where: { id: pendingJob.id },
      data: {
        matchScore: finalScore,
        jdSummary: finalSummary,
        resumeId: newlyForgedResume.id, // <-- We link the new scroll to the application!
      }
    });

    console.log(`✅ Success! A new resume named "${newlyForgedResume.title}" has been locked in the Vault.`);

  } catch (error) {
    console.error("❌ The Tailor's needle broke! Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

dispatchTailor();