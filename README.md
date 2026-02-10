# 🎓 UPHSD Student Faculty Evaluation System

**Complete Documentation & User Guide**

This project has been migrated from MySQL to **MongoDB Atlas** for easy cloud hosting!

## 📑 Table of Contents

- [Quick Start](#-quick-start-5-minutes)
- [What Changed (MongoDB Migration)](#-what-changed)
- [Complete Installation Guide](#-complete-installation-guide)
- [MongoDB Setup & Troubleshooting](#-mongodb-setup--troubleshooting)
- [Features Guide](#-features-guide)
- [Privacy & Data Protection](docs/PRIVACY-AND-DATA-PROTECTION.md)
- [Complete Function Reference](#-complete-function-reference)
- [Project Structure](#-project-structure)
- [Migration Notes](#-migration-notes)
- [Available Scripts](#️-available-scripts)
- [Resources & Tips](#-resources--tips)

---

## 🚀 Quick Start (5 minutes!)

### ✨ What Changed?

**Before (MySQL):**
- Required local MySQL server installation
- Complex database setup with SQL scripts
- Limited to local development

**Now (MongoDB Atlas):**
- ☁️ **Cloud-based** - No local database installation needed!
- 🆓 **Free tier** available (512MB storage)
- 🌍 **Access from anywhere** with internet connection
- 📊 **Built-in monitoring** and performance insights
- 🔒 **Automatic backups** (in paid tiers)
- 📈 **Scalable** - Easy to upgrade as needed

### Quick Setup Steps

#### 1. Create MongoDB Atlas Account (FREE)
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up for free account
3. Create a new **FREE** M0 cluster
4. Create database user (username + password)
5. Whitelist your IP (or allow from anywhere for development)
6. Get your connection string

#### 2. Install Dependencies
```powershell
npm install
```

#### 3. Configure Environment
Create `.env` file:
```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/faculty_evaluation?retryWrites=true&w=majority
PORT=3000
SESSION_SECRET=uphsd_faculty_evaluation_secret_key_2026
```

#### 4. Initialize Database
```powershell
node setup-db-mongodb.js
```

#### 5. Start Server
```powershell
npm start
```

**Done!** Visit http://localhost:3000

---

## 📖 Complete Installation Guide

### 📋 Prerequisites

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

### 🔧 Detailed Setup Instructions

#### Step 1: Set Up MongoDB Atlas

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

#### Step 2: Download and Extract the Project

Extract the project files to a folder of your choice, for example:
```
C:\Users\YourName\Documents\faculty-evaluation
```

#### Step 3: Install Dependencies

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

#### Step 4: Configure Environment Variables

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

#### Step 5: Initialize the Database

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

#### Step 6: Start the Server

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

#### Step 7: Test the Application

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

### 🔧 Common Issues & Solutions

#### Issue: "Cannot connect to MongoDB"
**Solutions:**
1. Check your MONGODB_URI in `.env` file
2. Verify your database user credentials
3. Ensure your IP address is whitelisted in Atlas
4. Check if your network allows MongoDB connections (port 27017)
5. Try "Allow Access from Anywhere" in Network Access

#### Issue: "Authentication failed"
**Solutions:**
1. Double-check username and password in connection string
2. Ensure special characters in password are URL-encoded:
   - `@` becomes `%40`
   - `#` becomes `%23`
   - `$` becomes `%24`
   - etc.
3. Verify the database user has proper permissions

#### Issue: "npm install" fails
**Solutions:**
1. Clear npm cache: `npm cache clean --force`
2. Delete `node_modules` folder and `package-lock.json`
3. Run `npm install` again
4. Check Node.js version (should be 14+)

#### Issue: "Database setup fails"
**Solutions:**
1. Verify MONGODB_URI is correct in `.env`
2. Check internet connection
3. Ensure MongoDB Atlas cluster is running
4. Try running setup script again

#### Issue: Port 3000 already in use
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

#### Issue: Session errors or logout issues
**Solution:**
Change SESSION_SECRET in `.env` to a new random string.

### 📝 Post-Installation Checklist

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

---

## 🛠️ MongoDB Setup & Troubleshooting

### Common Windows DNS Issue

**Problem:** Windows DNS cannot resolve MongoDB Atlas SRV records (common Windows 11 issue)

### Solution Options

#### Option 1: Install MongoDB Locally (Most Reliable for Development)
1. Download MongoDB Community Server: https://www.mongodb.com/try/download/community
2. Install with default settings
3. Update .env:
   ```
   MONGODB_URI=mongodb://localhost:27017/faculty_evaluation
   ```
4. Run setup: `npm run setup-db`
5. Start server: `npm start`

#### Option 2: Use MongoDB Compass (Official GUI Tool)
1. Download MongoDB Compass: https://www.mongodb.com/try/download/compass
2. Connect using your connection string
3. Compass handles DNS issues better than Node.js
4. Once data is loaded, your app can still access it

#### Option 3: Get Standard Connection String from Atlas
1. Login to MongoDB Atlas: https://cloud.mongodb.com
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "2.2.12 or later" driver
5. COPY the standard connection string (mongodb:// not mongodb+srv://)
6. Update .env file

#### Option 4: Whitelist Your IP in MongoDB Atlas
1. Login to MongoDB Atlas
2. Go to Network Access
3. Click "Add IP Address"
4. Add your current IP or "Allow Access from Anywhere" (0.0.0.0/0) for testing
5. Try connecting again

#### Option 5: Use Mobile Hotspot/Different Network
- School/corporate networks may block MongoDB Atlas
- Try using mobile hotspot temporarily to test
- If this works, contact your network administrator

### Current Status Indicators
- ✅ Internet connection: Working
- ✅ Application code: Ready
- ✅ Database schema: Configured
- ❌ DNS resolution: Failing for MongoDB Atlas
- 📦 Collections ready: admins, programs, teachers, courses, evaluations

### Quick Test After Fix
```bash
node test-connection.js
npm run setup-db
npm start
```

### Recommended Approach
**Install MongoDB locally** for development. It's faster, more reliable, and doesn't require internet for testing.

---

## 🎯 Features Guide

### Student Evaluation Form Features

#### 1. 💾 Auto-Save Draft System

**What it does:**
- Automatically saves your progress every second while you type
- Stores data in your browser (LocalStorage)
- Persists even if you close the browser or tab
- Resume anytime from where you left off

**How to use:**
- Just start filling out the form - it saves automatically!
- Green indicator appears briefly: "Draft saved ✓"
- Close and reopen the page - your data is still there

**Clear your draft:**
- Click the "Clear Draft" button at the bottom
- Confirms before deleting to prevent accidents

**Keyboard shortcut:**
- Press `Ctrl + S` (or `Cmd + S` on Mac) to manually save

#### 2. 📊 Real-Time Progress Tracker

**What it shows:**
- Visual progress bar at the very top (blue/green gradient)
- Percentage completion next to the header
- "Progress: 45%" updates as you fill fields

**Visual indicators:**
- **Progress bar grows** from left to right
- **Sections turn green** when all required fields are complete
- **Green borders** on valid fields
- **Red borders** on invalid/empty required fields

**Smart tracking:**
- Only counts required fields in percentage
- Updates instantly as you fill fields
- Shows which sections are complete

#### 3. ✅ Smart Form Validation

**Real-time feedback:**
- Fields change color as you type:
  - ✅ **Green border** = Valid input
  - ❌ **Red border** = Invalid/missing
- Student number format validation (00-0000-000)
- Email format validation

**On submit:**
- Automatically scrolls to first empty required field
- Highlights missing fields with red border and shake animation
- Opens collapsed sections if they contain errors
- Shows helpful error messages
- Won't submit until all required fields are filled

**Visual cues:**
- Required fields marked with red asterisk (*)
- Clear error messages
- Smooth animations and transitions

#### 4. 🎯 Section Accordion Navigation

**Collapsible sections:**
- Three main sections can expand/collapse
- Click section headers to toggle
- Only one section open at a time (accordion style)
- Automatically scrolls to opened section

**Smart scrolling:**
- Clicking a section header scrolls it to the top
- Smooth scroll animation
- Better navigation on long forms

**Three main sections:**
1. **The Teacher** (6 questions) - Personal qualities
2. **The Teacher Learning Process** (13 questions) - Teaching effectiveness
3. **The Classroom Management** (6 questions) - Classroom control

#### 5. 🎨 Modern Navigation Bar

**Features:**
- Professional blue gradient design
- UPHSD branding with graduation cap icon
- Quick access to Admin Login button
- Responsive design for all screen sizes

**Mobile optimized:**
- Button text adjusts for mobile ("Admin" on small screens)
- Icon stays visible on all sizes
- Clean, professional appearance

#### 6. 📱 Fully Responsive Design

**Mobile-first approach:**
- Works perfectly on phones (320px+)
- Optimized for tablets (768px+)
- Full features on laptops (1024px+)
- Large screens supported (1280px+)

**Adaptive layouts:**
- Forms adjust to screen width
- Tables scroll horizontally on mobile
- Buttons stack vertically on small screens
- Touch-friendly interface
- No horizontal scrolling needed

#### 7. 💡 Helpful User Experience

**Loading States:**
- Submit button shows spinner while processing
- "Submitting..." text during upload
- Prevents double-submission

**Success Confirmation:**
- Beautiful modal popup on successful submission
- Clear success message
- Automatically clears draft after submission

**Dynamic Course Loading:**
- Courses update instantly when you select a program
- No page reload needed
- Shows "Loading..." while fetching

**Smooth Animations:**
- Smooth scrolling throughout
- Fade-in/fade-out effects
- Professional transitions

#### 8. ⌨️ Keyboard Navigation

**Shortcuts:**
- `Ctrl + S` (or `Cmd + S`) - Save draft manually
- `Tab` - Move between fields
- `Space` - Check radio buttons/checkboxes
- `Enter` - Submit form (when on submit button)

**Accessibility:**
- All form elements keyboard accessible
- Logical tab order
- Clear focus indicators

### Admin Portal Features

#### 1. 🔐 Secure Authentication

**Features:**
- Session-based login
- Password encryption (bcrypt)
- Automatic session timeout (24 hours)
- Protected admin routes

**Security:**
- Passwords never stored in plain text
- Middleware protects all admin routes
- Logout clears session completely
- Default credentials: admin / admin123

#### 2. 📱 Responsive Admin Navigation

**Mobile hamburger menu:**
- Shows on mobile devices (<768px)
- Toggles open/close on tap
- Full navigation menu in dropdown
- Icons with labels

**Desktop menu:**
- Horizontal navigation bar
- Icon-only on medium screens
- Full labels on large screens
- Logout button highlighted in red

**Navigation links:**
- Dashboard - Overview and statistics
- Evaluations - View all submissions
- Programs - Manage academic programs
- Teachers - Manage faculty
- Courses - Manage subjects

#### 3. 📊 Comprehensive Dashboard

**Statistics cards:**
- Total evaluations count
- Active teachers count
- Programs count
- Color-coded with icons

**Average ratings display:**
- Teacher performance average
- Learning process average
- Classroom management average
- Overall average rating

**Top teachers leaderboard:**
- Top 5 highest-rated teachers
- Evaluation count per teacher
- Average ratings displayed

**Recent evaluations:**
- Last 10 evaluations
- **Student IDs hidden for privacy**
- Teacher and course information
- Quick view links

#### 4. 👁️ Detailed Evaluation Reports

**Privacy-focused:**
- **Student numbers completely hidden from admin view**
- Still stored in database for auditing
- Protects student identity

**Color-coded ratings:**
- 🟢 **Green** (4-5) - Outstanding/High Satisfactory
- 🟡 **Yellow** (3) - Satisfactory
- 🔴 **Red** (1-2) - Needs Improvement

**Complete information:**
- School year, program, year level, status
- Teacher and course information
- All 25 ratings clearly displayed
- Comments section
- Submission timestamp

**Easy to read:**
- Organized by section
- Visual rating displays
- Clean, professional layout
- Responsive on all devices

#### 5. 👨‍🏫 Teacher Management

**Complete control:**
- Add new teachers with modal form
- Edit existing teacher information
- Permanently remove teachers
- Employee ID, email, department tracking
- Active/inactive status

**Duplicate prevention:**
- Checks for duplicate employee IDs
- Shows error if teacher already exists
- Database constraints prevent duplicates

**Features:**
- Responsive table with horizontal scroll on mobile
- Search and filter capabilities
- Quick edit/delete actions

#### 6. 📚 Course Management

**Full CRUD operations:**
- Add courses with program association
- Edit course names and codes
- Delete courses (protected if has evaluations)
- Organize by program

**Duplicate prevention:**
- Checks for duplicate courses per program
- Shows error if course already exists
- Database constraints enforce uniqueness

**Responsive:**
- Table scrolls on mobile
- Modal forms work on all devices

#### 7. 🎓 Program Management

**Academic program control:**
- Add new programs with codes
- Edit existing programs
- Delete programs (protected if has courses)
- Track all programs

**Duplicate prevention:**
- Checks for duplicate program names
- Database constraints prevent duplicates
- Clear error messages

#### 8. 🛡️ Data Integrity Features

**Database constraints:**
- Unique program names
- Unique teacher employee IDs
- Unique courses per program
- Foreign key relationships

**Cleanup utilities:**
- `cleanup-duplicates-mongodb.js` - Remove program duplicates
- `cleanup-course-duplicates-mongodb.js` - Remove course duplicates
- `cleanup-teacher-duplicates-mongodb.js` - Remove teacher duplicates

**Referential integrity:**
- Evaluations preserved when deleting teachers
- Proper cascading updates
- No orphaned records

#### 9. 🎨 Professional Admin Design

**Modern UI:**
- Tailwind CSS framework
- Font Awesome icons throughout
- Consistent blue color scheme
- Professional appearance

**Responsive everywhere:**
- Mobile hamburger menu
- Horizontal scrolling tables on mobile
- Flexible layouts
- Touch-friendly buttons

**User-friendly:**
- Large, clear buttons
- Readable fonts and spacing
- Modal dialogs for actions
- Flash messages for feedback

### Tips for Best Experience

**For Students:**
1. **Take your time** - Form auto-saves, no rush!
2. **Be honest** - Your feedback helps improve education
3. **Use the progress bar** - See how much is left
4. **Watch for red borders** - Fix invalid fields
5. **Expand sections as needed** - Click headers to navigate
6. **Add comments** - Specific feedback is most helpful
7. **Mobile friendly** - Use any device you prefer

**For Administrators:**
1. **Regular backups** - Export database regularly
2. **Monitor submissions** - Check dashboard daily
3. **Review patterns** - Look for trends in feedback
4. **Manage data** - Keep teachers and courses updated
5. **Change default password** - Security first!
6. **Use mobile responsibly** - Admin panel works on phones
7. **Respect privacy** - Student IDs are hidden for a reason
8. **Run cleanup scripts** - If you notice duplicates

### Keyboard Shortcuts Summary

| Shortcut | Action |
|----------|--------|
| `Ctrl + S` / `Cmd + S` | Save draft |
| `Tab` | Next field |
| `Shift + Tab` | Previous field |
| `Space` | Select radio/checkbox |
| `Enter` | Submit form |

### Browser Compatibility

✅ **Fully supported:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

⚠️ **Limited support:**
- Internet Explorer (not recommended)
- Very old browsers

### Device Compatibility

✅ **Fully responsive:**
- 📱 Smartphones (320px - 767px)
- 📱 Tablets (768px - 1023px)
- 💻 Laptops (1024px - 1279px)
- 🖥️ Desktops (1280px+)

### Privacy & Data Protection

**🔒 PRIVACY PROTECTION IMPLEMENTED**

This system implements a **10-layer systematic privacy protection system** to ensure complete student anonymity using cutting-edge privacy preservation techniques.

**Quick Overview:**
- ✅ **Zero-Knowledge Privacy:** Impossible to trace evaluations to students
- ✅ **Cryptographic Security:** SHA-512 anonymous tokens
- ✅ **Timing Protection:** Random delays prevent correlation
- ✅ **Network Privacy:** IP addresses anonymized
- ✅ **Automatic Decoupling:** Links removed after 24 hours
- ✅ **Differential Privacy:** Mathematical protection for statistics
- ✅ **K-Anonymity:** Minimum thresholds protect small groups
- ✅ **Session Security:** Data minimization and cleanup
- ✅ **Compliance:** FERPA and GDPR principles

**🔒 [Complete Privacy Documentation](docs/PRIVACY-AND-DATA-PROTECTION.md)**

**Comprehensive Guide Including:**
- 10 layers of protection explained in detail
- How each protection works
- Attack vectors mitigated
- Installation and verification guides
- Privacy audit system
- Compliance standards
- Troubleshooting
- Best practices

**Key Features:**
- **Anonymous Tokens:** SHA-512 cryptographic hashing (cannot be reversed)
- **Time Fuzzing:** Random 2-8 second delays prevent timing attacks
- **IP Anonymization:** Last octet/segments removed from stored IPs
- **Auto-Decoupling:** Evaluation-enrollment links removed after 24 hours
- **Differential Privacy:** Noise added to statistics (ε = 0.1)
- **K-Anonymity:** Stats hidden until ≥5 evaluations (k=5)

**Privacy Guarantees:**
✅ Cannot trace evaluations back to students
✅ Cannot correlate by timing or IP address  
✅ Cannot infer individual responses from statistics
✅ Cannot identify students in small classes
✅ Cannot exploit sessions or audit logs

**Privacy Audit:**
- Available in Admin Dashboard
- Automated compliance checks
- Real-time monitoring

**Data Security:**
- Passwords hashed with bcrypt
- Session-based authentication
- Secure database connections
- Automatic session cleanup

**📚 For full details, see: [Privacy & Data Protection Documentation](docs/PRIVACY-AND-DATA-PROTECTION.md)**

### Local Storage Usage

**What's stored:**
- Form field values (draft)
- Session information

**What's NOT stored:**
- Passwords
- Student numbers
- Final submissions (those go to database)

**Clear storage:**
- Click "Clear Draft" button
- Or browser settings → Clear browsing data

---

## 🔍 Complete Function Reference

### Public-Facing Functions

#### 📝 Student Evaluation Form

**`GET /`**
- **Purpose**: Display the evaluation form for students
- **Access**: Public
- **Functionality**: 
  - Loads all active programs
  - Loads all active teachers
  - Renders the main evaluation form

**`GET /api/courses/:programId`**
- **Purpose**: AJAX endpoint to get courses for a selected program
- **Access**: Public
- **Parameters**: `programId` (MongoDB ObjectId)
- **Returns**: JSON array of courses
- **Usage**: Dynamic dropdown population when student selects program

**`POST /submit-evaluation`**
- **Purpose**: Submit student evaluation
- **Access**: Public
- **Data Collected**:
  - **Student Info**: School year, student number, program, year level, status
  - **Course Info**: Course and teacher being evaluated
  - **Teacher Ratings** (6 criteria, 1-5 scale):
    - Diction/voice quality
    - Grammar/language use
    - Personality/character
    - Disposition/attitude
    - Dynamic/enthusiasm
    - Fairness/impartiality
  - **Learning Process** (13 criteria, 1-5 scale):
    - Motivation
    - Critical thinking promotion
    - Organization
    - Interest generation
    - Explanation clarity
    - Clarity of instruction
    - Integration of concepts
    - Subject mastery
    - Teaching methodology
    - Values formation
    - Grading system
    - Synthesis ability
    - Reasonableness of requirements
  - **Classroom Management** (6 criteria, 1-5 scale):
    - Attendance monitoring
    - Policies enforcement
    - Discipline maintenance
    - Authority respect
    - Prayer observance
    - Punctuality
  - **Additional**: Optional comments, IP address
- **Returns**: Success/error JSON response
- **Validation**: All required fields must be present

### Admin Functions

#### 🔐 Authentication

**`GET /admin/login`**
- **Purpose**: Display admin login page
- **Access**: Guest only (redirects if already logged in)
- **Middleware**: `isGuest`

**`POST /admin/login`**
- **Purpose**: Process admin login
- **Authentication**: 
  - Verifies username exists
  - Compares password using bcrypt
  - Creates session on success
  - Updates last login timestamp
- **Session Data**: Stores adminId, username, fullName
- **Redirects**: `/admin/dashboard` on success

**`GET /admin/logout`**
- **Purpose**: Logout and destroy session
- **Redirects**: `/admin/login`

#### 📊 Dashboard & Analytics

**`GET /admin/dashboard`**
- **Purpose**: Main admin dashboard with statistics and insights
- **Access**: Authenticated admins only
- **Middleware**: `isAuthenticated`
- **Statistics Calculated**:
  - **Overall Stats**:
    - Total evaluations count
    - Total active teachers
    - Total programs
  - **Average Ratings** (using MongoDB aggregation):
    - Average teacher rating (6 criteria)
    - Average learning rating (13 criteria)
    - Average classroom rating (6 criteria)
    - Overall average (all 25 criteria)
  - **Evaluations by School Year**: Count per year
  - **Top 5 Teachers**: Ranked by average rating
  - **Recent Evaluations**: Last 10 submissions
- **Data Processing**:
  - Uses MongoDB aggregation pipeline
  - Calculates averages across rating categories
  - Populates teacher/program/course names
  - Sorts and limits results

#### 📋 Evaluation Management

**`GET /admin/evaluations`**
- **Purpose**: View all evaluations in a list
- **Access**: Authenticated admins
- **Functionality**:
  - Fetches all evaluations
  - Populates related teacher, program, course data
  - Sorts by submission date (newest first)
  - Displays in table format

**`GET /admin/evaluations/:id`**
- **Purpose**: View detailed evaluation
- **Access**: Authenticated admins
- **Parameters**: `id` (MongoDB ObjectId)
- **Displays**:
  - All student information
  - All 25 rating scores with labels
  - Teacher details
  - Program and course information
  - Comments
  - Submission timestamp
  - IP address
- **Error Handling**: Redirects if evaluation not found

#### 👨‍🏫 Teacher Management (CRUD)

**`GET /admin/teachers`**
- **Purpose**: List all teachers
- **Access**: Authenticated admins
- **Displays**: All teachers sorted by name

**`POST /admin/teachers`**
- **Purpose**: Add new teacher
- **Validation**: 
  - Checks for duplicate employee_id
  - Displays error if duplicate found
- **Fields**: full_name, employee_id, email, department
- **Default Status**: active

**`POST /admin/teachers/:id`**
- **Purpose**: Update existing teacher
- **Parameters**: `id` (MongoDB ObjectId)
- **Fields**: full_name, employee_id, email, department, status
- **Updates**: All provided fields

**`POST /admin/teachers/:id/delete`**
- **Purpose**: Delete teacher
- **Data Integrity**: 
  - Sets evaluations' teacher_id to NULL first
  - Then deletes teacher record
  - Prevents data loss of evaluations
- **Confirmation**: Flash message on success

#### 📚 Program Management (CRUD)

**`GET /admin/programs`**
- **Purpose**: List all academic programs
- **Access**: Authenticated admins
- **Displays**: All programs sorted by name

**`POST /admin/programs`**
- **Purpose**: Add new program
- **Validation**: Checks for duplicate program name
- **Fields**: name, code
- **Uniqueness**: Program name must be unique

**`POST /admin/programs/:id`**
- **Purpose**: Update existing program
- **Parameters**: `id` (MongoDB ObjectId)
- **Fields**: name, code

**`POST /admin/programs/:id/delete`**
- **Purpose**: Delete program
- **Data Integrity Checks**:
  - Counts related courses
  - Counts related evaluations
  - **Prevents deletion** if either count > 0
  - Displays error message explaining why
- **Purpose**: Prevents orphaned data

#### 📖 Course Management (CRUD)

**`GET /admin/courses`**
- **Purpose**: List all courses
- **Access**: Authenticated admins
- **Displays**: 
  - All courses with program names
  - Sorted by course name
- **Additional Data**: Loads all programs for add/edit forms

**`POST /admin/courses`**
- **Purpose**: Add new course
- **Validation**: 
  - Checks for duplicate course in same program
  - Course name + program combination must be unique
- **Fields**: name, code, program_id

**`POST /admin/courses/:id`**
- **Purpose**: Update existing course
- **Parameters**: `id` (MongoDB ObjectId)
- **Fields**: name, code, program_id

**`POST /admin/courses/:id/delete`**
- **Purpose**: Delete course
- **Data Integrity Check**:
  - Counts related evaluations
  - **Prevents deletion** if evaluations exist
  - Displays error message
- **Purpose**: Maintains evaluation data integrity

### System Functions

#### 🔄 Database Initialization

**`initializeDatabase()`**
- **Trigger**: Runs automatically on server start
- **Checks**: If admin count is 0
- **Creates Sample Data**:
  1. **Default Admin**:
     - Username: `admin`
     - Password: `admin123` (bcrypt hashed)
     - Full name: System Administrator
     - Email: admin@uphsd.edu.ph
  
  2. **2 Programs**:
     - BS Computer Science - Data Science (BSCS-DS)
     - BS Information Technology - Game Development (BSIT-GD)
  
  3. **5 Sample Teachers**:
     - Prof. Juan Dela Cruz (CS)
     - Prof. Maria Santos (IT)
     - Prof. Jose Garcia (CS)
     - Prof. Ana Reyes (IT)
     - Prof. Pedro Martinez (CS)
  
  4. **10 Sample Courses**:
     - 5 for BSCS-DS (Data Structures, DBMS, ML, etc.)
     - 5 for BSIT-GD (Game Design, 3D Modeling, etc.)

- **Summary**: Logs what was created
- **Idempotence**: Only runs if database is empty

#### 🛡️ Middleware

**`isAuthenticated(req, res, next)`**
- **Purpose**: Protect admin routes
- **Checks**: Session has adminId
- **If Valid**: Calls next()
- **If Invalid**: 
  - Flash error message
  - Redirect to login

**`isGuest(req, res, next)`**
- **Purpose**: Redirect logged-in admins from guest pages
- **Checks**: Session has adminId
- **If Logged In**: Redirect to dashboard
- **If Guest**: Calls next()

**`app.use(flash middleware)`**
- **Purpose**: Global template variables
- **Sets**:
  - `success_msg`: Success flash messages
  - `error_msg`: Error flash messages
  - `admin`: Current admin info (or null)

#### 📦 Session Management

**Session Configuration**
- **Store**: MongoDB (MongoStore) for serverless compatibility
- **Secret**: From env or default key
- **Cookie Settings**:
  - MaxAge: 24 hours
  - httpOnly: true (prevents XSS)
  - secure: true in production (HTTPS only)
- **Touch After**: 24 hours (reduces DB writes)
- **Persistence**: Survives server restarts

#### 🗃️ Database Models (Mongoose Schemas)

**Admin Schema**
- username (unique, required)
- password (hashed, required)
- full_name (required)
- email
- last_login
- Timestamps: createdAt, updatedAt

**Program Schema**
- name (unique, required)
- code
- Timestamps
- **Index**: Unique on name

**Teacher Schema**
- full_name (required)
- employee_id (unique, sparse)
- email
- department
- status (enum: active/inactive, default: active)
- Timestamps

**Course Schema**
- name (required)
- code
- program_id (ref: Program)
- Timestamps
- **Compound Index**: Unique on (name + program_id)

**Evaluation Schema**
- **Student Data**:
  - school_year (required)
  - student_number (required, indexed)
  - program_id (ref)
  - year_level (enum: 1st-4th)
  - status (enum: Regular/Irregular)
  
- **Course Data**:
  - course_id (ref)
  - teacher_id (ref, indexed)
  
- **25 Rating Fields** (all required, 1-5):
  - 6 teacher ratings
  - 13 learning ratings
  - 6 classroom ratings
  
- **Meta**:
  - comments (text)
  - submitted_at (indexed, default: now)
  - ip_address
  
- **Indexes**: 
  - student_number
  - teacher_id
  - school_year
  - submitted_at (descending)

### Error Handling

**404 Handler**
- Catches all unmatched routes
- Returns "Page not found"

**Try-Catch Blocks**
- All database operations wrapped
- Logs errors to console
- Displays user-friendly messages
- Uses flash messages for feedback

**Data Validation**
- Required field validation
- Enum validation for status fields
- Min/max validation for ratings (1-5)
- Duplicate checks before insertion
- Referential integrity checks before deletion

### Security Features

1. **Password Security**: bcrypt hashing (10 salt rounds)
2. **Session Security**: 
   - httpOnly cookies
   - Secure cookies in production
   - MongoDB session store (serverless-safe)
3. **CSRF Protection**: Session-based
4. **Input Validation**: Mongoose schema validation
5. **Authentication**: Route-level middleware
6. **SQL Injection**: N/A (NoSQL with Mongoose)
7. **XSS Protection**: EJS auto-escaping

### Performance Optimizations

1. **Database Indexes**: On frequently queried fields
2. **Aggregation**: For complex statistics
3. **Connection Pooling**: Mongoose default
4. **Session TouchAfter**: Reduces DB writes
5. **Lean Queries**: `.lean()` for read-only data
6. **Population**: Only loads needed fields
7. **Sorting**: Database-level sorting

### Environment Configuration

**Required Variables**
- `MONGODB_URI`: MongoDB connection string
- `SESSION_SECRET`: Session encryption key
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: production/development

**Serverless-Specific**
- Optimized for Vercel deployment
- MongoDB session store
- Exports app for serverless functions

---

## 📂 Project Structure

```
├── models/              # Mongoose schemas (NEW!)
│   ├── Admin.js        # Admin user model
│   ├── Program.js      # Academic programs
│   ├── Teacher.js      # Faculty members
│   ├── Course.js       # Course subjects
│   └── Evaluation.js   # Student evaluations
├── config/
│   └── database.js      # MongoDB connection (UPDATED!)
├── views/               # EJS templates
│   ├── index.ejs       # Student evaluation form
│   └── admin/          # Admin panel views
│       ├── dashboard.ejs
│       ├── evaluations.ejs
│       ├── evaluation-detail.ejs
│       ├── teachers.ejs
│       ├── programs.ejs
│       ├── courses.ejs
│       ├── login.ejs
│       └── partials/
│           └── navbar.ejs
├── middleware/          # Authentication
│   └── auth.js         # Auth middleware
├── public/             # Static files (CSS, JS, images)
├── database/           # Legacy SQL files (archived)
│   └── schema.sql
├── server.js           # Express app (UPDATED for MongoDB!)
├── setup-db-mongodb.js # Database initialization (NEW!)
├── .env.example        # MongoDB config template (UPDATED!)
├── package.json        # Now uses Mongoose! (UPDATED!)
├── README.md           # This file (comprehensive docs)
├── FEATURES.md         # Feature documentation
├── FUNCTIONS.md        # Function reference
├── INSTALLATION.md     # Installation guide
└── MONGODB-SETUP-GUIDE.md # Troubleshooting guide
```

---

## 🔄 Migration Notes

### For Existing Users

**Your old MySQL data is NOT automatically migrated.** If you have existing data:

1. **Export from MySQL:**
   ```sql
   mysqldump -u root -p faculty_evaluation > backup.sql
   ```

2. **Convert and import** (manual process)
   - Export data as JSON/CSV
   - Create import script for MongoDB
   - Or manually re-enter important data

3. **Old files preserved:**
   - `server-mysql-backup.js` - Original MySQL server
   - MySQL setup scripts still available in database folder

### Database Schema Differences

**MySQL (Old):**
- Tables with AUTO_INCREMENT IDs
- Foreign keys with ON DELETE SET NULL
- ENUM types for status fields
- JOIN queries for related data

**MongoDB (New):**
- Collections with ObjectId (_id)
- References using ObjectId
- String enums with Mongoose validation
- Built-in timestamps (createdAt, updatedAt)
- Populate for related data (no JOINs needed)

**Benefits:**
- Flexible schema (easier to modify)
- Better performance for read-heavy operations
- No need for complex JOIN queries
- Natural JSON structure
- Built-in timestamp tracking
- Better scalability

---

## 🛠️ Available Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `npm start` | Start the server | Normal operation |
| `npm run dev` | Start with nodemon (auto-reload) | Development |
| `node setup-db-mongodb.js` | Initialize MongoDB with sample data | First installation or reset |
| `node cleanup-duplicates-mongodb.js` | Remove duplicate programs | If programs duplicated |
| `node cleanup-teacher-duplicates-mongodb.js` | Remove duplicate teachers | If teachers duplicated |
| `node cleanup-course-duplicates-mongodb.js` | Remove duplicate courses | If courses duplicated |
| `node check-admin.js` | Verify admin account | Troubleshooting login |

---

## 🎓 Resources & Tips

### MongoDB Resources

#### Official Documentation
- **MongoDB University**: Free courses at https://university.mongodb.com/
- **Mongoose Docs**: https://mongoosejs.com/docs/
- **Atlas Docs**: https://docs.atlas.mongodb.com/
- **Connection Strings**: https://docs.mongodb.com/manual/reference/connection-string/

#### Useful Atlas Features
- **Performance Advisor**: Suggests indexes for better performance
- **Real-time Metrics**: View operations, connections, and queries
- **Query Profiler**: Analyze slow queries
- **Data Explorer**: Browse and edit data directly in Atlas
- **Backup & Restore**: Automated backups (limited in free tier)

#### Free Tier Limits
- **Storage**: 512 MB
- **RAM**: 512 MB (shared)
- **Backups**: Limited to recent snapshots
- **Connections**: 500 max

### Performance Tips

1. **Indexes**: Already configured in models (student_number, teacher_id, etc.)
2. **Lean queries**: Used for read-only operations (faster)
3. **Populate**: Only load needed fields from references
4. **Connection pooling**: Handled automatically by Mongoose
5. **Aggregation**: Use for complex statistics and reporting
6. **Limit results**: Use pagination for large datasets

### Security Best Practices

1. **Never commit `.env`** - Already in .gitignore
2. **Whitelist IPs** - Use specific IPs in production
3. **Strong passwords** - Use generated passwords for DB users
4. **Change SESSION_SECRET** - Use random string in production
5. **Enable Atlas audit logs** - Track database access
6. **Regular backups** - Export data regularly
7. **Update dependencies** - Keep packages up to date

### Monitoring with Atlas

Access your cluster in Atlas to see:
- Real-time performance metrics
- Slow query analysis
- Connection statistics
- Storage usage
- Operation counts
- Index usage statistics

### Deployment Ready

This project is ready to deploy to:

**Heroku:**
```bash
heroku config:set MONGODB_URI=your_uri
heroku config:set SESSION_SECRET=your_secret
```

**Render:**
- Add MONGODB_URI in environment variables
- Add SESSION_SECRET
- Set NODE_ENV=production

**Vercel:**
- Configure env vars in project settings
- MONGODB_URI, SESSION_SECRET, NODE_ENV
- Optimized for serverless

**Railway:**
- Auto-detects Node.js
- Add MONGODB_URI and SESSION_SECRET
- Set PORT if needed

### Development Workflow

#### For Students Testing:
1. Open http://localhost:3000
2. Fill out evaluation form
3. Test auto-save feature
4. Submit evaluation
5. Verify in admin panel

#### For Admin Testing:
1. Login at http://localhost:3000/admin/login
2. Check dashboard statistics
3. Add/edit teachers, programs, courses
4. View evaluation details
5. Test on mobile device

#### Testing Responsive Design

**Desktop Testing (Chrome/Firefox):**
1. Press F12 to open Developer Tools
2. Click Toggle Device Toolbar (Ctrl+Shift+M)
3. Test different device sizes:
   - Mobile: 375x667 (iPhone)
   - Tablet: 768x1024 (iPad)
   - Desktop: 1920x1080

**Real Device Testing:**
1. Make sure your device is on the same network
2. Find your computer's local IP:
   ```powershell
   ipconfig
   # Look for IPv4 Address
   ```
3. Access from phone: `http://YOUR_IP:3000`
4. Test all features on actual devices

### Useful Commands

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

**Count documents:**
```javascript
// In your scripts
const count = await Evaluation.countDocuments();
console.log('Total evaluations:', count);
```

**Export data from Atlas:**
- Use MongoDB Compass (free GUI tool)
- Or use `mongodump` command-line tool

### Next Steps

#### For Development:
1. ✅ Change default admin password
2. ✅ Add your actual teachers
3. ✅ Add your actual programs
4. ✅ Add your actual courses
5. ✅ Test on mobile devices
6. ✅ Customize the form if needed
7. ✅ Set up regular backups

#### For Production:
1. ✅ Secure MongoDB Atlas (specific IP whitelist)
2. ✅ Change SESSION_SECRET to strong random string
3. ✅ Enable MongoDB Atlas backups
4. ✅ Set up monitoring and alerts
5. ✅ Use environment variables
6. ✅ Deploy to hosting service
7. ✅ Test thoroughly before launch
8. ✅ Monitor performance and usage

---

## 🆘 Getting Help

### Support Resources

**MongoDB Atlas:**
- Status: https://status.mongodb.com/
- Support: https://support.mongodb.com/
- Community: https://community.mongodb.com/

**Project Issues:**
- Contact UPHSD Molino CCS IT Department
- Check documentation files in project
- Review error messages in console/terminal

### Common Questions

**Q: Can I use this without internet?**
A: Yes, install MongoDB locally and update MONGODB_URI to `mongodb://localhost:27017/faculty_evaluation`

**Q: Is student data private?**
A: Yes, student IDs are hidden from admin views but stored for auditing.

**Q: Can I customize the evaluation form?**
A: Yes, edit `views/index.ejs` and update the Evaluation model schema.

**Q: How do I backup my data?**
A: Use MongoDB Compass to export, or enable Atlas automated backups.

**Q: Can multiple admins use the system?**
A: Yes, add more admin accounts in the database.

---

## 🎉 Success!

If you can see the evaluation form and login to the admin portal, congratulations! Your installation is complete.

### Verification Checklist:
- ✅ Form loads and shows navigation bar
- ✅ Admin login button visible
- ✅ Can login to admin portal
- ✅ Dashboard shows statistics from MongoDB
- ✅ Mobile menu works (hamburger icon)
- ✅ Tables scroll on mobile
- ✅ Student IDs hidden from admin views
- ✅ Can add/edit/delete teachers
- ✅ No duplicate entries allowed (Mongoose validation)
- ✅ Auto-save works on evaluation form
- ✅ Progress tracker updates in real-time

### MongoDB Atlas Benefits:
- ✅ No local database installation needed
- ✅ Automatic backups (in paid tiers)
- ✅ Built-in monitoring and alerts
- ✅ Scalable as your needs grow
- ✅ Access from anywhere
- ✅ Free tier perfect for development
- ✅ Easy deployment to cloud platforms

### Start Using:
1. Test the student form on mobile
2. Add your actual teachers
3. Add your actual courses
4. Test a sample evaluation
5. View it in the admin dashboard
6. Monitor in Atlas dashboard
7. Customize as needed

---

## 📝 License

MIT License - See LICENSE file

---

## 👥 Credits

**UPHSD Molino - College of Computer Studies**
- Student Faculty Evaluation System
- Migrated to MongoDB Atlas: February 2026

**Technologies Used:**
- Node.js & Express
- MongoDB & Mongoose
- EJS Templates
- Tailwind CSS
- Font Awesome
- bcrypt for security
- Express Session

---

**Need help?** Contact the UPHSD Molino CCS IT Department

**MongoDB Atlas Help:** https://support.mongodb.com/

**Last Updated:** February 2026
