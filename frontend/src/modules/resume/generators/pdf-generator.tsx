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
  page: { padding: 0, fontSize: 10, fontFamily: 'Helvetica' },
  header: {
    backgroundColor: '#1b2838',
    padding: '30 40',
    color: 'white',
  },
  name: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    fontSize: 9,
    color: '#b0bec5',
  },
  contactSeparator: { marginLeft: 6, marginRight: 6 },
  body: { flexDirection: 'row', padding: '20 40' },
  leftCol: { width: '60%', paddingRight: 20 },
  rightCol: { width: '40%' },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottomWidth: 1.5,
    borderBottomColor: '#1b2838',
    paddingBottom: 3,
    marginBottom: 8,
  },
  jobTitle: { fontSize: 11, fontWeight: 'bold' },
  company: { fontSize: 10, fontWeight: 'bold', color: '#444' },
  dateRange: { fontSize: 9, color: '#666', marginBottom: 4 },
  bullet: { flexDirection: 'row', marginBottom: 2 },
  bulletDot: { width: 10, fontSize: 9 },
  bulletText: { flex: 1, fontSize: 9, lineHeight: 1.4 },
  paragraph: { fontSize: 9, lineHeight: 1.4, marginBottom: 2 },
  summary: { fontSize: 9, lineHeight: 1.5, color: '#333' },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  skillTag: {
    fontSize: 9,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    marginRight: 4,
    marginBottom: 4,
  },
});

function parseDescription(description: string) {
  const lines = description.split('\n').filter((l) => l.trim() !== '');
  return lines.map((line) => {
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
            <Text style={styles.bulletDot}>{'• '}</Text>
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
  const contactParts = [
    c.email,
    c.phone,
    c.location,
    c.website,
    c.linkedin,
    c.github,
  ].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{c.full_name}</Text>
          <View style={styles.contactRow}>
            {contactParts.map((part, i) => (
              <View key={i} style={{ flexDirection: 'row' }}>
                <Text>{part}</Text>
                {i < contactParts.length - 1 && (
                  <Text style={styles.contactSeparator}>|</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {resume.summary ? (
          <View style={{ paddingHorizontal: 40, paddingTop: 16, paddingBottom: 4 }}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summary}>{resume.summary}</Text>
          </View>
        ) : null}

        <View style={styles.body}>
          <View style={styles.leftCol}>
            {resume.work_experience.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Experience</Text>
                {resume.work_experience.map((w, i) => (
                  <View
                    key={i}
                    style={{
                      marginBottom:
                        i < resume.work_experience.length - 1 ? 10 : 0,
                    }}
                  >
                    <Text style={styles.jobTitle}>{w.title}</Text>
                    <Text style={styles.company}>{w.company}</Text>
                    <Text style={styles.dateRange}>
                      {w.start_date} - {w.current ? 'Present' : w.end_date}
                    </Text>
                    {w.description ? (
                      <DescriptionBlock description={w.description} />
                    ) : null}
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
                        i < resume.education.length - 1 ? 8 : 0,
                    }}
                  >
                    <Text style={styles.jobTitle}>
                      {e.degree}
                      {e.field_of_study ? `, ${e.field_of_study}` : ''}
                    </Text>
                    <Text style={styles.company}>{e.institution}</Text>
                    <Text style={styles.dateRange}>
                      {e.start_date}
                      {e.end_date ? ` - ${e.end_date}` : ''}
                    </Text>
                    {e.description ? (
                      <DescriptionBlock description={e.description} />
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>

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
