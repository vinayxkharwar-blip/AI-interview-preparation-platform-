import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';
import { connectDB } from '../config/db.js';
import AptitudeQuestion from '../models/AptitudeQuestion.js';

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const checkStats = async () => {
  await connectDB();
  const count = await AptitudeQuestion.countDocuments({ isArchived: false });
  const byCompany = await AptitudeQuestion.aggregate([
    { $match: { isArchived: false } },
    { $group: { _id: '$company', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  const byTopic = await AptitudeQuestion.aggregate([
    { $match: { isArchived: false } },
    { $group: { _id: '$topic', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  console.log('Total verified questions in MongoDB Atlas:', count);
  console.log('By Company:', JSON.stringify(byCompany, null, 2));
  console.log('By Topic:', JSON.stringify(byTopic, null, 2));
  process.exit(0);
};

checkStats().catch(err => {
  console.error(err);
  process.exit(1);
});
