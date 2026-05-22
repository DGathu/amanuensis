import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as readline from 'readline';

const openai = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (query: string): Promise<string> => new Promise(resolve => rl.question(query, resolve));

// --- DYNAMIC PREFERENCE EXTRACTION ---
async function generatePreferencesFromVault(): Promise<any> {
  console.log(`\n🧠 Consulting the Master Resume to establish target preferences...`);
  
  // 1. Fetch the Master Resume (We grab the most recently updated one)
  const masterResume = await prisma.resume.findFirst({ 
    orderBy: { updatedAt: 'desc' } 
  });
  
  if (!masterResume) {
    throw new Error("No master resume found in the Vault! Cannot establish preferences.");
  }

  // 2. We only send the skills, experience, and title to save tokens
  const resumeData = JSON.parse(masterResume.data);
  const distilledResume = {
    title: resumeData.personalInfo?.headline || "Telecommunication and Information Engineer",
    skills: resumeData.skills,
    experience: resumeData.experience,
    projects: resumeData.projects,
    certifications: resumeData.certifications
  };

  // 3. Use the instant 8B model to build the target rules
  const aiResponse = await openai.chat.completions.create({
    model: "llama-3.1-8b-instant",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an elite technical recruiter. Analyze the candidate's resume data and generate strict job search preferences.
        1. Extract the top 10 most prominent technical skills.
        2. Infer 5 suitable job titles based on their experience.
        3. Calculate their total years of professional experience (round to nearest integer).
        4. List 5 job categories they should STRICTLY DECLINE (e.g., Sales, Marketing, Unpaid, HR, etc.).
                                          
        Return ONLY valid JSON matching this schema:
        {
          "titles": ["Title 1", "Title 2", ...],
          "coreSkills": ["Skill 1", "Skill 2", ...],
          "minExperienceYears": <integer>,
          "strictDecline": ["Category 1", "Category 2", ...]
        }`
      },
      { role: "user", content: `RESUME DATA:\n${JSON.stringify(distilledResume)}` }
    ]
  });

  const preferences = JSON.parse(aiResponse.choices[0].message.content || "{}");
  console.log(`🎯 Targeting Roles: ${preferences.titles.join(', ')}`);
  console.log(`⏳ Minimum Experience Baseline: ${preferences.minExperienceYears} years`);
  return preferences;
}

// --- THE AI ENGINE ---
// Notice we now pass targetPreferences as an argument!
async function evaluateJob(rawText: string, sourceReference: string, targetPreferences: any) {
  try {
    const aiResponse = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an elite technical recruiter. Analyze the provided job description text.
          1. Extract the Job Title and Company Name.
          2. Evaluate if it matches the candidate's preferences.
          3. Extract application instructions (is it via an EMAIL or an external PORTAL?). Extract the email or URL if present.
          
          Candidate Preferences: ${JSON.stringify(targetPreferences)}
          
          Return ONLY valid JSON matching this schema:
          {
            "company": "<Extracted Company Name or 'Unknown'>",
            "title": "<Extracted Job Title or 'Unknown'>",
            "isMatch": <boolean>,
            "matchReason": "<1 short sentence explaining why it matches or fails>",
            "applicationType": "<'EMAIL' or 'PORTAL'>",
            "applyUrl": "<Extracted email address, external URL, or empty string>"
          }`
        },
        { role: "user", content: `SOURCE: ${sourceReference}\n\nDESCRIPTION TEXT:\n${rawText.substring(0, 5000)}` }
      ]
    });

    const data = JSON.parse(aiResponse.choices[0].message.content || "{}");

    if (data.isMatch) {
      console.log(`✅ MATCH: ${data.title} at ${data.company}`);
      console.log(`   Reason: ${data.matchReason}`);
      
      await prisma.jobApplication.create({
        data: {
          company: data.company || "Unknown Company",
          role: data.title || "Unknown Role",
          status: 'SCOUTED', 
          source: sourceReference,
          jdSummary: `Scout Notes: ${data.matchReason}`,
          applicationType: data.applicationType || 'PORTAL',
          applyUrl: data.applyUrl || sourceReference,
          coverLetterBody: `RAW_JD_CACHE:\n${rawText.substring(0, 3000)}` 
        }
      });
    } else {
      console.log(`❌ DECLINED: ${data.title} at ${data.company} (${data.matchReason})`);
    }
  } catch (error) {
    console.error(`⚠️ Failed to evaluate ${sourceReference}:`, error);
  }
}

// ... fetchUrlText function stays exactly the same ...
async function fetchUrlText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const $ = cheerio.load(html);
  $('script, style, nav, footer, header').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}

// --- THE INTERACTIVE COMMAND CENTER ---
async function dispatchScout() {
  console.log(`\n🕵️‍♂️ The Universal Scout Awakens.`);
  
  // 1. Boot up sequence: dynamically generate the rules
  let targetPreferences;
  try {
    targetPreferences = await generatePreferencesFromVault();
  } catch (e: any) {
    console.error(e.message);
    process.exit(1);
  }

  console.log(`\nHow would you like to provide the leads?`);
  console.log(`  [1] Single URL`);
  console.log(`  [2] Batch File (.txt list of URLs)`);
  console.log(`  [3] Paste Raw JD Text`);
  
  const mode = await question(`\nSelect an option (1-3): `);

  if (mode === '1') {
    const url = await question(`Paste the Job URL: `);
    console.log(`\n🔍 Fetching and analyzing...`);
    const text = await fetchUrlText(url);
    await evaluateJob(text, url, targetPreferences); // <-- Passing the dynamic preferences

  } else if (mode === '2') {
    const filename = await question(`Enter the filename (e.g., links.txt): `);
    try {
      const fileContent = await fs.readFile(filename, 'utf-8');
      const urls = fileContent.split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));
      
      console.log(`\n🗺️ Found ${urls.length} valid links. Beginning analysis...`);
      for (const url of urls) {
        console.log(`\n🔍 Inspecting: ${url}`);
        const text = await fetchUrlText(url);
        await evaluateJob(text, url, targetPreferences); // <-- Passing the dynamic preferences
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (e) {
      console.error(`❌ Could not read file ${filename}.`);
    }

  } else if (mode === '3') {
    console.log(`\n📝 Multiline terminal pasting can cause crashes.`);
    console.log(`Please paste your raw Job Description into a file named 'jd.txt' in your project root.`);
    const ready = await question(`Press Enter when 'jd.txt' is saved and ready...`);
    
    try {
      const rawText = await fs.readFile('jd.txt', 'utf-8');
      console.log(`\n🔍 Analyzing raw text...`);
      await evaluateJob(rawText, "Manually Pasted Text", targetPreferences); // <-- Passing the dynamic preferences
    } catch (e) {
      console.error(`❌ Could not find 'jd.txt'.`);
    }
  } else {
    console.log(`❌ Invalid selection.`);
  }

  console.log(`\n🏁 Scouting complete. Check your Telegram for new leads!`);
  rl.close();
  await prisma.$disconnect();
}

dispatchScout();