import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link, Svg, Path } from '@react-pdf/renderer';
import { Icons, IconName } from '../lib/icons';

// Dynamic Stylesheet Generator based on the Holy Trinity
const getStyles = (template: string) => {
  const isClassic = template === 'classic';
  const isExecutive = template === 'executive';
  
  const mainFont = isClassic || isExecutive ? 'Times-Roman' : 'Helvetica';
  const headerFont = isClassic ? 'Times-Bold' : 'Helvetica-Bold';
  const alignment = isClassic ? 'center' : 'left';

  return StyleSheet.create({
    page: { padding: 40, fontFamily: mainFont, backgroundColor: '#ffffff' },
    header: { marginBottom: 20, textAlign: alignment },
    name: { fontSize: 24, fontFamily: headerFont, textTransform: 'uppercase', marginBottom: 4 },
    headline: { fontSize: 12, color: '#1d4ed8', marginBottom: 4, fontFamily: headerFont },
    contact: { fontSize: 10, color: '#4b5563', marginBottom: 4 },
    link: { fontSize: 10, color: '#1d4ed8', textDecoration: 'none' },
    section: { marginBottom: 15 },
    sectionTitle: { fontSize: 11, fontFamily: headerFont, borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 2, marginBottom: 8, textTransform: 'uppercase' },
    item: { marginBottom: 8 },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
    itemTitleContainer: { flex: 1, paddingRight: 15 },
    itemTitle: { fontSize: 10, fontFamily: headerFont, color: '#000' },
    itemDates: { fontSize: 10, color: '#000', textAlign: 'right', flexShrink: 0 },  
    itemSubtitle: { fontSize: 9, fontStyle: 'italic', color: '#4b5563', marginBottom: 3 },
    normalText: { fontSize: 10, color: '#374151', lineHeight: 1.4 },
    bulletPoint: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 3 },
    bullet: { width: 15, fontSize: 10, color: '#374151' },
    bulletText: { flex: 1, fontSize: 10, color: '#374151', lineHeight: 1.4 },
    flexGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    gridItem: { fontSize: 10, color: '#374151', width: '45%', marginBottom: 4 },
    contactRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
    contactItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    icon: { width: 10, height: 10, color: '#4b5563' }
  });
};
const safeString = (val: any): string => {
  if (!val) return "";
  if (Array.isArray(val)) return val.join(", ");
  return String(val);
};

const Description = ({ text, styles }: { text?: string | string[], styles: any }) => {
  if (!text) return null;
  
  // 1. Safely normalize the AI's output into an array of strings
  let lines: string[] = [];
  if (Array.isArray(text)) {
    lines = text; // The AI gave us an array, use it directly
  } else if (typeof text === 'string') {
    lines = text.split('\n'); // The AI gave us a string, split it
  } else {
    lines = [String(text)]; // The AI went crazy and gave us a number/boolean, force it to a string
  }
  
  // 2. Clean out empty lines
  lines = lines.filter(line => line.trim().length > 0);
  
  // 3. Render logic
  if (lines.length === 1 && !/^[\-•*]/.test(lines[0])) {
    return <Text style={styles.normalText}>{lines[0]}</Text>;
  }

  return (
    <View>
      {lines.map((line, i) => {
        const cleanLine = line.replace(/^[\-•*]\s*/, '');
        return (
          <View key={i} style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{cleanLine}</Text>
          </View>
        );
      })}
    </View>
  );
};

const PDFIcon = ({ name, styles }: { name: IconName, styles: any }) => (
  <Svg viewBox="0 0 24 24" style={styles.icon}>
    <Path 
      d={Icons[name]} 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
  </Svg>
);

export default function ResumePDF({ data, sectionOrder, template = 'classic' }: { data: any, sectionOrder: string[], template?: string }) {
  const styles = getStyles(template);
  const { personalInfo, summary, experience, education, projects, skills, languages, interests, awards, certifications, publications, volunteer, references, profiles } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{personalInfo.fullName}</Text>
          <Text style={styles.headline}>{personalInfo.headline}</Text>
          
          {/* THE NEW ICON-DRIVEN CONTACT ROW */}
          <View style={styles.contactRow}>
            {personalInfo.email && (
              <View style={styles.contactItem}>
                <PDFIcon name="Email" styles={styles} />
                <Text style={styles.contact}>{personalInfo.email}</Text>
              </View>
            )}
            
            {personalInfo.phone && (
              <View style={styles.contactItem}>
                <PDFIcon name="Phone" styles={styles} />
                <Text style={styles.contact}>{personalInfo.phone}</Text>
              </View>
            )}
            
            {personalInfo.location && (
              <View style={styles.contactItem}>
                <PDFIcon name="Location" styles={styles} />
                <Text style={styles.contact}>{personalInfo.location}</Text>
              </View>
            )}

            {/* Map through dynamic social links in ResumePDF.tsx */}
            {personalInfo.links?.map((link: { network: IconName, url: string, username?: string }, index: number) => (
              <View key={index} style={styles.contactItem}>
                <PDFIcon name={link.network} styles={styles} />
                <Link src={link.url} style={styles.link}>
                  {/* NEW: Pulls the display name directly from your new input field! */}
                  {link.username || link.network}
                </Link>
              </View>
            ))}
          </View>
        </View>
        
        {/* 2. DYNAMIC SECTIONS */}
        {sectionOrder.map((sectionKey) => {
          switch (sectionKey) {
            case "summary":
              return summary?.content && (
                <View key={sectionKey} style={styles.section} wrap={false}>
                  <Text style={styles.sectionTitle}>Summary</Text>
                  <Text style={styles.normalText}>{summary.content}</Text>
                </View>
              );

            case "experience":
              return experience?.length > 0 && (
                <View key={sectionKey} style={styles.section}>
                  {experience.map((exp: any, idx: number) => (
                    <View key={idx} style={styles.item} wrap={false}>
                      {/* FIX: Title rendered INSIDE the first item to prevent page-break orphans! */}
                      {idx === 0 && <Text style={styles.sectionTitle}>Experience</Text>}
                      <View style={styles.itemHeader}>
                        <View style={styles.itemTitleContainer}>
                          <Text style={styles.itemTitle}>{exp.position} {exp.company && `— ${exp.company}`}</Text>
                        </View>
                        <Text style={styles.itemDates}>{exp.startDate} {exp.endDate ? `- ${exp.endDate}` : ""}</Text>
                      </View>
                      {exp.location && <Text style={styles.itemSubtitle}>{exp.location}</Text>}
                      <Description text={exp.description} styles={styles} />
                    </View>
                  ))}
                </View>
              );

            case "education":
              return education?.length > 0 && (
                <View key={sectionKey} style={styles.section}>
                  {education.map((edu: any, idx: number) => (
                    <View key={idx} style={styles.item} wrap={false}>
                      {/* FIX: Orphan protected title */}
                      {idx === 0 && <Text style={styles.sectionTitle}>Education</Text>}
                      <View style={styles.itemHeader}>
                        <View style={styles.itemTitleContainer}>
                          {/* FIX: Removed Grade from Title string */}
                          <Text style={styles.itemTitle}>
                            {edu.degree} {edu.studyArea && `in ${edu.studyArea}`} {edu.school && `— ${edu.school}`}
                          </Text>
                        </View>
                        <Text style={styles.itemDates}>{edu.startDate} {edu.endDate ? `- ${edu.endDate}` : ""}</Text>
                      </View>
                      {/* FIX: Grade moved securely below the school name */}
                      {edu.grade && <Text style={styles.itemSubtitle}>Grade: {edu.grade}</Text>}
                      {edu.location && <Text style={styles.itemSubtitle}>{edu.location}</Text>}
                      <Description text={edu.description} styles={styles} />
                    </View>
                  ))}
                </View>
              );

            case "projects":
              return projects?.length > 0 && (
                <View key={sectionKey} style={styles.section}>
                  {projects.map((proj: any, idx: number) => (
                    <View key={idx} style={styles.item} wrap={false}>
                      {idx === 0 && <Text style={styles.sectionTitle}>Projects</Text>}
                      <View style={styles.itemHeader}>
                        <View style={styles.itemTitleContainer}>
                          <Text style={styles.itemTitle}>{proj.name}</Text>
                        </View>
                        <Text style={styles.itemDates}>{proj.startDate} {proj.endDate ? `- ${proj.endDate}` : ""}</Text>
                      </View>
                      <Description text={proj.description} styles={styles} />
                    </View>
                  ))}
                </View>
              );

            case "skills": {
              if (!skills || skills.length === 0) return null;
              
              const groupedSkills = skills.filter((s: any) => safeString(s.keywords).trim().length > 0);
              const singleSkills = skills.filter((s: any) => safeString(s.keywords).trim().length === 0);

              return (
                <View key={sectionKey} style={styles.section} wrap={false}>
                  <Text style={styles.sectionTitle}>Skills</Text>
                  
                  {/* Grouped Skills */}
                  {groupedSkills.map((s: any, idx: number) => (
                    <View key={`grouped-${idx}`} style={{ flexDirection: 'row', marginBottom: 3 }}>
                      <Text style={styles.itemTitle}>
                        {s.name}{s.proficiency ? ` (${s.proficiency})` : ''}:{' '}
                      </Text>
                      <Text style={[styles.normalText, { flex: 1 }]}>
                        {safeString(s.keywords)}
                      </Text>
                    </View>
                  ))}

                  {/* Inline/Single Skills */}
                  {singleSkills.length > 0 && (
                    <View style={{ marginTop: groupedSkills.length > 0 ? 3 : 0, flexDirection: 'row', flexWrap: 'wrap' }}>
                      <Text style={styles.normalText}>
                        {singleSkills.map((s: any) => `${s.name}${s.proficiency ? ` (${s.proficiency})` : ''}`).join('  •  ')}
                      </Text>
                    </View>
                  )}
                </View>
              );
            }

            case "languages":
              return languages?.length > 0 && (
                <View key={sectionKey} style={styles.section} wrap={false}>
                  <Text style={styles.sectionTitle}>Languages</Text>
                  <Text style={styles.normalText}>
                    {languages.map((l: any) => `${l.language} (${l.fluency})`).join(' • ')}
                  </Text>
                </View>
              );

            case "interests":
              return interests?.length > 0 && (
                <View key={sectionKey} style={styles.section} wrap={false}>
                  <Text style={styles.sectionTitle}>Interests</Text>
                  <Text style={styles.normalText}>
                    {interests.map((i: any) => i.name).join(' • ')}
                  </Text>
                </View>
              );

            case "awards":
              return awards?.length > 0 && (
                <View key={sectionKey} style={styles.section}>
                  {awards.map((award: any, idx: number) => (
                    <View key={idx} style={styles.item} wrap={false}>
                      {idx === 0 && <Text style={styles.sectionTitle}>Awards</Text>}
                      <View style={styles.itemHeader}>
                        <View style={styles.itemTitleContainer}>
                          <Text style={styles.itemTitle}>{award.title}</Text>
                        </View>
                        <Text style={styles.itemDates}>{award.date}</Text>
                      </View>
                      <Text style={styles.itemSubtitle}>{award.awarder}</Text>
                      <Description text={award.description} styles={styles} />
                    </View>
                  ))}
                </View>
              );

            case "certifications":
              return certifications?.length > 0 && (
                <View key={sectionKey} style={styles.section}>
                  {certifications.map((cert: any, idx: number) => (
                    <View key={idx} style={styles.item} wrap={false}>
                      {idx === 0 && <Text style={styles.sectionTitle}>Certifications</Text>}
                      <View style={styles.itemHeader}>
                        <View style={styles.itemTitleContainer}>
                          <Text style={styles.itemTitle}>{cert.title}</Text>
                        </View>
                        <Text style={styles.itemDates}>{cert.date}</Text>
                      </View>
                      <Text style={styles.itemSubtitle}>{cert.issuer}</Text>
                      <Description text={cert.description} styles={styles} />
                    </View>
                  ))}
                </View>
              );

             case "publications":
              return publications?.length > 0 && (
                <View key={sectionKey} style={styles.section}>
                  {publications.map((pub: any, idx: number) => (
                    <View key={idx} style={styles.item} wrap={false}>
                      {idx === 0 && <Text style={styles.sectionTitle}>Publications</Text>}
                      <View style={styles.itemHeader}>
                        <View style={styles.itemTitleContainer}>
                          <Text style={styles.itemTitle}>{pub.title} {pub.publisher && `— ${pub.publisher}`}</Text>
                        </View>
                        <Text style={styles.itemDates}>{pub.date}</Text>
                      </View>
                      <Description text={pub.description} styles={styles} />
                    </View>
                  ))}
                </View>
              );

            case "volunteer":
              return volunteer?.length > 0 && (
                <View key={sectionKey} style={styles.section}>
                  {volunteer.map((vol: any, idx: number) => (
                    <View key={idx} style={styles.item} wrap={false}>
                      {idx === 0 && <Text style={styles.sectionTitle}>Volunteer</Text>}
                      <View style={styles.itemHeader}>
                        <View style={styles.itemTitleContainer}>
                          <Text style={styles.itemTitle}>{vol.organization}</Text>
                        </View>
                        <Text style={styles.itemDates}>{vol.startDate} {vol.endDate ? `- ${vol.endDate}` : ""}</Text>
                      </View>
                      {vol.location && <Text style={styles.itemSubtitle}>{vol.location}</Text>}
                      <Description text={vol.description} styles={styles} />
                    </View>
                  ))}
                </View>
              );

            case "references":
              return references?.length > 0 && (
                <View key={sectionKey} style={styles.section} wrap={false}>
                  <Text style={styles.sectionTitle}>References</Text>
                  <View style={styles.flexGrid}>
                    {references.map((ref: any, idx: number) => (
                      <View key={idx} style={{ width: '45%', marginBottom: 10 }}>
                        <Text style={{ fontSize: 10, color: '#000', marginBottom: 2 }}>{ref.name}</Text>
                        
                        {(ref.position || ref.company) && (
                          <Text style={{ fontSize: 9, color: '#374151', marginBottom: 3 }}>
                            {ref.position} {ref.company && `— ${ref.company}`}
                          </Text>
                        )}
                        
                        {ref.phone && <Text style={{ fontSize: 9, color: '#4b5563', marginBottom: 1 }}>{ref.phone}</Text>}
                        
                        {ref.email && (
                          <Link src={`mailto:${ref.email}`} style={{ fontSize: 9, color: '#1d4ed8', textDecoration: 'none' }}>
                            {ref.email}
                          </Link>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              );
            default:
              return null;
          }
        })}

      </Page>
    </Document>
  );
}