import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import { Resume } from '@/shared/types/api';
import { useState } from 'react';

const styles = StyleSheet.create({
  page: { padding: 0, fontSize: 9, fontFamily: 'Helvetica' },
  header: {
    backgroundColor: '#1b2838',
    paddingHorizontal: 36,
    paddingVertical: 24,
  },
  name: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
    fontSize: 8,
    color: '#b0bec5',
  },
  contactItem: { flexDirection: 'row', marginRight: 12 },
  contactIcon: { marginRight: 3 },
  summaryWrap: { paddingHorizontal: 36, paddingTop: 12, paddingBottom: 4 },
  summary: { fontSize: 8.5, lineHeight: 1.5, color: '#333' },
  body: { flexDirection: 'row', paddingHorizontal: 36, paddingTop: 12 },
  leftCol: { width: '58%', paddingRight: 16 },
  rightCol: { width: '42%' },
  section: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#1b2838',
    paddingBottom: 2,
    marginBottom: 6,
    color: '#1b2838',
  },
  jobTitle: { fontSize: 10, fontWeight: 'bold' },
  company: { fontSize: 9, fontWeight: 'bold', color: '#444' },
  dateRange: { fontSize: 8, color: '#666', marginBottom: 3 },
  bullet: { flexDirection: 'row', marginBottom: 2 },
  bulletDot: { width: 8, fontSize: 8.5 },
  bulletText: { flex: 1, fontSize: 8.5, lineHeight: 1.4 },
  paragraph: { fontSize: 8.5, lineHeight: 1.4, marginBottom: 2 },
  techLine: { fontSize: 8, color: '#666', fontStyle: 'italic', marginTop: 2 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  skillTag: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginRight: 4,
    marginBottom: 4,
  },
  achievementRow: { flexDirection: 'row', marginBottom: 3 },
  achievementStar: { width: 12, fontSize: 9, color: '#1b2838' },
  achievementText: { flex: 1, fontSize: 8.5, lineHeight: 1.4 },
  eduDegree: { fontSize: 9, fontWeight: 'bold' },
  eduInstitution: { fontSize: 8, color: '#444' },
  eduDate: { fontSize: 8, color: '#666' },
});

const ICONS = {
  phone: '\u260E',
  email: '\u2709',
  location: '\u25C9',
  linkedin: 'in',
  github: '\u2302',
  calendar: '\u229E',
} as const;

function parseDescription(description: string) {
  return description
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((line) => {
      if (line.trimStart().startsWith('- ')) {
        return { type: 'bullet' as const, text: line.trimStart().slice(2) };
      }
      return { type: 'paragraph' as const, text: line };
    });
}

function DescriptionBlock({ description }: { description: string }) {
  const parts = parseDescription(description);
  return (
    <>
      {parts.map((part, i) =>
        part.type === 'bullet' ? (
          <View key={i} style={styles.bullet}>
            <Text style={styles.bulletDot}>{'\u2022 '}</Text>
            <Text style={styles.bulletText}>{part.text}</Text>
          </View>
        ) : (
          <Text key={i} style={styles.paragraph}>
            {part.text}
          </Text>
        ),
      )}
    </>
  );
}

function ContactItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.contactItem}>
      <Text style={styles.contactIcon}>{icon}</Text>
      <Text>{text}</Text>
    </View>
  );
}

function ResumeDocument({ resume }: { resume: Resume }) {
  const c = resume.contact;

  const contactItems: { icon: string; text: string }[] = [];
  if (c.phone) contactItems.push({ icon: ICONS.phone, text: c.phone });
  if (c.email) contactItems.push({ icon: ICONS.email, text: c.email });
  if (c.location) contactItems.push({ icon: ICONS.location, text: c.location });
  if (c.linkedin) contactItems.push({ icon: ICONS.linkedin, text: c.linkedin });
  if (c.github) contactItems.push({ icon: ICONS.github, text: c.github });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{c.full_name}</Text>
          <View style={styles.contactRow}>
            {contactItems.map((item, i) => (
              <ContactItem key={i} icon={item.icon} text={item.text} />
            ))}
          </View>
        </View>

        {/* Summary */}
        {resume.summary ? (
          <View style={styles.summaryWrap}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summary}>{resume.summary}</Text>
          </View>
        ) : null}

        {/* Two-column body */}
        <View style={styles.body}>
          {/* Left column: Experience */}
          <View style={styles.leftCol}>
            {resume.work_experience.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Experience</Text>
                {resume.work_experience.map((w, i) => (
                  <View
                    key={i}
                    wrap={false}
                    style={{
                      marginBottom:
                        i < resume.work_experience.length - 1 ? 8 : 0,
                    }}
                  >
                    <Text style={styles.jobTitle}>{w.title}</Text>
                    <Text style={styles.company}>{w.company}</Text>
                    <Text style={styles.dateRange}>
                      {ICONS.calendar} {w.start_date} –{' '}
                      {w.current ? 'Present' : w.end_date}
                    </Text>
                    {w.description ? (
                      <DescriptionBlock description={w.description} />
                    ) : null}
                    {w.technologies.length > 0 && (
                      <Text style={styles.techLine}>
                        {w.technologies.join(', ')}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Right column: Skills, Achievements, Education */}
          <View style={styles.rightCol}>
            {resume.skills.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Skills</Text>
                <View style={styles.skillsRow}>
                  {resume.skills.map((s, i) => (
                    <Text key={i} style={styles.skillTag}>
                      {s}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {resume.achievements.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Achievements</Text>
                {resume.achievements.map((a, i) => (
                  <View key={i} style={styles.achievementRow}>
                    <Text style={styles.achievementStar}>{'\u2605'}</Text>
                    <Text style={styles.achievementText}>{a}</Text>
                  </View>
                ))}
              </View>
            )}

            {resume.education.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Education</Text>
                {resume.education.map((e, i) => (
                  <View
                    key={i}
                    style={{
                      marginBottom:
                        i < resume.education.length - 1 ? 6 : 0,
                    }}
                  >
                    <Text style={styles.eduDegree}>
                      {e.degree}
                      {e.field_of_study ? `, ${e.field_of_study}` : ''}
                    </Text>
                    <Text style={styles.eduInstitution}>{e.institution}</Text>
                    <Text style={styles.eduDate}>
                      {ICONS.calendar} {e.start_date}
                      {e.end_date ? ` – ${e.end_date}` : ''}
                    </Text>
                    {e.description ? (
                      <DescriptionBlock description={e.description} />
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

export function PDFDownloadButton({ resume }: { resume: Resume }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setGenerating(true);
    setError(null);
    try {
      const blob = await pdf(<ResumeDocument resume={resume} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${resume.contact.full_name.replace(/\s+/g, '_')}_Resume.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setError('PDF generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleDownload}
        disabled={generating}
        className="btn btn-primary text-sm"
      >
        {generating ? 'Generating...' : 'Download PDF'}
      </button>
      {error && <span className="text-sm text-red-500">{error}</span>}
    </>
  );
}
