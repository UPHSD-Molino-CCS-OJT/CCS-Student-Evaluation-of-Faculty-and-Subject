# 🚀 Installation Guide

## Step-by-Step Setup Instructions

### 1. Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js (version 14 or higher) - [Download here](https://nodejs.org/)
- ✅ MySQL Server (version 5.7 or higher) - [Download here](https://dev.mysql.com/downloads/mysql/)
- ✅ A text editor (VS Code recommended)

**Verify installations:**
```bash
node --version
npm --version
mysql --version
```

### 2. Install Node.js Dependencies

Open PowerShell/Terminal in the project folder and run:
```bash
npm install
```

This installs:
- express (web framework)
- mysql2 (database driver)
- ejs (template engine)
- bcrypt (password hashing)
- express-session (session management)
- dotenv (environment variables)
- connect-flash (flash messages)

### 3. Configure MySQL Database

#### Option A: Using MySQL Workbench (Recommended for Beginners)

1. Open MySQL Workbench
2. Connect to your local MySQL server
3. Click "File" → "Run SQL Script"
4. Select `database/schema.sql`
5. Click "Run"
6. Verify tables were created

#### Option B: Using MySQL Command Line

1. Open MySQL command line:
```bash
mysql -u root -p
```

2. Enter your MySQL password

3. Run the schema file:
```bash
source C:/Users/ladeg/Downloads/ojt/UPHSD-Molino-CCS-OJT/Student-Evaluation-of-Faculty-and-Subject/database/schema.sql
```

#### Option C: Using Setup Script (Easiest!)

1. Configure `.env` file first (see step 4)
2. Run:
```bash
npm run setup-db
```

### 4. Configure Environment Variables

Edit the `.env` file in the project root:

```env
# Your MySQL Connection Details
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD_HERE
DB_NAME=faculty_evaluation
DB_PORT=3306

# Session Secret (Change this!)
SESSION_SECRET=change_this_to_something_random_and_secure

# Server Port
PORT=3000
```

**Important:** Replace `YOUR_MYSQL_PASSWORD_HERE` with your actual MySQL password!

### 5. Start the Application

#### Development Mode (with auto-reload):
```bash
npm run dev
```

#### Production Mode:
```bash
npm start
```

You should see:
```
✓ Database connected successfully
✓ Server is running on http://localhost:3000
✓ Admin login: http://localhost:3000/admin/login
  Default credentials: admin / admin123
```

### 6. Test the Application

Open your browser and visit:

**Student Evaluation Form:**
- URL: http://localhost:3000
- Test the auto-save feature by filling out fields
- Check progress indicator at the top

**Admin Portal:**
- URL: http://localhost:3000/admin/login
- Username: `admin`
- Password: `admin123`
- Explore dashboard, evaluations, teachers, and courses

## 🔧 Common Issues & Solutions

### Issue: "Cannot connect to MySQL"
**Solutions:**
1. Check if MySQL service is running:
   - Windows: Services → MySQL → Start
   - Mac: System Preferences → MySQL → Start
2. Verify credentials in `.env` file
3. Check MySQL port (default is 3306)

### Issue: "npm install" fails
**Solutions:**
1. Clear npm cache: `npm cache clean --force`
2. Delete `node_modules` folder and `package-lock.json`
3. Run `npm install` again

### Issue: "Database already exists" error
**Solution:**
If you need to reset the database:
```sql
DROP DATABASE faculty_evaluation;
```
Then run `npm run setup-db` again

### Issue: Can't login to admin
**Solutions:**
1. Check if database was set up correctly
2. Verify the `admins` table has data:
```sql
USE faculty_evaluation;
SELECT * FROM admins;
```
3. Default credentials: admin / admin123

### Issue: Port 3000 already in use
**Solution:**
Change the port in `.env`:
```env
PORT=3001
```

## 📝 Post-Installation Checklist

- [ ] MySQL server is running
- [ ] Database `faculty_evaluation` exists
- [ ] All tables created (admins, programs, teachers, courses, evaluations)
- [ ] `.env` file configured correctly
- [ ] Can access student form at http://localhost:3000
- [ ] Can login to admin portal with admin/admin123
- [ ] Sample teachers and courses are loaded

## 🎯 Next Steps

### For Development:
1. **Change default admin password**
   - Login to admin portal
   - Or update directly in database

2. **Add your teachers**
   - Go to Admin → Teachers → Add Teacher

3. **Add your courses**
   - Go to Admin → Courses → Add Course

4. **Customize the form**
   - Edit `views/index.ejs`
   - Modify questions as needed

### For Production:
1. Change `SESSION_SECRET` to a random string
2. Use a strong MySQL password
3. Consider using environment-specific `.env` files
4. Set up proper backup procedures
5. Configure HTTPS/SSL
6. Set up proper logging

## 📚 Additional Resources

### Documentation:
- Node.js: https://nodejs.org/docs/
- Express.js: https://expressjs.com/
- MySQL: https://dev.mysql.com/doc/
- Tailwind CSS: https://tailwindcss.com/docs

### Useful Commands:

**Check if server is running:**
```bash
netstat -ano | findstr :3000
```

**View MySQL databases:**
```sql
SHOW DATABASES;
USE faculty_evaluation;
SHOW TABLES;
```

**View recent evaluations:**
```sql
SELECT * FROM evaluations ORDER BY submitted_at DESC LIMIT 10;
```

**Backup database:**
```bash
mysqldump -u root -p faculty_evaluation > backup.sql
```

**Restore database:**
```bash
mysql -u root -p faculty_evaluation < backup.sql
```

## 🆘 Getting Help

If you encounter issues not covered here:

1. Check the browser console (F12) for JavaScript errors
2. Check the terminal/PowerShell for server errors
3. Review MySQL logs
4. Check the project README.md for additional info

## 🎉 Success!

If you can see the evaluation form and login to the admin portal, congratulations! Your installation is complete.

Start by:
1. Adding your teachers
2. Adding your courses
3. Testing a sample evaluation
4. Viewing it in the admin dashboard

---

**Need help?** Contact the UPHSD Molino CCS IT Department
