import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import dns from 'dns';

// Load environment variables from backend/.env regardless of CWD
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Fix DNS resolution for Windows + MongoDB Atlas (only in development)
if (process.env.NODE_ENV !== 'production') {
  try {
    dns.setDefaultResultOrder('ipv4first');
    
    // Use Google DNS as fallback (helps with Windows DNS issues)
    dns.setServers([
      '8.8.8.8',       // Google DNS
      '8.8.4.4',       // Google DNS Secondary
      '1.1.1.1'        // Cloudflare DNS
    ]);
  } catch (err) {
    console.log('DNS configuration skipped (production environment)');
  }
}

// MongoDB connection string - supports both local and MongoDB Atlas
const mongoURI: string = process.env.MONGODB_URI || 'mongodb://localhost:27017/faculty_evaluation';

// MongoDB connection options optimized for both local and Vercel
// Increased pool sizes to handle parallel automated testing (10+ concurrent browsers)
const options: mongoose.ConnectOptions = {
  serverSelectionTimeoutMS: process.env.VERCEL ? 10000 : 30000,
  socketTimeoutMS: 45000,
  family: 4,
  retryWrites: true,
  maxPoolSize: process.env.VERCEL ? 10 : 200, // Increased from 100 to 200 for parallel testing
  minPoolSize: process.env.VERCEL ? 1 : 20    // Increased from 10 to 20 for parallel testing
};

// Connect to MongoDB
mongoose.connect(mongoURI, options)
  .then(() => {
    console.log('✓ MongoDB connected successfully');
    console.log('✓ Database:', mongoose.connection.name);
  })
  .catch((err: Error) => {
    console.error('✗ MongoDB connection failed:', err.message);
    console.error('✗ Full error:', err);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('✓ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err: Error) => {
  console.error('✗ Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('✗ Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('✓ MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error closing MongoDB connection:', err);
    process.exit(1);
  }
});

export const connection = mongoose.connection;
export { mongoose };
export default mongoose;
