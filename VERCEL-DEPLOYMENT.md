# 🚀 Vercel Deployment Guide

## Prerequisites

1. ✅ MongoDB Atlas account (FREE tier works!)
2. ✅ Vercel account (FREE tier works!)
3. ✅ Git repository (GitHub, GitLab, or Bitbucket)

## Step-by-Step Deployment

### 1. Prepare MongoDB Atlas

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create a FREE M0 cluster
3. Create database user:
   - Username: `admin` (or your choice)
   - Password: Generate strong password
4. Network Access:
   - Click "Add IP Address"
   - Select **"Allow Access from Anywhere"** (0.0.0.0/0)
   - This is required for Vercel servers
5. Get connection string:
   - Click "Connect" > "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your actual password
   - Example: `mongodb+srv://admin:YourPassword123@cluster0.xxxxx.mongodb.net/faculty_evaluation?retryWrites=true&w=majority`

### 2. Push Code to Git Repository

```powershell
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for Vercel deployment"

# Add remote (replace with your repository URL)
git remote add origin https://github.com/yourusername/your-repo.git

# Push
git push -u origin main
```

### 3. Deploy to Vercel

#### Option A: Using Vercel Dashboard (Easiest)

1. Go to https://vercel.com
2. Sign up/Login (can use GitHub account)
3. Click **"Add New Project"**
4. Import your Git repository
5. Configure project:
   - **Framework Preset**: Other
   - **Build Command**: Leave empty
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`

6. **Add Environment Variables** (CRITICAL!):
   ```
   MONGODB_URI = mongodb+srv://admin:YourPassword123@cluster0.xxxxx.mongodb.net/faculty_evaluation?retryWrites=true&w=majority
   SESSION_SECRET = your_random_secret_string_here_make_it_long_and_complex
   NODE_ENV = production
   ```

7. Click **"Deploy"**

#### Option B: Using Vercel CLI

```powershell
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# Add environment variables
vercel env add MONGODB_URI
# Paste your MongoDB URI when prompted

vercel env add SESSION_SECRET
# Enter a random secret string

vercel env add NODE_ENV
# Enter: production

# Deploy to production
vercel --prod
```

### 4. Initialize Database (First Time Only)

After deployment, your database will auto-initialize when the app first runs. The default admin credentials will be:
- **Username**: `admin`
- **Password**: `admin123`

**⚠️ IMPORTANT**: Change the default password after first login!

### 5. Verify Deployment

1. Visit your Vercel URL: `https://your-app-name.vercel.app`
2. Test the student evaluation form
3. Login to admin panel: `https://your-app-name.vercel.app/admin/login`
4. Check that data is being saved to MongoDB Atlas

## Environment Variables Explained

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `SESSION_SECRET` | Secret key for session encryption | `random_string_min_32_chars` |
| `NODE_ENV` | Environment mode | `production` |

## Troubleshooting

### ❌ "Cannot connect to MongoDB"
- Check MongoDB Atlas network access allows 0.0.0.0/0
- Verify connection string has correct password
- Ensure password doesn't have special characters (or URL-encode them)

### ❌ "Session store connection error"
- Verify MONGODB_URI is set in Vercel environment variables
- Check MongoDB cluster is running (not paused)

### ❌ "Module not found"
- Run `vercel env pull` to sync environment variables
- Redeploy: `vercel --prod`

### ❌ "504 Gateway Timeout"
- MongoDB Atlas free tier may have cold starts
- Increase serverSelectionTimeoutMS in database.js
- Consider upgrading to paid MongoDB tier for better performance

## Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click **Settings** > **Domains**
3. Add your custom domain
4. Update DNS records as instructed
5. Vercel automatically provisions SSL certificate

## Updating Your App

```powershell
# Make your changes
git add .
git commit -m "Your changes"
git push

# Vercel automatically redeploys on push!
```

## Security Best Practices

1. ✅ Change default admin password immediately
2. ✅ Use strong SESSION_SECRET (32+ random characters)
3. ✅ Enable MongoDB Atlas backup (paid feature)
4. ✅ Monitor MongoDB Atlas metrics for suspicious activity
5. ✅ Regularly update dependencies: `npm audit fix`
6. ✅ Use environment variables for all secrets (never commit to Git)

## Performance Tips

1. **MongoDB Indexes**: Already configured in models
2. **Session Store**: Using MongoDB store with 24-hour touch interval
3. **Connection Pooling**: Mongoose handles this automatically
4. **Caching**: Consider adding Redis for session caching (advanced)

## Support

- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas Docs**: https://www.mongodb.com/docs/atlas/
- **Project Issues**: Contact UPHSD Molino CCS IT Department

---

## 🎉 Your app is now live on Vercel!

Share your URL with students and faculty: `https://your-app-name.vercel.app`
