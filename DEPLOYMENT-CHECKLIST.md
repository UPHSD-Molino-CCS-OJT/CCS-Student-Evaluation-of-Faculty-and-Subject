# ✅ Pre-Deployment Checklist

## 1. MongoDB Atlas Setup ☁️

- [ ] Created free MongoDB Atlas account
- [ ] Created M0 (FREE) cluster
- [ ] Created database user with strong password
- [ ] Added Network Access: 0.0.0.0/0 (Allow from anywhere)
- [ ] Copied connection string
- [ ] Replaced `<password>` in connection string
- [ ] Tested connection string locally

## 2. Code Preparation 📝

- [ ] All code changes committed to Git
- [ ] `.env` file is in `.gitignore` (NEVER commit secrets!)
- [ ] Dependencies updated: `npm update`
- [ ] No critical security vulnerabilities: `npm audit`
- [ ] Code pushed to GitHub/GitLab/Bitbucket

## 3. Environment Variables 🔐

- [ ] `MONGODB_URI` ready (connection string from Atlas)
- [ ] `SESSION_SECRET` generated (min 32 random characters)
- [ ] `NODE_ENV` set to "production"

**Generate SESSION_SECRET:**
```powershell
# PowerShell - Run this to generate random secret:
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

## 4. Vercel Account Setup 🚀

- [ ] Created Vercel account (free tier)
- [ ] Connected GitHub/GitLab account to Vercel
- [ ] Verified account via email

## 5. Deployment Steps 📤

- [ ] Imported project from Git repository
- [ ] Added all 3 environment variables
- [ ] Deployed successfully
- [ ] Received deployment URL

## 6. Post-Deployment Testing ✔️

- [ ] Visited deployment URL
- [ ] Student form loads correctly
- [ ] Programs dropdown populated
- [ ] Courses load when program selected
- [ ] Successfully submitted test evaluation
- [ ] Admin login works (`/admin/login`)
- [ ] Admin dashboard displays data
- [ ] Teachers management works
- [ ] Programs management works
- [ ] Courses management works
- [ ] Evaluation details viewable

## 7. Security Steps 🔒

- [ ] Changed default admin password from `admin123`
- [ ] Created additional admin accounts if needed
- [ ] Reviewed MongoDB Atlas security settings
- [ ] Enabled MongoDB Atlas backup (if using paid tier)
- [ ] Set up monitoring/alerts in Vercel dashboard

## 8. Performance Monitoring 📊

- [ ] Checked Vercel analytics
- [ ] Monitored MongoDB Atlas metrics
- [ ] Tested from multiple devices/networks
- [ ] Verified response times acceptable
- [ ] No timeout errors on Vercel

## 9. Optional Enhancements 🌟

- [ ] Set up custom domain in Vercel
- [ ] Configured SSL certificate (Vercel auto-provisions)
- [ ] Added MongoDB Atlas IP whitelist for specific IPs
- [ ] Set up Vercel deployment webhooks
- [ ] Configured automatic deployments on Git push

## 10. Documentation 📚

- [ ] Updated README with deployment URL
- [ ] Documented admin credentials (store securely!)
- [ ] Shared student evaluation URL with stakeholders
- [ ] Trained admin users on the system

---

## Quick Deploy Commands

```powershell
# If using Vercel CLI
vercel login
vercel

# Add environment variables
vercel env add MONGODB_URI
vercel env add SESSION_SECRET  
vercel env add NODE_ENV

# Deploy to production
vercel --prod
```

## Troubleshooting Common Issues

### "Cannot connect to MongoDB"
✅ Check Network Access in Atlas (0.0.0.0/0)
✅ Verify password has no special characters or is URL-encoded
✅ Ensure cluster is not paused

### "Session store error"
✅ Verify MONGODB_URI environment variable is set
✅ Check MongoDB connection string format

### "504 Gateway Timeout"
✅ Increase serverSelectionTimeoutMS in database.js
✅ Check MongoDB Atlas status page
✅ Consider upgrading MongoDB tier

### "Module not found" 
✅ Ensure package.json is committed
✅ Run `vercel env pull` to sync env vars
✅ Redeploy

---

## Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas**: https://www.mongodb.com/docs/atlas/
- **Deployment Guide**: See VERCEL-DEPLOYMENT.md
- **Functions Reference**: See FUNCTIONS.md

---

Last Updated: {{ DATE }}
