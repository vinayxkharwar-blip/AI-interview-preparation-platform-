import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';

// Fix Windows DNS SRV lookup for MongoDB Atlas if local router DNS blocks SRV
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if not permitted
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function verifyDatabase() {
  console.log('--- DIRECTIVE 10: DATABASE INTEGRITY & DUPLICATE CHECKS ---');
  if (!process.env.MONGO_URI) {
    console.error('ERROR: MONGO_URI missing from environment.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas:', mongoose.connection.name);

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log(`Total collections found: ${collections.length}`);

  // Check SavedJobs for duplicate { user, jobId }
  const savedJobsColl = db.collection('savedjobs');
  const savedJobsCount = await savedJobsColl.countDocuments();
  console.log(`SavedJobs count: ${savedJobsCount}`);

  const duplicateSavedJobs = await savedJobsColl.aggregate([
    { $group: { _id: { user: '$user', jobId: '$jobId' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();

  if (duplicateSavedJobs.length > 0) {
    console.warn(`WARNING: Found ${duplicateSavedJobs.length} duplicate (user, jobId) pairs in savedjobs!`, duplicateSavedJobs);
  } else {
    console.log('✅ PASS: No duplicate (user, jobId) pairs found in savedjobs. Unique index safe to apply.');
  }

  // Check existing indexes across all collections
  const collectionsToCheck = [
    'sessions',
    'resumes',
    'questions',
    'answers',
    'feedbacks',
    'savedjobs',
    'applications',
    'coverletters',
    'placementdrives',
    'aptitudeattempts'
  ];

  for (const collName of collectionsToCheck) {
    const coll = db.collection(collName);
    try {
      const indexes = await coll.indexes();
      console.log(`Collection "${collName}" indexes (${indexes.length}):`);
      indexes.forEach(idx => {
        console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '(UNIQUE)' : ''}`);
      });
    } catch (e) {
      console.log(`   - Collection "${collName}" not initialized yet or empty.`);
    }
  }

  // Verify syncIndexes without errors
  await import('../models/SavedJob.js');
  await import('../models/Session.js');
  await import('../models/Answer.js');
  await import('../models/Feedback.js');
  await import('../models/Question.js');
  await import('../models/Resume.js');
  await import('../models/Application.js');
  await import('../models/CoverLetter.js');
  await import('../models/PlacementDrive.js');
  await import('../models/AptitudeAttempt.js');

  console.log('\nVerifying Mongoose syncIndexes on models...');
  for (const [modelName, model] of Object.entries(mongoose.models)) {
    try {
      await model.syncIndexes();
      console.log(`✅ Index sync successful for model: ${modelName}`);
      const newIndexes = await model.collection.indexes();
      newIndexes.forEach(idx => {
        console.log(`     - [${modelName}] ${idx.name}: ${JSON.stringify(idx.key)}`);
      });
    } catch (idxErr) {
      console.error(`❌ Index sync error on model ${modelName}:`, idxErr.message);
    }
  }

  await mongoose.disconnect();
  console.log('\n--- DATABASE INTEGRITY CHECK COMPLETE ---');
}

verifyDatabase().catch(err => {
  console.error('Database verification error:', err);
  process.exit(1);
});
