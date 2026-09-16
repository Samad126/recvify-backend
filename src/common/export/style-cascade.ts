import type { StyleOverrides } from './export-cv.types.js';

export const DEFAULT_ACCENT_COLOR = '#0F766E';
export const DEFAULT_FONT_FAMILY = 'Inter';
export const BASE_FONT_SIZE = 14;
export const DEFAULT_LINE_HEIGHT = 1.4;

export interface ResolvedStyle {
  color: string;
  /** Same as `color`, but `undefined` when no layer set an accentColor at all — for text that should stay neutral (e.g. a job title) unless explicitly colored, instead of always defaulting to the accent. */
  explicitColor: string | undefined;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  /** `undefined` unless a layer explicitly set it — these are toggles, not cascaded defaults. */
  bold: boolean | undefined;
  italic: boolean | undefined;
  underline: boolean | undefined;
  /** Relative to the 14px design baseline — multiply an element's base px size by this. */
  fontScale: number;
}

/**
 * Mirrors the frontend's lib/utils/style-cascade.ts so the PDF/DOCX exports
 * resolve font/color the same way the live editor preview does: layers passed
 * lowest-to-highest priority (template default → CV → section → entry), each
 * field independently falling back to the next layer down.
 */
export function resolveStyle(...layers: (StyleOverrides | null | undefined)[]): ResolvedStyle {
  let color = DEFAULT_ACCENT_COLOR;
  let explicitColor: string | undefined;
  let fontFamily = DEFAULT_FONT_FAMILY;
  let fontSize = BASE_FONT_SIZE;
  let lineHeight = DEFAULT_LINE_HEIGHT;
  let bold: boolean | undefined;
  let italic: boolean | undefined;
  let underline: boolean | undefined;

  for (const layer of layers) {
    if (!layer) continue;
    if (layer.accentColor) {
      color = layer.accentColor;
      explicitColor = layer.accentColor;
    }
    if (layer.fontFamily) fontFamily = layer.fontFamily;
    if (layer.fontSize) fontSize = layer.fontSize;
    if (layer.lineHeight) lineHeight = layer.lineHeight;
    if (layer.bold !== undefined) bold = layer.bold;
    if (layer.italic !== undefined) italic = layer.italic;
    if (layer.underline !== undefined) underline = layer.underline;
  }

  return {
    color,
    explicitColor,
    fontFamily,
    fontSize,
    lineHeight,
    bold,
    italic,
    underline,
    fontScale: fontSize / BASE_FONT_SIZE,
  };
}
