import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const EXTENSION_BY_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
};

function ensureUploadDir(): string {
  const dir = path.resolve(process.cwd(), env.UPLOAD_DIR);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      cb(null, ensureUploadDir());
    } catch (err) {
      cb(err as Error, '');
    }
  },
  filename: (_req, file, cb) => {
    const ext = EXTENSION_BY_MIME[file.mimetype] ?? path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  },
});

export const uploadResume = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(
        new ApiError(400, 'Unsupported file type. Upload a PDF, DOCX, or TXT file.', {
          code: 'UNSUPPORTED_FILE_TYPE',
        }),
      );
      return;
    }
    cb(null, true);
  },
}).single('file');

export function removeUploadedFile(filePathOrName: string): void {
  const fullPath = path.isAbsolute(filePathOrName)
    ? filePathOrName
    : path.resolve(process.cwd(), env.UPLOAD_DIR, filePathOrName);
  fs.promises.unlink(fullPath).catch(() => {
    /* file may already be gone; safe to ignore */
  });
}

export function getUploadPath(fileName: string): string {
  return path.isAbsolute(fileName)
    ? fileName
    : path.resolve(process.cwd(), env.UPLOAD_DIR, fileName);
}
