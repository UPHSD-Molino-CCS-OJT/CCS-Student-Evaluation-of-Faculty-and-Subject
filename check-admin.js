const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function checkAndCreateAdmin() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'faculty_evaluation',
            port: process.env.DB_PORT || 3306
        });
        
        console.log('✓ Connected to database');
        
        // Check if admin exists
        const [admins] = await connection.query('SELECT * FROM admins WHERE username = ?', ['admin']);
        
        if (admins.length > 0) {
            console.log('\n✓ Admin account already exists');
            console.log('  Username: admin');
            console.log('  Password: admin123');
            console.log('\nTry logging in at: http://localhost:3000/admin/login');
        } else {
            console.log('\n✗ Admin account not found. Creating...');
            
            // Create admin account
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await connection.query(
                'INSERT INTO admins (username, password, full_name, email) VALUES (?, ?, ?, ?)',
                ['admin', hashedPassword, 'System Administrator', 'admin@uphsd.edu.ph']
            );
            
            console.log('✓ Admin account created successfully!');
            console.log('\nLogin credentials:');
            console.log('  Username: admin');
            console.log('  Password: admin123');
            console.log('\nLogin at: http://localhost:3000/admin/login');
        }
        
        await connection.end();
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log('\n⚠️  The admins table does not exist.');
            console.log('Please run the database setup manually:');
            console.log('\n1. Open phpMyAdmin (http://localhost/phpmyadmin)');
            console.log('2. Create database: faculty_evaluation');
            console.log('3. Import: database/schema.sql');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('\n⚠️  Cannot connect to MySQL.');
            console.log('Please make sure XAMPP MySQL is running!');
        }
        
        process.exit(1);
    }
}

checkAndCreateAdmin();
