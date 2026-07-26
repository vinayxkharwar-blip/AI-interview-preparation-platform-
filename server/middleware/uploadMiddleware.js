import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(process.cwd(), 'uploads');
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

const fileFilter = (req, file, cb) => {
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
  fileFilter,
});
