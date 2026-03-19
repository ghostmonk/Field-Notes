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
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica' },
  header: { marginBottom: 20 },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    fontSize: 10,
    color: '#555',
  },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 4,
    marginBottom: 8,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  entryTitle: { fontWeight: 'bold' },
  entrySubtitle: { color: '#555', fontSize: 10 },
  entryDesc: { marginTop: 4, lineHeight: 1.4 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  skill: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
  },
  summary: { lineHeight: 1.5, color: '#333' },
});

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
              <Text key={i}>
                {part}
                {i < contactParts.length - 1 ? '  |' : ''}
              </Text>
            ))}
          </View>
        </View>

        {resume.summary ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summary}>{resume.summary}</Text>
          </View>
        ) : null}

        {resume.work_experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {resume.work_experience.map((w, i) => (
              <View key={i} style={{ marginBottom: 10 }}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>
                    {w.title} - {w.company}
                  </Text>
                  <Text style={styles.entrySubtitle}>
                    {w.start_date} - {w.current ? 'Present' : w.end_date}
                  </Text>
                </View>
                {w.description ? (
                  <Text style={styles.entryDesc}>{w.description}</Text>
                ) : null}
                {w.technologies.length > 0 && (
                  <View style={[styles.skillsRow, { marginTop: 4 }]}>
                    {w.technologies.map((t, j) => (
                      <Text key={j} style={styles.skill}>
                        {t}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {resume.education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {resume.education.map((e, i) => (
              <View key={i} style={{ marginBottom: 8 }}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>
                    {e.degree}
                    {e.field_of_study ? ` - ${e.field_of_study}` : ''}
                  </Text>
                  <Text style={styles.entrySubtitle}>
                    {e.start_date} - {e.end_date || 'Present'}
                  </Text>
                </View>
                <Text style={styles.entrySubtitle}>{e.institution}</Text>
                {e.description ? (
                  <Text style={styles.entryDesc}>{e.description}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {resume.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsRow}>
              {resume.skills.map((s, i) => (
                <Text key={i} style={styles.skill}>
                  {s}
                </Text>
              ))}
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}

export function PDFDownloadButton({ resume }: { resume: Resume }) {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
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
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={generating}
      className="btn btn-primary text-sm"
    >
      {generating ? 'Generating...' : 'Download PDF'}
    </button>
  );
}
