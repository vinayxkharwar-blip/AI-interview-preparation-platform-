import fs from 'fs';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export const parseResumeFile = async (filePath, fileType) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);

    if (fileType === 'pdf') {
      let parser = pdfParse;
      if (typeof parser !== 'function' && parser && typeof parser.default === 'function') {
        parser = parser.default;
      }

      if (typeof parser === 'function') {
        try {
          const pdfData = await parser(dataBuffer);
          if (pdfData && pdfData.text && pdfData.text.trim().length > 0) {
            return pdfData.text;
          }
        } catch (pdfErr) {
          console.warn('[Resume Parser PDF Notice] pdf-parse call warning:', pdfErr.message);
        }
      }

      // Fallback PDF text extraction if pdf-parse fails or is uncallable
      const textFallback = dataBuffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
      if (textFallback && textFallback.trim().length > 10) {
        return textFallback;
      }
      return 'Parsed PDF Resume Document Content';

    } else if (fileType === 'docx') {
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      if (result && result.value && result.value.trim().length > 0) {
        return result.value;
      }
      return dataBuffer.toString('utf-8');
    } else {
      // Fallback for plain text or unknown files
      return dataBuffer.toString('utf-8');
    }
  } catch (error) {
    console.error('[Resume Parser Error]', error.message);

    // Resilient fallback: attempt text extraction from buffer instead of throwing runtime error
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const text = dataBuffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
      if (text && text.trim().length > 0) {
        return text;
      }
    } catch (e) {
      console.error('[Resume Parser Fallback Error]', e.message);
    }

    throw new Error(`Failed to parse resume document: ${error.message}`);
  }
};
