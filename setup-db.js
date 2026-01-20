const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
    console.log('🚀 Starting database setup...\n');
    
    try {
        // Connect without database first
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3306,
            multipleStatements: true
        });
        
        console.log('✓ Connected to MySQL server');
        
        // Read and execute schema
        const schemaSQL = fs.readFileSync(
            path.join(__dirname, 'database', 'schema.sql'),
            'utf8'
        );
        
        await connection.query(schemaSQL);
        console.log('✓ Database schema created');
        console.log('✓ Tables created');
        console.log('✓ Default data inserted');
        
        await connection.end();
        
        console.log('\n✅ Database setup completed successfully!\n');
        console.log('Default Admin Credentials:');
        console.log('  Username: admin');
        console.log('  Password: admin123\n');
        console.log('You can now run: npm start');
        
    } catch (error) {
        console.error('\n❌ Database setup failed:');
        console.error(error.message);
        console.error('\nPlease check:');
        console.error('1. MySQL is running');
        console.error('2. Database credentials in .env file are correct');
        console.error('3. MySQL user has permission to create databases');
        process.exit(1);
    }
}

setupDatabase();
