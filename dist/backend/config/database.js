"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongoose = exports.connection = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
exports.mongoose = mongoose_1.default;
const dns_1 = __importDefault(require("dns"));
// Load environment variables
dotenv_1.default.config();
// Fix DNS resolution for Windows + MongoDB Atlas (only in development)
if (process.env.NODE_ENV !== 'production') {
    try {
        dns_1.default.setDefaultResultOrder('ipv4first');
        // Use Google DNS as fallback (helps with Windows DNS issues)
        dns_1.default.setServers([
            '8.8.8.8', // Google DNS
            '8.8.4.4', // Google DNS Secondary
            '1.1.1.1' // Cloudflare DNS
        ]);
    }
    catch (err) {
        console.log('DNS configuration skipped (production environment)');
    }
}
// MongoDB connection string - supports both local and MongoDB Atlas
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/faculty_evaluation';
// MongoDB connection options optimized for both local and Vercel
// Increased pool sizes to handle parallel automated testing (10+ concurrent browsers)
const options = {
    serverSelectionTimeoutMS: process.env.VERCEL ? 10000 : 30000,
    socketTimeoutMS: 45000,
    family: 4,
    retryWrites: true,
    maxPoolSize: process.env.VERCEL ? 10 : 200, // Increased from 100 to 200 for parallel testing
    minPoolSize: process.env.VERCEL ? 1 : 20 // Increased from 10 to 20 for parallel testing
};
// Connect to MongoDB
mongoose_1.default.connect(mongoURI, options)
    .then(() => {
    console.log('✓ MongoDB connected successfully');
    console.log('✓ Database:', mongoose_1.default.connection.name);
})
    .catch((err) => {
    console.error('✗ MongoDB connection failed:', err.message);
    console.error('✗ Full error:', err);
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
});
// Handle connection events
mongoose_1.default.connection.on('connected', () => {
    console.log('✓ Mongoose connected to MongoDB');
});
mongoose_1.default.connection.on('error', (err) => {
    console.error('✗ Mongoose connection error:', err.message);
});
mongoose_1.default.connection.on('disconnected', () => {
    console.log('✗ Mongoose disconnected from MongoDB');
});
// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await mongoose_1.default.connection.close();
        console.log('✓ MongoDB connection closed through app termination');
        process.exit(0);
    }
    catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
    }
});
exports.connection = mongoose_1.default.connection;
exports.default = mongoose_1.default;
//# sourceMappingURL=database.js.map