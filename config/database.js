require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection string - supports both local and MongoDB Atlas
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/faculty_evaluation';

// MongoDB connection options with Stable API
const options = {
    serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true,
    },
    serverSelectionTimeoutMS: 30000, // 30 seconds timeout
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
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
