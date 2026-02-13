# Evaluation Period Management System

## Overview

The Evaluation Period Management System allows administrators to control when students can submit faculty evaluations. This provides fine-grained control over the evaluation process and sets the foundation for period-based encryption keys (replacing the master encryption key approach).

## Key Features

### 1. **Temporal Control**
- Define specific time windows for evaluation submission
- Set academic year and semester for each period
- Specify exact start and end dates

### 2. **Active Period Enforcement**
- Only one evaluation period can be active at a time
- Students can only submit evaluations during an active period within the valid date range
- Automatic validation of period dates

### 3. **Admin Management Interface**
- Full CRUD operations for evaluation periods
- Quick activation/deactivation toggle
- Visual status indicators (Active, Scheduled, Inactive)
- Pagination support for managing multiple periods

## Database Schema

### EvaluationPeriod Model
```typescript
{
  _id: ObjectId,
  academic_year: string,           // e.g., "2023-2024"
  semester: string,                // "1st Semester" | "2nd Semester" | "Summer"
  is_active: boolean,              // Only one can be true at a time
  start_date: Date,                // Period start
  end_date: Date,                  // Period end
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
  start_date: string,
  end_date: string,
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
   
2. **Validates Date Range**
   - Returns 403 if current date is before `start_date`
   - Returns 403 if current date is after `end_date`
   
3. **Proceeds with Submission**
   - Only if all checks pass

### Error Messages
- `"Student evaluation is currently closed. Please check back later or contact your administrator."`
- `"Student evaluation will open on [date]."`
- `"Student evaluation period ended on [date]."`

## Admin UI

### Navigation
Access via: **Admin Portal → Periods** (in navbar)

### Page Features

1. **Period List**
   - View all evaluation periods
   - Status badges (Active/Scheduled/Inactive)
   - Date ranges display
   - Pagination controls

2. **Create/Edit Modal**
   - Academic year input
   - Semester dropdown
   - Date pickers for start/end
   - Optional description
   - Active status checkbox

3. **Actions**
   - **Power button**: Quick toggle active/inactive
   - **Edit button**: Modify period details
   - **Delete button**: Remove period (with confirmation)

### Status Indicators
- 🟢 **Active**: Period is active AND within date range
- 🟡 **Scheduled**: Period is set to active but outside date range
- ⚫ **Inactive**: Period is not active

## Business Rules

### Single Active Period
- Only one period can have `is_active: true`
- When activating a period, all others are automatically deactivated
- Implemented via Mongoose pre-save hook

### Date Validation
- `end_date` must be after `start_date`
- Date format validation on both client and server
- Date range checked during submission

### Duplicate Prevention
- Cannot create multiple periods with same academic_year + semester
- Validation enforced during create and update operations

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
  start_date: '2024-10-01',
  end_date: '2024-11-15',
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
5. Set date range
6. Check "Activate this period immediately" if ready
7. Click **Create**

### Student Experience
- Student logs in and views subjects
- Clicks "Evaluate" on a subject
- If no active period: sees closure message
- If period active: can submit evaluation
- If period ended: sees ended message

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
   - Date validation

2. **Test Active Period Logic**
   - Only one active period
   - Date range enforcement
   - Submission blocking

3. **Test UI Interactions**
   - Modal open/close
   - Form validation
   - CRUD operations
   - Status toggle

4. **Integration Testing**
   - Student submission flow
   - Admin management flow
   - Error handling

## Troubleshooting

### "Evaluation period is currently closed"
- Check if any period is marked as active
- Verify current date is within the active period's date range
- Ensure start_date is not in the future

### "Only one period can be active at a time"
- This is enforced automatically
- Manually deactivate old periods if needed via toggle

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
- Review active periods before academic terms
- Update period dates if schedule changes

### Monitoring
- Check logs for failed period validations
- Monitor active period status
- Track submission attempts outside periods

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
