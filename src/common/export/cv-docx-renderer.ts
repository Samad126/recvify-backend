import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import type { CvSection } from '../../generated/prisma/client.js';
import { sectionLabel, type ContactInfo, type ExportableCv } from './export-cv.types.js';

function str(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function renderEntryParagraphs(
  section: CvSection,
  fields: Record<string, unknown>,
): Paragraph[] {
  switch (section.sectionType) {
    case 'SUMMARY':
    case 'CUSTOM':
      return [new Paragraph({ text: str(fields.text) })];
    case 'EXPERIENCE': {
      const dates = `${str(fields.startDate)} – ${fields.isCurrent ? 'Present' : str(fields.endDate)}`;
      return [
        new Paragraph({
          children: [
            new TextRun({ text: `${str(fields.jobTitle)} · ${str(fields.company)}`, bold: true }),
            new TextRun({ text: `    ${dates}`, italics: true }),
          ],
        }),
        new Paragraph({ text: str(fields.description) }),
      ];
    }
    case 'EDUCATION': {
      const dates = `${str(fields.startDate)} – ${str(fields.endDate)}`;
      return [
        new Paragraph({
          children: [
            new TextRun({ text: `${str(fields.school)} — ${str(fields.degree)}`, bold: true }),
            new TextRun({ text: `    ${dates}`, italics: true }),
          ],
        }),
      ];
    }
    case 'SKILLS':
      return [
        new Paragraph({
          text: `• ${str(fields.name)}${fields.level ? ` (${str(fields.level)})` : ''}`,
        }),
      ];
    case 'CERTIFICATIONS':
      return [
        new Paragraph({
          text: `${str(fields.name)}${fields.issuer ? ` — ${str(fields.issuer)}` : ''}${fields.date ? ` (${str(fields.date)})` : ''}`,
        }),
      ];
    default:
      return [];
  }
}

export async function buildCvDocx(cv: ExportableCv): Promise<Buffer> {
  const contact = (cv.contactInfoJson ?? {}) as ContactInfo;
  const children: Paragraph[] = [];

  if (contact.fullName) {
    children.push(new Paragraph({ text: contact.fullName, heading: HeadingLevel.TITLE }));
  }
  if (contact.title) {
    children.push(new Paragraph({ text: contact.title }));
  }
  const contactLine = [contact.email, contact.phone, contact.location].filter(Boolean).join(' | ');
  if (contactLine) {
    children.push(new Paragraph({ text: contactLine, spacing: { after: 200 } }));
  }

  for (const section of cv.sections) {
    children.push(
      new Paragraph({
        text: sectionLabel(section),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 100 },
      }),
    );
    for (const entry of section.entries) {
      children.push(...renderEntryParagraphs(section, entry.fieldsJson as Record<string, unknown>));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}
