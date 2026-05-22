import 'dotenv/config';
import nodemailer from 'nodemailer';
import { prisma } from '../src/lib/prisma';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import ResumePDF from '../src/components/ResumePDF';

// 1. Initialize the Gmail Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function generateResumePDFBuffer(resumeData: any): Promise<Buffer> {
  // Define the standard section order for the AI-tailored resumes
  const standardSectionOrder = [
    "summary", 
    "experience", 
    "education", 
    "projects", 
    "skills", 
    "certifications"
  ];

  console.log(`🖨️ Compiling React-PDF component into a secure buffer...`);
  
  // Call the React-PDF instance with your actual component
  const documentInstance = pdf(
    <ResumePDF 
      data={resumeData} 
      sectionOrder={standardSectionOrder} 
      template="classic" // Or 'classic' / 'onyx'
    />
  );
  
  // Convert the generated document directly into a Node Buffer for the email attachment
  const buffer = await documentInstance.toBuffer();
  return buffer;
}

async function dispatchPostmaster() {
  console.log(`\n📮 The Postmaster awakens. Checking the outbox...`);

  try {
    // 2. Find a Quest that you explicitly Approved via Telegram (No 'include' needed)
    const approvedJob = await prisma.jobApplication.findFirst({
      where: { status: 'IN_REVIEW' }
    });

    // If no job is found, or if it somehow doesn't have a linked resume, go back to sleep
    if (!approvedJob || !approvedJob.resumeId) {
      console.log(`📭 The outbox is empty or missing documents. No quests awaiting dispatch.`);
      return;
    }

    // 2b. Manually fetch the linked tailored resume from the Vault
    const linkedResume = await prisma.resume.findUnique({
      where: { id: approvedJob.resumeId }
    });

    if (!linkedResume) {
      console.log(`❌ CRITICAL: The Resume ID ${approvedJob.resumeId} was not found in the Vault!`);
      return;
    }

    console.log(`✉️ Preparing dispatch for: ${approvedJob.role} at ${approvedJob.company}`);

    // 3. Generate the PDF Document
    const resumeData = JSON.parse(linkedResume.data);
    const applicantName = resumeData.personalInfo?.fullName || "Applicant";
    const pdfBuffer = await generateResumePDFBuffer(resumeData);

    // 4. Format the Email
    const targetEmail = process.env.TEST_RECIPIENT_EMAIL; 
    
    const coverLetterBody = `
Dear Hiring Manager,

I am writing to express my interest in the ${approvedJob.role} position. 

Please find my resume attached for your review.

Best regards,
${applicantName}
    `.trim();

    const mailOptions = {
      from: `"${applicantName}" <${process.env.GMAIL_USER}>`,
      to: targetEmail,
      subject: `Application: ${approvedJob.role} - ${applicantName}`,
      text: coverLetterBody,
      attachments: [
        {
          filename: `${approvedJob.company.replace(/\s+/g, '_')}_Resume.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    // 5. Send the Dispatch
    console.log(`🚀 Sending transmission to Google Servers...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Message sent successfully! Message ID: ${info.messageId}`);

    // 6. Update the Vault Ledger
    await prisma.jobApplication.update({
      where: { id: approvedJob.id },
      data: { status: 'APPLIED' }
    });

    console.log(`📗 Ledger updated. Quest marked as APPLIED.`);

  } catch (error) {
    console.error("❌ The Postmaster encountered an error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

export { dispatchPostmaster };