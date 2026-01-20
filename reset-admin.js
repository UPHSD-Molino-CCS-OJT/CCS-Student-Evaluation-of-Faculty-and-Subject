const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function resetAdminPassword() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'faculty_evaluation',
            port: process.env.DB_PORT || 3306
        });
        
        console.log('✓ Connected to database\n');
        console.log('Resetting admin password...\n');
        
        // Generate new password hash
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Update admin password
        const [result] = await connection.query(
            'UPDATE admins SET password = ? WHERE username = ?',
            [hashedPassword, 'admin']
        );
        
        if (result.affectedRows > 0) {
            console.log('✓ Admin password has been reset successfully!\n');
            console.log('═══════════════════════════════════');
            console.log('  LOGIN CREDENTIALS');
            console.log('═══════════════════════════════════');
            console.log('  Username: admin');
            console.log('  Password: admin123');
            console.log('═══════════════════════════════════\n');
            console.log('Login at: http://localhost:3000/admin/login\n');
            
            // Test the password
            const [admin] = await connection.query('SELECT * FROM admins WHERE username = ?', ['admin']);
            if (admin.length > 0) {
                const isValid = await bcrypt.compare('admin123', admin[0].password);
                console.log('Password verification test:', isValid ? '✓ PASSED' : '✗ FAILED');
            }
        } else {
            console.log('✗ Admin user not found. Creating new admin...\n');
            
            await connection.query(
                'INSERT INTO admins (username, password, full_name, email) VALUES (?, ?, ?, ?)',
                ['admin', hashedPassword, 'System Administrator', 'admin@uphsd.edu.ph']
            );
            
            console.log('✓ New admin account created!\n');
            console.log('═══════════════════════════════════');
            console.log('  LOGIN CREDENTIALS');
            console.log('═══════════════════════════════════');
            console.log('  Username: admin');
            console.log('  Password: admin123');
            console.log('═══════════════════════════════════\n');
        }
        
        await connection.end();
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('\n⚠️  Cannot connect to MySQL.');
            console.log('Please make sure XAMPP MySQL is running!');
        }
        process.exit(1);
    }
}

resetAdminPassword();
