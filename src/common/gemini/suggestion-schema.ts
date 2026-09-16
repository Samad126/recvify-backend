import { Schema, Type } from '@google/genai';

export const SUGGESTIONS_SCHEMA: Schema = {
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
};

export interface SuggestionInput {
  index: number;
  text: string;
}

export interface SuggestionResult {
  index: number;
  label: string;
  suggestedText: string;
}

export function buildSuggestionsPrompt(items: SuggestionInput[]): string {
  const blocks = items.map((item) => `[${item.index}] ${item.text}`).join('\n\n');
  return `You are an expert resume writer. For each numbered text block below, rewrite it to be more impactful — stronger action verbs, quantified impact where it's plausible from context, professional tone — while staying truthful to the original content and roughly the same length. Return exactly one suggestion per block, referencing it by its index. Also include a short label (3-5 words) describing the type of improvement, e.g. "Stronger action verbs", "Quantified impact", "Professional tone".

${blocks}`;
}
