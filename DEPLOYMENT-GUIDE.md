# E-Signature Feature - Deployment Guide

## 🎉 Implementation Complete

The e-signature feature has been successfully implemented. Teachers can now upload their e-signature images and embed them in evaluation reports with configurable placement before generating PDFs.

---

## 📋 What Was Implemented

### Backend (Node.js/Express/MongoDB)

1. **Railway Configuration** ([railway.toml](railway.toml))
   - Volume mount configuration for persistent file storage
   - Build and deployment settings

2. **Image Upload Infrastructure**
   - **Upload Utilities** ([backend/utils/upload-helpers.ts](backend/utils/upload-helpers.ts))
     - File validation (PNG/JPEG, max 2MB)
     - Image processing with Sharp (resize to max 400x150px, optimize)
     - Unique filename generation
     - File management functions
   - **Multer Middleware** ([backend/middleware/upload.ts](backend/middleware/upload.ts))
     - Memory storage for initial upload
     - File type and size validation
     - Error handling

3. **API Endpoints** ([backend/routes/teacher/profile.ts](backend/routes/teacher/profile.ts))
   - `GET /api/teacher/profile` - Get profile with signature metadata
   - `POST /api/teacher/profile/signature` - Upload/replace signature
   - `GET /api/teacher/profile/signature/metadata` - Get signature info
   - `DELETE /api/teacher/profile/signature` - Remove signature
   - `GET /api/uploads/signatures/:filename` - Serve signature image (authenticated)

4. **Database Schema Updates** ([backend/models/Teacher.ts](backend/models/Teacher.ts))
   - Added `signature_filename` field (encrypted)
   - Added `signature_uploaded_at` field

### Frontend (React/TypeScript/Vite)

1. **SignatureUpload Component** ([frontend/src/components/SignatureUpload.tsx](frontend/src/components/SignatureUpload.tsx))
   - Drag-and-drop file upload
   - File preview before upload
   - Upload/delete functionality
   - Real-time validation and error handling

2. **TeacherProfile Page** ([frontend/src/pages/teacher/TeacherProfile.tsx](frontend/src/pages/teacher/TeacherProfile.tsx))
   - Profile information display
   - E-signature management section
   - Integration with SignatureUpload component

3. **Navigation Updates**
   - Added "Profile" link to [TeacherNavbar](frontend/src/components/TeacherNavbar.tsx)
   - Added profile route to [App.tsx](frontend/src/App.tsx)

4. **Report Signature Embedding** ([frontend/src/pages/teacher/EvaluationReport.tsx](frontend/src/pages/teacher/EvaluationReport.tsx))
   - Signature configurator UI (placement, enable/disable)
   - Configurable placement: Bottom Right, Center, Left
   - Signature rendering in PDF reports
   - Configuration persistence in localStorage

---

## 🚀 Railway Deployment Steps

### 1. Create Railway Volume

In Railway dashboard or CLI:

```bash
# Option 1: Railway Dashboard
# Navigate to your project → Settings → Volumes → Create Volume
# Name: signatures-storage
# Mount Path: /data/uploads

# Option 2: Railway CLI
railway volume create signatures-storage --mount /data/uploads
```

### 2. Set Environment Variables

In Railway dashboard, add these variables:

```bash
# Required
MONGODB_URI=<your-mongodb-connection-string>
ENCRYPTION_MASTER_KEY=<your-512-bit-hex-key>
SESSION_SECRET=<your-session-secret>
NODE_ENV=production

# Railway Volume (auto-set, but verify)
RAILWAY_VOLUME_MOUNT_PATH=/data/uploads
```

### 3. Deploy to Railway

```bash
# Initialize Railway project (if not done)
railway init

# Link to your project
railway link

# Deploy
railway up

# Or use GitHub integration
# Push to main branch → auto-deploys
```

### 4. Verify Deployment

Check the deployment logs for:
- ✅ "Signatures directory created at /data/uploads/signatures"
- ✅ Server started successfully
- ✅ MongoDB connected

---

## 🧪 Testing Checklist

### Backend Testing

#### 1. Signature Upload
- [ ] Navigate to `https://your-domain/teacher/profile` (after logging in as teacher)
- [ ] Upload a PNG or JPEG signature image (< 2MB)
- [ ] Verify success message appears
- [ ] Check file exists in Railway Volume: `ls /data/uploads/signatures/`

#### 2. File Validation
- [ ] Try uploading a file > 2MB → Should show error
- [ ] Try uploading a PDF or other non-image → Should show error
- [ ] Try uploading without selecting a file → Should show error

#### 3. Signature Replacement
- [ ] Upload a signature
- [ ] Upload a new signature → Should replace old one
- [ ] Verify old file is deleted from filesystem

#### 4. Signature Deletion
- [ ] Upload a signature
- [ ] Click "Delete" button
- [ ] Confirm deletion
- [ ] Verify file removed from database and filesystem

#### 5. Access Control
- [ ] Try accessing `/api/uploads/signatures/<other-teacher-filename>` → Should return 403 Forbidden
- [ ] Verify teacher can only access their own signature

### Frontend Testing

#### 1. Profile Page
- [ ] Navigate to "Profile" from TeacherNavbar
- [ ] Verify profile information displays correctly
- [ ] Upload signature using drag-and-drop
- [ ] Upload signature using "Browse Files" button
- [ ] Preview displays before upload
- [ ] Success message shows after upload

#### 2. Report Generation
- [ ] Go to Dashboard → Select a course → View Report
- [ ] Verify signature configurator UI appears in toolbar (if signature uploaded)
- [ ] Enable "Include signature on report" checkbox
- [ ] Select placement: Bottom Right, Center, Left
- [ ] Verify signature appears in report preview
- [ ] Disable checkbox → Signature disappears

#### 3. PDF Generation
- [ ] Enable signature with "Bottom Right" placement
- [ ] Click "Print / Save PDF"
- [ ] Verify signature appears in PDF at bottom right
- [ ] Test other placements (center, left)
- [ ] Verify signature prints clearly (not pixelated)

#### 4. Persistence
- [ ] Configure signature placement → Refresh page → Verify settings persist
- [ ] Upload signature → Logout → Login → Verify signature still exists
- [ ] Redeploy Railway service → Verify signature file persists (not deleted)

### Cross-Browser Testing
- [ ] Test on Chrome
- [ ] Test on Firefox
- [ ] Test on Edge
- [ ] Test on Safari (if available)

---

## 🔍 Troubleshooting

### Issue: "Failed to upload signature"

**Check:**
1. Railway Volume is properly mounted: `echo $RAILWAY_VOLUME_MOUNT_PATH`
2. Directory exists: `ls -la /data/uploads/signatures/`
3. Permissions: Directory should be writable
4. Backend logs for error details

**Fix:**
```bash
# SSH into Railway container
railway run bash

# Check volume mount
ls -la /data/uploads

# Create directory manually if needed
mkdir -p /data/uploads/signatures
chmod 755 /data/uploads/signatures
```

### Issue: "Signature not appearing in PDF"

**Check:**
1. Signature configuration is enabled (checkbox checked)
2. Image URL loads correctly: Open browser DevTools → Network tab
3. Browser console for errors
4. Image is preloaded before printing

**Fix:**
- Clear localStorage: `localStorage.removeItem('evalReport_signatureConfig')`
- Refresh page and reconfigure

### Issue: "Access denied" when accessing signature

**Check:**
1. Teacher is logged in (session active)
2. Signature filename matches teacher's record
3. Backend authentication middleware working

**Fix:**
- Logout and login again
- Check session cookie is present

### Issue: Volume data lost after deployment

**Check:**
1. Railway Volume is properly configured (not ephemeral storage)
2. Volume is linked to the service

**Fix:**
```bash
# Verify volume is persistent
railway volume list

# Recreate volume if needed
railway volume create signatures-storage --mount /data/uploads
```

---

## 📊 Database Impact

### Teacher Collection

New fields added (encrypted):
```javascript
{
  signature_filename: EncryptedData | undefined,
  signature_uploaded_at: Date | undefined
}
```

**Migration:** No migration needed. Fields are optional and will be `undefined` for existing teachers until they upload a signature.

---

## 🔐 Security Considerations

1. **File Validation:** Server-side validation prevents malicious files
2. **Access Control:** Teachers can only access their own signatures
3. **Encryption:** Signature filenames are encrypted in database (like other PII)
4. **File Storage:** Railway Volumes are isolated per project
5. **Image Processing:** Sharp sanitizes images during processing

---

## 📈 Performance

- **Image Size:** Optimized to < 100KB per signature
- **Load Time:** Signature images are lazy-loaded
- **PDF Generation:** Preloading prevents print delays
- **Storage:** ~1MB per 10 signatures (negligible)

---

## 🎨 Customization

### Change Max File Size

Edit [backend/utils/upload-helpers.ts](backend/utils/upload-helpers.ts):
```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024; // Change to 5MB
```

### Change Max Dimensions

Edit [backend/utils/upload-helpers.ts](backend/utils/upload-helpers.ts):
```typescript
const MAX_WIDTH = 600;  // Increase width
const MAX_HEIGHT = 200; // Increase height
```

### Add More Placement Options

Edit [frontend/src/pages/teacher/EvaluationReport.tsx](frontend/src/pages/teacher/EvaluationReport.tsx):
```typescript
interface SignatureConfig {
  placement: 'bottom-right' | 'bottom-center' | 'bottom-left' | 'top-right'; // Add more
}
```

---

## 📝 Next Steps (Optional Enhancements)

1. **Audit Trail:** Log signature upload/delete events in privacy audit
2. **Signature Watermarking:** Add timestamp overlay for authenticity
3. **Multiple Signatures:** Support multiple signature styles per teacher
4. **Batch Operations:** Allow admin to export all signatures
5. **Signature Preview:** Add preview modal before applying to report

---

## 🆘 Support

**Issues?** Check:
1. Railway deployment logs
2. Browser console errors
3. Network tab for failed requests
4. Backend error responses

**Still stuck?** Review relevant files:
- Backend routes: [backend/routes/teacher/profile.ts](backend/routes/teacher/profile.ts)
- Upload utilities: [backend/utils/upload-helpers.ts](backend/utils/upload-helpers.ts)
- Frontend component: [frontend/src/components/SignatureUpload.tsx](frontend/src/components/SignatureUpload.tsx)
- Report embedding: [frontend/src/pages/teacher/EvaluationReport.tsx](frontend/src/pages/teacher/EvaluationReport.tsx)

---

## ✅ Summary

You now have a complete e-signature feature that:
- ✅ Allows teachers to upload/manage signatures in their profile
- ✅ Stores signatures securely in Railway Volumes (persistent)
- ✅ Validates and optimizes images server-side
- ✅ Encrypts signature filenames in database
- ✅ Embeds signatures in PDF reports with configurable placement
- ✅ Maintains signature settings across sessions
- ✅ Provides secure access control (teachers can only access their own)

**Ready to deploy!** Follow the Railway deployment steps above and test thoroughly before going live.
