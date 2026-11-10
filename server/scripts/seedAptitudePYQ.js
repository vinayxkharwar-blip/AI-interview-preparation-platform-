import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';
import AptitudeQuestion, { computeQuestionHash } from '../models/AptitudeQuestion.js';
import { validateQuestionPayload } from '../services/aptitudePYQService.js';
import { COMPREHENSIVE_QUESTION_BANK } from '../data/companyAptitudeQuestionBank.js';
import { TOPIC_QUESTION_CATALOG } from '../data/topicQuestionCatalog.js';
import { connectDB } from '../config/db.js';

// Configure DNS for MongoDB Atlas SRV lookup reliability on Windows
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  // Ignore if already set
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

export const seedAptitudeBank = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB Atlas...');
    await connectDB();
    console.log('✅ [Seed] Connected to MongoDB Atlas successfully.');

    // Combine both company bank and topic catalog
    const allQuestionsToSeed = [
      ...COMPREHENSIVE_QUESTION_BANK,
      ...TOPIC_QUESTION_CATALOG.map((tq) => ({
        company: 'General Aptitude',
        examName: 'Placement Aptitude Practice',
        examYear: 2024,
        topic: tq.topic,
        subtopic: tq.subtopic,
        difficulty: tq.difficulty,
        questionText: tq.questionText,
        options: tq.options,
        correctAnswer: tq.correctAnswer,
        explanation: tq.explanation,
        sourceTitle: `${tq.topic} - ${tq.subtopic} Question Bank`,
        sourceUrl: 'https://prepilot.ai/practice',
        sourceType: 'authorized_curated',
        verificationStatus: 'verified',
      })),
    ];

    console.log(`[Seed] Processing ${allQuestionsToSeed.length} questions...`);

    let inserted = 0;
    let skipped = 0;
    let failed = 0;

    for (const q of allQuestionsToSeed) {
      const validation = validateQuestionPayload(q);
      if (!validation.isValid) {
        console.warn(`⚠️ Validation failed for: "${q.questionText?.substring(0, 40)}" - ${validation.errors.join(', ')}`);
        failed++;
        continue;
      }

      const contentHash = computeQuestionHash(q.company, q.questionText);
      const existing = await AptitudeQuestion.findOne({ contentHash });

      if (existing) {
        skipped++;
        continue;
      }

      await AptitudeQuestion.create({
        ...validation.sanitized,
        contentHash,
        verificationStatus: 'verified',
        isArchived: false,
        verifiedAt: new Date(),
      });

      inserted++;
    }

    console.log('----------------------------------------------------');
    console.log(`🎯 Seed completed! Inserted: ${inserted}, Skipped (duplicates): ${skipped}, Failed: ${failed}`);
    console.log('----------------------------------------------------');

    return { inserted, skipped, failed };
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    throw error;
  }
};

// If run directly from CLI
if (process.argv[1] && process.argv[1].endsWith('seedAptitudePYQ.js')) {
  seedAptitudeBank()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
