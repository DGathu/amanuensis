import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';

// We reuse the identical typography engine from your ResumePDF to ensure matching visual branding
const getStyles = (template: string) => {
  const isClassic = template === 'classic';
  const isExecutive = template === 'executive';
  
  const mainFont = isClassic || isExecutive ? 'Times-Roman' : 'Helvetica';
  const headerFont = isClassic ? 'Times-Bold' : 'Helvetica-Bold';
  const alignment = isClassic ? 'center' : 'left';

  return StyleSheet.create({
    page: { padding: 40, fontFamily: mainFont, backgroundColor: '#ffffff' },
    header: { marginBottom: 30, textAlign: alignment },
    name: { fontSize: 24, fontFamily: headerFont, textTransform: 'uppercase', marginBottom: 4 },
    headline: { fontSize: 12, color: '#1d4ed8', marginBottom: 4, fontFamily: headerFont },
    contact: { fontSize: 10, color: '#4b5563', marginBottom: 4 },
    link: { color: '#1d4ed8', textDecoration: 'none' },
    body: { fontSize: 11, color: '#374151', lineHeight: 1.6 },
    paragraph: { marginBottom: 12 },
    dateAndRecipient: { marginBottom: 20, fontSize: 11, color: '#374151' },
    signatureBox: { marginTop: 30 },
    signatureText: { fontSize: 11, fontFamily: headerFont, color: '#000' }
  });
};

export default function CoverLetterPDF({ data, template = 'executive' }: { data: any, template?: string }) {
  const styles = getStyles(template);
  const { personalInfo, jobDetails, bodyText } = data;

  // Split the raw text from the Vault into properly spaced paragraphs
  const paragraphs = bodyText ? bodyText.split('\n').filter((p: string) => p.trim().length > 0) : [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* 1. MATCHING HEADER */}
        <View style={styles.header}>
          <Text style={styles.name}>{personalInfo?.fullName || "Your Name"}</Text>
          {personalInfo?.headline && <Text style={styles.headline}>{personalInfo.headline}</Text>}
          <Text style={styles.contact}>
            {[personalInfo?.email, personalInfo?.phone, personalInfo?.location].filter(Boolean).join(" • ")}
          </Text>
          {personalInfo?.website && (
             <Link src={personalInfo.website} style={styles.link}>{personalInfo.website}</Link>
          )}
        </View>

        {/* 2. DATE & RECIPIENT */}
        <View style={styles.dateAndRecipient}>
          {/* Automatically stamps today's date on generation */}
          <Text>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
          <Text style={{ marginTop: 10 }}>Hiring Manager</Text>
          <Text>{jobDetails?.company || "Company Name"}</Text>
        </View>

        {/* 3. THE AI GENERATED LETTER BODY */}
        <View style={styles.body}>
          {paragraphs.map((para: string, idx: number) => (
            <Text key={idx} style={styles.paragraph}>{para}</Text>
          ))}
        </View>

        {/* 4. SIGNATURE */}
        <View style={styles.signatureBox}>
          <Text style={styles.paragraph}>Sincerely,</Text>
          <Text style={styles.signatureText}>{personalInfo?.fullName || "Your Name"}</Text>
        </View>

      </Page>
    </Document>
  );
}