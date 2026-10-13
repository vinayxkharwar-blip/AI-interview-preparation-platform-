import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, '../data/authorized_pyq_template.json');
const csvPath = path.join(__dirname, '../data/authorized_pyq_template.csv');

const items = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const headers = [
  'company',
  'exam_name',
  'exam_year',
  'topic',
  'subtopic',
  'difficulty',
  'question_text',
  'options',
  'correct_answer',
  'explanation',
  'source_reference',
  'source_type',
  'verification_status',
];

const escapeCSV = (val) => {
  if (val === undefined || val === null) return '';
  const str = Array.isArray(val) ? val.join(' | ') : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const rows = [headers.join(',')];

for (const item of items) {
  const row = [
    escapeCSV(item.company),
    escapeCSV(item.examName),
    escapeCSV(item.examYear),
    escapeCSV(item.topic),
    escapeCSV(item.subtopic),
    escapeCSV(item.difficulty),
    escapeCSV(item.questionText),
    escapeCSV(item.options),
    escapeCSV(item.correctAnswer),
    escapeCSV(item.explanation),
    escapeCSV(item.sourceTitle || item.sourceUrl),
    escapeCSV(item.sourceType),
    escapeCSV(item.verificationStatus),
  ];
  rows.push(row.join(','));
}

fs.writeFileSync(csvPath, rows.join('\n'), 'utf8');
console.log(`✅ Generated ${csvPath} with ${items.length} questions`);
