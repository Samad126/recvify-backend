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

/**
 * Design tokens copied from the frontend's app/globals.css @theme block, so
 * the exported PDF matches the live editor preview instead of drifting into
 * its own generic layout.
 */
const TOKENS = {
  light: {
    surfaceContainerLowest: '#ffffff',
    surfaceContainer: '#eceef0',
    onSurface: '#191c1e',
    onSurfaceVariant: '#3e4947',
    outlineVariant: '#bdc9c6',
  },
  dark: {
    surfaceContainerLowest: '#1a1a1a',
    surfaceContainer: '#2a2a2a',
    onSurface: '#e5e5e5',
    onSurfaceVariant: '#b3b3b3',
    outlineVariant: '#444444',
  },
};

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function styleAttr(rules: Record<string, string | number | undefined>): string {
  const css = Object.entries(rules)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
  return css ? ` style="${css}"` : '';
}

type EntryWithStyle = CvEntry & { fieldsJson: unknown };

function renderEntry(
  section: CvSection,
  entry: EntryWithStyle,
  layers: (StyleOverrides | null | undefined)[],
): string {
  const fields = entry.fieldsJson as Record<string, unknown>;
  const style = resolveStyle(...layers, entry.styleOverridesJson as StyleOverrides | null);
  const entryFont = styleAttr({ 'font-family': `'${style.fontFamily}', Arial, sans-serif` });
  const accent = styleAttr({ color: style.color, 'font-size': `${14 * style.fontScale}px` });
  const body = styleAttr({ 'font-size': `${14 * style.fontScale}px` });
  const title = styleAttr({ 'font-size': `${16 * style.fontScale}px` });

  switch (section.sectionType) {
    case 'SUMMARY':
    case 'CUSTOM': {
      const heading = fields.title
        ? `<h3 class="entry-title"${title}>${escapeHtml(fields.title)}</h3>`
        : '';
      return `<div class="entry"${entryFont}>${heading}<p class="text"${body}>${escapeHtml(fields.text)}</p></div>`;
    }
    case 'EXPERIENCE': {
      const dates = `${escapeHtml(fields.startDate)} – ${fields.isCurrent ? 'Present' : escapeHtml(fields.endDate)}`;
      return `<div class="entry"${entryFont}>
        <div class="entry-header">
          <span class="entry-title"${title}>${escapeHtml(fields.jobTitle)}</span>
          <span class="entry-dates">${dates}</span>
        </div>
        <p class="entry-subtitle"${accent}>${escapeHtml(fields.company)}</p>
        <p class="text"${body}>${escapeHtml(fields.description)}</p>
      </div>`;
    }
    case 'EDUCATION': {
      const dates = `${escapeHtml(fields.startDate)} – ${escapeHtml(fields.endDate)}`;
      return `<div class="entry"${entryFont}>
        <div class="entry-header">
          <span class="entry-title"${title}>${escapeHtml(fields.degree)}</span>
          <span class="entry-dates">${dates}</span>
        </div>
        <p class="entry-subtitle"${accent}>${escapeHtml(fields.school)}</p>
      </div>`;
    }
    case 'SKILLS':
      return `<span class="chip"${entryFont}${body}>${escapeHtml(fields.name)}${fields.level ? ` · ${escapeHtml(fields.level)}` : ''}</span>`;
    case 'CERTIFICATIONS':
      return `<div class="entry"${entryFont}>
        <div class="entry-header">
          <span class="entry-title" style="font-size:14px">${escapeHtml(fields.name)}</span>
          <span class="entry-dates">${[fields.issuer, fields.date].filter(Boolean).map(escapeHtml).join(' · ')}</span>
        </div>
      </div>`;
    default:
      return '';
  }
}

function renderSection(
  section: CvSection & { entries: EntryWithStyle[] },
  layers: (StyleOverrides | null | undefined)[],
): string {
  const style = resolveStyle(...layers, section.styleOverridesJson as StyleOverrides | null);
  const sectionLayers = [...layers, section.styleOverridesJson as StyleOverrides | null];
  const isSkills = section.sectionType === 'SKILLS';
  const body = section.entries
    .map((entry) => renderEntry(section, entry, sectionLayers))
    .join('\n');
  const headerColorRule = (section.styleOverridesJson as StyleOverrides | null)?.accentColor
    ? `color:${style.color};`
    : '';
  return `<section class="section">
    <h2 class="section-title" style="font-family:'${style.fontFamily}', Arial, sans-serif;font-size:${14 * style.fontScale}px;${headerColorRule}">${escapeHtml(sectionLabel(section))}</h2>
    <div class="${isSkills ? 'chips' : 'section-body'}">${body}</div>
  </section>`;
}

export function renderCvHtml(cv: ExportableCv): string {
  const structure = (cv.template.structureJson ?? {}) as TemplateStructure;
  const cvStyle = (cv.styleOverridesJson ?? {}) as StyleOverrides;
  const contact = (cv.contactInfoJson ?? {}) as ContactInfo;

  const templateLayer: StyleOverrides = {
    accentColor: structure.accentColor,
    fontFamily: structure.font,
  };
  const headerStyle = resolveStyle(templateLayer, cvStyle);
  const isDark = cvStyle.theme === 'dark';
  const t = isDark ? TOKENS.dark : TOKENS.light;
  const isTwoColumn = structure.layout === 'two-column';

  const sortedSections = [...cv.sections].sort((a, b) => a.sortOrder - b.sortOrder);
  const mainSections = sortedSections.filter((s) => !isSidebarSection(structure, s.sectionType));
  const sidebarSections = isTwoColumn
    ? sortedSections.filter((s) => isSidebarSection(structure, s.sectionType))
    : [];
  const bodyLayers = [templateLayer, cvStyle];

  const contactLine = [contact.email, contact.phone, contact.location].filter(Boolean).join(' &nbsp;|&nbsp; ');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: '${headerStyle.fontFamily}', Arial, sans-serif;
    font-size: ${headerStyle.fontSize}px;
    color: ${t.onSurface};
    background: ${t.surfaceContainerLowest};
    margin: 0;
    padding: 40px;
  }
  .header { border-bottom: 2px solid ${t.onSurface}; padding-bottom: 16px; margin-bottom: 24px; }
  h1 { font-size: 32px; line-height: 40px; letter-spacing: -0.02em; font-weight: 700; margin: 0; text-transform: uppercase; color: ${t.onSurface}; }
  .header-title { font-size: 18px; line-height: 24px; font-weight: 600; color: ${headerStyle.color}; margin: 4px 0 0; }
  .contact-line { font-size: 13px; color: ${t.onSurfaceVariant}; margin-top: 8px; }
  .layout { display: ${isTwoColumn ? 'flex' : 'block'}; gap: 24px; align-items: flex-start; }
  .main { flex: 2; min-width: 0; }
  .sidebar { flex: 1; min-width: 0; background: ${t.surfaceContainer}66; border-radius: 8px; padding: 16px; margin-top: -4px; }
  .section { margin-bottom: 24px; }
  .section:last-child { margin-bottom: 0; }
  .section-title {
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${t.onSurface};
    border-bottom: 1px solid ${t.outlineVariant};
    padding-bottom: 4px;
    margin: 0 0 16px;
  }
  .entry { margin-bottom: 16px; }
  .entry:last-child { margin-bottom: 0; }
  .entry-title { font-weight: 600; color: ${t.onSurface}; }
  .entry-header { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .entry-dates { font-size: 13px; font-weight: 400; color: ${t.onSurfaceVariant}; white-space: nowrap; }
  .entry-subtitle { margin: 2px 0 8px; }
  .text { margin: 4px 0 0; line-height: 1.4; color: ${t.onSurfaceVariant}; white-space: pre-line; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    background: ${t.surfaceContainer};
    color: ${t.onSurfaceVariant};
  }
</style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(contact.fullName)}</h1>
    ${contact.title ? `<p class="header-title">${escapeHtml(contact.title)}</p>` : ''}
    ${contactLine ? `<p class="contact-line">${contactLine}</p>` : ''}
  </div>
  <div class="layout">
    <div class="main">${mainSections.map((s) => renderSection(s, bodyLayers)).join('\n')}</div>
    ${isTwoColumn && sidebarSections.length > 0 ? `<div class="sidebar">${sidebarSections.map((s) => renderSection(s, bodyLayers)).join('\n')}</div>` : ''}
  </div>
</body>
</html>`;
}
