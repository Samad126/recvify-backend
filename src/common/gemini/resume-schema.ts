import { Schema, Type } from '@google/genai';

/**
 * Structured-output schema handed to Gemini so it returns resume data in a
 * predictable shape (see `ParsedResumeData` below) instead of free-form text.
 */
export const RESUME_EXTRACTION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    personal: {
      type: Type.OBJECT,
      properties: {
        fullName: { type: Type.STRING },
        title: { type: Type.STRING },
        email: { type: Type.STRING },
        phone: { type: Type.STRING },
        location: { type: Type.STRING },
      },
    },
    summary: { type: Type.STRING },
    experience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          jobTitle: { type: Type.STRING },
          company: { type: Type.STRING },
          startDate: { type: Type.STRING },
          endDate: { type: Type.STRING },
          isCurrent: { type: Type.BOOLEAN },
          description: { type: Type.STRING },
        },
        required: ['jobTitle', 'company', 'startDate', 'description'],
      },
    },
    education: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          school: { type: Type.STRING },
          degree: { type: Type.STRING },
          startDate: { type: Type.STRING },
          endDate: { type: Type.STRING },
        },
        required: ['school', 'degree', 'startDate'],
      },
    },
    skills: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ['personal', 'summary', 'experience', 'education', 'skills'],
};

export interface ParsedResumePersonal {
  fullName?: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
}

export interface ParsedResumeExperience {
  jobTitle: string;
  company: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  description: string;
}

export interface ParsedResumeEducation {
  school: string;
  degree: string;
  startDate: string;
  endDate?: string;
}

export interface ParsedResumeData {
  personal: ParsedResumePersonal;
  summary: string;
  experience: ParsedResumeExperience[];
  education: ParsedResumeEducation[];
  skills: string[];
}

export const RESUME_EXTRACTION_PROMPT = `You are extracting structured data from a resume/CV for a resume-building app.
Read the attached resume and return the person's personal details, professional summary, work experience, education, and skills.
Keep dates as they're written in the source document (e.g. "Mar 2020", "2020-2023", free text is fine). If a field genuinely isn't present in the resume, omit it rather than inventing a value.`;
