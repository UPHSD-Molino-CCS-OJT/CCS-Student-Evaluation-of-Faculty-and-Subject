require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

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
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/faculty_evaluation';

// MongoDB connection options optimized for both local and Vercel
const options = {
    serverSelectionTimeoutMS: process.env.VERCEL ? 10000 : 30000, // Shorter timeout on Vercel
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4, // Use IPv4, skip trying IPv6 (helps with DNS issues on Windows)
    retryWrites: true,
    w: 'majority',
    maxPoolSize: process.env.VERCEL ? 10 : 100, // Smaller pool for serverless
    minPoolSize: process.env.VERCEL ? 1 : 10
};

// Connect to MongoDB
mongoose.connect(mongoURI, options)
    .then(() => {
        console.log('✓ MongoDB connected successfully');
        console.log('✓ Database:', mongoose.connection.name);
    })
    .catch(err => {
        console.error('✗ MongoDB connection failed:', err.message);
        console.error('✗ Full error:', err);
        process.exit(1);
    });

// Handle connection events
mongoose.connection.on('connected', () => {
    console.log('✓ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('✗ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('✗ Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('✓ MongoDB connection closed through app termination');
    process.exit(0);
});

module.exports = mongoose.connection;
