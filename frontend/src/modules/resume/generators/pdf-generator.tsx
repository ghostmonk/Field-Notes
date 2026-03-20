import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,

  Svg,
  Path,
} from '@react-pdf/renderer';
import { Resume } from '@/shared/types/api';
import { useState } from 'react';
import { parseDescription, RESUME_NAVY, getResumeFilename } from '../shared';

// SVG icon components for PDF (react-icons can't be used in @react-pdf)
const ICON_SIZE = 8;
const ICON_COLOR = '#b0bec5';

function PhoneIcon() {
  return (
    <Svg viewBox="0 0 24 24" width={ICON_SIZE} height={ICON_SIZE}>
      <Path fill={ICON_COLOR} d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z" />
    </Svg>
  );
}

function EmailIcon() {
  return (
    <Svg viewBox="0 0 24 24" width={ICON_SIZE} height={ICON_SIZE}>
      <Path fill={ICON_COLOR} d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
    </Svg>
  );
}

function LocationIcon() {
  return (
    <Svg viewBox="0 0 24 24" width={ICON_SIZE} height={ICON_SIZE}>
      <Path fill={ICON_COLOR} d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
    </Svg>
  );
}

function WebIcon() {
  return (
    <Svg viewBox="0 0 24 24" width={ICON_SIZE} height={ICON_SIZE}>
      <Path fill={ICON_COLOR} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </Svg>
  );
}

function LinkedInIcon() {
  return (
    <Svg viewBox="0 0 24 24" width={ICON_SIZE} height={ICON_SIZE}>
      <Path fill={ICON_COLOR} d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </Svg>
  );
}

function GitHubIcon() {
  return (
    <Svg viewBox="0 0 24 24" width={ICON_SIZE} height={ICON_SIZE}>
      <Path fill={ICON_COLOR} d="M12 2A10 10 0 002 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
    </Svg>
  );
}


const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 30,
    paddingHorizontal: 0,
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    color: '#222',
  },
  pageInner: {
    paddingHorizontal: 40,
  },

  // Header
  header: {
    backgroundColor: RESUME_NAVY,
    paddingHorizontal: 36,
    paddingTop: 28,
    paddingBottom: 20,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    fontSize: 8,
    color: '#b0bec5',
  },
  contactItem: {
    flexDirection: 'row',
    marginRight: 10,
    marginBottom: 1,
  },

  // Summary
  summaryWrap: {
    paddingHorizontal: 36,
    paddingTop: 18,
    paddingBottom: 10,
  },
  summary: {
    fontSize: 8.5,
    lineHeight: 1.5,
    color: '#333',
  },

  // Body columns
  body: {
    flexDirection: 'row',
    paddingHorizontal: 36,
    paddingTop: 12,
  },
  leftCol: { width: '58%', paddingRight: 16 },
  rightCol: { width: '42%' },

  // Section
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 9.5,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: RESUME_NAVY,
    paddingBottom: 2,
    marginBottom: 8,
    color: RESUME_NAVY,
  },

  // Work experience
  jobEntry: { marginBottom: 16 },
  jobTitle: { fontSize: 9.5, fontWeight: 'bold', marginBottom: 0 },
  company: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 0,
  },
  dateRange: { fontSize: 7.5, color: '#666', marginBottom: 2 },
  bullet: { flexDirection: 'row', marginBottom: 1.5, paddingLeft: 2 },
  bulletDot: { width: 7, fontSize: 8, lineHeight: 1.3 },
  bulletText: { flex: 1, fontSize: 8, lineHeight: 1.4 },
  paragraph: { fontSize: 8, lineHeight: 1.4, marginBottom: 1.5 },
  techLine: {
    fontSize: 7.5,
    color: '#555',
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Skills
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  skillTag: {
    fontSize: 7.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.75,
    borderColor: '#bbb',
    borderRadius: 6,
    marginRight: 3,
    marginBottom: 3,
  },

  // Achievements
  achievementRow: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingLeft: 2,
  },
  achievementDot: { width: 7, fontSize: 8, lineHeight: 1.3 },
  achievementText: { flex: 1, fontSize: 8, lineHeight: 1.4 },

  // Education
  eduEntry: { marginBottom: 6 },
  eduDegree: { fontSize: 8.5, fontWeight: 'bold', marginBottom: 0 },
  eduInstitution: { fontSize: 7.5, color: '#444', marginBottom: 0 },
  eduDate: { fontSize: 7.5, color: '#666' },
});

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

function ContactEntry({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.contactItem}>
      {icon}
      <Text style={{ marginLeft: 3 }}>{text}</Text>
    </View>
  );
}

const PAGE1_JOB_COUNT = 3;

function JobEntry({ w }: { w: Resume['work_experience'][0] }) {
  return (
    <View wrap={false} style={styles.jobEntry}>
      <Text style={styles.jobTitle}>{w.title}</Text>
      <Text style={styles.company}>{w.company}</Text>
      <Text style={styles.dateRange}>
        {w.start_date}{w.current ? ' - Present' : w.end_date ? ` - ${w.end_date}` : ''}
      </Text>
      {w.description ? <DescriptionBlock description={w.description} /> : null}
      {w.technologies.length > 0 && (
        <Text style={styles.techLine}>{w.technologies.join(', ')}</Text>
      )}
    </View>
  );
}

function ResumeDocument({ resume }: { resume: Resume }) {
  const c = resume.contact;
  const downloadJobs = resume.work_experience.filter(w => !w.hide_from_downloads);
  const page1Jobs = downloadJobs.slice(0, PAGE1_JOB_COUNT);
  const page2Jobs = downloadJobs.slice(PAGE1_JOB_COUNT);

  return (
    <Document>
      {/* Page 1: Header, Summary, first 3 jobs + right column */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{c.full_name}</Text>
          {c.title && (
            <Text style={{ fontSize: 11, color: '#d0d8e0', marginBottom: 10 }}>{c.title}</Text>
          )}
          <View style={styles.contactRow}>
            {c.phone && <ContactEntry icon={<PhoneIcon />} text={c.phone} />}
            {c.email && <ContactEntry icon={<EmailIcon />} text={c.email} />}
            {c.location && <ContactEntry icon={<LocationIcon />} text={c.location} />}
            {c.website && <ContactEntry icon={<WebIcon />} text={c.website.replace(/^https?:\/\//, '')} />}
            {c.linkedin && <ContactEntry icon={<LinkedInIcon />} text="LinkedIn" />}
            {c.github && <ContactEntry icon={<GitHubIcon />} text="GitHub" />}
          </View>
        </View>

        {resume.summary ? (
          <View style={styles.summaryWrap}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summary}>{resume.summary}</Text>
          </View>
        ) : null}

        <View style={styles.body}>
          <View style={styles.leftCol}>
            {page1Jobs.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Experience</Text>
                {page1Jobs.map((w, i) => (
                  <JobEntry key={i} w={w} />
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
                    <Text key={i} style={styles.skillTag}>{s}</Text>
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
                    <Text style={styles.eduInstitution}>{e.institution}</Text>
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

      {/* Page 2+: Remaining experience in same column width */}
      {page2Jobs.length > 0 && (
        <Page size="A4" style={{ ...styles.page, paddingTop: 40 }}>
          <View style={styles.body}>
            <View style={styles.leftCol}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Experience (continued)</Text>
                {page2Jobs.map((w, i) => (
                  <JobEntry key={i} w={w} />
                ))}
              </View>
            </View>
            <View style={styles.rightCol} />
          </View>
        </Page>
      )}
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
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = getResumeFilename(resume, 'pdf');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } finally {
        URL.revokeObjectURL(url);
      }
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
        className="btn btn-primary text-sm flex items-center gap-1.5"
        title="Download PDF"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="hidden sm:inline">{generating ? 'Generating...' : 'PDF'}</span>
      </button>
      {error && <span className="text-sm text-red-500">{error}</span>}
    </>
  );
}
