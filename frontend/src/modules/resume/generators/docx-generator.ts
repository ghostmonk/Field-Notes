import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  BorderStyle,
} from 'docx';
import { saveAs } from 'file-saver';
import { Resume } from '@/shared/types/api';

export async function generateDocx(resume: Resume): Promise<void> {
  const c = resume.contact;
  const contactLine = [
    c.email,
    c.phone,
    c.location,
    c.website,
    c.linkedin,
    c.github,
  ]
    .filter(Boolean)
    .join('  |  ');

  const children: Paragraph[] = [];

  // Name
  children.push(
    new Paragraph({
      children: [new TextRun({ text: c.full_name, bold: true, size: 32 })],
      spacing: { after: 100 },
    })
  );

  // Contact line
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: contactLine, size: 20, color: '555555' }),
      ],
      spacing: { after: 200 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      },
    })
  );

  // Summary
  if (resume.summary) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun('Summary')],
      })
    );
    children.push(
      new Paragraph({
        children: [new TextRun(resume.summary)],
        spacing: { after: 200 },
      })
    );
  }

  // Work Experience
  if (resume.work_experience.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun('Experience')],
      })
    );
    for (const w of resume.work_experience) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${w.title} - ${w.company}`, bold: true }),
            new TextRun({
              text: `    ${w.start_date} - ${w.current ? 'Present' : w.end_date || ''}`,
              color: '555555',
              size: 20,
            }),
          ],
          spacing: { before: 120 },
        })
      );
      if (w.description) {
        children.push(
          new Paragraph({
            children: [new TextRun(w.description)],
            spacing: { after: 60 },
          })
        );
      }
      if (w.technologies.length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: w.technologies.join(', '),
                italics: true,
                size: 20,
                color: '555555',
              }),
            ],
            spacing: { after: 120 },
          })
        );
      }
    }
  }

  // Education
  if (resume.education.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun('Education')],
      })
    );
    for (const e of resume.education) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${e.degree}${e.field_of_study ? ` - ${e.field_of_study}` : ''}`,
              bold: true,
            }),
            new TextRun({
              text: `    ${e.start_date}${e.end_date ? ` - ${e.end_date}` : ''}`,
              color: '555555',
              size: 20,
            }),
          ],
          spacing: { before: 120 },
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun({ text: e.institution, color: '555555' })],
        })
      );
      if (e.description) {
        children.push(
          new Paragraph({
            children: [new TextRun(e.description)],
            spacing: { after: 60 },
          })
        );
      }
    }
  }

  // Skills
  if (resume.skills.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun('Skills')],
      })
    );
    children.push(
      new Paragraph({
        children: [new TextRun(resume.skills.join('  |  '))],
        spacing: { after: 200 },
      })
    );
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(
    blob,
    `${resume.contact.full_name.replace(/\s+/g, '_')}_Resume.docx`
  );
}
