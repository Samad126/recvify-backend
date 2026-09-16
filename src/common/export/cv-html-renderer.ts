import type { CvSection } from '../../generated/prisma/client.js';
import {
  isSidebarSection,
  sectionLabel,
  type ContactInfo,
  type ExportableCv,
  type StyleOverrides,
  type TemplateStructure,
} from './export-cv.types.js';

const DEFAULT_FONT_SIZE_PX = 14;

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderEntry(section: CvSection, fields: Record<string, unknown>): string {
  switch (section.sectionType) {
    case 'SUMMARY':
    case 'CUSTOM':
      return `<p class="text">${escapeHtml(fields.text)}</p>`;
    case 'EXPERIENCE': {
      const dates = `${escapeHtml(fields.startDate)} – ${fields.isCurrent ? 'Present' : escapeHtml(fields.endDate)}`;
      return `<div class="entry">
        <div class="entry-header">
          <span class="entry-title">${escapeHtml(fields.jobTitle)} · ${escapeHtml(fields.company)}</span>
          <span class="entry-dates">${dates}</span>
        </div>
        <p class="text">${escapeHtml(fields.description)}</p>
      </div>`;
    }
    case 'EDUCATION': {
      const dates = `${escapeHtml(fields.startDate)} – ${escapeHtml(fields.endDate)}`;
      return `<div class="entry">
        <div class="entry-header">
          <span class="entry-title">${escapeHtml(fields.school)} — ${escapeHtml(fields.degree)}</span>
          <span class="entry-dates">${dates}</span>
        </div>
      </div>`;
    }
    case 'SKILLS':
      return `<span class="chip">${escapeHtml(fields.name)}${fields.level ? ` (${escapeHtml(fields.level)})` : ''}</span>`;
    case 'CERTIFICATIONS':
      return `<div class="entry">
        <span class="entry-title">${escapeHtml(fields.name)}${fields.issuer ? ` — ${escapeHtml(fields.issuer)}` : ''}</span>
        ${fields.date ? `<span class="entry-dates">${escapeHtml(fields.date)}</span>` : ''}
      </div>`;
    default:
      return '';
  }
}

function renderSection(section: CvSection & { entries: { fieldsJson: unknown }[] }): string {
  const isSkills = section.sectionType === 'SKILLS';
  const body = section.entries
    .map((entry) => renderEntry(section, entry.fieldsJson as Record<string, unknown>))
    .join('\n');
  return `<section class="section">
    <h2 class="section-title">${escapeHtml(sectionLabel(section))}</h2>
    <div class="${isSkills ? 'chips' : 'section-body'}">${body}</div>
  </section>`;
}

export function renderCvHtml(cv: ExportableCv): string {
  const structure = (cv.template.structureJson ?? {}) as TemplateStructure;
  const overrides = (cv.styleOverridesJson ?? {}) as StyleOverrides;
  const contact = (cv.contactInfoJson ?? {}) as ContactInfo;

  const fontFamily = overrides.fontFamily ?? structure.font ?? 'Inter';
  const accentColor = overrides.accentColor ?? structure.accentColor ?? '#0F766E';
  const fontSizePx = overrides.fontSize ?? DEFAULT_FONT_SIZE_PX;
  const isDark = overrides.theme === 'dark';
  const bg = isDark ? '#1a1a1a' : '#ffffff';
  const fg = isDark ? '#e5e5e5' : '#191c1e';
  const isTwoColumn = structure.layout === 'two-column';

  const mainSections = cv.sections.filter((s) => !isSidebarSection(structure, s.sectionType));
  const sidebarSections = isTwoColumn
    ? cv.sections.filter((s) => isSidebarSection(structure, s.sectionType))
    : [];

  const contactLine = [contact.email, contact.phone, contact.location].filter(Boolean).join(' &nbsp;|&nbsp; ');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: '${fontFamily}', Arial, sans-serif;
    font-size: ${fontSizePx}px;
    color: ${fg};
    background: ${bg};
    margin: 0;
  }
  h1 { font-size: ${fontSizePx + 14}px; margin: 0; }
  .header-title { font-size: ${fontSizePx + 4}px; color: ${accentColor}; margin: 4px 0; }
  .contact-line { font-size: ${fontSizePx - 1}px; margin-bottom: 16px; }
  .layout { display: ${isTwoColumn ? 'grid' : 'block'}; grid-template-columns: 2fr 1fr; gap: 24px; }
  .section { margin-bottom: 18px; }
  .section-title {
    font-size: ${fontSizePx + 2}px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${accentColor};
    border-bottom: 1px solid ${accentColor};
    padding-bottom: 4px;
    margin: 0 0 8px;
  }
  .entry { margin-bottom: 10px; }
  .entry-header { display: flex; justify-content: space-between; font-weight: 600; }
  .entry-dates { font-weight: 400; color: ${isDark ? '#aaa' : '#555'}; white-space: nowrap; }
  .text { margin: 4px 0 0; line-height: 1.4; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    background: ${isDark ? '#333' : '#f0f0f0'};
    font-size: ${fontSizePx - 1}px;
  }
</style>
</head>
<body>
  <h1>${escapeHtml(contact.fullName)}</h1>
  ${contact.title ? `<p class="header-title">${escapeHtml(contact.title)}</p>` : ''}
  ${contactLine ? `<p class="contact-line">${contactLine}</p>` : ''}
  <div class="layout">
    <div class="main">${mainSections.map(renderSection).join('\n')}</div>
    ${isTwoColumn ? `<div class="sidebar">${sidebarSections.map(renderSection).join('\n')}</div>` : ''}
  </div>
</body>
</html>`;
}
