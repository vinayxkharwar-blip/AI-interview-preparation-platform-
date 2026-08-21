import mongoose from 'mongoose';
import dns from 'dns';

// Force Node.js DNS resolver to use Google Public DNS servers for mongodb+srv:// resolution on Windows
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  console.warn('[DNS Warning] Failed to set custom DNS servers:', e.message);
}

// Disable Mongoose command buffering globally so operations don't hang when DB is disconnected
mongoose.set('bufferCommands', false);

export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai-interview-prep';
  const maxRetries = 2;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}`);
      return;
    } catch (error) {
      if (attempt < maxRetries) {
        console.warn(`[MongoDB Warning] Connection attempt ${attempt} failed (${error.message}). Retrying in 3 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } else {
        console.error(`[MongoDB Warning] Database connection failed after ${maxRetries} attempts: ${error.message}`);
        console.log('[MongoDB Notice] Possible causes & troubleshooting steps:');
        console.log('                 1. Windows/Node SRV DNS issues (Google DNS fallback configured above).');
        console.log('                 2. IP Access List in MongoDB Atlas: Ensure Network Access whitelist includes 0.0.0.0/0 or your current IP.');
        console.log('                 3. Verify database credentials in server/.env file.');
        console.log('[MongoDB Notice] Operating in fast in-memory fallback mode.');
      }
    }
  }
};