import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { prisma } from '../src/lib/prisma';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (!token || !chatId) {
  console.error("❌ CRITICAL: Telegram credentials missing from .env!");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
const openai = new OpenAI({ baseURL: "https://api.groq.com/openai/v1", apiKey: process.env.GROQ_API_KEY });

// 🎛️ THE FLEXIBILITY DIAL: Any job scoring this or higher will be sent to you for approval.
const MINIMUM_MATCH_THRESHOLD = 60; 

console.log(`📡 The Headless Sentry is online. (Minimum Match Threshold: ${MINIMUM_MATCH_THRESHOLD}%)`);

// --- HELPER: FETCH DYNAMIC PROFILE ---
async function getPreferences() {
  const masterResume = await prisma.resume.findFirst({ orderBy: { updatedAt: 'desc' } });
  if (!masterResume) throw new Error("No master resume found.");
  
  const resumeData = JSON.parse(masterResume.data);
  const distilled = { title: resumeData.personalInfo?.headline, skills: resumeData.skills, experience: resumeData.experience };

  // We ask the AI to build a flexible profile, not a rigid checklist
  const aiResponse = await openai.chat.completions.create({
    model: "llama-3.1-8b-instant",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Analyze the candidate's resume data and build a holistic professional profile.
        Extract: 1. Core technical skills 2. Ideal job titles 3. Total years of experience 4. Absolute Dealbreakers (e.g. Sales, Unpaid). 
        Return JSON: {"titles": [], "coreSkills": [], "minExperienceYears": 0, "dealbreakers": []}`
      },
      { role: "user", content: JSON.stringify(distilled) }
    ]
  });
  return JSON.parse(aiResponse.choices[0].message.content || "{}");
}

// --- HELPER: FETCH HTML TEXT ---
async function fetchUrlText(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const $ = cheerio.load(html);
  $('script, style, nav, footer, header').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}

// --- STAGE A: INCOMING MESSAGES (THE SCOUT) ---
bot.on('message', async (msg) => {
  if (msg.chat.id.toString() !== chatId || !msg.text || msg.text.startsWith('/')) return;

  const inputText = msg.text.trim();
  const isUrl = inputText.startsWith('http');
  const processingMsg = await bot.sendMessage(chatId, `🔍 *Scouting...* ${isUrl ? 'Fetching URL' : 'Analyzing text'}`, { parse_mode: 'Markdown' });

  try {
    const rawText = isUrl ? await fetchUrlText(inputText) : inputText;
    const candidateProfile = await getPreferences();

    // The new Percentage-Based AI Prompt
    const aiResponse = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an elite technical recruiter. Evaluate this job against the candidate's profile.
          
          Candidate Profile: ${JSON.stringify(candidateProfile)}
          
          INSTRUCTIONS:
          1. Extract Company Name and Job Title.
          2. Calculate a "matchScore" from 0 to 100 based on skill overlap, experience level, and title relevance. Be flexible—consider transferable skills. 
          3. If the job hits any "dealbreakers", cap the score at 30.
          4. Extract application instructions (EMAIL or PORTAL) and the URL/Email.
          
          Return JSON: {"company": "...", "title": "...", "matchScore": <integer>, "matchReason": "<1 short sentence explaining the score>", "applicationType": "EMAIL"|"PORTAL", "applyUrl": "..."}`
        },
        { role: "user", content: `SOURCE: ${isUrl ? inputText : 'Manual Text'}\n\n${rawText.substring(0, 5000)}` }
      ]
    });

    const data = JSON.parse(aiResponse.choices[0].message.content || "{}");
    const score = data.matchScore || 0;

    // THE FLEXIBLE THRESHOLD CHECK
    if (score >= MINIMUM_MATCH_THRESHOLD) {
      const savedJob = await prisma.jobApplication.create({
        data: {
          company: data.company || "Unknown Company",
          role: data.title || "Unknown Role",
          status: 'SCOUTED',
          source: isUrl ? inputText : "Manual Paste",
          matchScore: score, // We save the Scout's preliminary score here
          jdSummary: `Scout Notes: ${data.matchReason}`,
          applicationType: data.applicationType || 'PORTAL',
          applyUrl: data.applyUrl || (isUrl ? inputText : ""),
          coverLetterBody: `RAW_JD_CACHE:\n${rawText.substring(0, 3000)}` 
        }
      });

      // We now show you the exact score and reason!
      const message = `🎯 *POTENTIAL MATCH: ${score}%*\n\n*🏢 ${savedJob.company}*\n*💼 ${savedJob.role}*\n\n_Analysis: ${data.matchReason}_\n_App Type: ${savedJob.applicationType}_`;
      
      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: processingMsg.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🧵 Tailor It', callback_data: `tailor_${savedJob.id}` },
            { text: '❌ Decline', callback_data: `decline_${savedJob.id}` }
          ]]
        }
      });
    } else {
      await bot.editMessageText(`❌ *DECLINED (Score: ${score}% )*\n\n*${data.title} at ${data.company}*\n_Reason: ${data.matchReason}_`, {
        chat_id: chatId,
        message_id: processingMsg.message_id,
        parse_mode: 'Markdown'
      });
    }
  } catch (error) {
    console.error(error);
    await bot.editMessageText(`⚠️ Error analyzing the quest. Check server logs.`, { chat_id: chatId, message_id: processingMsg.message_id });
  }
});

// --- STAGE B & C: BUTTON CLICKS ---
bot.on('callback_query', async (query) => {
  if (!query.data || !query.message) return;
  const [command, jobId] = query.data.split('_');

  try {
    // Stage A Actions (The Scout)
    if (command === 'tailor') {
      await prisma.jobApplication.update({ where: { id: jobId }, data: { status: 'TAILORING' } });
      await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: query.message.chat.id, message_id: query.message.message_id });
      await bot.sendMessage(chatId!, `🧠 *Sent to the Forge!* The 70B Tailor is now processing this quest.`, { parse_mode: 'Markdown' });
      
    } else if (command === 'decline' || command === 'discard') {
      await prisma.jobApplication.update({ where: { id: jobId }, data: { status: 'REJECTED' } });
      await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: query.message.chat.id, message_id: query.message.message_id });
      await bot.sendMessage(chatId!, `🗑️ *Quest Discarded.* Moving to archives.`, { parse_mode: 'Markdown' });
    }
    
    // Stage C Actions (The Final Dispatch)
    else if (command === 'portal') {
      // You apply manually, we just update the ledger!
      const job = await prisma.jobApplication.update({ where: { id: jobId }, data: { status: 'APPLIED' } });
      await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: query.message.chat.id, message_id: query.message.message_id });
      await bot.sendMessage(chatId!, `✅ *Ledger Updated!* Good luck with your application to ${job.company}.`, { parse_mode: 'Markdown' });
    }
    
    else if (command === 'email') {
      // Mark as IN_REVIEW so the Postmaster daemon knows to pick it up and email it!
      const job = await prisma.jobApplication.update({ where: { id: jobId }, data: { status: 'IN_REVIEW' } });
      await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: query.message.chat.id, message_id: query.message.message_id });
      await bot.sendMessage(chatId!, `📮 *Routed to Postmaster!* The Amanuensis will now email the hiring manager at ${job.company}.`, { parse_mode: 'Markdown' });
    }

    bot.answerCallbackQuery(query.id);
  } catch (error) {
    console.error(error);
    bot.answerCallbackQuery(query.id, { text: 'Error updating Vault!' });
  }
});