import fs from 'node:fs/promises';
import mammoth from 'mammoth';
import { ApiError } from '../../utils/ApiError';

export interface ExtractedResume {
  text: string;
  wordCount: number;
  summary: string;
}

const MAX_CHARS = 20000;

async function extractPdf(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);

  // pdfjs tries to polyfill Path2D via the optional `canvas` package (used only
  // for rendering). A stub avoids a noisy warning during pure text extraction.
  const g = globalThis as unknown as { Path2D?: unknown; DOMMatrix?: unknown };
  if (!g.Path2D) g.Path2D = class Path2D {};
  if (!g.DOMMatrix) g.DOMMatrix = class DOMMatrix {};

  // pdfjs-dist v3 ships a CommonJS "legacy" build that works in Node and Jest.
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.js') as {
    getDocument: (options: Record<string, unknown>) => { promise: Promise<any> };
  };

  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
  }).promise;

  let text = '';
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: { str?: string }) => (typeof item.str === 'string' ? item.str : ''))
      .join(' ');
    text += `${pageText}\n`;
  }
  return text;
}

async function extractDocx(filePath: string): Promise<string> {
  const { value } = await mammoth.extractRawText({ path: filePath });
  return value ?? '';
}

async function extractTxt(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function buildSummary(text: string): string {
  const paragraphs = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 40);
  const source = paragraphs.length > 0 ? paragraphs.slice(0, 3).join(' ') : text;
  return source.slice(0, 600).trim();
}

/**
 * Extracts plain text from an uploaded resume file (PDF, DOCX, or TXT).
 * Throws a clear ApiError when extraction yields nothing usable.
 */
export async function extractResume(filePath: string, mimeType: string): Promise<ExtractedResume> {
  let raw = '';
  try {
    if (mimeType === 'application/pdf') {
      raw = await extractPdf(filePath);
    } else if (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      raw = await extractDocx(filePath);
    } else if (mimeType === 'text/plain') {
      raw = await extractTxt(filePath);
    } else {
      throw ApiError.badRequest('Unsupported file type for text extraction');
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.badRequest(
      'Could not read this file. It may be corrupted or password-protected.',
    );
  }

  const text = cleanText(raw);
  if (text.length < 30) {
    throw ApiError.badRequest(
      'No readable text found. If this is a scanned PDF, please upload a text-based version.',
    );
  }

  const trimmed = text.slice(0, MAX_CHARS);
  return {
    text: trimmed,
    wordCount: trimmed.split(/\s+/).filter(Boolean).length,
    summary: buildSummary(trimmed),
  };
}
