import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  BorderStyle,
  AlignmentType,
} from 'docx';
import { saveAs } from 'file-saver';
import { Resume } from '@/shared/types/api';
import { parseDescription, getResumeFilename } from '../shared';

const COLORS = {
  navy: '1B2838',
  gray: '666666',
  border: 'CCCCCC',
};

const SIZES = {
  name: 64, // 32pt in half-points
  contact: 20, // 10pt
  sectionHeader: 28, // 14pt
  jobTitle: 22, // 11pt
  company: 20, // 10pt
  date: 18, // 9pt
  body: 20, // 10pt
};

const ICONS = {
  phone: '\u260E', // ☎
  email: '\u2709', // ✉
  location: '\u25C9', // ◉
  date: '\u229E', // ⊞
};

function sectionHeader(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: SIZES.sectionHeader,
        color: COLORS.navy,
      }),
    ],
    spacing: { before: 400, after: 120 },
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 1,
        color: COLORS.border,
      },
    },
  });
}

function descriptionToParagraphs(description: string): Paragraph[] {
  return parseDescription(description).map((part) => {
    if (part.type === 'bullet') {
      return new Paragraph({
        bullet: { level: 0 },
        children: [
          new TextRun({ text: part.text, size: SIZES.body }),
        ],
        spacing: { before: 40, after: 40 },
      });
    }
    return new Paragraph({
      children: [new TextRun({ text: part.text, size: SIZES.body })],
      spacing: { before: 40, after: 40 },
    });
  });
}

function contactRuns(contact: Resume['contact']): TextRun[] {
  const parts: { icon: string; value: string }[] = [];

  if (contact.email) parts.push({ icon: ICONS.email, value: contact.email });
  if (contact.phone) parts.push({ icon: ICONS.phone, value: contact.phone });
  if (contact.location)
    parts.push({ icon: ICONS.location, value: contact.location });

  const runs: TextRun[] = [];
  parts.forEach((part, i) => {
    if (i > 0) {
      runs.push(
        new TextRun({
          text: '    ',
          size: SIZES.contact,
        })
      );
    }
    runs.push(
      new TextRun({
        text: `${part.icon} ${part.value}`,
        size: SIZES.contact,
        color: COLORS.gray,
      })
    );
  });

  // Append plain-text links (website, linkedin, github) without icons
  const links = [contact.website, contact.linkedin, contact.github].filter(
    Boolean
  );
  if (links.length > 0 && parts.length > 0) {
    runs.push(
      new TextRun({
        text: '    ',
        size: SIZES.contact,
      })
    );
  }
  links.forEach((link, i) => {
    if (i > 0) {
      runs.push(
        new TextRun({
          text: '    ',
          size: SIZES.contact,
        })
      );
    }
    runs.push(
      new TextRun({
        text: link!,
        size: SIZES.contact,
        color: COLORS.gray,
      })
    );
  });

  return runs;
}

export async function generateDocx(resume: Resume): Promise<void> {
  const children: Paragraph[] = [];

  // Name
  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({ text: resume.contact.full_name, bold: true, size: SIZES.name }),
      ],
      spacing: { after: 100 },
    })
  );

  // Contact info with icons
  children.push(
    new Paragraph({
      children: contactRuns(resume.contact),
      spacing: { after: 200 },
    })
  );

  // Horizontal rule separator
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: COLORS.border,
        },
      },
    })
  );

  // Summary
  if (resume.summary) {
    children.push(sectionHeader('Summary'));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: resume.summary, size: SIZES.body })],
        spacing: { after: 200 },
      })
    );
  }

  // Work Experience
  const downloadJobs = resume.work_experience.filter(w => !w.hide_from_downloads);
  if (downloadJobs.length > 0) {
    children.push(sectionHeader('Experience'));
    for (const w of downloadJobs) {
      // Job Title
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: w.title,
              bold: true,
              size: SIZES.jobTitle,
            }),
          ],
          spacing: { before: 200, after: 40 },
        })
      );

      // Company + Date on same conceptual block
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: w.company,
              bold: true,
              size: SIZES.company,
              color: COLORS.gray,
            }),
          ],
          spacing: { after: 20 },
        })
      );

      // Date range with calendar icon
      const dateText = `${w.start_date} - ${w.current ? 'Present' : w.end_date || ''}`;
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${ICONS.date} ${dateText}`,
              size: SIZES.date,
              color: COLORS.gray,
            }),
          ],
          spacing: { after: 80 },
        })
      );

      // Description
      if (w.description) {
        children.push(...descriptionToParagraphs(w.description));
      }

      // Technologies
      if (w.technologies.length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: w.technologies.join(', '),
                italics: true,
                size: SIZES.date,
                color: COLORS.gray,
              }),
            ],
            spacing: { before: 40, after: 200 },
          })
        );
      }
    }
  }

  // Education
  if (resume.education.length > 0) {
    children.push(sectionHeader('Education'));
    for (const e of resume.education) {
      const degreeLine = e.field_of_study
        ? `${e.degree}, ${e.field_of_study}`
        : e.degree;
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: degreeLine,
              bold: true,
              size: SIZES.jobTitle,
            }),
          ],
          spacing: { before: 200, after: 40 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: e.institution,
              size: SIZES.company,
              color: COLORS.gray,
            }),
          ],
          spacing: { after: 20 },
        })
      );

      const eduDate = e.end_date
        ? `${e.start_date} - ${e.end_date}`
        : e.start_date;
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${ICONS.date} ${eduDate}`,
              size: SIZES.date,
              color: COLORS.gray,
            }),
          ],
          spacing: { after: 80 },
        })
      );

      if (e.description) {
        children.push(...descriptionToParagraphs(e.description));
      }
    }
  }

  // Skills
  if (resume.skills.length > 0) {
    children.push(sectionHeader('Skills'));
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: resume.skills.join(' \u00B7 '),
            size: SIZES.body,
          }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  // Achievements
  if (resume.achievements && resume.achievements.length > 0) {
    children.push(sectionHeader('Achievements'));
    for (const achievement of resume.achievements) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({ text: achievement, size: SIZES.body }),
          ],
          spacing: { before: 40, after: 40 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: 1080,
              right: 1080,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, getResumeFilename(resume, 'docx'));
}
