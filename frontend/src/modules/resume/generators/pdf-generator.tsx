import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
} from '@react-pdf/renderer';
import { Resume } from '@/shared/types/api';
import { useState } from 'react';

// Register Helvetica variants explicitly for bold/italic to work
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
    { src: 'Helvetica-Oblique', fontStyle: 'italic' },
    {
      src: 'Helvetica-BoldOblique',
      fontWeight: 'bold',
      fontStyle: 'italic',
    },
  ],
});

const NAVY = '#1b2838';

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 36,
    paddingHorizontal: 0,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#222',
  },
  pageInner: {
    paddingHorizontal: 40,
  },

  // Header
  header: {
    backgroundColor: NAVY,
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 22,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 6,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    fontSize: 8.5,
    color: '#b0bec5',
  },
  contactItem: {
    flexDirection: 'row',
    marginRight: 14,
    marginBottom: 2,
  },

  // Summary
  summaryWrap: {
    paddingHorizontal: 40,
    paddingTop: 16,
    paddingBottom: 8,
  },
  summary: {
    fontSize: 9,
    lineHeight: 1.6,
    color: '#333',
  },

  // Body columns
  body: {
    flexDirection: 'row',
    paddingHorizontal: 40,
    paddingTop: 8,
  },
  leftCol: { width: '58%', paddingRight: 20 },
  rightCol: { width: '42%' },

  // Section
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    borderBottomWidth: 1.5,
    borderBottomColor: NAVY,
    paddingBottom: 3,
    marginBottom: 10,
    color: NAVY,
  },

  // Work experience
  jobEntry: { marginBottom: 14 },
  jobTitle: { fontSize: 10.5, fontWeight: 'bold', marginBottom: 1 },
  company: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 1,
  },
  dateRange: { fontSize: 8.5, color: '#666', marginBottom: 4 },
  bullet: { flexDirection: 'row', marginBottom: 3, paddingLeft: 2 },
  bulletDot: { width: 8, fontSize: 9, lineHeight: 1.4 },
  bulletText: { flex: 1, fontSize: 9, lineHeight: 1.5 },
  paragraph: { fontSize: 9, lineHeight: 1.5, marginBottom: 3 },
  techLine: {
    fontSize: 8.5,
    color: '#555',
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Skills
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  skillTag: {
    fontSize: 8.5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 8,
    marginRight: 5,
    marginBottom: 5,
  },

  // Achievements
  achievementRow: {
    flexDirection: 'row',
    marginBottom: 5,
    paddingLeft: 2,
  },
  achievementDot: { width: 8, fontSize: 9, lineHeight: 1.4 },
  achievementText: { flex: 1, fontSize: 9, lineHeight: 1.5 },

  // Education
  eduEntry: { marginBottom: 10 },
  eduDegree: { fontSize: 9.5, fontWeight: 'bold', marginBottom: 1 },
  eduInstitution: { fontSize: 8.5, color: '#444', marginBottom: 1 },
  eduDate: { fontSize: 8.5, color: '#666' },
});

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
            <Text style={styles.bulletDot}>{'\u2022'}</Text>
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

function ResumeDocument({ resume }: { resume: Resume }) {
  const c = resume.contact;

  const contactParts: string[] = [];
  if (c.phone) contactParts.push(c.phone);
  if (c.email) contactParts.push(c.email);
  if (c.location) contactParts.push(c.location);
  if (c.website)
    contactParts.push(c.website.replace(/^https?:\/\//, ''));
  if (c.linkedin) contactParts.push('LinkedIn');
  if (c.github) contactParts.push('GitHub');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Dark header */}
        <View style={styles.header} fixed>
          <Text style={styles.name}>{c.full_name}</Text>
          <View style={styles.contactRow}>
            {contactParts.map((part, i) => (
              <View key={i} style={styles.contactItem}>
                <Text>
                  {part}
                  {i < contactParts.length - 1 ? '   |' : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Summary — full width */}
        {resume.summary ? (
          <View style={styles.summaryWrap}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summary}>{resume.summary}</Text>
          </View>
        ) : null}

        {/* Two-column body */}
        <View style={styles.body}>
          {/* Left: Experience */}
          <View style={styles.leftCol}>
            {resume.work_experience.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Experience</Text>
                {resume.work_experience.map((w, i) => (
                  <View key={i} wrap={false} style={styles.jobEntry}>
                    <Text style={styles.jobTitle}>{w.title}</Text>
                    <Text style={styles.company}>{w.company}</Text>
                    <Text style={styles.dateRange}>
                      {w.start_date}
                      {' - '}
                      {w.current ? 'Present' : w.end_date || ''}
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

          {/* Right: Skills, Achievements, Education */}
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

            {resume.achievements && resume.achievements.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Achievements</Text>
                {resume.achievements.map((a, i) => (
                  <View key={i} style={styles.achievementRow}>
                    <Text style={styles.achievementDot}>{'\u2022'}</Text>
                    <Text style={styles.achievementText}>{a}</Text>
                  </View>
                ))}
              </View>
            )}

            {resume.education.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Education</Text>
                {resume.education.map((e, i) => (
                  <View key={i} style={styles.eduEntry}>
                    <Text style={styles.eduDegree}>
                      {e.degree}
                      {e.field_of_study ? `, ${e.field_of_study}` : ''}
                    </Text>
                    <Text style={styles.eduInstitution}>
                      {e.institution}
                    </Text>
                    <Text style={styles.eduDate}>
                      {e.start_date}
                      {e.end_date ? ` - ${e.end_date}` : ''}
                    </Text>
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
