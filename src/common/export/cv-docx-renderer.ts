import { Document, HeadingLevel, Paragraph, TextRun } from 'docx';
import { Packer } from 'docx';
import type { CvEntry, CvSection } from '../../generated/prisma/client.js';
import { resolveStyle } from './style-cascade.js';
import {
  isSidebarSection,
  sectionLabel,
  type ContactInfo,
  type ExportableCv,
  type StyleOverrides,
  type TemplateStructure,
} from './export-cv.types.js';

const ON_SURFACE_VARIANT = '3E4947';

function str(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function hex(color: string): string {
  return color.replace('#', '').toUpperCase();
}

function renderEntryParagraphs(
  section: CvSection,
  entry: CvEntry,
  layers: (StyleOverrides | null | undefined)[],
): Paragraph[] {
  const fields = entry.fieldsJson as Record<string, unknown>;
  const style = resolveStyle(...layers, entry.styleOverridesJson as StyleOverrides | null);
  const accentColor = hex(style.color);

  switch (section.sectionType) {
    case 'SUMMARY':
    case 'CUSTOM': {
      const paragraphs: Paragraph[] = [];
      if (fields.title) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: str(fields.title), bold: true, size: 16 * style.fontScale * 2 })],
            spacing: { after: 60 },
          }),
        );
      }
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: str(fields.text), size: 14 * style.fontScale * 2 })],
          spacing: { after: 120 },
        }),
      );
      return paragraphs;
    }
    case 'EXPERIENCE': {
      const dates = `${str(fields.startDate)} – ${fields.isCurrent ? 'Present' : str(fields.endDate)}`;
      return [
        new Paragraph({
          children: [
            new TextRun({ text: str(fields.jobTitle), bold: true, size: 16 * style.fontScale * 2 }),
            new TextRun({ text: `    ${dates}`, italics: true, color: ON_SURFACE_VARIANT, size: 13 * 2 }),
          ],
        }),
        new Paragraph({
          children: [new TextRun({ text: str(fields.company), color: accentColor, size: 14 * style.fontScale * 2 })],
          spacing: { after: 40 },
        }),
        new Paragraph({
          children: [new TextRun({ text: str(fields.description), size: 14 * style.fontScale * 2 })],
          spacing: { after: 120 },
        }),
      ];
    }
    case 'EDUCATION': {
      const dates = `${str(fields.startDate)} – ${str(fields.endDate)}`;
      return [
        new Paragraph({
          children: [
            new TextRun({ text: str(fields.degree), bold: true, size: 16 * style.fontScale * 2 }),
            new TextRun({ text: `    ${dates}`, italics: true, color: ON_SURFACE_VARIANT, size: 13 * 2 }),
          ],
        }),
        new Paragraph({
          children: [new TextRun({ text: str(fields.school), color: accentColor, size: 14 * style.fontScale * 2 })],
          spacing: { after: 120 },
        }),
      ];
    }
    case 'SKILLS':
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: `• ${str(fields.name)}${fields.level ? ` (${str(fields.level)})` : ''}`,
              size: 14 * style.fontScale * 2,
            }),
          ],
        }),
      ];
    case 'CERTIFICATIONS':
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: `${str(fields.name)}${fields.issuer ? ` — ${str(fields.issuer)}` : ''}${fields.date ? ` (${str(fields.date)})` : ''}`,
              size: 14 * style.fontScale * 2,
            }),
          ],
          spacing: { after: 80 },
        }),
      ];
    default:
      return [];
  }
}

function renderSectionParagraphs(
  section: CvSection & { entries: CvEntry[] },
  layers: (StyleOverrides | null | undefined)[],
): Paragraph[] {
  const sectionLayers = [...layers, section.styleOverridesJson as StyleOverrides | null];
  return [
    new Paragraph({
      text: sectionLabel(section).toUpperCase(),
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 120 },
    }),
    ...section.entries.flatMap((entry) => renderEntryParagraphs(section, entry, sectionLayers)),
  ];
}

export async function buildCvDocx(cv: ExportableCv): Promise<Buffer> {
  const structure = (cv.template.structureJson ?? {}) as TemplateStructure;
  const cvStyle = (cv.styleOverridesJson ?? {}) as StyleOverrides;
  const contact = (cv.contactInfoJson ?? {}) as ContactInfo;
  const templateLayer: StyleOverrides = { accentColor: structure.accentColor, fontFamily: structure.font };
  const headerStyle = resolveStyle(templateLayer, cvStyle);

  const children: Paragraph[] = [];

  if (contact.fullName) {
    children.push(new Paragraph({ text: contact.fullName, heading: HeadingLevel.TITLE }));
  }
  if (contact.title) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: contact.title, color: hex(headerStyle.color), bold: true })],
      }),
    );
  }
  const contactLine = [contact.email, contact.phone, contact.location].filter(Boolean).join(' | ');
  if (contactLine) {
    children.push(new Paragraph({ text: contactLine, spacing: { after: 200 } }));
  }

  // Sorted the same way as the editor preview and PDF export — the CV's own
  // sortOrder decides sequence, the template only decides which sections would
  // sit in a sidebar in the two-column HTML/PDF layout (Word output stays linear).
  const sortedSections = [...cv.sections].sort((a, b) => a.sortOrder - b.sortOrder);
  const isTwoColumn = structure.layout === 'two-column';
  const mainSections = sortedSections.filter((s) => !isSidebarSection(structure, s.sectionType));
  const sidebarSections = isTwoColumn
    ? sortedSections.filter((s) => isSidebarSection(structure, s.sectionType))
    : [];
  const orderedSections = [...mainSections, ...sidebarSections];
  const bodyLayers = [templateLayer, cvStyle];

  for (const section of orderedSections) {
    children.push(...renderSectionParagraphs(section, bodyLayers));
  }

  const doc = new Document({
    sections: [{ children }],
    styles: {
      default: {
        document: { run: { font: headerStyle.fontFamily, size: headerStyle.fontSize * 2 } },
      },
    },
  });
  return Packer.toBuffer(doc);
}
