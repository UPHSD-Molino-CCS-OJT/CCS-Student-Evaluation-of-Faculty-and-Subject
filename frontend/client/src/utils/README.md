# Client Utilities Documentation

## Overview

The `client/src/utils/` directory contains all client-side utility functions and helpers organized by functionality. These utilities provide reusable functions for API communication, validation, error handling, and more.

## Utility Modules

### 📡 API Service (`api.js`)

Centralized API communication layer with axios interceptors and organized methods.

**Features:**
- Axios instance with default configuration
- Request/response interceptors
- Automatic error handling and redirects
- Organized API methods for students and admins

**Usage:**
```javascript
import { studentApi, adminApi } from '@/utils/api';

// Student operations
const subjects = await studentApi.getSubjects();
await studentApi.submitEvaluation(evaluationData);

// Admin operations
const teachers = await adminApi.getTeachers();
await adminApi.createTeacher(teacherData);
```

---

### ✅ Validation (`validation.js`)

Form validation utilities for all data types.

**Includes:**
- Student login validation
- Admin login validation
- Evaluation form validation
- Teacher/Program/Course/Student form validation
- Input sanitization
- Student number formatting

**Usage:**
```javascript
import { validateStudentLogin, validateEvaluation } from '@/utils/validation';

const { isValid, errors } = validateStudentLogin(studentNumber, birthdate);
if (!isValid) {
  console.log(errors);
}
```

---

### 📋 Constants (`constants.js`)

Application-wide constants including evaluation questions, rating scales, and configuration.

**Includes:**
- Rating scale definitions (1-5 with labels and colors)
- Evaluation sections (Teacher, Learning, Classroom)
- All 25 evaluation questions
- Privacy configuration
- Status constants
- Error/success messages
- App configuration

**Usage:**
```javascript
import { 
  EVALUATION_SECTIONS, 
  ALL_QUESTIONS, 
  calculateProgress,
  PRIVACY_CONFIG 
} from '@/utils/constants';

// Get questions
const questions = EVALUATION_SECTIONS.teacher.questions;

// Calculate progress
const progress = calculateProgress(formData);
```

---

### 💾 Storage (`storage.js`)

LocalStorage and SessionStorage utilities for auto-save and preferences.

**Features:**
- Draft save/load/clear for evaluations
- Session management
- User preferences
- Storage availability checks
- Storage size calculation

**Usage:**
```javascript
import { saveDraft, loadDraft, clearDraft } from '@/utils/storage';

// Auto-save draft
saveDraft(enrollmentId, formData);

// Load draft
const draft = loadDraft(enrollmentId);

// Clear draft after submission
clearDraft(enrollmentId);
```

---

### ❌ Error Handling (`errorHandling.js`)

Comprehensive error handling utilities for API and form errors.

**Features:**
- API error parsing
- User-friendly error messages
- Error logging (dev mode)
- Network error detection
- Auth error detection
- Retry logic with exponential backoff

**Usage:**
```javascript
import { 
  parseApiError, 
  getUserErrorMessage,
  handleFormError 
} from '@/utils/errorHandling';

try {
  await api.post('/endpoint', data);
} catch (error) {
  const message = getUserErrorMessage(error);
  alert(message);
}
```

---

### 📅 Date & Time (`dateTime.js`)

Date and time formatting utilities.

**Features:**
- Multiple date format options
- Relative time formatting ("2 hours ago")
- Academic year/semester calculation
- Age calculation
- Date validation
- Duration formatting

**Usage:**
```javascript
import { 
  formatDate, 
  formatRelativeTime,
  getAcademicYear,
  calculateAge 
} from '@/utils/dateTime';

const formattedDate = formatDate(new Date());
const relativeTime = formatRelativeTime(evaluation.submittedAt);
const academicYear = getAcademicYear(); // "2026-2027"
const age = calculateAge(student.birthdate);
```

---

### 🛠️ Helpers (`helpers.js`)

General purpose helper functions for common tasks.

**Features:**
- Debounce/throttle functions
- Deep object cloning
- String manipulation (capitalize, truncate)
- Array operations (sort, group, average)
- Number formatting
- Clipboard operations
- URL query parameter handling
- Mobile device detection
- CSV export

**Usage:**
```javascript
import { 
  debounce, 
  formatNumber,
  sortBy,
  average,
  exportToCSV 
} from '@/utils/helpers';

// Debounce search
const debouncedSearch = debounce(searchFunction, 300);

// Format number
const formatted = formatNumber(1234567); // "1,234,567"

// Export data
exportToCSV(evaluationsData, 'evaluations.csv');
```

---

## Import Strategies

### Option 1: Named Imports from Index
```javascript
import { 
  studentApi, 
  validateEvaluation, 
  formatDate,
  saveDraft 
} from '@/utils';
```

### Option 2: Import from Specific Module
```javascript
import { studentApi } from '@/utils/api';
import { validateEvaluation } from '@/utils/validation';
```

### Option 3: Import All from Module
```javascript
import * as dateUtils from '@/utils/dateTime';
import * as helpers from '@/utils/helpers';
```

---

## Best Practices

### 1. **Use the API Service Layer**
Always use `studentApi` or `adminApi` instead of raw axios calls for consistency and proper error handling.

```javascript
// ✅ Good
import { studentApi } from '@/utils/api';
const subjects = await studentApi.getSubjects();

// ❌ Avoid
import axios from 'axios';
const subjects = await axios.get('/api/student/subjects');
```

### 2. **Validate Before Submitting**
Always validate form data before API calls to provide immediate feedback.

```javascript
const { isValid, errors } = validateEvaluation(formData, questions);
if (!isValid) {
  setErrors(errors);
  return;
}
await studentApi.submitEvaluation(formData);
```

### 3. **Handle Errors Gracefully**
Use error handling utilities to display user-friendly messages.

```javascript
try {
  await adminApi.createTeacher(data);
  showSuccess('Teacher created successfully');
} catch (error) {
  const message = getUserErrorMessage(error);
  showError(message);
}
```

### 4. **Use Constants**
Reference constants instead of hardcoding values for maintainability.

```javascript
// ✅ Good
import { PRIVACY_CONFIG } from '@/utils/constants';
const interval = PRIVACY_CONFIG.AUTO_SAVE_INTERVAL;

// ❌ Avoid
const interval = 2000; // Magic number
```

### 5. **Leverage Storage Utilities**
Use storage utilities for consistent localStorage/sessionStorage operations.

```javascript
import { saveDraft, loadDraft } from '@/utils/storage';

// Auto-save every 2 seconds
useEffect(() => {
  const timer = setInterval(() => {
    saveDraft(enrollmentId, formData);
  }, 2000);
  return () => clearInterval(timer);
}, [formData]);
```

---

## Testing Utilities

When writing tests, import utilities individually for easier mocking:

```javascript
import { validateStudentLogin } from '@/utils/validation';

describe('validateStudentLogin', () => {
  it('should validate correct student number format', () => {
    const result = validateStudentLogin('21-1234-567', '2000-01-01');
    expect(result.isValid).toBe(true);
  });
});
```

---

## Extending Utilities

When adding new utility functions:

1. **Create or update the appropriate module** based on functionality
2. **Export the function** from that module
3. **Add to index.js** if it should be available from the central export
4. **Document the function** with JSDoc comments
5. **Update this README** with usage examples

Example:
```javascript
// utils/newModule.js
/**
 * New utility function description
 * @param {string} param - Parameter description
 * @returns {boolean} Return value description
 */
export const newUtilityFunction = (param) => {
  // Implementation
};

// utils/index.js
export * from './newModule';
```

---

## Performance Considerations

- **Debounce expensive operations** (search, validation)
- **Use memoization** for computed values when appropriate
- **Lazy load utilities** when only needed in specific routes
- **Keep utility functions pure** when possible for better testability

---

## Migration Notes

These utilities replace the following server-side functionality:
- EJS template validation → Client-side validation utilities
- Server-side date formatting → Client-side date utilities  
- Inline validation logic → Centralized validation module
- Scattered helper functions → Organized utility modules

The privacy protection utilities (`privacy-protection.js`, `privacy-audit.js`, `privacy-scheduler.js`) remain server-side as they handle cryptographic operations and database interactions that must not be exposed to the client.
