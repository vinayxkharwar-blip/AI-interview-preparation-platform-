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

// Resume-specific file filter: PDF & DOCX only
const resumeFileFilter = (req, file, cb) => {
  const allowedExts = ['.pdf', '.docx', '.doc'];
  const allowedMimes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (allowedExts.includes(ext) && (allowedMimes.includes(mime) || mime === 'application/octet-stream' || mime.includes('document') || mime.includes('pdf'))) {
    cb(null, true);
  } else {
    const err = new Error('Invalid file type. Only PDF and DOCX documents are allowed.');
    err.code = 'INVALID_FILE_TYPE';
    cb(err, false);
  }
};

export const uploadResumeMiddleware = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: resumeFileFilter,
}).single('resume');

// Wrapper middleware to handle Multer errors cleanly and return 400
export const handleResumeUpload = (req, res, next) => {
  uploadResumeMiddleware(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size exceeds 5MB limit.' });
      }
      return res.status(400).json({ message: err.message || 'Error uploading resume file.' });
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
