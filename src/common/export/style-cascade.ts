import type { StyleOverrides } from './export-cv.types.js';

export const DEFAULT_ACCENT_COLOR = '#0F766E';
export const DEFAULT_FONT_FAMILY = 'Inter';
export const BASE_FONT_SIZE = 14;

export interface ResolvedStyle {
  color: string;
  fontFamily: string;
  fontSize: number;
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
  let fontFamily = DEFAULT_FONT_FAMILY;
  let fontSize = BASE_FONT_SIZE;

  for (const layer of layers) {
    if (!layer) continue;
    if (layer.accentColor) color = layer.accentColor;
    if (layer.fontFamily) fontFamily = layer.fontFamily;
    if (layer.fontSize) fontSize = layer.fontSize;
  }

  return { color, fontFamily, fontSize, fontScale: fontSize / BASE_FONT_SIZE };
}
