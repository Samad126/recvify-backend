import type { Cv, CvEntry, CvSection, Template } from '../../generated/prisma/client.js';

export type ExportableCv = Cv & {
  template: Template;
  sections: (CvSection & { entries: CvEntry[] })[];
};

export interface ContactInfo {
  fullName?: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
}

export interface StyleOverrides {
  fontFamily?: string;
  fontSize?: number;
  accentColor?: string;
  theme?: 'light' | 'dark';
}

export interface TemplateStructure {
  layout?: 'single-column' | 'two-column';
  sections?: { type: string; position?: string | number }[];
  font?: string;
  accentColor?: string;
}

const SECTION_LABELS: Record<string, string> = {
  SUMMARY: 'Summary',
  EXPERIENCE: 'Experience',
  EDUCATION: 'Education',
  SKILLS: 'Skills',
  CERTIFICATIONS: 'Certifications',
  CUSTOM: 'Custom',
};

export function sectionLabel(section: CvSection): string {
  return section.title ?? SECTION_LABELS[section.sectionType] ?? section.sectionType;
}

export function isSidebarSection(structure: TemplateStructure, sectionType: string): boolean {
  const entry = structure.sections?.find((s) => s.type === sectionType.toLowerCase());
  return entry?.position === 'sidebar';
}
