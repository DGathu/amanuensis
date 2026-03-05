import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';

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
    link: { color: '#1d4ed8', textDecoration: 'none' },
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
    gridItem: { fontSize: 10, color: '#374151', width: '45%', marginBottom: 4 }
  });
};

const Description = ({ text, styles }: { text?: string, styles: any }) => {
  if (!text) return null;
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
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

export default function ResumePDF({ data, sectionOrder, template = 'onyx' }: { data: any, sectionOrder: string[], template?: string }) {
  const styles = getStyles(template);
  const { personalInfo, summary, experience, education, projects, skills, languages, interests, awards, certifications, publications, volunteer, references, profiles } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* 1. HEADER (Pinned to Top) */}
        <View style={styles.header}>
          <Text style={styles.name}>{personalInfo?.fullName || "Your Name"}</Text>
          {personalInfo?.headline && <Text style={styles.headline}>{personalInfo.headline}</Text>}
          <Text style={styles.contact}>
            {[personalInfo?.email, personalInfo?.phone, personalInfo?.location].filter(Boolean).join(" • ")}
          </Text>
          {personalInfo?.website && (
             <Link src={personalInfo.website} style={styles.link}>{personalInfo.website}</Link>
          )}
          
          {/* FIX: Profiles are now dynamically mapped and clickable if they have a website */}
          {profiles?.length > 0 && (
            <Text style={styles.contact}>
              {profiles.map((p: any, idx: number) => (
                <React.Fragment key={idx}>
                  {p.website ? (
                    <Link src={p.website} style={styles.link}>{p.username || p.network}</Link>
                  ) : (
                    p.username || p.network
                  )}
                  {idx < profiles.length - 1 ? " | " : ""}
                </React.Fragment>
              ))}
            </Text>
          )}
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

            case "skills":
              return skills?.length > 0 && (
                <View key={sectionKey} style={styles.section} wrap={false}>
                  <Text style={styles.sectionTitle}>Skills</Text>
                  <Text style={styles.normalText}>
                    {skills.map((s: any) => `${s.name}${s.proficiency ? ` (${s.proficiency})` : ''}`).join(' • ')}
                  </Text>
                </View>
              );

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