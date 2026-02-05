# Installation Guide - MongoDB Atlas Version

This guide will help you set up and run the UPHSD Student Faculty Evaluation System using **MongoDB Atlas** (cloud database).

## 📋 Prerequisites

Before you begin, make sure you have:

1. **Node.js** (v14 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **MongoDB Atlas Account** (FREE tier available)
   - Sign up at: https://www.mongodb.com/cloud/atlas/register
   - No local MongoDB installation needed!

3. **Git** (optional, for version control)
   - Download from: https://git-scm.com/

4. **Code Editor** (VS Code recommended)
   - Download from: https://code.visualstudio.com/

## 🚀 Quick Start

### 1. Set Up MongoDB Atlas

1. **Create a MongoDB Atlas Account**
   - Go to https://www.mongodb.com/cloud/atlas/register
   - Sign up for a free account

2. **Create a New Cluster**
   - Click "Build a Database"
   - Choose **FREE** tier (M0 Sandbox)
   - Select your preferred cloud provider and region
   - Click "Create Cluster"

3. **Create Database User**
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Username: `admin` (or your choice)
   - Password: Generate a secure password or create your own
   - User Privileges: "Atlas admin"
   - Click "Add User"

4. **Whitelist Your IP Address**
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (for development)
   - Or add your current IP address
   - Click "Confirm"

5. **Get Your Connection String**
   - Go to "Database" in the left sidebar
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Select "Node.js" as driver and version
   - Copy the connection string (looks like):
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```

### 2. Download and Extract the Project

Extract the project files to a folder of your choice, for example:
```
C:\Users\YourName\Documents\faculty-evaluation
```

### 3. Install Dependencies

Open PowerShell or Command Prompt and navigate to the project folder:

```powershell
cd C:\Users\YourName\Documents\faculty-evaluation
```

Install required Node.js packages:

```powershell
npm install
```

This will install:
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `ejs` - Template engine
- `bcrypt` - Password hashing
- `express-session` - Session management
- `dotenv` - Environment variables
- And other dependencies

### 4. Configure Environment Variables

Create a `.env` file in the project root directory:

**Windows PowerShell:**
```powershell
New-Item .env -ItemType File
```

**Or manually create** a file named `.env` (no extension)

Add the following content to `.env`:

```env
# MongoDB Atlas Connection String
# Replace <username>, <password>, and <cluster> with your actual values
MONGODB_URI=mongodb+srv://admin:yourpassword@cluster0.xxxxx.mongodb.net/faculty_evaluation?retryWrites=true&w=majority

# Server Configuration
PORT=3000
SESSION_SECRET=uphsd_faculty_evaluation_secret_key_2026_mongodb

# Environment
NODE_ENV=development
```

**Important:** Replace the MongoDB URI with your actual connection string from Atlas:
- Replace `<username>` with your database username
- Replace `<password>` with your database password
- Replace `cluster0.xxxxx` with your actual cluster address
- The database name `faculty_evaluation` will be created automatically

### 5. Initialize the Database

Run the setup script to create initial data:

```powershell
node setup-db-mongodb.js
```

You should see output like:
```
🔧 Setting up MongoDB database...

✓ Connected to MongoDB

📦 Clearing existing collections...
✓ Collections cleared

👤 Creating default admin...
✓ Default admin created
  Username: admin
  Password: admin123

📚 Creating default programs...
✓ Created 2 programs

👨‍🏫 Creating sample teachers...
✓ Created 5 teachers

📖 Creating sample courses...
✓ Created 10 courses

✅ Database setup completed successfully!

📊 Summary:
  • 1 admin account
  • 2 programs
  • 5 teachers
  • 10 courses

🚀 You can now run: npm start
```

### 6. Start the Server

```powershell
npm start
```

You should see:
```
✓ MongoDB connected successfully
✓ Database: faculty_evaluation
✓ Mongoose connected to MongoDB
✓ Server is running on http://localhost:3000
✓ Admin login: http://localhost:3000/admin/login
  Default credentials: admin / admin123
```

### 7. Test the Application

Open your browser and visit:

**Student Evaluation Form:**
- URL: http://localhost:3000
- Features to test:
  - Auto-save functionality
  - Progress bar at the top
  - Form validation with red highlights
  - Section accordion (expand/collapse)
  - Automatic scroll to errors on submit
  - Mobile responsive design

**Admin Portal:**
- URL: http://localhost:3000/admin/login
- Username: `admin`
- Password: `admin123`
- Features to test:
  - Responsive navigation (hamburger menu on mobile)
  - Dashboard with statistics
  - View evaluations (student IDs hidden)
  - Manage teachers (add/edit/delete)
  - Manage courses and programs
  - Mobile responsive tables

## 🔧 Common Issues & Solutions

### Issue: "Cannot connect to MongoDB"
**Solutions:**
1. Check your MONGODB_URI in `.env` file
2. Verify your database user credentials
3. Ensure your IP address is whitelisted in Atlas
4. Check if your network allows MongoDB connections (port 27017)
5. Try "Allow Access from Anywhere" in Network Access

### Issue: "Authentication failed"
**Solutions:**
1. Double-check username and password in connection string
2. Ensure special characters in password are URL-encoded:
   - `@` becomes `%40`
   - `#` becomes `%23`
   - `$` becomes `%24`
   - etc.
3. Verify the database user has proper permissions

### Issue: "npm install" fails
**Solutions:**
1. Clear npm cache: `npm cache clean --force`
2. Delete `node_modules` folder and `package-lock.json`
3. Run `npm install` again
4. Check Node.js version (should be 14+)

### Issue: "Database setup fails"
**Solutions:**
1. Verify MONGODB_URI is correct in `.env`
2. Check internet connection
3. Ensure MongoDB Atlas cluster is running
4. Try running setup script again

### Issue: Port 3000 already in use
**Solutions:**
1. Change the port in `.env`:
```env
PORT=3001
```
2. Or stop the process using port 3000:
```powershell
# PowerShell (Windows)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

### Issue: Session errors or logout issues
**Solution:**
Change SESSION_SECRET in `.env` to a new random string.

## 📝 Post-Installation Checklist

- [ ] MongoDB Atlas cluster is running
- [ ] Database user created with admin privileges
- [ ] IP address whitelisted (or "Allow from Anywhere")
- [ ] `.env` file configured with correct MONGODB_URI
- [ ] Dependencies installed (`node_modules` folder exists)
- [ ] Database initialized (setup script ran successfully)
- [ ] Can access student form at http://localhost:3000
- [ ] Student form is responsive on mobile
- [ ] Can login to admin portal with admin/admin123
- [ ] Admin navigation works on mobile (hamburger menu)
- [ ] Sample teachers and courses are loaded
- [ ] Student IDs are hidden in admin views

## 🎯 Next Steps

### For Development:
1. **Change default admin password**
   - Login to admin portal
   - Or run: `node reset-admin.js` (you may need to create this)

2. **Add your teachers**
   - Go to Admin → Teachers → Add Teacher
   - Include employee IDs (unique)

3. **Add your programs**
   - Go to Admin → Programs → Add Program
   - Use official program names and codes

4. **Add your courses**
   - Go to Admin → Courses → Add Course
   - Associate with correct programs

5. **Test on mobile devices**
   - Open on phone/tablet
   - Test hamburger menu
   - Test form submission
   - Check table scrolling

6. **Customize the form**
   - Edit `views/index.ejs`
   - Modify questions as needed
   - Keep responsive classes

### For Production:
1. **Secure your MongoDB Atlas**
   - Use specific IP whitelist instead of "Allow from Anywhere"
   - Create separate database users for production
   - Enable MongoDB Atlas backup

2. **Environment Security**
   - Change `SESSION_SECRET` to a strong random string
   - Never commit `.env` to version control
   - Use environment variables in production

3. **Performance Optimization**
   - Enable MongoDB Atlas Performance Advisor
   - Create appropriate indexes (already set in models)
   - Monitor slow queries in Atlas

4. **Backup Strategy**
   - Enable Atlas automated backups (free tier has limited backups)
   - Export important data regularly
   - Document restore procedures

5. **Deployment**
   - Deploy to services like Heroku, Render, or Vercel
   - Use environment variables for MONGODB_URI
   - Set NODE_ENV to 'production'

6. **Monitoring**
   - Use Atlas monitoring dashboard
   - Set up alerts for connection issues
   - Monitor database size (free tier has 512MB limit)

## 🛠️ Utility Scripts Reference

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `node setup-db-mongodb.js` | Initial database setup | First installation or reset |
| `node cleanup-duplicates-mongodb.js` | Remove duplicate programs | If programs duplicated |
| `node cleanup-course-duplicates-mongodb.js` | Remove duplicate courses | If courses duplicated |
| `node cleanup-teacher-duplicates-mongodb.js` | Remove duplicate teachers | If teachers duplicated |
| `node check-admin.js` | Verify admin account | Troubleshooting login |

## 📚 MongoDB Atlas Resources

### Atlas Documentation:
- Getting Started: https://docs.atlas.mongodb.com/getting-started/
- Connection Strings: https://docs.mongodb.com/manual/reference/connection-string/
- Security: https://docs.atlas.mongodb.com/security/
- Monitoring: https://docs.atlas.mongodb.com/monitoring-alerts/

### Useful Atlas Features:
- **Performance Advisor**: Suggests indexes for better performance
- **Real-time Metrics**: View operations, connections, and queries
- **Query Profiler**: Analyze slow queries
- **Data Explorer**: Browse and edit data directly in Atlas
- **Backup & Restore**: Automated backups (limited in free tier)

### Free Tier Limits:
- **Storage**: 512 MB
- **RAM**: 512 MB (shared)
- **Backups**: Limited to recent snapshots
- **Connections**: 500 max

## 🔍 Useful Commands

**Check MongoDB connection:**
```javascript
// Run in Node.js
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected!'))
    .catch(err => console.error('Error:', err));
```

**View collections in Atlas:**
- Go to your cluster in Atlas
- Click "Browse Collections"
- Navigate through databases and collections

**Export data from Atlas:**
- Use MongoDB Compass (free GUI tool)
- Or use `mongodump` command-line tool

**Count documents:**
```javascript
// In your scripts
const count = await Evaluation.countDocuments();
console.log('Total evaluations:', count);
```

## 📱 Testing Responsive Design

### Desktop Testing (Chrome/Firefox):
1. Press F12 to open Developer Tools
2. Click Toggle Device Toolbar (Ctrl+Shift+M)
3. Test different device sizes:
   - Mobile: 375x667 (iPhone)
   - Tablet: 768x1024 (iPad)
   - Desktop: 1920x1080

### Real Device Testing:
1. Make sure your device is on the same network
2. Find your computer's local IP:
   ```powershell
   # Windows
   ipconfig
   ```
3. Access from phone: `http://YOUR_IP:3000`
4. Test all features on actual devices

## 🆘 Getting Help

If you encounter issues not covered here:

1. **Check Atlas Status**: https://status.mongodb.com/
2. **Atlas Support**: https://support.mongodb.com/
3. **Check browser console** (F12) for JavaScript errors
4. **Check terminal** for server errors
5. **Review MongoDB logs** in Atlas dashboard

## 🎉 Success!

If you can see the evaluation form and login to the admin portal, congratulations! Your MongoDB Atlas installation is complete.

**Verification Steps:**
1. ✅ Form loads and shows navigation bar
2. ✅ Admin login button visible
3. ✅ Can login to admin portal
4. ✅ Dashboard shows statistics from MongoDB
5. ✅ Mobile menu works (hamburger icon)
6. ✅ Tables scroll on mobile
7. ✅ Student IDs hidden from admin views
8. ✅ Can add/edit/delete teachers
9. ✅ No duplicate entries allowed (Mongoose validation)

**MongoDB Atlas Benefits:**
- ✅ No local database installation needed
- ✅ Automatic backups (in paid tiers)
- ✅ Built-in monitoring and alerts
- ✅ Scalable as your needs grow
- ✅ Access from anywhere
- ✅ Free tier perfect for development

Start by:
1. Testing the student form on mobile
2. Adding your actual teachers
3. Adding your actual courses
4. Testing a sample evaluation
5. Viewing it in the admin dashboard
6. Monitoring in Atlas dashboard

---

**Need help?** Contact the UPHSD Molino CCS IT Department

**MongoDB Atlas Help:** https://support.mongodb.com/

**Last Updated:** February 2026
