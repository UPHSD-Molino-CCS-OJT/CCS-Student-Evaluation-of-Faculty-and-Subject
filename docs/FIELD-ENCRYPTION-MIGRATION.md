# Field Encryption Migration Guide

## Overview

This guide explains how to apply field-level encryption to sensitive data across all collections in the student evaluation system.

## What's Being Encrypted

### Collections and Fields

| Collection | Encrypted Fields | Not Encrypted |
|------------|-----------------|---------------|
| **Admins** | username, full_name, email | password (hashed), last_login |
| **Courses** | name, code | program_id |
| **Enrollments** | section_code, school_year, semester | receipt_hash (hash), student_id, course_id, teacher_id |
| **Evaluations** | school_year, year_level, status | anonymous_token, ratings, comments (already encrypted) |
| **Programs** | name, code | - |
| **Students** | student_number, full_name, email, year_level, section, status | program_id |
| **Teachers** | full_name, employee_id, email, department, status | - |

### Why Not Encrypt Everything?

- **Hashes** (password, receipt_hash): Already one-way encrypted for verification
- **Tokens** (anonymous_token, submission_token): Used for anonymity/verification logic
- **ObjectIds**: MongoDB references, not PII
- **Ratings**: Numeric data without PII
- **Timestamps**: Not sensitive

## Prerequisites

### 1. Backup Your Database

```powershell
# MongoDB backup
mongodump --uri="mongodb://localhost:27017/student-evaluation" --out=./backup-$(Get-Date -Format 'yyyy-MM-dd')
```

### 2. Set Encryption Master Key

```powershell
# Generate a new master key (256-bit)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Set environment variable (PowerShell)
$env:ENCRYPTION_MASTER_KEY = "your_64_character_hex_key_here"

# Or add to .env file
ENCRYPTION_MASTER_KEY=your_64_character_hex_key_here
```

> ⚠️ **CRITICAL**: Store this key securely! If lost, encrypted data cannot be recovered.

## Running the Migration

### Dry Run (Recommended First)

Test the migration without modifying data:

```powershell
npm run build
node dist/migrate-encrypt-fields.js --dry-run
```

### Full Migration

Encrypt all collections:

```powershell
npm run build
node dist/migrate-encrypt-fields.js
```

### Migrate Specific Collection

Encrypt only one collection:

```powershell
npm run build
node dist/migrate-encrypt-fields.js --collection=students
node dist/migrate-encrypt-fields.js --collection=teachers
node dist/migrate-encrypt-fields.js --collection=admins
```

## Migration Output

The script provides detailed progress:

```
🔐 Database Field Encryption Migration
======================================================================
✅ Encryption configured
🔌 Connecting to: mongodb://***@localhost:27017/student-evaluation
✅ Connected to database

📁 Migrating Students collection...
  ✓ Encrypted student: 507f1f77bcf86cd799439011
  ✓ Encrypted student: 507f1f77bcf86cd799439012
  ...

📊 MIGRATION SUMMARY
======================================================================

students:
  Total documents:     150
  Fields encrypted:    900
  Already encrypted:   0
  Errors:              0

Overall Totals:
  Total documents:     500
  Fields encrypted:    2850
  Already encrypted:   0
  Errors:              0
======================================================================
✅ Migration completed successfully!
```

## What Happens During Migration

1. **Connects** to MongoDB using MONGODB_URI from environment
2. **Checks** if encryption is configured (ENCRYPTION_MASTER_KEY)
3. **Iterates** through each document in each collection
4. **Detects** plaintext vs encrypted fields
5. **Encrypts** plaintext fields using AES-256-GCM
6. **Skips** already encrypted fields (idempotent)
7. **Saves** updated documents back to database
8. **Reports** statistics for each collection

## Using Encrypted Data in Application

### Reading Encrypted Fields

Fields are automatically decrypted in queries:

```typescript
import { decryptField } from './utils/encryption';
import Student from './models/Student';

// Fetch student
const student = await Student.findById(id);

// Decrypt fields for use
const studentNumber = typeof student.student_number === 'string' 
  ? student.student_number 
  : decryptField(student.student_number);

const fullName = typeof student.full_name === 'string'
  ? student.full_name
  : decryptField(student.full_name);
```

### Creating New Records

Encrypt fields before saving:

```typescript
import { encryptField } from './utils/encryption';
import Student from './models/Student';

const newStudent = new Student({
  student_number: encryptField('2024-12345'),
  full_name: encryptField('John Doe'),
  email: encryptField('john.doe@example.com'),
  year_level: encryptField('1st'),
  section: encryptField('A'),
  status: encryptField('Regular'),
  program_id: programId
});

await newStudent.save();
```

### Updating Records

```typescript
import { encryptField } from './utils/encryption';

await Student.findByIdAndUpdate(id, {
  full_name: encryptField('Jane Doe'),
  email: encryptField('jane.doe@example.com')
});
```

## Helper Functions

The encryption utility provides several helper functions:

```typescript
import { 
  encryptField, 
  decryptField, 
  encryptFields, 
  decryptFields,
  isEncryptionConfigured 
} from './utils/encryption';

// Encrypt single field
const encrypted = encryptField('sensitive data');

// Decrypt single field
const plaintext = decryptField(encrypted);

// Encrypt multiple fields in object
const obj = {
  name: 'John',
  email: 'john@example.com',
  age: 25  // won't be encrypted
};
const encryptedObj = encryptFields(obj, ['name', 'email']);

// Decrypt multiple fields in object
const decryptedObj = decryptFields(encryptedObj, ['name', 'email']);

// Check if encryption is configured
if (!isEncryptionConfigured()) {
  console.error('Set ENCRYPTION_MASTER_KEY!');
}
```

## Troubleshooting

### Error: ENCRYPTION_MASTER_KEY not configured

**Solution**: Set the environment variable:

```powershell
$env:ENCRYPTION_MASTER_KEY = "your_64_character_hex_key_here"
```

### Error: Database connection failed

**Solution**: Check your MONGODB_URI:

```powershell
$env:MONGODB_URI = "mongodb://localhost:27017/student-evaluation"
```

### Error: Field encryption failed

**Cause**: Empty or invalid data in field

**Solution**: The migration skips problematic fields and continues. Check console output for specific errors.

### Already Encrypted Warning

**Normal**: The migration is idempotent - it skips already encrypted fields. Safe to run multiple times.

## Rollback Procedure

If you need to restore from backup:

```powershell
# Stop your application first

# Restore from backup
mongorestore --uri="mongodb://localhost:27017/student-evaluation" --drop ./backup-2026-02-12

# Restart application
```

## Security Best Practices

1. **Store Master Key Securely**
   - Use environment variables (never commit to Git)
   - Consider Azure Key Vault or AWS Secrets Manager for production
   - Create key rotation plan

2. **Access Control**
   - Limit who can access the master key
   - Audit encryption key usage
   - Monitor decryption operations

3. **Compliance**
   - Encryption at rest (MongoDB)
   - Encryption in transit (TLS/SSL)
   - Field-level encryption (this migration)
   - Regular security audits

4. **Backup Strategy**
   - Backup before migration
   - Test restore procedures
   - Store backups securely
   - Keep master key with backups

## Performance Considerations

- **Encryption overhead**: ~1-2ms per field
- **Storage increase**: ~30-40% due to encryption metadata
- **Query performance**: No impact (encryption doesn't affect indexes on _id)
- **Migration time**: ~1-2 seconds per 100 documents

## Post-Migration Checklist

- [ ] All collections migrated successfully (0 errors)
- [ ] Application code updated to handle encrypted fields
- [ ] Master key backed up securely
- [ ] Test data decryption in application
- [ ] Update API routes to decrypt fields for display
- [ ] Verify searching/filtering still works
- [ ] Document key management procedures
- [ ] Schedule regular encryption audits

## Questions?

Refer to:
- `utils/encryption.ts` - Encryption implementation
- `migrate-encrypt-fields.ts` - Migration script
- `docs/ENCRYPTION-GUIDE.md` - Detailed encryption documentation

