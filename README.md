# 🎓 UPHSD Student Faculty Evaluation System

**Complete Documentation & User Guide**

This project has been migrated from MySQL to **MongoDB Atlas** for easy cloud hosting!

## 📑 Table of Contents

- [Quick Start](#-quick-start-5-minutes)
- [Project Structure](#-project-structure)
- [Available Scripts](#️-available-scripts)
- [Resources & Tips](#-resources--tips)

## 📚 Documentation

- **[Installation Guide](docs/INSTALLATION-GUIDE.md)** - Complete setup instructions
- **[MongoDB Setup & Troubleshooting](docs/MONGODB-SETUP-TROUBLESHOOTING.md)** - Connection issues and solutions
- **[Features Guide](docs/FEATURES-GUIDE.md)** - Detailed feature documentation
- **[Function Reference](docs/FUNCTION-REFERENCE.md)** - API and function documentation
- **[Privacy & Data Protection](docs/PRIVACY-AND-DATA-PROTECTION.md)** - Complete privacy system guide

---

## 🚀 Quick Start (5 minutes!)

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

**📖 For detailed setup instructions, see: [Installation Guide](docs/INSTALLATION-GUIDE.md)**

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

## ️ Available Scripts

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
