import multer from 'multer';
import path from 'path';
import fs from 'fs';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

// Resume-specific file filter: PDF & DOCX only
const resumeFileFilter = (req, file, cb) => {
  const allowedExts = ['.pdf', '.docx', '.doc'];
  const allowedMimes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  if (allowedExts.includes(ext) && (allowedMimes.includes(mime) || mime.includes('document') || mime.includes('pdf'))) {
    cb(null, true);
  } else {
    const err = new Error('Invalid file type. Only PDF and DOCX documents are allowed.');
    err.code = 'INVALID_FILE_TYPE';
    cb(err, false);
  }
};

/**
 * Inspect document magic bytes to verify genuine file signature.
 * Prevents disguised executables or scripts from passing extension-only filters.
 */
export const verifyDocumentMagicBytes = async (filePath, ext) => {
  let fileHandle;
  try {
    fileHandle = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(8);
    const { bytesRead } = await fileHandle.read(buffer, 0, 8, 0);
    if (bytesRead < 4) return false;

    // PDF magic bytes: %PDF (0x25 0x50 0x44 0x46)
    if (ext === '.pdf') {
      return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
    }

    // DOCX (ZIP archive) magic bytes: PK\x03\x04 (0x50 0x4B 0x03 0x04)
    if (ext === '.docx') {
      return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
    }

    // DOC (OLE2 compound file) magic bytes: 0xD0 0xCF 0x11 0xE0 or ZIP PK\x03\x04
    if (ext === '.doc') {
      return (
        (buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0) ||
        (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04)
      );
    }

    return false;
  } catch (err) {
    return false;
  } finally {
    if (fileHandle) {
      await fileHandle.close().catch(() => {});
    }
  }
};

export const uploadResumeMiddleware = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: resumeFileFilter,
}).single('resume');

// Wrapper middleware to handle Multer errors and verify magic-byte signatures
export const handleResumeUpload = (req, res, next) => {
  uploadResumeMiddleware(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size exceeds 15MB limit.' });
      }
      return res.status(400).json({ message: err.message || 'Error uploading resume file.' });
    }

    if (req.file && req.file.path) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const isValidMagic = await verifyDocumentMagicBytes(req.file.path, ext);
      if (!isValidMagic) {
        fs.promises.unlink(req.file.path).catch(() => {});
        return res.status(400).json({
          message: 'Invalid document signature. File content does not match genuine PDF or DOCX format.',
        });
      }
    }

    next();
  });
};

const generalFileFilter = (req, file, cb) => {
  const allowedExts = ['.pdf', '.docx', '.doc', '.webm', '.wav', '.mp3', '.m4a', '.ogg'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExts.includes(ext) || file.mimetype.startsWith('audio/') || file.mimetype.includes('pdf') || file.mimetype.includes('document')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only PDF, DOCX, and Audio files are allowed.'), false);
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: generalFileFilter,
});
