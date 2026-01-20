# 📋 Quick Start Guide

## ⚡ Fast Setup (5 Minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Database
Edit `.env` file:
```env
DB_PASSWORD=your_mysql_password
```

### 3. Setup Database
```bash
npm run setup-db
```

### 4. Start Server
```bash
npm start
```

### 5. Open Browser
- Student Form: http://localhost:3000
- Admin Login: http://localhost:3000/admin/login
  - Username: `admin`
  - Password: `admin123`

## 🎯 What You Get

### ✨ Features Added

#### 1. MySQL Database ✅
- Full relational database structure
- Tables: admins, programs, teachers, courses, evaluations
- Sample data included
- Indexed for performance

#### 2. Admin Authentication ✅
- Secure login system
- Session management (24-hour sessions)
- Password encryption with bcrypt
- Protected admin routes

#### 3. Admin Dashboard ✅
- Statistics overview
- Recent evaluations display
- Manage teachers (add, view, status)
- Manage courses (add, view, by program)
- View detailed evaluation reports
- Color-coded ratings display

#### 4. Quality of Life Improvements ✅

**Student Form:**
- 💾 Auto-save draft (LocalStorage)
- 📊 Real-time progress tracker (percentage + bar)
- ✅ Smart validation (green/red borders)
- 🎯 Section completion indicators
- ⌨️ Keyboard shortcuts (Ctrl+S to save)
- 📱 Fully responsive design
- 🎨 Sticky header with progress
- 🔄 Loading states on submit
- ✨ Success modal confirmation
- 🚀 Dynamic course loading
- 📝 Clear draft button
- 💡 First-time user tips

**Admin Portal:**
- 📊 Dashboard with statistics
- 🎨 Professional design with Tailwind CSS
- 👁️ Detailed evaluation viewer
- 🎯 Color-coded ratings (green/yellow/red)
- ➕ Quick add modals for teachers/courses
- 📋 Clean table displays
- 🔍 Easy navigation
- 🔐 Secure logout

## 📁 New Files Created

```
├── config/
│   └── database.js              ✨ Database configuration
├── database/
│   └── schema.sql              ✨ Complete database schema
├── middleware/
│   └── auth.js                 ✨ Authentication middleware
├── views/
│   ├── index.ejs               ♻️ Updated with QoL features
│   └── admin/                  ✨ New admin portal
│       ├── login.ejs
│       ├── dashboard.ejs
│       ├── evaluations.ejs
│       ├── evaluation-detail.ejs
│       ├── teachers.ejs
│       ├── courses.ejs
│       └── partials/
│           └── navbar.ejs
├── server.js                    ♻️ Updated with database & auth
├── setup-db.js                  ✨ Database setup script
├── .env                         ✨ Environment configuration
├── .env.example                 ✨ Example configuration
├── INSTALLATION.md              ✨ Detailed setup guide
├── FEATURES.md                  ✨ Features documentation
└── README.md                    ♻️ Updated documentation

✨ = New file
♻️ = Updated file
```

## 🗄️ Database Schema

### Tables Created:
1. **admins** - Admin user accounts
2. **programs** - Academic programs (BSCS, BSIT)
3. **teachers** - Faculty members
4. **courses** - Subject/course listings
5. **evaluations** - Student evaluation responses (25+ fields)

### Sample Data Included:
- 1 admin account (admin/admin123)
- 2 programs (BS CS Data Science, BS IT Game Dev)
- 5 sample teachers
- 10 sample courses

## 🔐 Security Features

- ✅ Password hashing (bcrypt with salt rounds)
- ✅ Session-based authentication
- ✅ Protected admin routes
- ✅ SQL injection prevention (parameterized queries)
- ✅ HTTP-only cookies
- ✅ Environment variable configuration
- ✅ CSRF protection ready

## 📊 Admin Portal Routes

| Route | Access | Purpose |
|-------|--------|---------|
| `/admin/login` | Public | Admin login page |
| `/admin/dashboard` | Protected | Statistics & overview |
| `/admin/evaluations` | Protected | List all evaluations |
| `/admin/evaluations/:id` | Protected | View specific evaluation |
| `/admin/teachers` | Protected | Manage teachers |
| `/admin/courses` | Protected | Manage courses |
| `/admin/logout` | Protected | Logout & destroy session |

## 🎨 Design Highlights

### Student Form:
- Sticky progress header
- Auto-save indicator (floating badge)
- Progress bar (top of page)
- Color-coded sections (blue → green when complete)
- Field validation colors (green valid, red invalid)
- Smooth animations throughout
- Mobile-responsive grid layout

### Admin Portal:
- Professional blue color scheme
- Font Awesome icons
- Card-based statistics
- Clean table displays
- Modal popups for forms
- Color-coded status indicators
- Hover effects and transitions

## 🚀 Usage Examples

### Submit an Evaluation (Student):
1. Go to http://localhost:3000
2. Fill in student information
3. Select program (courses load automatically)
4. Rate teacher on all criteria
5. Add comments (optional)
6. Click "Submit Evaluation"
7. See success message

### View Evaluations (Admin):
1. Login at http://localhost:3000/admin/login
2. See dashboard with stats
3. Click "Evaluations" in nav
4. Click "View" on any evaluation
5. See complete details with color-coded ratings

### Add a Teacher (Admin):
1. Login to admin portal
2. Go to "Teachers"
3. Click "Add Teacher"
4. Fill in modal form
5. Click submit
6. Teacher added instantly

## 💡 Tips & Best Practices

### For Development:
- Use `npm run dev` for auto-reload
- Check browser console for client errors
- Check terminal for server errors
- MySQL Workbench for database management

### For Production:
- Change `SESSION_SECRET` in .env
- Use strong MySQL password
- Regular database backups
- Enable HTTPS/SSL
- Set up monitoring/logging

### For Users:
- Students: Take advantage of auto-save!
- Admins: Change default password immediately
- Backup database regularly
- Keep teachers/courses updated

## 🆘 Quick Troubleshooting

**Can't connect to database?**
```bash
# Check MySQL is running
# Windows: Services → MySQL
# Verify .env credentials
```

**Can't login?**
```bash
# Default: admin / admin123
# Check admins table exists
mysql -u root -p
USE faculty_evaluation;
SELECT * FROM admins;
```

**Port 3000 in use?**
```env
# Change in .env
PORT=3001
```

## 📚 Documentation Files

- **README.md** - Main documentation
- **INSTALLATION.md** - Detailed setup guide
- **FEATURES.md** - Complete features list
- **QUICK_START.md** - This file!

## ✅ Checklist

Before going live:
- [ ] Database created and populated
- [ ] Admin password changed
- [ ] .env configured correctly
- [ ] Test evaluation submission
- [ ] Test admin login and dashboard
- [ ] Add real teachers and courses
- [ ] Test on mobile devices
- [ ] Configure backups
- [ ] Review security settings

## 🎉 You're Ready!

Everything is set up and ready to use. Start by:

1. **Testing the student form**
   - Fill out a sample evaluation
   - Test auto-save by closing and reopening
   - Try the clear draft feature

2. **Exploring the admin portal**
   - Login and view dashboard
   - Add your actual teachers
   - Add your actual courses
   - View sample evaluations

3. **Customizing for your needs**
   - Update school year in database
   - Modify questions if needed
   - Add more programs if needed

---

**Made with ❤️ for UPHSD - Molino Campus**

Need help? Check INSTALLATION.md or FEATURES.md for detailed guides!
