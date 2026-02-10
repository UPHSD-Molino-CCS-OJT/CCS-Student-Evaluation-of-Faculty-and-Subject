# 🛠️ MongoDB Setup & Troubleshooting

## Common Windows DNS Issue

**Problem:** Windows DNS cannot resolve MongoDB Atlas SRV records (common Windows 11 issue)

## Solution Options

### Option 1: Install MongoDB Locally (Most Reliable for Development)
1. Download MongoDB Community Server: https://www.mongodb.com/try/download/community
2. Install with default settings
3. Update .env:
   ```
   MONGODB_URI=mongodb://localhost:27017/faculty_evaluation
   ```
4. Run setup: `npm run setup-db`
5. Start server: `npm start`

### Option 2: Use MongoDB Compass (Official GUI Tool)
1. Download MongoDB Compass: https://www.mongodb.com/try/download/compass
2. Connect using your connection string
3. Compass handles DNS issues better than Node.js
4. Once data is loaded, your app can still access it

### Option 3: Get Standard Connection String from Atlas
1. Login to MongoDB Atlas: https://cloud.mongodb.com
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "2.2.12 or later" driver
5. COPY the standard connection string (mongodb:// not mongodb+srv://)
6. Update .env file

### Option 4: Whitelist Your IP in MongoDB Atlas
1. Login to MongoDB Atlas
2. Go to Network Access
3. Click "Add IP Address"
4. Add your current IP or "Allow Access from Anywhere" (0.0.0.0/0) for testing
5. Try connecting again

### Option 5: Use Mobile Hotspot/Different Network
- School/corporate networks may block MongoDB Atlas
- Try using mobile hotspot temporarily to test
- If this works, contact your network administrator

## Current Status Indicators
- ✅ Internet connection: Working
- ✅ Application code: Ready
- ✅ Database schema: Configured
- ❌ DNS resolution: Failing for MongoDB Atlas
- 📦 Collections ready: admins, programs, teachers, courses, evaluations

## Quick Test After Fix
```bash
node test-connection.js
npm run setup-db
npm start
```

## Recommended Approach
**Install MongoDB locally** for development. It's faster, more reliable, and doesn't require internet for testing.

## Additional Troubleshooting Tips

### Connection String Format

**Standard format (for local MongoDB):**
```
mongodb://localhost:27017/faculty_evaluation
```

**Atlas format (with SRV):**
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/faculty_evaluation?retryWrites=true&w=majority
```

**Atlas format (without SRV - if DNS issues):**
```
mongodb://username:password@cluster0-shard-00-00.xxxxx.mongodb.net:27017,cluster0-shard-00-01.xxxxx.mongodb.net:27017,cluster0-shard-00-02.xxxxx.mongodb.net:27017/faculty_evaluation?ssl=true&replicaSet=atlas-xxxxx-shard-0&authSource=admin&retryWrites=true&w=majority
```

### Password Special Characters

If your password contains special characters, URL-encode them:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `/` → `%2F`
- `:` → `%3A`

### Firewall Issues

**Check if MongoDB ports are blocked:**
- MongoDB default port: 27017
- MongoDB Atlas typically uses port 27017 with SSL

**Allow through Windows Firewall:**
1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Click "Change settings" (admin required)
4. Find Node.js and ensure both Private and Public are checked
5. If not listed, click "Allow another app" and browse to node.exe

### Network Issues

**Corporate/School Networks:**
- May block MongoDB Atlas connections
- May require proxy configuration
- Contact IT department for whitelisting

**VPN or Proxy:**
- May interfere with MongoDB connections
- Try disconnecting temporarily to test
- Configure proxy if required

### MongoDB Atlas Issues

**Cluster Paused:**
- Free tier clusters pause after inactivity
- Login to Atlas and resume the cluster

**IP Whitelist:**
- Verify your current IP address: https://whatismyipaddress.com/
- Add it to Network Access in Atlas
- Or use 0.0.0.0/0 for development (allows all IPs)

**User Permissions:**
- Ensure database user has "Read and write to any database" privilege
- Check in Database Access section of Atlas

### Testing Connection

**Create test script (test-connection.js):**
```javascript
require('dotenv').config();
const mongoose = require('mongoose');

console.log('Testing MongoDB connection...');
console.log('URI:', process.env.MONGODB_URI.replace(/:[^:]*@/, ':***@'));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✓ Connection successful!');
    console.log('✓ Database:', mongoose.connection.name);
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('✗ Connection failed!');
    console.error('Error:', err.message);
    process.exit(1);
  });
```

**Run test:**
```powershell
node test-connection.js
```

### Common Error Messages

**"MongooseServerSelectionError: getaddrinfo ENOTFOUND"**
- DNS cannot resolve hostname
- Try standard connection string instead of SRV
- Check internet connection

**"MongooseServerSelectionError: connect ETIMEDOUT"**
- Network timeout
- Check firewall settings
- Verify IP whitelist in Atlas
- Try different network

**"MongooseServerSelectionError: Authentication failed"**
- Wrong username or password
- Check credentials in connection string
- Verify user exists in Database Access
- Check special characters are URL-encoded

**"MongooseError: The `uri` parameter must be a string"**
- MONGODB_URI not set in .env file
- Check .env file exists in project root
- Verify dotenv is loaded: `require('dotenv').config()`

## MongoDB Compass Setup

MongoDB Compass is a free GUI tool for MongoDB that can help diagnose connection issues.

**Installation:**
1. Download: https://www.mongodb.com/try/download/compass
2. Install with default settings
3. Launch MongoDB Compass

**Connect:**
1. Paste your connection string (with password)
2. Click "Connect"
3. If successful, browse databases and collections

**Benefits:**
- Visual interface for database
- Better error messages
- Can help identify connection problems
- Manual data entry/editing
- Query builder

## Alternative: Local MongoDB Installation

For development without internet dependency:

**Windows Installation:**
1. Download MongoDB Community Server: https://www.mongodb.com/try/download/community
2. Choose "Complete" installation
3. Install as Windows Service
4. Default port: 27017

**Update .env:**
```env
MONGODB_URI=mongodb://localhost:27017/faculty_evaluation
```

**Verify Installation:**
```powershell
# Check if MongoDB service is running
Get-Service -Name MongoDB
```

**Connect:**
```powershell
node setup-db-mongodb.js
npm start
```

## Getting Help

**MongoDB Status:**
- Check MongoDB Atlas status: https://status.mongodb.com/

**MongoDB Support:**
- Community Forums: https://community.mongodb.com/
- Official Support: https://support.mongodb.com/

**Node.js/Mongoose:**
- Mongoose Docs: https://mongoosejs.com/docs/
- Connection String Options: https://docs.mongodb.com/manual/reference/connection-string/

---

**Still having issues?** Contact your system administrator or IT support team.
