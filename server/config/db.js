import mongoose from 'mongoose';
import dns from 'dns';

// Prefer IPv4 resolution on Node 18+ on Windows to avoid IPv6 timeouts
try {
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) {
  // Ignore DNS config errors
}

// Disable Mongoose command buffering globally so operations don't hang when DB is disconnected
mongoose.set('bufferCommands', false);

const connectionOptions = {
  family: 4,
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
};

export const connectDB = async () => {
  let mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  const fallbackDirectUri = process.env.MONGO_DIRECT_URI;

  if (!mongoUri || !mongoUri.trim()) {
    throw new Error('MONGO_URI (or MONGODB_URI) is missing in environment variables.');
  }

  const maxRetries = 2;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const conn = await mongoose.connect(mongoUri, connectionOptions);
      console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.warn(`[MongoDB Warning] Connection attempt ${attempt} failed: ${error.message}`);

      // If initial attempt failed with SRV / DNS error and an optional direct URI is configured in env
      if (attempt === 1 && mongoUri.startsWith('mongodb+srv://') && fallbackDirectUri) {
        console.log('[MongoDB Notice] Retrying with configured MONGO_DIRECT_URI (bypassing SRV DNS lookup)...');
        mongoUri = fallbackDirectUri;
        continue;
      }

      if (attempt < maxRetries) {
        console.warn('[MongoDB Warning] Retrying connection in 2 seconds...');
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        console.error(`[MongoDB Warning] Database connection failed after ${maxRetries} attempts: ${error.message}`);
        console.log('[MongoDB Notice] Operating in fallback mode.');
      }
    }
  }
};
