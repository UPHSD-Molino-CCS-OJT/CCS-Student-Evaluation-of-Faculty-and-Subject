## MongoDB Connection Solutions

### Issue
Windows DNS cannot resolve MongoDB Atlas SRV records (common Windows 11 issue)

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

### Current Status
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
