# 📖 Complete Installation Guide

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

## 🔧 Detailed Setup Instructions

### Step 1: Set Up MongoDB Atlas

1. **Create a MongoDB Atlas Account**
   - Go to https://www.mongodb.com/cloud/atlas/register
   - Sign up for a free account

2. **Create a New Cluster**
   - Click "Build a Database"
   - Choose **FREE** tier (M0 Sandbox)
   - Select your preferred region
   - Click "Create Cluster"

3. **Create Database User**
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Choose authentication method (Username and Password)
   - Create username and strong password
   - Set privileges (Read and write to any database)
   - Click "Add User"

4. **Whitelist Your IP Address**
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - Add current IP or "Allow Access from Anywhere" (0.0.0.0/0) for development
   - Click "Confirm"

5. **Get Your Connection String**
   - Go to "Database" in the left sidebar
   - Click "Connect" button on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<username>`, `<password>`, and database name

### Step 2: Download and Extract the Project

Extract the project files to a folder of your choice, for example:
```
C:\Users\YourName\Documents\faculty-evaluation
```

### Step 3: Install Dependencies

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

### Step 4: Configure Environment Variables

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

### Step 5: Initialize the Database

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

### Step 6: Start the Server

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
```

### Step 7: Test the Application

Open your browser and visit:

**Student Evaluation Form:**
- URL: http://localhost:3000
- Features to test:
  - Auto-save functionality
  - Progress tracker
  - Section navigation
  - Form validation
  - Mobile responsive design

**Admin Portal:**
- URL: http://localhost:3000/admin/login
- Username: `admin`
- Password: `admin123`
- Features to test:
  - Responsive navigation (hamburger menu on mobile)
  - Dashboard statistics
  - Teacher management
  - Course management
  - Evaluation viewing
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

## Next Steps

After successful installation:
1. Change the default admin password
2. Add your actual teachers
3. Add your actual programs and courses
4. Test on mobile devices
5. Review the [Features Guide](FEATURES-GUIDE.md)
6. Review the [Privacy Documentation](PRIVACY-AND-DATA-PROTECTION.md)

---

**Need help?** Check the [MongoDB Setup & Troubleshooting Guide](MONGODB-SETUP-TROUBLESHOOTING.md)
