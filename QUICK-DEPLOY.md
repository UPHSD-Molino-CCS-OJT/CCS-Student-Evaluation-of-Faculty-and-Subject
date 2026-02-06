# 🚀 Quick Deploy Guide - UPHSD Faculty Evaluation

## ⚡ 5-Minute Deployment

### Step 1: MongoDB Atlas (2 minutes)
1. Visit https://mongodb.com/cloud/atlas/register
2. Create FREE account → Create FREE M0 cluster
3. Database Access → Add User (remember username & password)
4. Network Access → Add IP: **0.0.0.0/0** (allow from anywhere)
5. Clusters → Connect → Copy connection string
   ```
   mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/faculty_evaluation
   ```

### Step 2: Push to Git (1 minute)
```powershell
git add .
git commit -m "Ready for Vercel"
git push origin main
```

### Step 3: Deploy to Vercel (2 minutes)
1. Visit https://vercel.com → Sign up/Login
2. **New Project** → Import your Git repository
3. **Environment Variables** (Click "Add"):
   ```
   MONGODB_URI = [paste your connection string]
   SESSION_SECRET = [random 32+ characters]
   NODE_ENV = production
   ```
4. Click **Deploy**

### Step 4: Test (30 seconds)
- Visit: `https://your-app.vercel.app`
- Login: `https://your-app.vercel.app/admin/login`
- Credentials: `admin` / `admin123`
- ⚠️ **Change password immediately!**

---

## 📱 Quick Commands

### Using Vercel CLI
```powershell
# Install CLI
npm install -g vercel

# Deploy
vercel login
vercel

# Add environment variables
vercel env add MONGODB_URI
vercel env add SESSION_SECRET
vercel env add NODE_ENV

# Production deployment
vercel --prod
```

### Generate Random Secret
```powershell
# PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

---

## 🔗 Important URLs After Deployment

| URL | Purpose |
|-----|---------|
| `https://your-app.vercel.app/` | Student evaluation form |
| `https://your-app.vercel.app/admin/login` | Admin login |
| `https://vercel.com/dashboard` | Vercel dashboard |
| `https://cloud.mongodb.com/` | MongoDB Atlas |

---

## ⚙️ Environment Variables

| Variable | Example | Where to Get |
|----------|---------|--------------|
| `MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas → Connect |
| `SESSION_SECRET` | `abc123xyz789...` | Generate random (32+ chars) |
| `NODE_ENV` | `production` | Type manually |

---

## ✅ Default Login

- **Username**: `admin`
- **Password**: `admin123`
- **⚠️ CHANGE THIS IMMEDIATELY!**

---

## 🆘 Common Issues

| Problem | Solution |
|---------|----------|
| "Cannot connect to MongoDB" | MongoDB Atlas → Network Access → Add 0.0.0.0/0 |
| "Session error" | Check `MONGODB_URI` in Vercel env variables |
| "504 Timeout" | MongoDB free tier cold start - wait 60s, refresh |
| "Admin login fails" | Visit homepage first to auto-initialize database |

---

## 📚 Full Documentation

- **Complete Guide**: `VERCEL-DEPLOYMENT.md`
- **All Functions**: `FUNCTIONS.md`
- **Checklist**: `DEPLOYMENT-CHECKLIST.md`
- **This File**: Quick reference only

---

## 🎯 What Gets Auto-Created on First Run

- ✅ 1 admin account (admin/admin123)
- ✅ 2 sample programs (BSCS-DS, BSIT-GD)
- ✅ 5 sample teachers
- ✅ 10 sample courses

You can delete/modify these after deployment.

---

## 📊 Features

- **Public**: Student evaluation form (25 criteria)
- **Admin**: Dashboard, statistics, management
- **Security**: Password hashing, session management
- **Cloud**: 100% serverless, no server maintenance

---

## 💰 Cost

- **Vercel**: FREE (for personal projects)
- **MongoDB Atlas**: FREE (M0 cluster, 512MB)
- **Total**: **$0/month** ✨

---

## 🔒 Security First

1. ✅ Change default admin password immediately
2. ✅ Use strong SESSION_SECRET (32+ random chars)
3. ✅ Never commit `.env` file to Git
4. ✅ Monitor MongoDB Atlas for suspicious activity
5. ✅ Regularly update dependencies: `npm update`

---

## 📞 Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Docs**: https://www.mongodb.com/docs/atlas/
- **Full Guide**: See `VERCEL-DEPLOYMENT.md`

---

**🎉 Ready? Let's deploy! Follow the 4 steps above.**

Print this page for quick reference during deployment.
