# E-Signature API Reference

Quick reference for the e-signature endpoints and usage.

---

## 🔗 API Endpoints

### Teacher Profile

#### Get Profile Information
```http
GET /api/teacher/profile
```

**Authentication:** Required (Teacher session)

**Response:**
```json
{
  "success": true,
  "profile": {
    "_id": "507f1f77bcf86cd799439011",
    "full_name": "John Doe",
    "employee_id": "EMP-001",
    "username": "jdoe",
    "email": "john@example.com",
    "department": "Computer Studies",
    "status": "active",
    "signature_filename": "signature_123_1234567890.png",
    "signature_uploaded_at": "2026-03-10T08:30:00.000Z",
    "last_login": "2026-03-10T08:00:00.000Z"
  }
}
```

---

### Signature Management

#### Upload/Replace Signature
```http
POST /api/teacher/profile/signature
Content-Type: multipart/form-data
```

**Authentication:** Required (Teacher session)

**Body:**
- `signature` (file): PNG or JPEG image, max 2MB

**Example (JavaScript):**
```javascript
const formData = new FormData();
formData.append('signature', fileInput.files[0]);

const response = await axios.post('/api/teacher/profile/signature', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  withCredentials: true,
});
```

**Success Response:**
```json
{
  "success": true,
  "message": "Signature uploaded successfully",
  "signature": {
    "filename": "signature_507f1f77bcf86cd799439011_1710061800000.png",
    "uploaded_at": "2026-03-10T08:30:00.000Z"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "File size exceeds maximum allowed size of 2MB."
}
```

---

#### Get Signature Metadata
```http
GET /api/teacher/profile/signature/metadata
```

**Authentication:** Required (Teacher session)

**Response (with signature):**
```json
{
  "success": true,
  "hasSignature": true,
  "signature": {
    "filename": "signature_507f1f77bcf86cd799439011_1710061800000.png",
    "uploaded_at": "2026-03-10T08:30:00.000Z"
  }
}
```

**Response (no signature):**
```json
{
  "success": true,
  "hasSignature": false,
  "signature": null
}
```

---

#### Delete Signature
```http
DELETE /api/teacher/profile/signature
```

**Authentication:** Required (Teacher session)

**Response:**
```json
{
  "success": true,
  "message": "Signature deleted successfully"
}
```

---

#### Serve Signature Image
```http
GET /api/uploads/signatures/:filename
```

**Authentication:** Required (Teacher session)

**Security:** 
- Teacher can only access their own signature
- Returns 403 if trying to access another teacher's signature

**Response:** 
- Content-Type: `image/png`
- Binary image data

**Example Usage:**
```html
<img src="/api/uploads/signatures/signature_507f1f77bcf86cd799439011_1710061800000.png" 
     alt="Teacher Signature" />
```

---

## 📋 File Requirements

### Accepted Formats
- PNG (`.png`)
- JPEG (`.jpg`, `.jpeg`)

### Size Limits
- Maximum file size: **2MB**
- Maximum dimensions: **400x150px** (auto-resized)

### Processing
- Images are automatically resized to fit within 400x150px while maintaining aspect ratio
- Converted to PNG format with optimization
- Small images are not upscaled (withoutEnlargement: true)

---

## 🔐 Security Features

### Authentication
All endpoints require active teacher session:
```javascript
// Session must contain teacherId
req.session.teacherId // Must be present
```

### Access Control
- Teachers can only access their own signature
- Signature filenames are encrypted in database
- File access is validated against database records

### Validation
- File type checked (MIME type)
- File size validated server-side
- Image processing with Sharp sanitizes malicious content

---

## 🎯 Frontend Usage Examples

### Upload Signature Component
```tsx
import axios from 'axios';

const uploadSignature = async (file: File) => {
  const formData = new FormData();
  formData.append('signature', file);

  try {
    const response = await axios.post('/api/teacher/profile/signature', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      withCredentials: true,
    });
    
    if (response.data.success) {
      console.log('Uploaded:', response.data.signature);
    }
  } catch (error) {
    console.error('Upload failed:', error.response?.data?.message);
  }
};
```

### Fetch Signature Metadata
```tsx
const fetchSignature = async () => {
  try {
    const response = await axios.get('/api/teacher/profile/signature/metadata', {
      withCredentials: true,
    });

    if (response.data.hasSignature) {
      const signatureUrl = `/api/uploads/signatures/${response.data.signature.filename}`;
      setSignatureUrl(signatureUrl);
    }
  } catch (error) {
    console.error('Failed to fetch signature:', error);
  }
};
```

### Delete Signature
```tsx
const deleteSignature = async () => {
  if (!confirm('Are you sure?')) return;

  try {
    const response = await axios.delete('/api/teacher/profile/signature', {
      withCredentials: true,
    });

    if (response.data.success) {
      console.log('Signature deleted');
    }
  } catch (error) {
    console.error('Delete failed:', error);
  }
};
```

---

## 🖼️ Signature Configuration

### LocalStorage Structure
```typescript
interface SignatureConfig {
  enabled: boolean;
  placement: 'bottom-right' | 'bottom-center' | 'bottom-left';
}

// Stored in: localStorage.getItem('evalReport_signatureConfig')
```

### Example:
```json
{
  "enabled": true,
  "placement": "bottom-right"
}
```

---

## 🚨 Error Codes

| Status | Message | Cause |
|--------|---------|-------|
| 400 | "No file uploaded" | Missing file in request |
| 400 | "File size exceeds maximum..." | File > 2MB |
| 400 | "Invalid file type..." | Non-image file |
| 401 | "Not authenticated" | No active session |
| 403 | "Access denied" | Trying to access another teacher's signature |
| 404 | "Teacher not found" | Invalid teacher ID in session |
| 404 | "Signature not found" | File doesn't exist in filesystem |
| 500 | "Failed to process image" | Sharp processing error |

---

## 📂 File Storage Structure

```
/data/uploads/signatures/
├── signature_507f1f77bcf86cd799439011_1710061800000.png
├── signature_507f1f77bcf86cd799439012_1710061900000.png
└── ...
```

**Filename Pattern:**
```
signature_{teacherId}_{timestamp}.png
```

**Example:**
- Teacher ID: `507f1f77bcf86cd799439011`
- Timestamp: `1710061800000`
- Filename: `signature_507f1f77bcf86cd799439011_1710061800000.png`

---

## ✅ Quick Start

### 1. Teacher uploads signature
```bash
POST /api/teacher/profile/signature
# Upload file via multipart form
```

### 2. Signature is processed
- Validated (type, size)
- Resized to max 400x150px
- Converted to PNG
- Saved to /data/uploads/signatures/

### 3. Database updated
```javascript
teacher.signature_filename = encrypt("signature_..._....png")
teacher.signature_uploaded_at = new Date()
```

### 4. Signature used in report
```tsx
<img src="/api/uploads/signatures/signature_..._....png" />
```

### 5. PDF generated with signature
```typescript
// Signature appears at configured placement
// (bottom-right, bottom-center, or bottom-left)
```

---

## 🔄 Signature Replacement Flow

1. **Upload new signature** → POST /api/teacher/profile/signature
2. **Old file deleted** from filesystem
3. **New file saved** to filesystem
4. **Database updated** with new filename
5. **Previous signature overwritten**

---

## 💡 Tips

### Preload Images Before Printing
```javascript
const handlePrint = () => {
  const img = new Image();
  img.onload = () => {
    window.print(); // Print after image loads
  };
  img.src = signatureUrl;
};
```

### Validate Client-Side Before Upload
```javascript
const validateFile = (file: File) => {
  const MAX_SIZE = 2 * 1024 * 1024; // 2MB
  const ALLOWED_TYPES = ['image/png', 'image/jpeg'];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Only PNG and JPEG images are allowed.';
  }
  if (file.size > MAX_SIZE) {
    return 'File size must be less than 2MB.';
  }
  return null;
};
```

### Handle Upload Progress
```javascript
const uploadWithProgress = async (file: File) => {
  const formData = new FormData();
  formData.append('signature', file);

  await axios.post('/api/teacher/profile/signature', formData, {
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      setProgress(percentCompleted);
    },
  });
};
```

---

## 📞 Need Help?

**Common Issues:**
1. 401 Error → Check if teacher session is active
2. 403 Error → Verify accessing own signature, not another teacher's
3. 500 Error → Check Railway Volume is mounted and writable
4. Image not loading → Verify image URL and authentication

**Debugging:**
```bash
# Check Railway logs
railway logs

# Check if file exists
railway run ls -la /data/uploads/signatures/

# Test API endpoint
curl -X GET http://localhost:3000/api/teacher/profile/signature/metadata \
  --cookie "connect.sid=<session-id>"
```
