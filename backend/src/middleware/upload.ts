import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { AppError } from './errorHandler';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'application/pdf': '.pdf',
};

const SIGNATURES: Record<string, (buf: Buffer) => boolean> = {
  'image/jpeg': (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/gif': (b) => {
    if (b.length < 6) return false;
    const magic = b.subarray(0, 6).toString('ascii');
    return magic === 'GIF87a' || magic === 'GIF89a';
  },
  'image/webp': (b) => b.length >= 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
  'video/mp4': (b) => b.length >= 12 && b.subarray(4, 8).toString('ascii') === 'ftyp',
  'video/webm': (b) => b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3,
  'application/pdf': (b) => b.length >= 5 && b.subarray(0, 5).toString('ascii') === '%PDF-',
};

// Verify a file's magic bytes match the declared mime type. The client-sent
// Content-Type must not be trusted on its own, otherwise arbitrary content
// (HTML/scripts) could be stored under an allowed image/video/pdf name.
export function verifyFileSignature(filePath: string, mime: string): boolean {
  const check = SIGNATURES[mime];
  // Whitelist-then-fail: an unrecognised declared type must not pass.
  if (!check) return false;
  try {
    const buf = Buffer.alloc(16);
    const fd = fs.openSync(filePath, 'r');
    try {
      fs.readSync(fd, buf, 0, 16, 0);
    } finally {
      fs.closeSync(fd);
    }
    return check(buf);
  } catch {
    return false;
  }
}

function safeExt(mime: string): string {
  return EXT_BY_MIME[mime] || '';
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.upload.dir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${uuidv4()}${safeExt(file.mimetype)}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only images and videos are allowed.', 400) as unknown as Error);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.upload.maxFileSize },
});

const importStorage = multer.memoryStorage();

const importFileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/csv',
    'text/plain',
    'application/octet-stream',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.', 400) as unknown as Error);
  }
};

export const importUpload = multer({
  storage: importStorage,
  fileFilter: importFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

const reportStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(config.upload.dir, 'reports'));
  },
  filename: (_req, file, cb) => {
    cb(null, `${uuidv4()}${safeExt(file.mimetype) || '.pdf'}`);
  },
});

const reportFileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['application/pdf', 'application/octet-stream'];
  if (allowedTypes.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.pdf')) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only PDF files are allowed.', 400) as unknown as Error);
  }
};

export const reportUpload = multer({
  storage: reportStorage,
  fileFilter: reportFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});
