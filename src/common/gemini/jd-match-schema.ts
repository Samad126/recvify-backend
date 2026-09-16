import { Schema, Type } from '@google/genai';
import type { SuggestionResult } from './suggestion-schema.js';

export const JD_MATCH_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    matchScore: { type: Type.NUMBER },
    summary: { type: Type.STRING },
    matchedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    suggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          index: { type: Type.NUMBER },
          label: { type: Type.STRING },
          suggestedText: { type: Type.STRING },
        },
        required: ['index', 'label', 'suggestedText'],
      },
    },
  },
  required: ['matchScore', 'summary', 'matchedKeywords', 'missingKeywords', 'suggestions'],
};

export interface JdMatchTarget {
  index: number;
  text: string;
}

export interface JdMatchResult {
  matchScore: number;
  summary: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: SuggestionResult[];
}

export function buildJdMatchPrompt(
  jobDescriptionText: string,
  skills: string[],
  targets: JdMatchTarget[],
): string {
  const blocks = targets.map((t) => `[${t.index}] ${t.text}`).join('\n\n');
  return `You are an expert resume/recruiting analyst. Compare the candidate's resume content below against the job description and produce a tailoring analysis.

Job description:
"""
${jobDescriptionText}
"""

Candidate's current skills: ${skills.length ? skills.join(', ') : '(none listed)'}

Candidate's resume text blocks (numbered):
${blocks || '(no rewritable text blocks found)'}

Return JSON with:
- matchScore: an honest 0-100 estimate of how well this resume matches the job description's requirements.
- summary: one encouraging sentence describing the overall fit and the single biggest lever to improve it, e.g. "Good foundation, needs targeted keywords."
- matchedKeywords: important skills/technologies/qualifications from the job description that the resume or skills list already demonstrates.
- missingKeywords: important skills/technologies/qualifications the job description asks for that are missing from the resume and skills list.
- suggestions: for each numbered block where a targeted rewrite would meaningfully improve alignment with this job description, return { index, label, suggestedText } — a rewrite emphasizing relevant keywords/impact while staying truthful to the original. Skip blocks that don't need changing; do not force a suggestion for every block.`;
}
