import { Document, HeadingLevel, ImageRun, Packer, Paragraph, TextRun, UnderlineType } from 'docx';
import type { CvEntry, CvSection } from '../../generated/prisma/client.js';
import { type ResolvedStyle, resolveStyle } from './style-cascade.js';
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

/**
 * Bold/italic run properties for one resolved field style. `defaultBold`/
 * `defaultItalic` match the design's baseline for that field (e.g. job
 * titles are bold by default) — an explicit override on the field still wins
 * either way, it just changes what "unset" falls back to.
 */
function runWeight(style: ResolvedStyle, defaultBold = false, defaultItalic = false) {
  return {
    bold: style.bold === undefined ? defaultBold : style.bold,
    italics: style.italic === undefined ? defaultItalic : style.italic,
    underline: style.underline ? { type: UnderlineType.SINGLE } : undefined,
  };
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
                ...runWeight(s, true),
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
              ...runWeight(bodyStyle),
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
              ...runWeight(titleStyle, true),
              color: titleStyle.explicitColor ? hex(titleStyle.explicitColor) : undefined,
              size: 16 * titleStyle.fontScale * 2,
            }),
            new TextRun({
              text: `    ${dates}`,
              ...runWeight(startStyle, false, true),
              color: startStyle.explicitColor ? hex(startStyle.explicitColor) : ON_SURFACE_VARIANT,
              size: 13 * 2,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: str(fields.company),
              ...runWeight(companyStyle),
              color: hex(companyStyle.color),
              size: 14 * companyStyle.fontScale * 2,
            }),
          ],
          spacing: { after: 40 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: str(fields.description),
              ...runWeight(descStyle),
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
              ...runWeight(degreeStyle, true),
              color: degreeStyle.explicitColor ? hex(degreeStyle.explicitColor) : undefined,
              size: 16 * degreeStyle.fontScale * 2,
            }),
            new TextRun({
              text: `    ${dates}`,
              ...runWeight(startStyle, false, true),
              color: startStyle.explicitColor ? hex(startStyle.explicitColor) : ON_SURFACE_VARIANT,
              size: 13 * 2,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: str(fields.school),
              ...runWeight(schoolStyle),
              color: hex(schoolStyle.color),
              size: 14 * schoolStyle.fontScale * 2,
            }),
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
              ...runWeight(s),
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
              ...runWeight(s),
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
  const headingStyle = resolveStyle(...sectionLayers);
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 120 },
      children: [
        new TextRun({
          text: sectionLabel(section).toUpperCase(),
          ...runWeight(headingStyle),
          color: hex(headingStyle.color),
        }),
      ],
    }),
    ...section.entries.flatMap((entry) => renderEntryParagraphs(section, entry, sectionLayers)),
  ];
}

const DOCX_IMAGE_TYPES: Record<string, 'jpg' | 'png' | 'gif' | 'bmp'> = {
  jpg: 'jpg',
  jpeg: 'jpg',
  png: 'png',
  gif: 'gif',
  bmp: 'bmp',
};

export async function buildCvDocx(
  cv: ExportableCv,
  photo?: { buffer: Buffer; ext: string },
): Promise<Buffer> {
  const structure = (cv.template.structureJson ?? {}) as TemplateStructure;
  const cvStyle = (cv.styleOverridesJson ?? {}) as StyleOverrides;
  const contact = (cv.contactInfoJson ?? {}) as ContactInfo;
  const templateLayer: StyleOverrides = { accentColor: structure.accentColor, fontFamily: structure.font };
  const headerStyle = resolveStyle(templateLayer, cvStyle, cvStyle.fieldOverrides?.title);
  // Name/contact-line stay neutral unless explicitly given a color — see
  // the matching comment in cv-html-renderer.ts.
  const nameStyle = resolveStyle(cvStyle, cvStyle.fieldOverrides?.fullName);
  const contactFieldStyle = (field: string) => resolveStyle(cvStyle, cvStyle.fieldOverrides?.[field]);

  const children: Paragraph[] = [];

  // Word has no simple circular-crop for images via this library — unlike
  // the PDF/live preview, the photo here is a plain square/rect. webp isn't
  // one of docx's supported ImageRun types, so it's skipped rather than
  // producing a broken image.
  const docxImageType = photo && DOCX_IMAGE_TYPES[photo.ext];
  if (photo && docxImageType) {
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: photo.buffer,
            type: docxImageType,
            transformation: { width: 80, height: 80 },
          }),
        ],
        spacing: { after: 120 },
      }),
    );
  }

  if (contact.fullName) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [
          new TextRun({
            text: contact.fullName,
            ...runWeight(nameStyle),
            color: nameStyle.explicitColor ? hex(nameStyle.explicitColor) : undefined,
          }),
        ],
      }),
    );
  }
  if (contact.title) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: contact.title,
            color: hex(headerStyle.color),
            ...runWeight(headerStyle, true),
          }),
        ],
      }),
    );
  }
  const contactParts = [
    contact.email && { text: contact.email, style: contactFieldStyle('email') },
    contact.phone && { text: contact.phone, style: contactFieldStyle('phone') },
    contact.location && { text: contact.location, style: contactFieldStyle('location') },
  ].filter((p): p is { text: string; style: ResolvedStyle } => !!p);
  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        children: contactParts.flatMap((part, i) => [
          ...(i > 0 ? [new TextRun({ text: ' | ' })] : []),
          new TextRun({
            text: part.text,
            ...runWeight(part.style),
            color: part.style.explicitColor ? hex(part.style.explicitColor) : undefined,
          }),
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
