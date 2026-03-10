# 🔍 Complete Function Reference

## Public-Facing Functions

### 📝 Student Evaluation Form

**`GET /`**
- **Purpose**: Display the evaluation form for students
- **Access**: Public
- **Functionality**: 
  - Loads all active programs
  - Loads all active teachers
  - Renders the main evaluation form

**`GET /api/courses/:programId`**
- **Purpose**: AJAX endpoint to get courses for a selected program
- **Access**: Public
- **Parameters**: `programId` (MongoDB ObjectId)
- **Returns**: JSON array of courses
- **Usage**: Dynamic dropdown population when student selects program

**`POST /submit-evaluation`**
- **Purpose**: Submit student evaluation
- **Access**: Public
- **Data Collected**:
  - **Student Info**: School year, student number, program, year level, status
  - **Course Info**: Course and teacher being evaluated
  - **Teacher Ratings** (6 criteria, 1-5 scale):
    - Diction/voice quality
    - Grammar/language use
    - Personality/character
    - Disposition/attitude
    - Dynamic/enthusiasm
    - Fairness/impartiality
  - **Learning Process** (13 criteria, 1-5 scale):
    - Motivation
    - Critical thinking promotion
    - Organization
    - Interest generation
    - Explanation clarity
    - Clarity of instruction
    - Integration of concepts
    - Subject mastery
    - Teaching methodology
    - Values formation
    - Grading system
    - Synthesis ability
    - Reasonableness of requirements
  - **Classroom Management** (6 criteria, 1-5 scale):
    - Attendance monitoring
    - Policies enforcement
    - Discipline maintenance
    - Authority respect
    - Prayer observance
    - Punctuality
  - **Additional**: Optional comments, IP address
- **Returns**: Success/error JSON response
- **Validation**: All required fields must be present

## Admin Functions

### 🔐 Authentication

**`GET /admin/login`**
- **Purpose**: Display admin login page
- **Access**: Guest only (redirects if already logged in)
- **Middleware**: `isGuest`

**`POST /admin/login`**
- **Purpose**: Process admin login
- **Authentication**: 
  - Verifies username exists
  - Compares password using bcrypt
  - Creates session on success
  - Updates last login timestamp
- **Session Data**: Stores adminId, username, fullName
- **Redirects**: `/admin/dashboard` on success

**`GET /admin/logout`**
- **Purpose**: Logout and destroy session
- **Redirects**: `/admin/login`

### 📊 Dashboard & Analytics

**`GET /admin/dashboard`**
- **Purpose**: Main admin dashboard with statistics and insights
- **Access**: Authenticated admins only
- **Middleware**: `isAuthenticated`
- **Statistics Calculated**:
  - **Overall Stats**:
    - Total evaluations count
    - Total active teachers
    - Total programs
  - **Average Ratings** (using MongoDB aggregation):
    - Average teacher rating (6 criteria)
    - Average learning rating (13 criteria)
    - Average classroom rating (6 criteria)
    - Overall average (all 25 criteria)
  - **Evaluations by School Year**: Count per year
  - **Top 5 Teachers**: Ranked by average rating
  - **Recent Evaluations**: Last 10 submissions
- **Data Processing**:
  - Uses MongoDB aggregation pipeline
  - Calculates averages across rating categories
  - Populates teacher/program/course names
  - Sorts and limits results

### 📋 Evaluation Management

**`GET /admin/evaluations`**
- **Purpose**: View all evaluations in a list
- **Access**: Authenticated admins
- **Functionality**:
  - Fetches all evaluations
  - Populates related teacher, program, course data
  - Sorts by submission date (newest first)
  - Displays in table format

**`GET /admin/evaluations/:id`**
- **Purpose**: View detailed evaluation
- **Access**: Authenticated admins
- **Parameters**: `id` (MongoDB ObjectId)
- **Displays**:
  - All student information
  - All 25 rating scores with labels
  - Teacher details
  - Program and course information
  - Comments
  - Submission timestamp
  - IP address
- **Error Handling**: Redirects if evaluation not found

### 👨‍🏫 Teacher Management (CRUD)

**`GET /admin/teachers`**
- **Purpose**: List all teachers
- **Access**: Authenticated admins
- **Displays**: All teachers sorted by name

**`POST /admin/teachers`**
- **Purpose**: Add new teacher
- **Validation**: 
  - Checks for duplicate employee_id
  - Displays error if duplicate found
- **Fields**: full_name, employee_id, email, department
- **Default Status**: active

**`POST /admin/teachers/:id`**
- **Purpose**: Update existing teacher
- **Parameters**: `id` (MongoDB ObjectId)
- **Fields**: full_name, employee_id, email, department, status
- **Updates**: All provided fields

**`POST /admin/teachers/:id/delete`**
- **Purpose**: Delete teacher
- **Data Integrity**: 
  - Sets evaluations' teacher_id to NULL first
  - Then deletes teacher record
  - Prevents data loss of evaluations
- **Confirmation**: Flash message on success

### 📚 Program Management (CRUD)

**`GET /admin/programs`**
- **Purpose**: List all academic programs
- **Access**: Authenticated admins
- **Displays**: All programs sorted by name

**`POST /admin/programs`**
- **Purpose**: Add new program
- **Validation**: Checks for duplicate program name
- **Fields**: name, code
- **Uniqueness**: Program name must be unique

**`POST /admin/programs/:id`**
- **Purpose**: Update existing program
- **Parameters**: `id` (MongoDB ObjectId)
- **Fields**: name, code

**`POST /admin/programs/:id/delete`**
- **Purpose**: Delete program
- **Data Integrity Checks**:
  - Counts related courses
  - Counts related evaluations
  - **Prevents deletion** if either count > 0
  - Displays error message explaining why
- **Purpose**: Prevents orphaned data

### 📖 Course Management (CRUD)

**`GET /admin/courses`**
- **Purpose**: List all courses
- **Access**: Authenticated admins
- **Displays**: 
  - All courses with program names
  - Sorted by course name
- **Additional Data**: Loads all programs for add/edit forms

**`POST /admin/courses`**
- **Purpose**: Add new course
- **Validation**: 
  - Checks for duplicate course in same program
  - Course name + program combination must be unique
- **Fields**: name, code, program_id

**`POST /admin/courses/:id`**
- **Purpose**: Update existing course
- **Parameters**: `id` (MongoDB ObjectId)
- **Fields**: name, code, program_id

**`POST /admin/courses/:id/delete`**
- **Purpose**: Delete course
- **Data Integrity Check**:
  - Counts related evaluations
  - **Prevents deletion** if evaluations exist
  - Displays error message
- **Purpose**: Maintains evaluation data integrity

## System Functions

### 🔄 Database Initialization

**`initializeDatabase()`**
- **Trigger**: Runs automatically on server start
- **Checks**: If admin count is 0
- **Creates Sample Data**:
  1. **Default Admin**:
     - Username: `admin`
     - Password: `admin123` (bcrypt hashed)
     - Full name: System Administrator
     - Email: admin@uphsd.edu.ph
  
  2. **2 Programs**:
     - BS Computer Science - Data Science (BSCS-DS)
     - BS Information Technology - Game Development (BSIT-GD)
  
  3. **5 Sample Teachers**:
     - Prof. Juan Dela Cruz (CS)
     - Prof. Maria Santos (IT)
     - Prof. Jose Garcia (CS)
     - Prof. Ana Reyes (IT)
     - Prof. Pedro Martinez (CS)
  
  4. **10 Sample Courses**:
     - 5 for BSCS-DS (Data Structures, DBMS, ML, etc.)
     - 5 for BSIT-GD (Game Design, 3D Modeling, etc.)

- **Summary**: Logs what was created
- **Idempotence**: Only runs if database is empty

### 🛡️ Middleware

**`isAuthenticated(req, res, next)`**
- **Purpose**: Protect admin routes
- **Checks**: Session has adminId
- **If Valid**: Calls next()
- **If Invalid**: 
  - Flash error message
  - Redirect to login

**`isGuest(req, res, next)`**
- **Purpose**: Redirect logged-in admins from guest pages
- **Checks**: Session has adminId
- **If Logged In**: Redirect to dashboard
- **If Guest**: Calls next()

**`app.use(flash middleware)`**
- **Purpose**: Global template variables
- **Sets**:
  - `success_msg`: Success flash messages
  - `error_msg`: Error flash messages
  - `admin`: Current admin info (or null)

### 📦 Session Management

**Session Configuration**
- **Store**: MongoDB (MongoStore) for serverless compatibility
- **Secret**: From env or default key
- **Cookie Settings**:
  - MaxAge: 24 hours
  - httpOnly: true (prevents XSS)
  - secure: true in production (HTTPS only)
- **Touch After**: 24 hours (reduces DB writes)
- **Persistence**: Survives server restarts

### 🗃️ Database Models (Mongoose Schemas)

**Admin Schema**
- username (unique, required)
- password (hashed, required)
- full_name (required)
- email
- last_login
- Timestamps: createdAt, updatedAt

**Program Schema**
- name (unique, required)
- code
- Timestamps
- **Index**: Unique on name

**Teacher Schema**
- full_name (required)
- employee_id (unique, sparse)
- email
- department
- status (enum: active/inactive, default: active)
- Timestamps

**Course Schema**
- name (required)
- code
- program_id (ref: Program)
- Timestamps
- **Compound Index**: Unique on (name + program_id)

**Evaluation Schema**
- **Student Data**:
  - school_year (required)
  - student_number (required, indexed)
  - program_id (ref)
  - year_level (enum: 1st-4th)
  - status (enum: Regular/Irregular)
  
- **Course Data**:
  - course_id (ref)
  - teacher_id (ref, indexed)
  
- **25 Rating Fields** (all required, 1-5):
  - 6 teacher ratings
  - 13 learning ratings
  - 6 classroom ratings
  
- **Meta**:
  - comments (text)
  - submitted_at (indexed, default: now)
  - ip_address
  
- **Indexes**: 
  - student_number
  - teacher_id
  - school_year
  - submitted_at (descending)

## Error Handling

**404 Handler**
- Catches all unmatched routes
- Returns "Page not found"

**Try-Catch Blocks**
- All database operations wrapped
- Logs errors to console
- Displays user-friendly messages
- Uses flash messages for feedback

**Data Validation**
- Required field validation
- Enum validation for status fields
- Min/max validation for ratings (1-5)
- Duplicate checks before insertion
- Referential integrity checks before deletion

## Security Features

1. **Password Security**: bcrypt hashing (10 salt rounds)
2. **Session Security**: 
   - httpOnly cookies
   - Secure cookies in production
   - MongoDB session store (serverless-safe)
3. **CSRF Protection**: Session-based
4. **Input Validation**: Mongoose schema validation
5. **Authentication**: Route-level middleware
6. **SQL Injection**: N/A (NoSQL with Mongoose)
7. **XSS Protection**: EJS auto-escaping

## Performance Optimizations

1. **Database Indexes**: On frequently queried fields
2. **Aggregation**: For complex statistics
3. **Connection Pooling**: Mongoose default
4. **Session TouchAfter**: Reduces DB writes
5. **Lean Queries**: `.lean()` for read-only data
6. **Population**: Only loads needed fields
7. **Sorting**: Database-level sorting

## Environment Configuration

**Required Variables**
- `MONGODB_URI`: MongoDB connection string
- `SESSION_SECRET`: Session encryption key
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: production/development

**Serverless-Specific**
- Optimized for Vercel deployment
- MongoDB session store
- Exports app for serverless functions

## API Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {...}
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message description"
}
```

## Database Operations

### Common Query Patterns

**Find all with population:**
```javascript
Model.find()
  .populate('reference_field')
  .sort({ field: -1 })
  .lean();
```

**Aggregation for statistics:**
```javascript
Model.aggregate([
  { $group: { _id: '$field', avg: { $avg: '$rating' } } },
  { $sort: { avg: -1 } }
]);
```

**Update with validation:**
```javascript
await Model.findByIdAndUpdate(
  id, 
  updateData, 
  { new: true, runValidators: true }
);
```

**Delete with integrity check:**
```javascript
const count = await RelatedModel.countDocuments({ reference_id: id });
if (count > 0) {
  throw new Error('Cannot delete: related records exist');
}
await Model.findByIdAndDelete(id);
```

## Testing Endpoints

### Manual Testing

**Test student submission:**
```bash
curl -X POST http://localhost:3000/submit-evaluation \
  -H "Content-Type: application/json" \
  -d '{
    "school_year": "2025-2026",
    "student_number": "12-3456-789",
    ...
  }'
```

**Test admin authentication:**
```bash
curl -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

**Test course API:**
```bash
curl http://localhost:3000/api/courses/[programId]
```

## Common Development Tasks

### Adding New Routes

1. Define route in server.js
2. Create corresponding view in views/
3. Add middleware if auth required
4. Update navigation menu
5. Test thoroughly

### Adding New Fields

1. Update Mongoose schema in models/
2. Update form in views/
3. Update submit handler
4. Update display views
5. Run database migration if needed

### Debugging Tips

**Check MongoDB connection:**
```javascript
console.log('MongoDB state:', mongoose.connection.readyState);
// 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
```

**Log request data:**
```javascript
console.log('Request body:', req.body);
console.log('Session data:', req.session);
```

**Check validation errors:**
```javascript
try {
  await document.save();
} catch (err) {
  console.log('Validation errors:', err.errors);
}
```

---

**Related Documentation:**
- [Installation Guide](INSTALLATION-GUIDE.md)
- [Features Guide](FEATURES-GUIDE.md)
- [Privacy & Data Protection](PRIVACY-AND-DATA-PROTECTION.md)
- [MongoDB Setup & Troubleshooting](MONGODB-SETUP-TROUBLESHOOTING.md)
