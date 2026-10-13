import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import AptitudeQuestion, { computeQuestionHash } from '../models/AptitudeQuestion.js';
import { validateQuestionPayload } from '../services/aptitudePYQService.js';
import { connectDB } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const seedAuthorizedPYQs = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await connectDB();
    console.log('✅ Connected to MongoDB successfully.');

    const dataPath = path.join(__dirname, '../data/authorized_pyq_template.json');
    if (!fs.existsSync(dataPath)) {
      console.error(`❌ Data template file not found at: ${dataPath}`);
      process.exit(1);
    }

    const rawContent = fs.readFileSync(dataPath, 'utf8');
    const questions = JSON.parse(rawContent);

    console.log(`Processing ${questions.length} authorized questions...`);

    let inserted = 0;
    let skipped = 0;
    let failed = 0;

    for (const q of questions) {
      const validation = validateQuestionPayload(q);
      if (!validation.isValid) {
        console.warn(`⚠️ Validation failed for: "${q.questionText?.substring(0, 40)}" - ${validation.errors.join(', ')}`);
        failed++;
        continue;
      }

      const contentHash = computeQuestionHash(q.company, q.questionText);
      const existing = await AptitudeQuestion.findOne({ contentHash });

      if (existing) {
        console.log(`ℹ️ Question already exists (duplicate skipped): [${q.company}] "${q.questionText.substring(0, 40)}..."`);
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

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    process.exit(1);
  }
};

seedAuthorizedPYQs();
