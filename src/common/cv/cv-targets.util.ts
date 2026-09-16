import type { DatabaseService } from '../database/database.service.js';
import type { SectionType } from '../../generated/prisma/client.js';

/** Only these section types carry free text worth rewriting. */
export const IMPROVABLE_SECTION_TYPES: SectionType[] = ['SUMMARY', 'EXPERIENCE', 'CUSTOM'];

export function fieldKeyFor(sectionType: SectionType): string {
  return sectionType === 'EXPERIENCE' ? 'description' : 'text';
}

export interface CvTarget {
  entryId: string;
  sectionId: string;
  fieldKey: string;
  text: string;
}

/** Collects every rewritable text block for a CV, scoped to the given section types. */
export async function collectImprovableTargets(
  db: DatabaseService,
  cvId: string,
  sectionTypes: SectionType[],
): Promise<CvTarget[]> {
  const sections = await db.cvSection.findMany({
    where: { cvId, sectionType: { in: sectionTypes } },
    include: { entries: true },
  });

  const targets: CvTarget[] = [];
  for (const section of sections) {
    const fieldKey = fieldKeyFor(section.sectionType);
    for (const entry of section.entries) {
      const fields = entry.fieldsJson as Record<string, unknown>;
      const text = fields[fieldKey];
      if (typeof text === 'string' && text.trim().length > 0) {
        targets.push({ entryId: entry.id, sectionId: section.id, fieldKey, text });
      }
    }
  }
  return targets;
}
