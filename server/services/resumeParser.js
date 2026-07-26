import fs from 'fs';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export const parseResumeFile = async (filePath, fileType) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);

    if (fileType === 'pdf') {
      const pdfData = await pdfParse(dataBuffer);
      return pdfData.text || '';
    } else if (fileType === 'docx') {
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      return result.value || '';
    } else {
      // Fallback for plain text or unknown files
      return dataBuffer.toString('utf-8');
    }
  } catch (error) {
    console.error('[Resume Parser Error]', error.message);
    throw new Error(`Failed to parse resume document: ${error.message}`);
  }
};
