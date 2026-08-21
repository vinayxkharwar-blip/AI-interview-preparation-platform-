import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const isDeleteMode = process.argv.includes('--delete') || process.env.DELETE_INVALID === 'true';

async function cleanInvalidUsers() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/ai-interview-prep';

  console.log('====================================================');
  console.log('[Cleanup Script] Connecting to MongoDB...');
  console.log(`[Cleanup Script] Target URI: ${mongoUri.replace(/:([^@]+)@/, ':****@')}`);
  console.log(`[Cleanup Script] Execution Mode: ${isDeleteMode ? 'EXECUTE DELETE (--delete)' : 'DRY RUN (preview only)'}`);
  console.log('====================================================\n');

  try {
    await mongoose.connect(mongoUri);
    console.log('[Cleanup Script] MongoDB connection established successfully.\n');

    const db = mongoose.connection.db;

    // Use native driver to bypass Mongoose Schema ObjectId casting
    const invalidUsers = await db
      .collection('users')
      .find({
        $or: [
          { _id: { $type: 'string' } },
          { _id: { $regex: '^user-' } }
        ]
      })
      .toArray();

    console.log(`[Cleanup Script] Found ${invalidUsers.length} user document(s) with invalid string-based _id format:\n`);

    if (invalidUsers.length === 0) {
      console.log('✓ No invalid string-based user records found in MongoDB.');
      await mongoose.disconnect();
      process.exit(0);
    }

    const invalidUserIds = [];

    invalidUsers.forEach((u, index) => {
      invalidUserIds.push(u._id);
      console.log(`  ${index + 1}. ID: "${u._id}" | Email: "${u.email || 'N/A'}" | Name: "${u.name || 'N/A'}" | CreatedAt: ${u.createdAt || 'N/A'}`);
    });

    console.log('\n[Cleanup Script] Checking related collections for orphaned records...');

    const collectionsToCheck = ['sessions', 'resumes', 'answers', 'feedbacks', 'improvementplans', 'analyticssnapshots'];
    const orphanedCounts = {};

    for (const collName of collectionsToCheck) {
      const collectionsList = await db.listCollections({ name: collName }).toArray();
      if (collectionsList.length > 0) {
        const count = await db.collection(collName).countDocuments({
          $or: [
            { user: { $in: invalidUserIds } },
            { user: { $type: 'string' } }
          ]
        });
        orphanedCounts[collName] = count;
        console.log(`  - Collection "${collName}": ${count} matching/orphaned document(s)`);
      }
    }

    if (isDeleteMode) {
      console.log('\n----------------------------------------------------');
      console.log('[Cleanup Script] DELETING invalid records...');

      const deleteUsersResult = await db.collection('users').deleteMany({
        $or: [
          { _id: { $type: 'string' } },
          { _id: { $regex: '^user-' } }
        ]
      });
      console.log(`✓ Deleted ${deleteUsersResult.deletedCount} invalid user document(s) from "users" collection.`);

      for (const collName of collectionsToCheck) {
        const collectionsList = await db.listCollections({ name: collName }).toArray();
        if (collectionsList.length > 0) {
          const deleteRelResult = await db.collection(collName).deleteMany({
            $or: [
              { user: { $in: invalidUserIds } },
              { user: { $type: 'string' } }
            ]
          });
          if (deleteRelResult.deletedCount > 0) {
            console.log(`✓ Deleted ${deleteRelResult.deletedCount} orphaned document(s) from "${collName}".`);
          }
        }
      }
      console.log('----------------------------------------------------');
      console.log('Cleanup completed successfully!');
    } else {
      console.log('\n----------------------------------------------------');
      console.log('[DRY RUN NOTICE] No changes were made to MongoDB.');
      console.log('To permanently remove these invalid records, run:');
      console.log('  node server/scripts/cleanInvalidUsers.js --delete');
      console.log('----------------------------------------------------');
    }
  } catch (err) {
    console.error('[Cleanup Script Error]', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('[Cleanup Script] MongoDB connection closed.');
  }
}

cleanInvalidUsers();
