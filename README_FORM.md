# UPHSD Student Faculty Evaluation Form

A web-based student faculty evaluation system built with Node.js, Express, and Tailwind CSS.

## Features

- ✅ Data Privacy Consent compliance
- 📋 Comprehensive evaluation form with three main sections:
  - The Teacher (personal qualities)
  - The Teacher Learning Process
  - The Classroom Management
- 🎨 Modern, responsive design with Tailwind CSS
- ⭐ 5-point rating scale for all evaluation criteria
- 💬 Comments/suggestions section
- ✨ Dynamic course selection based on program
- 📱 Mobile-friendly interface

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Application

### Development mode (with auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Project Structure

```
├── server.js           # Express server configuration
├── package.json        # Dependencies and scripts
├── views/
│   └── index.ejs      # Main evaluation form template
└── README_FORM.md     # This file
```

## Technologies Used

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **EJS** - Templating engine
- **Tailwind CSS** - Utility-first CSS framework
- **Body Parser** - Parse incoming request bodies

## Form Sections

### 1. Student Information
- School Year
- Student Number (format: 00-0000-000)
- Program (BS CS Data Science / BS IT Game Development)
- Year Level (1st - 4th)
- Status (Regular/Irregular)
- Course/Subject
- Teacher Name

### 2. Evaluation Criteria

**The Teacher (6 criteria)**
- Voice projection and diction
- Grammar usage
- Personality and grooming
- Disposition
- Sharing of ideas
- Fairness in student dealings

**The Teacher Learning Process (13 criteria)**
- Student motivation
- Critical thinking development
- Lesson organization
- Concept explanation
- Question formulation
- Subject mastery
- Teaching methodology
- And more...

**The Classroom Management (6 criteria)**
- Attendance checking
- Policy communication
- Discipline maintenance
- Authority exercise
- Prayer recitation
- Punctuality

### 3. Comments Section
Open text area for suggestions and remarks

## Rating Scale

- **5** - Outstanding
- **4** - High Satisfactory
- **3** - Satisfactory
- **2** - Fairly Satisfactory
- **1** - Needs Improvement

## Future Enhancements

- [ ] Database integration (MongoDB/PostgreSQL)
- [ ] Admin dashboard for viewing results
- [ ] Export evaluation results to Excel/PDF
- [ ] Email notifications
- [ ] User authentication
- [ ] Analytics and reporting
- [ ] Multi-language support

## Notes

Currently, form submissions are logged to the console. To persist data, integrate with a database system.
