import { Document, HeadingLevel, Paragraph, TextRun } from 'docx';
import { Packer } from 'docx';
import type { CvEntry, CvSection } from '../../generated/prisma/client.js';
import { resolveStyle } from './style-cascade.js';
import {
  isSidebarSection,
  sectionLabel,
  type ContactInfo,
  type EntryFieldStyles,
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
  const fieldStyles = entry.styleOverridesJson as EntryFieldStyles | null;
  const fieldStyle = (key: string) => resolveStyle(...layers, fieldStyles?.[key]);

  switch (section.sectionType) {
    case 'SUMMARY':
    case 'CUSTOM': {
      const paragraphs: Paragraph[] = [];
      if (fields.title) {
        const s = fieldStyle('title');
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: str(fields.title),
                bold: true,
                color: s.explicitColor ? hex(s.explicitColor) : undefined,
                size: 16 * s.fontScale * 2,
              }),
            ],
            spacing: { after: 60 },
          }),
        );
      }
      const bodyStyle = fieldStyle('text');
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: str(fields.text),
              color: bodyStyle.explicitColor ? hex(bodyStyle.explicitColor) : undefined,
              size: 14 * bodyStyle.fontScale * 2,
            }),
          ],
          spacing: { after: 120 },
        }),
      );
      return paragraphs;
    }
    case 'EXPERIENCE': {
      const titleStyle = fieldStyle('jobTitle');
      const startStyle = fieldStyle('startDate');
      const companyStyle = fieldStyle('company');
      const descStyle = fieldStyle('description');
      const dates = `${str(fields.startDate)} – ${fields.isCurrent ? 'Present' : str(fields.endDate)}`;
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: str(fields.jobTitle),
              bold: true,
              color: titleStyle.explicitColor ? hex(titleStyle.explicitColor) : undefined,
              size: 16 * titleStyle.fontScale * 2,
            }),
            new TextRun({
              text: `    ${dates}`,
              italics: true,
              color: startStyle.explicitColor ? hex(startStyle.explicitColor) : ON_SURFACE_VARIANT,
              size: 13 * 2,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: str(fields.company), color: hex(companyStyle.color), size: 14 * companyStyle.fontScale * 2 }),
          ],
          spacing: { after: 40 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: str(fields.description),
              color: descStyle.explicitColor ? hex(descStyle.explicitColor) : undefined,
              size: 14 * descStyle.fontScale * 2,
            }),
          ],
          spacing: { after: 120 },
        }),
      ];
    }
    case 'EDUCATION': {
      const degreeStyle = fieldStyle('degree');
      const startStyle = fieldStyle('startDate');
      const schoolStyle = fieldStyle('school');
      const dates = `${str(fields.startDate)} – ${str(fields.endDate)}`;
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: str(fields.degree),
              bold: true,
              color: degreeStyle.explicitColor ? hex(degreeStyle.explicitColor) : undefined,
              size: 16 * degreeStyle.fontScale * 2,
            }),
            new TextRun({
              text: `    ${dates}`,
              italics: true,
              color: startStyle.explicitColor ? hex(startStyle.explicitColor) : ON_SURFACE_VARIANT,
              size: 13 * 2,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: str(fields.school), color: hex(schoolStyle.color), size: 14 * schoolStyle.fontScale * 2 }),
          ],
          spacing: { after: 120 },
        }),
      ];
    }
    case 'SKILLS': {
      const s = fieldStyle('name');
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: `• ${str(fields.name)}${fields.level ? ` (${str(fields.level)})` : ''}`,
              color: s.explicitColor ? hex(s.explicitColor) : undefined,
              size: 14 * s.fontScale * 2,
            }),
          ],
        }),
      ];
    }
    case 'CERTIFICATIONS': {
      const s = fieldStyle('name');
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: `${str(fields.name)}${fields.issuer ? ` — ${str(fields.issuer)}` : ''}${fields.date ? ` (${str(fields.date)})` : ''}`,
              color: s.explicitColor ? hex(s.explicitColor) : undefined,
              size: 14 * s.fontScale * 2,
            }),
          ],
          spacing: { after: 80 },
        }),
      ];
    }
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
  const headerStyle = resolveStyle(templateLayer, cvStyle, cvStyle.fieldOverrides?.title);
  // Name/contact-line stay neutral unless explicitly given a color — see
  // the matching comment in cv-html-renderer.ts.
  const nameColor = cvStyle.fieldOverrides?.fullName?.accentColor ?? cvStyle.accentColor;
  const contactFieldColor = (field: string) => cvStyle.fieldOverrides?.[field]?.accentColor ?? cvStyle.accentColor;

  const children: Paragraph[] = [];

  if (contact.fullName) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [new TextRun({ text: contact.fullName, color: nameColor ? hex(nameColor) : undefined })],
      }),
    );
  }
  if (contact.title) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: contact.title, color: hex(headerStyle.color), bold: true })],
      }),
    );
  }
  const contactParts = [
    contact.email && { text: contact.email, color: contactFieldColor('email') },
    contact.phone && { text: contact.phone, color: contactFieldColor('phone') },
    contact.location && { text: contact.location, color: contactFieldColor('location') },
  ].filter((p): p is { text: string; color: string | undefined } => !!p);
  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        children: contactParts.flatMap((part, i) => [
          ...(i > 0 ? [new TextRun({ text: ' | ' })] : []),
          new TextRun({ text: part.text, color: part.color ? hex(part.color) : undefined }),
        ]),
        spacing: { after: 200 },
      }),
    );
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
