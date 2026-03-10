# Evaluation Period Management System

## Overview

The Evaluation Period Management System allows administrators to control when students can submit faculty evaluations through a simple toggle system. Administrators can easily open and close evaluation periods for specific academic years and semesters as needed (e.g., at the end of semester, for late students during clearance, etc.).

## Key Features

### 1. **Simple Toggle Control**
- Quick on/off switch for evaluation periods
- No date restrictions - fully manual control
- Perfect for flexible scheduling (end of semester, clearance periods, makeup evaluations)

### 2. **Active Period Enforcement**
- Only one evaluation period can be active at a time
- Students can only submit evaluations when a period is active
- Automatic deactivation of other periods when activating a new one

### 3. **Admin Management Interface**
- Full CRUD operations for evaluation periods
- Quick activation/deactivation toggle
- Visual status indicators (Active/Inactive)
- Pagination support for managing multiple periods

## Database Schema

### EvaluationPeriod Model
```typescript
{
  _id: ObjectId,
  academic_year: string,           // e.g., "2023-2024"
  semester: string,                // "1st Semester" | "2nd Semester" | "Summer"
  is_active: boolean,              // Only one can be true at a time
  description: string (optional),  // Additional notes
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `{ academic_year: 1, semester: 1 }` - Composite unique constraint
- `{ is_active: 1 }` - Fast lookup of active period

## API Endpoints

### Admin Endpoints (Authentication Required)

#### Get All Periods (Paginated)
```
GET /api/admin/evaluation-periods?page=1&limit=10
Response: {
  success: true,
  periods: EvaluationPeriod[],
  pagination: { page, limit, totalPages, totalCount, hasMore }
}
```

#### Create Period
```
POST /api/admin/evaluation-periods
Body: {
  academic_year: string,
  semester: string,
  is_active: boolean,
  description?: string
}
```

#### Update Period
```
PUT /api/admin/evaluation-periods/:id
Body: { /* same as create */ }
```

#### Delete Period
```
DELETE /api/admin/evaluation-periods/:id
```

#### Toggle Active Status
```
PATCH /api/admin/evaluation-periods/:id/toggle
```

### Public Endpoints

#### Get Active Period
```
GET /api/evaluation-period/active
Response: {
  success: boolean,
  period: EvaluationPeriod | null,
  message?: string
}
```

## Student Evaluation Flow

### Submission Validation

When a student attempts to submit an evaluation (`POST /api/student/submit-evaluation`), the system:

1. **Checks for Active Period**
   - Returns 403 if no period is active
   - Message: "Student evaluation is currently closed. Please check back later or contact your administrator."
   
2. **Proceeds with Submission**
   - If an active period exists, submission is allowed

## Admin UI

### Navigation
Access via: **Admin Portal → Periods** (in navbar)

### Page Features

1. **Period List**
   - View all evaluation periods
   - Status badges (Active/Inactive)
   - Pagination controls

2. **Create/Edit Modal**
   - Academic year input
   - Semester dropdown
   - Optional description
   - Active status toggle

3. **Actions**
   - **Power button**: Quick toggle active/inactive
   - **Edit button**: Modify period details
   - **Delete button**: Remove period (with confirmation)

### Status Indicators
- 🟢 **Active**: Period is currently active and students can submit evaluations
- ⚫ **Inactive**: Period is not active and students cannot submit

## Business Rules

### Single Active Period
- Only one period can have `is_active: true`
- When activating a period, all others are automatically deactivated
- Implemented via Mongoose pre-save hook

### Duplicate Prevention
- Cannot create multiple periods with same academic_year + semester
- Validation enforced during create and update operations

### Manual Control
- No automatic date-based activation/deactivation
- Administrators have full manual control
- Perfect for flexible scenarios (end of semester, clearance, makeup evaluations)

## Future Enhancements: Period-Based Encryption

### Current State
The system currently uses a global `ENCRYPTION_MASTER_KEY` environment variable for encrypting sensitive data (comments, PII).

### Planned Migration
This evaluation period system lays the groundwork for:

1. **Period-Specific Encryption Keys**
   - Each evaluation period gets its own encryption key
   - Keys stored securely per period
   - Enables key rotation without re-encrypting old data

2. **Enhanced Security**
   - Compromised key only affects one period
   - Natural key lifecycle tied to academic periods
   - Simplified key management

3. **Compliance Benefits**
   - Better data segregation
   - Easier audit trails
   - Period-specific data retention policies

### Migration Path
```typescript
// Future enhancement
interface IEvaluationPeriod {
  // ...existing fields
  encryption_key_id: string,      // Reference to key vault
  key_rotation_date?: Date,       // Track key updates
  encrypted_with_key?: string     // Key version tracking
}
```

## Usage Examples

### Creating a Period via API
```javascript
const response = await axios.post('/api/admin/evaluation-periods', {
  academic_year: '2024-2025',
  semester: '1st Semester',
  is_active: true,
  description: 'Mid-term evaluation period'
}, { withCredentials: true })
```

### Checking Active Period (Client)
```javascript
const response = await axios.get('/api/evaluation-period/active')
if (response.data.success && response.data.period) {
  console.log('Evaluations are open!')
} else {
  console.log(response.data.message) // Display closure message
}
```

### Admin Workflow
1. Navigate to **Admin → Periods**
2. Click **New Period**
3. Fill in academic year (e.g., "2024-2025")
4. Select semester
5. Optionally add description
6. Check "Activate this period" if ready to open evaluations
7. Click **Create**
8. Use the power button to toggle status anytime

### Student Experience
- Student logs in and views subjects
- Clicks "Evaluate" on a subject
- If no active period: sees "Student evaluation is currently closed" message
- If period active: can submit evaluation

### Common Use Cases
- **End of Semester**: Activate period when ready for evaluation submissions
- **Late Students**: Temporarily activate period for clearance
- **Makeup Evaluations**: Quick toggle for specific situations
- **Between Terms**: Keep all periods inactive

## Technical Notes

### Mongoose Pre-Save Hook
```typescript
evaluationPeriodSchema.pre('save', async function(next) {
  if (this.is_active && this.isModified('is_active')) {
    // Deactivate all other periods
    await mongoose.model('EvaluationPeriod').updateMany(
      { _id: { $ne: this._id } },
      { $set: { is_active: false } }
    );
  }
  next();
});
```

### Client-Side Type Safety
```typescript
interface EvaluationPeriod {
  _id: string
  academic_year: string
  semester: '1st Semester' | '2nd Semester' | 'Summer'
  is_active: boolean
  start_date: Date | string
  end_date: Date | string
  description?: string
  createdAt?: Date
  updatedAt?: Date
}
```

## Testing Considerations

1. **Test Period Creation**
   - Valid data
   - Duplicate prevention

2. **Test Active Period Logic**
   - Only one active period
   - Submission blocking when no active period

3. **Test UI Interactions**
   - Modal open/close
   - Form validation
   - CRUD operations
   - Status toggle (power button)

4. **Integration Testing**
   - Student submission flow
   - Admin management flow
   - Error handling

## Troubleshooting

### "Evaluation period is currently closed"
- Check if any period is marked as active
- Use the power button to activate the appropriate period

### "Only one period can be active at a time"
- This is enforced automatically
- Activating a new period deactivates all others

### Periods not appearing in UI
- Check API endpoint with browser dev tools
- Verify authentication/session is valid
- Check pagination (may be on different page)

## Security Notes

- All admin endpoints require authentication
- CSRF protection via credentials
- Input validation on both client and server
- SQL injection prevention via Mongoose
- XSS protection via React's built-in escaping

## Maintenance

### Regular Tasks
- Archive old periods (optional)
- Activate periods at appropriate times (end of semester, clearance, etc.)
- Deactivate periods when evaluation window closes

### Monitoring
- Check logs for failed period validations
- Monitor active period status
- Track submission attempts when periods are inactive

## Related Files

### Backend
- `models/EvaluationPeriod.ts` - Mongoose model
- `routes/api.ts` - API endpoints (lines ~1600-1835)
- `types/index.ts` - TypeScript interfaces

### Frontend
- `client/src/pages/admin/AdminEvaluationPeriods.tsx` - Admin UI
- `client/src/types/index.ts` - Client types
- `client/src/App.tsx` - Route configuration
- `client/src/components/AdminNavbar.tsx` - Navigation

---

**Version**: 1.0  
**Last Updated**: February 2026  
**Author**: System Implementation Team
