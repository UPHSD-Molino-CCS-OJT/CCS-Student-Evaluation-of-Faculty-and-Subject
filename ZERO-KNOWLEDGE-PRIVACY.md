# Zero-Knowledge Privacy Implementation

## Overview

This system implements a **zero-knowledge security model** for student evaluations, ensuring complete anonymity and privacy protection for all students submitting faculty evaluations.

## What is Zero-Knowledge Privacy?

Zero-knowledge privacy means that student evaluations are stored in a way that makes it **impossible to trace back to the student's identity**. Even system administrators cannot determine which specific student submitted which evaluation.

## How It Works

### 1. Anonymous Token Generation

When a student submits an evaluation, the system:
- Generates a unique cryptographic hash (anonymous token) using SHA-256
- The token is created from: enrollment ID + timestamp + random bytes
- This token is **one-way encrypted** - it cannot be reversed to reveal student information

```javascript
// Example token generation
const anonymousToken = crypto
    .createHash('sha256')
    .update(`${enrollment._id}-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`)
    .digest('hex');
```

### 2. Data Storage

**What IS stored:**
- Anonymous token (unique hash)
- School year and semester
- Program, course, and teacher references
- Year level and status (but not tied to specific student)
- All rating scores and comments
- Submission timestamp

**What is NOT stored:**
- Student number
- Student name
- Student ID
- Any personally identifiable information

### 3. Duplicate Prevention

The system prevents duplicate evaluations by:
- Tracking the `has_evaluated` flag in the enrollment record
- Using session-based authentication during submission
- Linking by enrollment, not by student identity

Once submitted, the link between student and evaluation is severed permanently.

## Privacy Guarantees

✅ **Complete Anonymity:** No one can trace an evaluation back to a specific student
✅ **Secure Storage:** Student identities are never stored with evaluation data
✅ **One-Way Protection:** Anonymous tokens cannot be decrypted or reversed
✅ **Admin Transparency:** Admin interface clearly shows evaluations are anonymous
✅ **Student Confidence:** Students are informed their responses are protected

## Migration from Old System

If you have existing evaluations with student numbers, run the migration script:

```bash
npm run migrate-anonymous
```

This will:
1. Generate anonymous tokens for all existing evaluations
2. Remove student_number fields from all records
3. Permanently sever the link between students and their evaluations

## Security Benefits

1. **Encourages Honest Feedback:** Students can be truthful without fear of retaliation
2. **Protects Student Rights:** Complies with privacy regulations and best practices
3. **Prevents Tracking:** No way to build profiles of individual student responses
4. **Data Minimization:** Stores only what's necessary for evaluation purposes
5. **Irreversible Anonymization:** Once submitted, cannot be traced back

## Technical Implementation

### Files Modified:
- `models/Evaluation.js` - Changed from `student_number` to `anonymous_token`
- `server.js` - Added crypto hash generation for submissions
- `views/student-evaluate.ejs` - Removed student ID display, added privacy notice
- `views/admin/*.ejs` - Added anonymity indicators
- `migrate-to-anonymous.js` - Migration script for existing data

### Database Schema:
```javascript
{
  anonymous_token: String,    // Cryptographic hash (required)
  school_year: String,
  program_id: ObjectId,
  year_level: String,
  status: String,
  course_id: ObjectId,
  teacher_id: ObjectId,
  // ... ratings and comments
  submitted_at: Date
}
```

## Best Practices

1. **Never log anonymous tokens** - They should only exist in the database
2. **Don't store IP addresses with tokens** - Keep them separate
3. **Regular security audits** - Ensure no new tracking is introduced
4. **Inform students** - Always display privacy notices on evaluation forms
5. **Document changes** - Keep clear records of privacy implementations

## Compliance

This implementation follows:
- FERPA (Family Educational Rights and Privacy Act) guidelines
- Data minimization principles
- Privacy by design methodology
- Zero-knowledge security model best practices

## Support

For questions about the privacy implementation, contact your system administrator or refer to the technical documentation.

---

**Last Updated:** February 10, 2026
**Version:** 1.0.0
