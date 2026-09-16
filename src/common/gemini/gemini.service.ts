import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, type Part } from '@google/genai';
import {
  RESUME_EXTRACTION_PROMPT,
  RESUME_EXTRACTION_SCHEMA,
  type ParsedResumeData,
} from './resume-schema.js';
import {
  buildSuggestionsPrompt,
  SUGGESTIONS_SCHEMA,
  type SuggestionInput,
  type SuggestionResult,
} from './suggestion-schema.js';
import {
  buildJdMatchPrompt,
  JD_MATCH_SCHEMA,
  type JdMatchResult,
  type JdMatchTarget,
} from './jd-match-schema.js';

const MODEL = 'gemini-3.6-flash';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    this.client = new GoogleGenAI({
      apiKey: this.configService.get<string>('GEMINI_API_KEY') ?? '',
    });
  }

  /**
   * Extracts structured resume data from either a PDF (sent natively as
   * multimodal input, since Gemini reads layout/columns far better than a
   * text-extraction library would) or plain text (already extracted from a
   * DOCX via mammoth, since Gemini doesn't accept .docx as inline media).
   */
  async parseResume(input: { pdfBase64: string } | { text: string }): Promise<ParsedResumeData> {
    const contentPart: Part =
      'pdfBase64' in input
        ? { inlineData: { data: input.pdfBase64, mimeType: 'application/pdf' } }
        : { text: input.text };

    try {
      const response = await this.client.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts: [contentPart, { text: RESUME_EXTRACTION_PROMPT }] }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: RESUME_EXTRACTION_SCHEMA,
        },
      });

      const raw = response.text;
      if (!raw) throw new Error('Gemini returned an empty response');

      return JSON.parse(raw) as ParsedResumeData;
    } catch (err) {
      this.logger.error(`Resume parsing failed: ${(err as Error).message}`);
      throw new InternalServerErrorException('Failed to parse resume');
    }
  }

  /** Generates one rewrite suggestion per input text block, matched back by `index`. */
  async generateSuggestions(items: SuggestionInput[]): Promise<SuggestionResult[]> {
    try {
      const response = await this.client.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts: [{ text: buildSuggestionsPrompt(items) }] }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: SUGGESTIONS_SCHEMA,
        },
      });

      const raw = response.text;
      if (!raw) throw new Error('Gemini returned an empty response');

      return JSON.parse(raw) as SuggestionResult[];
    } catch (err) {
      this.logger.error(`Suggestion generation failed: ${(err as Error).message}`);
      throw new InternalServerErrorException('Failed to generate suggestions');
    }
  }

  /** Scores a CV's fit against a job description and suggests targeted rewrites for weak text blocks. */
  async analyzeJobMatch(
    jobDescriptionText: string,
    skills: string[],
    targets: JdMatchTarget[],
  ): Promise<JdMatchResult> {
    try {
      const response = await this.client.models.generateContent({
        model: MODEL,
        contents: [
          { role: 'user', parts: [{ text: buildJdMatchPrompt(jobDescriptionText, skills, targets) }] },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: JD_MATCH_SCHEMA,
        },
      });

      const raw = response.text;
      if (!raw) throw new Error('Gemini returned an empty response');

      return JSON.parse(raw) as JdMatchResult;
    } catch (err) {
      this.logger.error(`JD match analysis failed: ${(err as Error).message}`);
      throw new InternalServerErrorException('Failed to analyze job match');
    }
  }
}
