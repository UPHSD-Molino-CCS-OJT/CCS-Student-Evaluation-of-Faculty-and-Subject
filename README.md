# 🚀 MongoDB Atlas Migration - Quick Start Guide

This project has been migrated from MySQL to **MongoDB Atlas** for easy cloud hosting!

## ✨ What Changed?

### Before (MySQL):
- Required local MySQL server installation
- Complex database setup with SQL scripts
- Limited to local development

### Now (MongoDB Atlas):
- ☁️ **Cloud-based** - No local database installation needed!
- 🆓 **Free tier** available (512MB storage)
- 🌍 **Access from anywhere** with internet connection
- 📊 **Built-in monitoring** and performance insights
- 🔒 **Automatic backups** (in paid tiers)
- 📈 **Scalable** - Easy to upgrade as needed

## 🎯 Quick Setup (5 minutes!)

### 1. Create MongoDB Atlas Account (FREE)
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up for free account
3. Create a new **FREE** M0 cluster
4. Create database user (username + password)
5. Whitelist your IP (or allow from anywhere for development)
6. Get your connection string

### 2. Install Dependencies
```powershell
npm install
```

### 3. Configure Environment
Create `.env` file:
```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/faculty_evaluation?retryWrites=true&w=majority
PORT=3000
SESSION_SECRET=uphsd_faculty_evaluation_secret_key_2026
```

### 4. Initialize Database
```powershell
node setup-db-mongodb.js
```

### 5. Start Server
```powershell
npm start
```

**Done!** Visit http://localhost:3000

## 📚 Full Documentation

- **[INSTALLATION.md](INSTALLATION.md)** - Complete step-by-step guide with screenshots
- **[FEATURES.md](FEATURES.md)** - All features and functionality

## 🆘 Need Help?

**Common Issues:**
- Connection fails? Check your MongoDB URI and IP whitelist
- Authentication error? Verify username/password (URL-encode special characters)
- Can't connect? Ensure "Allow access from anywhere" is enabled in Atlas

**Get Help:**
- MongoDB Atlas: https://support.mongodb.com/
- Project Issues: Contact UPHSD Molino CCS IT Department

## 📂 Project Structure

```
├── models/              # Mongoose schemas (NEW!)
│   ├── Admin.js
│   ├── Program.js
│   ├── Teacher.js
│   ├── Course.js
│   └── Evaluation.js
├── config/
│   └── database.js      # MongoDB connection (UPDATED!)
├── views/               # EJS templates
├── middleware/          # Authentication
├── server.js            # Express app (UPDATED for MongoDB!)
├── setup-db-mongodb.js  # Database initialization (NEW!)
├── .env.example         # MongoDB config template (UPDATED!)
└── package.json         # Now uses Mongoose! (UPDATED!)
```

## 🔄 Migration Notes

### For Existing Users:

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
   - MySQL setup scripts still available

### Database Schema Differences:

**MySQL (Old):**
- Tables with AUTO_INCREMENT IDs
- Foreign keys with ON DELETE SET NULL
- ENUM types for status fields

**MongoDB (New):**
- Collections with ObjectId (_id)
- References using ObjectId
- String enums with Mongoose validation
- Built-in timestamps (createdAt, updatedAt)

**Benefits:**
- Flexible schema (easier to modify)
- Better performance for read-heavy operations
- No need for JOIN queries (using populate)
- Natural JSON structure

## 🛠️ Available Scripts

| Script | Purpose |
|--------|---------|
| `npm start` | Start the server |
| `npm run dev` | Start with nodemon (auto-reload) |
| `node setup-db-mongodb.js` | Initialize MongoDB with sample data |
| `node cleanup-duplicates-mongodb.js` | Remove duplicate programs |
| `node cleanup-teacher-duplicates-mongodb.js` | Remove duplicate teachers |
| `node cleanup-course-duplicates-mongodb.js` | Remove duplicate courses |

## 🎓 MongoDB Resources

- **MongoDB University**: Free courses at https://university.mongodb.com/
- **Mongoose Docs**: https://mongoosejs.com/docs/
- **Atlas Docs**: https://docs.atlas.mongodb.com/

## ⚡ Performance Tips

1. **Indexes**: Already configured in models (student_number, teacher_id, etc.)
2. **Lean queries**: Used for read-only operations (faster)
3. **Populate**: Only load needed fields from references
4. **Connection pooling**: Handled automatically by Mongoose

## 🔐 Security Best Practices

1. **Never commit `.env`** - Already in .gitignore
2. **Whitelist IPs** - Use specific IPs in production
3. **Strong passwords** - Use generated passwords for DB users
4. **Change SESSION_SECRET** - Use random string in production
5. **Enable Atlas audit logs** - Track database access

## 📊 Monitoring with Atlas

Access your cluster in Atlas to see:
- Real-time performance metrics
- Slow query analysis
- Connection statistics
- Storage usage
- Operation counts

## 🚀 Deployment Ready

This project is ready to deploy to:
- **Heroku** - `heroku config:set MONGODB_URI=your_uri`
- **Render** - Add MONGODB_URI in environment variables
- **Vercel** - Configure env vars in project settings
- **Railway** - Auto-detects Node.js, add MONGODB_URI

## 📝 License

MIT License - See LICENSE file

## 👥 Credits

**UPHSD Molino - College of Computer Studies**
- Student Faculty Evaluation System
- Migrated to MongoDB Atlas: February 2026

---

**Questions?** Read [INSTALLATION_MONGODB.md](INSTALLATION_MONGODB.md) for detailed instructions!
