require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection string
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/faculty_evaluation';

console.log('🔌 Testing MongoDB connection...\n');
console.log('📍 Connection URI:', mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'), '\n');

// Connection options
const options = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    family: 4,
    retryWrites: true,
    w: 'majority'
};

mongoose.connect(mongoURI, options)
    .then(async () => {
        console.log('✅ SUCCESS! MongoDB connection established\n');
        console.log('📊 Connection Details:');
        console.log('  • Database:', mongoose.connection.name);
        console.log('  • Host:', mongoose.connection.host);
        console.log('  • Port:', mongoose.connection.port || 'N/A (Atlas)');
        console.log('  • Connection State:', mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected');
        console.log('\n✓ Your MongoDB setup is working correctly!');
        console.log('\n🚀 Next step: Run "node setup-db-mongodb.js" to initialize the database\n');
        
        await mongoose.connection.close();
        console.log('✓ Connection closed');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ CONNECTION FAILED\n');
        console.error('Error:', err.message);
        console.error('\n💡 Troubleshooting Tips:');
        console.error('  1. Check your .env file exists and contains MONGODB_URI');
        console.error('  2. Verify your MongoDB Atlas IP whitelist (try 0.0.0.0/0 for testing)');
        console.error('  3. Ensure your database user credentials are correct');
        console.error('  4. Check if special characters in password are URL-encoded');
        console.error('  5. Try using a local MongoDB: mongodb://localhost:27017/faculty_evaluation');
        console.error('\n📖 See MONGODB-SETUP-GUIDE.md for detailed help\n');
        process.exit(1);
    });
