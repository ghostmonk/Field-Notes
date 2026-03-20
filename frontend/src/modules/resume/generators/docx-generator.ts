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

const COLORS = {
  gray: '666666',
  border: 'CCCCCC',
};

const SIZES = {
  name: 56, // 28pt in half-points
  contact: 20, // 10pt
  sectionHeader: 24, // 12pt
  jobTitle: 22, // 11pt
  company: 20, // 10pt
  date: 18, // 9pt
  body: 20, // 10pt
};

function sectionHeader(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: SIZES.sectionHeader,
      }),
    ],
    spacing: { before: 300, after: 100 },
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 1,
        color: COLORS.border,
      },
    },
  });
}

function parseDescription(description: string): Paragraph[] {
  const lines = description.split('\n').filter((l) => l.trim());
  return lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      return new Paragraph({
        bullet: { level: 0 },
        children: [
          new TextRun({ text: trimmed.slice(2), size: SIZES.body }),
        ],
        spacing: { before: 40, after: 40 },
      });
    }
    return new Paragraph({
      children: [new TextRun({ text: trimmed, size: SIZES.body })],
      spacing: { before: 40, after: 40 },
    });
  });
}

export async function generateDocx(resume: Resume): Promise<void> {
  const c = resume.contact;
  const contactParts = [
    c.email,
    c.phone,
    c.location,
    c.website,
    c.linkedin,
    c.github,
  ].filter(Boolean);

  const children: Paragraph[] = [];

  // Name
  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({ text: c.full_name, bold: true, size: SIZES.name }),
      ],
      spacing: { after: 80 },
    })
  );

  // Contact info - single line
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: contactParts.join('  |  '),
          size: SIZES.contact,
          color: COLORS.gray,
        }),
      ],
      spacing: { after: 120 },
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
  if (resume.work_experience.length > 0) {
    children.push(sectionHeader('Experience'));
    for (const w of resume.work_experience) {
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
          spacing: { before: 160, after: 40 },
        })
      );

      // Company
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

      // Date range
      const dateText = `${w.start_date} - ${w.current ? 'Present' : w.end_date || ''}`;
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: dateText,
              size: SIZES.date,
              color: COLORS.gray,
            }),
          ],
          spacing: { after: 60 },
        })
      );

      // Description - parsed into bullets and paragraphs
      if (w.description) {
        children.push(...parseDescription(w.description));
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
            spacing: { before: 40, after: 120 },
          })
        );
      }
    }
  }

  // Education
  if (resume.education.length > 0) {
    children.push(sectionHeader('Education'));
    for (const e of resume.education) {
      // Degree + Field of Study
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
          spacing: { before: 160, after: 40 },
        })
      );

      // Institution
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

      // Dates
      const eduDate = e.end_date
        ? `${e.start_date} - ${e.end_date}`
        : e.start_date;
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: eduDate,
              size: SIZES.date,
              color: COLORS.gray,
            }),
          ],
          spacing: { after: 60 },
        })
      );

      // Description
      if (e.description) {
        children.push(...parseDescription(e.description));
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
            text: resume.skills.join('  |  '),
            size: SIZES.body,
          }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch
              bottom: 720,
              left: 1080, // 0.75 inch
              right: 1080,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(
    blob,
    `${resume.contact.full_name.replace(/\s+/g, '_')}_Resume.docx`
  );
}
