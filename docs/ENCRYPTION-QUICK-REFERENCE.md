# Quick Reference: Working with Encrypted Fields

## Common Patterns

### Reading Encrypted Data

```typescript
import { safeDecrypt, decryptStudent } from '../utils/encryption-helpers';

// Single field
const studentNumber = safeDecrypt(student.student_number);

// Entire document
const decryptedStudent = decryptStudent(student);
```

### Creating New Records

```typescript
import { encryptField } from '../utils/encryption';
import Student from '../models/Student';

const newStudent = new Student({
  student_number: encryptField('2024-12345'),
  full_name: encryptField('John Doe'),
  email: encryptField('john@example.com'),
  year_level: encryptField('1st'),
  section: encryptField('A'),
  status: encryptField('Regular'),
  program_id: programId
});

await newStudent.save();
```

### API Responses

```typescript
import { prepareForResponse } from '../utils/encryption-helpers';

// Single document
router.get('/api/student/:id', async (req, res) => {
  const student = await Student.findById(req.params.id);
  const decrypted = prepareForResponse(student, [
    'student_number', 'full_name', 'email', 
    'year_level', 'section', 'status'
  ]);
  res.json(decrypted);
});

// Multiple documents
router.get('/api/students', async (req, res) => {
  const students = await Student.find();
  const decrypted = students.map(s => prepareForResponse(s, [
    'student_number', 'full_name', 'email', 
    'year_level', 'section', 'status'
  ]));
  res.json(decrypted);
});
```

### Helper Functions by Collection

```typescript
import {
  decryptAdmin,
  decryptCourse,
  decryptEnrollment,
  decryptEvaluation,
  decryptProgram,
  decryptStudent,
  decryptTeacher
} from '../utils/encryption-helpers';

// Use collection-specific helpers
const admin = await Admin.findById(id);
const decrypted = decryptAdmin(admin);
```

## Migration Commands

```powershell
# Dry run (test without changes)
npm run migrate:encrypt:dry-run

# Full migration
npm run migrate:encrypt

# Specific collection
npm run build
node dist/migrate-encrypt-fields.js --collection=students
```

## Field Reference

| Collection | Encrypted Fields |
|------------|-----------------|
| Admins | username, full_name, email |
| Courses | name, code |
| Enrollments | section_code, school_year, semester |
| Evaluations | school_year, year_level, status |
| Programs | name, code |
| Students | student_number, full_name, email, year_level, section, status |
| Teachers | full_name, employee_id, email, department, status |

## Notes

- **receipt_hash**: NOT encrypted (it's a hash for verification)
- **password**: NOT encrypted (it's hashed with bcrypt)
- **anonymous_token**: NOT encrypted (used for anonymity logic)
- **comments**: Already encrypted in previous implementation
