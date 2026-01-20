# UPHSD Student Faculty Evaluation System

Complete web-based student faculty evaluation system with admin portal, MySQL database, and modern UI.

## ✨ Features

### Student Portal
- 📋 Comprehensive evaluation form with 25+ criteria
- 💾 **Auto-save draft** - Never lose your progress!
- 📊 **Real-time progress tracker** - See completion percentage
- 🎯 Visual feedback for completed sections
- 📱 Fully responsive mobile-friendly design
- ⌨️ Keyboard shortcuts (Ctrl+S to save)
- 🔒 Data Privacy Act compliance

### Admin Portal
- 🔐 Secure login system with session management
- 📊 Dashboard with statistics and recent evaluations
- 👁️ View all evaluations with detailed breakdowns
- 👨‍🏫 Manage teachers (add, view, status tracking)
- 📚 Manage courses by program
- 🎨 Color-coded rating system
- 📈 Easy-to-read evaluation reports

### Database Features
- 💾 MySQL database for persistent storage
- 🔗 Relational data structure
- 📝 Complete evaluation history
- 🔍 Indexed for fast queries
- 👤 Admin authentication with bcrypt

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MySQL Server (v5.7 or higher)
- npm or yarn

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
Edit the `.env` file with your MySQL credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=faculty_evaluation
DB_PORT=3306
SESSION_SECRET=change_this_to_random_string
PORT=3000
```

3. **Setup database:**
```bash
npm run setup-db
```

4. **Start the server:**
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

5. **Access the application:**
- Student Form: http://localhost:3000
- Admin Portal: http://localhost:3000/admin/login
  - Username: `admin`
  - Password: `admin123`

## 📁 Project Structure

```
├── config/
│   └── database.js          # Database configuration
├── database/
│   └── schema.sql           # Database schema and seed data
├── middleware/
│   └── auth.js              # Authentication middleware
├── views/
│   ├── index.ejs            # Student evaluation form
│   └── admin/               # Admin portal views
├── server.js                # Express server & routes
├── setup-db.js              # Database setup script
└── README.md
```

## 🎯 Quality of Life Features

### Student Experience
1. **Auto-Save Draft** - Form automatically saves to browser storage
2. **Progress Indicator** - Visual progress bar and percentage
3. **Smart Validation** - Real-time field validation with color coding
4. **Better UX** - Sticky header, loading states, keyboard shortcuts

### Admin Experience
1. **Intuitive Dashboard** - Quick statistics overview
2. **Detailed Reports** - Color-coded ratings and complete breakdowns
3. **Easy Management** - Quick add modals for teachers/courses

## 🛠️ Technologies Used

- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **Template Engine:** EJS
- **CSS Framework:** Tailwind CSS
- **Icons:** Font Awesome
- **Authentication:** express-session, bcrypt
- **Storage:** LocalStorage (draft saving)

## 📝 Usage Guide

### For Students
1. Open the evaluation form
2. Fill in your information (auto-saves as you type)
3. Rate your teacher on various criteria
4. Submit when complete - your progress is saved!

### For Administrators
1. Login to admin portal
2. View dashboard statistics
3. Browse and manage evaluations, teachers, and courses

## 🚨 Troubleshooting

**Database connection failed:**
- Check MySQL is running
- Verify credentials in `.env`

**Can't login to admin:**
- Default credentials: admin / admin123

## 👨‍💻 Credits

**Developed by:** Lloyd Alvin Degaños  
**Institution:** UPHSD - Molino Campus  
**Project:** Student Faculty Evaluation System  
**Year:** 2026

## 📄 License

This project is developed for UPHSD - Molino Campus educational purposes.

---

**Made with ❤️ for UPHSD - Molino Campus**
