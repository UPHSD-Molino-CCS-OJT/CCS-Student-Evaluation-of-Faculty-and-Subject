# 🚨 Known Issues & Solutions

## Current Issues

### 1. Tailwind CDN Warning (Non-Critical)

**Warning Message:**
```
cdn.tailwindcss.com should not be used in production
```

**Status:** ⚠️ Development Only - Works fine for testing

**Why it happens:**
The current implementation uses Tailwind CSS via CDN for quick setup. This is perfect for development but not recommended for production.

**Impact:**
- Slower page load times
- Larger file sizes
- Some advanced features may not work
- Console warning in browser

**Solution for Production:**

#### Option 1: Use Tailwind CLI (Recommended)

1. Install Tailwind CSS:
```bash
npm install -D tailwindcss
npx tailwindcss init
```

2. Create `tailwind.config.js`:
```javascript
module.exports = {
  content: ["./views/**/*.ejs"],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

3. Create `public/css/input.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

4. Add build script to `package.json`:
```json
"scripts": {
  "build-css": "tailwindcss -i ./public/css/input.css -o ./public/css/output.css --minify",
  "watch-css": "tailwindcss -i ./public/css/input.css -o ./public/css/output.css --watch"
}
```

5. Update views to use compiled CSS:
```html
<link rel="stylesheet" href="/css/output.css">
```

Instead of:
```html
<script src="https://cdn.tailwindcss.com"></script>
```

#### Option 2: Keep CDN (Quick Fix)
If you want to keep using CDN but remove the warning:

Add this to your EJS files:
```javascript
<script>
  // Suppress Tailwind CDN warning
  window.console = window.console || {};
  const originalWarn = console.warn;
  console.warn = function(...args) {
    if (!args[0].includes('cdn.tailwindcss.com')) {
      originalWarn.apply(console, args);
    }
  };
</script>
```

### 2. ✅ FIXED: Course Loading Error

**Error Message:**
```
Failed to load resource: 404 (Not Found)
Error loading courses: SyntaxError: Unexpected token '<'
```

**Status:** ✅ Fixed

**What was wrong:**
The form was sending program name instead of program ID to the API.

**What was fixed:**
- Updated program select to use `program.id` as value
- Updated teacher select to use `teacher.id` as value
- Removed old courses data code that was causing conflicts

**Result:** Courses now load correctly when you select a program!

### 3. Node.js Deprecation Warning (Non-Critical)

**Warning Message:**
```
[DEP0044] DeprecationWarning: The `util.isArray` API is deprecated
```

**Status:** ⚠️ Non-Critical - Caused by dependencies

**Why it happens:**
One of the npm packages (likely mysql2 or body-parser) uses an old Node.js API.

**Impact:**
None - just a warning, functionality works fine.

**Solution:**
Wait for package maintainers to update, or suppress the warning:
```bash
node --no-deprecation server.js
```

Or update `package.json`:
```json
"scripts": {
  "start": "node --no-deprecation server.js"
}
```

## Testing Checklist

After fixing issues, test these:

- [ ] Student form loads correctly
- [ ] Select a program - courses load dynamically
- [ ] Fill out form - auto-save works
- [ ] Submit evaluation - success modal appears
- [ ] Admin login works (admin/admin123)
- [ ] Admin dashboard shows data
- [ ] View evaluations in admin panel
- [ ] Add teacher in admin panel
- [ ] Add course in admin panel

## Performance Notes

### For Development:
Current setup is perfect - CDN makes development fast and easy.

### For Production:
Consider these optimizations:

1. **Use compiled Tailwind CSS** (see Option 1 above)
2. **Minify JavaScript** - Consider using a build tool
3. **Enable gzip compression** in Express:
```javascript
const compression = require('compression');
app.use(compression());
```

4. **Add caching headers** for static files
5. **Use a process manager** like PM2:
```bash
npm install -g pm2
pm2 start server.js
```

6. **Set up HTTPS** with Let's Encrypt
7. **Use environment-specific configs**

## Security Checklist

Before deploying:

- [ ] Change default admin password
- [ ] Update SESSION_SECRET in .env
- [ ] Use strong MySQL password
- [ ] Enable HTTPS/SSL
- [ ] Set up regular database backups
- [ ] Add rate limiting for API endpoints
- [ ] Implement CSRF protection
- [ ] Add input sanitization
- [ ] Set secure cookie options in production

## Database Performance

For large-scale use:

1. **Add more indexes:**
```sql
CREATE INDEX idx_program_year ON evaluations(program_id, school_year);
CREATE INDEX idx_teacher_year ON evaluations(teacher_id, school_year);
```

2. **Regular maintenance:**
```sql
OPTIMIZE TABLE evaluations;
ANALYZE TABLE evaluations;
```

3. **Monitor query performance:**
```javascript
// Add query logging in database.js
pool.on('connection', (connection) => {
  connection.query('SET SESSION long_query_time = 1');
});
```

## Browser Compatibility

Tested and working on:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ⚠️ Internet Explorer (not recommended, may have issues)

## Common User Issues

### "Auto-save not working"
**Solution:** Check if browser allows localStorage. Private/Incognito mode may block it.

### "Can't see courses"
**Solution:** Make sure you selected a program first. Courses load based on program.

### "Form won't submit"
**Solution:** Check all required fields (marked with *) are filled. Form will scroll to first error.

### "Admin can't login"
**Solution:** 
1. Check database is set up: `npm run setup-db`
2. Try default credentials: admin / admin123
3. Check MySQL is running

## Getting Help

If you encounter issues:

1. **Check browser console** (F12) for JavaScript errors
2. **Check terminal** for server errors
3. **Check MySQL logs** for database errors
4. **Review documentation:**
   - INSTALLATION.md - Setup guide
   - FEATURES.md - Features documentation
   - QUICK_START.md - Quick reference

## Issue Reporting

When reporting issues, include:
- Browser and version
- Node.js version
- MySQL version
- Error messages (console and terminal)
- Steps to reproduce

---

**Note:** The system is fully functional despite the Tailwind CDN warning. This is a development best-practice warning that doesn't affect functionality. Address it when moving to production.
