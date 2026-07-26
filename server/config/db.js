import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  // Ignore DNS override errors
}

import mongoose from 'mongoose';

// Disable Mongoose command buffering globally so operations don't hang when DB is disconnected
mongoose.set('bufferCommands', false);

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai-interview-prep';
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB Error] Connection failed: ${error.message}`);
    console.log('[MongoDB Notice] Operating in fast fallback mode for offline/disconnected database.');
  }
};