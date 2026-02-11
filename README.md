# 🎓 UPHSD Student Faculty Evaluation System (React + Vite)

A modern, full-stack web application for collecting anonymous student feedback on faculty performance, built with **React.js + Vite** frontend and **Express.js + MongoDB** backend.

## 🌟 Version 2.0 - React Migration

**Major Update:** The system has been migrated from EJS server-side rendering to a modern React + Vite architecture for improved performance, better user experience, and enhanced developer workflow.

## ✨ Key Features

### Student Portal
- 💾 **Auto-save Draft System** - Automatic progress saving
- 📊 **Real-time Progress Tracker** - Visual completion indicators  
- ✅ **Smart Form Validation** - Instant feedback
- 🎯 **Section Accordion Navigation** - Easy form navigation
- ⌨️ **Keyboard Shortcuts** - Ctrl+S to save manually
- 📱 **Fully Responsive** - Works on all devices
- 🔒 **10-Layer Privacy Protection** - Complete anonymity

### Admin Portal  
- 🔐 **Secure Authentication** - Session-based login
- 📊 **Comprehensive Dashboard** - Statistics and analytics
- 👁️ **Detailed Evaluation Reports** - Color-coded ratings
- 👨‍🏫 **Teacher Management** - Full CRUD operations
- 📚 **Course Management** - Organize by program
- 🎓 **Program Management** - Academic program control
- 🛡️ **Privacy Audit System** - Compliance monitoring

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- MongoDB
- npm or yarn

### Installation

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd CCS-Student-Evaluation-of-Faculty-and-Subject
   npm install
   cd client && npm install && cd ..
   ```

2. **Configure environment:**
   ```bash
   # Create .env in root directory
   MONGODB_URI=mongodb://localhost:27017/student_evaluation
   SESSION_SECRET=your_secret_key_here
   NODE_ENV=development
   ```

3. **Initialize database:**
   ```bash
   npm run setup-db
   ```

### Development Mode

**Run full-stack application:**
```bash
npm run dev:fullstack
```
- Backend API: `http://localhost:3000`
- Frontend: `http://localhost:5173`

**Or run separately:**
```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend  
cd client
npm run dev
```

### Production Mode

```bash
# Build React app
npm run build

# Start production server
npm start
```
Access at `http://localhost:3000`

## 🏗️ Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **Axios** - HTTP client
- **Font Awesome** - Icons

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **bcrypt** - Password hashing
- **express-session** - Session management

## 📁 Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── App.jsx        # Main app
│   │   └── main.jsx       # Entry point
│   ├── public/            # Static assets
│   └── vite.config.js     # Vite config
├── routes/
│   └── api.js            # API routes
├── models/                # MongoDB models
├── middleware/            # Express middleware
├── utils/                 # Utilities
├── config/                # Configuration
├── server.js             # Express server
└── package.json          # Dependencies
```

## 📚 Documentation

- 📖 [React Migration Guide](REACT-MIGRATION.md) - Migration details
- 🎯 [Features Guide](docs/FEATURES-GUIDE.md) - Complete feature list
- 🔐 [Privacy & Data Protection](docs/PRIVACY-AND-DATA-PROTECTION.md) - Privacy system
- 📦 [Installation Guide](docs/INSTALLATION-GUIDE.md) - Detailed setup
- 🔧 [Function Reference](docs/FUNCTION-REFERENCE.md) - API reference

## 🔐 Default Credentials

**Admin Portal:**
- Username: `admin`
- Password: `admin123`

⚠️ **Change these credentials immediately after first login!**

## 🌐 Access URLs

- **Student Portal:** `http://localhost:3000/student/login`
- **Admin Portal:** `http://localhost:3000/admin/login`
- **API Health Check:** `http://localhost:3000/api/health`

## 🎨 Key Features in Detail

### Auto-Save System
- Saves every 2 seconds automatically
- Stores in browser localStorage
- Resume anytime
- Clear draft option
- Ctrl+S manual save

### Progress Tracking
- Visual progress bar
- Percentage completion  
- Section-by-section status
- Color-coded indicators

### Privacy Protection
1. **Cryptographic anonymization** (SHA-512)
2. **Timing decorrelation** (random delays)
3. **IP anonymization**
4. **Automatic decoupling** (24h)
5. **Differential privacy**
6. **K-anonymity** (k=5)
7. **Session security**
8. **Data minimization**
9. **Audit logging**
10. **FERPA/GDPR compliance**

## 🐛 Troubleshooting

### Frontend Issues
```bash
cd client
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Backend Issues
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Database Issues
```bash
npm run setup-db
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

ISC License

## 👥 Support

For issues and questions:
- Create an issue on GitHub
- Contact the development team
- Check documentation in `/docs`

## 🙏 Acknowledgments

- UPHSD for project requirements
- React community for excellent tools
- MongoDB team for database solutions
- All contributors and testers

---

**Version 2.0** - React + Vite Architecture  
Built with ❤️ for UPHSD