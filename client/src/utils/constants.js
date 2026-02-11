/**
 * Evaluation Form Constants
 * Questions, rating scales, and configuration
 */

// Rating scale definitions
export const RATING_SCALE = {
  5: { label: 'Strongly Agree', color: 'bg-green-500' },
  4: { label: 'Agree', color: 'bg-blue-500' },
  3: { label: 'Neutral', color: 'bg-yellow-500' },
  2: { label: 'Disagree', color: 'bg-orange-500' },
  1: { label: 'Strongly Disagree', color: 'bg-red-500' },
};

// Evaluation questions organized by section
export const EVALUATION_SECTIONS = {
  teacher: {
    title: 'Teacher Evaluation',
    description: 'Rate the teacher\'s performance and teaching effectiveness',
    icon: '👨‍🏫',
    questions: [
      {
        id: 'q1',
        category: 'teacher',
        text: 'The teacher demonstrates mastery of the subject matter',
      },
      {
        id: 'q2',
        category: 'teacher',
        text: 'The teacher presents lessons clearly and systematically',
      },
      {
        id: 'q3',
        category: 'teacher',
        text: 'The teacher uses relevant examples and illustrations',
      },
      {
        id: 'q4',
        category: 'teacher',
        text: 'The teacher encourages student participation and questions',
      },
      {
        id: 'q5',
        category: 'teacher',
        text: 'The teacher manages class time effectively',
      },
      {
        id: 'q6',
        category: 'teacher',
        text: 'The teacher shows enthusiasm and passion for the subject',
      },
      {
        id: 'q7',
        category: 'teacher',
        text: 'The teacher treats students with respect and fairness',
      },
      {
        id: 'q8',
        category: 'teacher',
        text: 'The teacher provides timely and constructive feedback',
      },
    ],
  },
  learning: {
    title: 'Learning Environment',
    description: 'Evaluate the learning experience and course content',
    icon: '📚',
    questions: [
      {
        id: 'q9',
        category: 'learning',
        text: 'The course objectives were clearly communicated',
      },
      {
        id: 'q10',
        category: 'learning',
        text: 'The course content is relevant and up-to-date',
      },
      {
        id: 'q11',
        category: 'learning',
        text: 'The teaching methods are appropriate for the subject',
      },
      {
        id: 'q12',
        category: 'learning',
        text: 'The workload is reasonable and manageable',
      },
      {
        id: 'q13',
        category: 'learning',
        text: 'The assessments fairly measure student learning',
      },
      {
        id: 'q14',
        category: 'learning',
        text: 'The course materials and resources are helpful',
      },
      {
        id: 'q15',
        category: 'learning',
        text: 'I have learned valuable knowledge and skills',
      },
      {
        id: 'q16',
        category: 'learning',
        text: 'I would recommend this course to other students',
      },
    ],
  },
  classroom: {
    title: 'Classroom Management',
    description: 'Rate the classroom environment and organization',
    icon: '🏛️',
    questions: [
      {
        id: 'q17',
        category: 'classroom',
        text: 'The classroom environment is conducive to learning',
      },
      {
        id: 'q18',
        category: 'classroom',
        text: 'Class begins and ends on time',
      },
      {
        id: 'q19',
        category: 'classroom',
        text: 'The teacher maintains classroom discipline',
      },
      {
        id: 'q20',
        category: 'classroom',
        text: 'Technology and equipment are used effectively',
      },
      {
        id: 'q21',
        category: 'classroom',
        text: 'The teacher is accessible for consultation',
      },
      {
        id: 'q22',
        category: 'classroom',
        text: 'The teacher responds promptly to student concerns',
      },
      {
        id: 'q23',
        category: 'classroom',
        text: 'The grading system is fair and transparent',
      },
      {
        id: 'q24',
        category: 'classroom',
        text: 'Overall, I am satisfied with this course',
      },
      {
        id: 'q25',
        category: 'classroom',
        text: 'I feel comfortable asking questions in class',
      },
    ],
  },
};

// Flatten all questions into a single array
export const ALL_QUESTIONS = Object.values(EVALUATION_SECTIONS)
  .flatMap(section => section.questions);

// Get question by ID
export const getQuestionById = (id) => {
  return ALL_QUESTIONS.find(q => q.id === id);
};

// Get questions by category
export const getQuestionsByCategory = (category) => {
  return ALL_QUESTIONS.filter(q => q.category === category);
};

// Calculate progress percentage
export const calculateProgress = (formData) => {
  const totalQuestions = ALL_QUESTIONS.length;
  const answeredQuestions = ALL_QUESTIONS.filter(
    q => formData[q.id] && formData[q.id] !== ''
  ).length;
  
  return Math.round((answeredQuestions / totalQuestions) * 100);
};

// Check if form is complete
export const isFormComplete = (formData) => {
  return ALL_QUESTIONS.every(q => formData[q.id] && formData[q.id] !== '');
};

// Get first unanswered question
export const getFirstUnansweredQuestion = (formData) => {
  return ALL_QUESTIONS.find(q => !formData[q.id] || formData[q.id] === '');
};

// Get average rating
export const calculateAverageRating = (formData) => {
  const ratings = ALL_QUESTIONS
    .map(q => parseInt(formData[q.id]))
    .filter(rating => !isNaN(rating));
  
  if (ratings.length === 0) return 0;
  
  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  return (sum / ratings.length).toFixed(2);
};

// Privacy protection constants
export const PRIVACY_CONFIG = {
  AUTO_SAVE_INTERVAL: 2000, // 2 seconds
  AUTO_SAVE_KEY_PREFIX: 'evaluation_draft_',
  SUBMISSION_DELAY_MIN: 2000, // 2 seconds
  SUBMISSION_DELAY_MAX: 8000, // 8 seconds
};

// Status constants
export const EVALUATION_STATUS = {
  NOT_SUBMITTED: 'not_submitted',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please fill in all required fields.',
  ALREADY_SUBMITTED: 'You have already submitted an evaluation for this course.',
  UNAUTHORIZED: 'Your session has expired. Please login again.',
  NOT_FOUND: 'The requested resource was not found.',
};

// Success messages
export const SUCCESS_MESSAGES = {
  EVALUATION_SUBMITTED: 'Your evaluation has been submitted successfully. Thank you for your feedback!',
  TEACHER_CREATED: 'Teacher created successfully.',
  TEACHER_UPDATED: 'Teacher updated successfully.',
  TEACHER_DELETED: 'Teacher deleted successfully.',
  PROGRAM_CREATED: 'Program created successfully.',
  PROGRAM_UPDATED: 'Program updated successfully.',
  PROGRAM_DELETED: 'Program deleted successfully.',
  COURSE_CREATED: 'Course created successfully.',
  COURSE_UPDATED: 'Course updated successfully.',
  COURSE_DELETED: 'Course deleted successfully.',
  STUDENT_CREATED: 'Student created successfully.',
  STUDENT_UPDATED: 'Student updated successfully.',
  STUDENT_DELETED: 'Student deleted successfully.',
  LOGIN_SUCCESS: 'Login successful.',
  LOGOUT_SUCCESS: 'Logout successful.',
};

// App configuration
export const APP_CONFIG = {
  APP_NAME: 'UPHSD Faculty Evaluation',
  SCHOOL_NAME: 'University of Perpetual Help System DALTA',
  COLLEGE_NAME: 'College of Computer Studies',
  COLORS: {
    PRIMARY: '#1e40af', // uphsd-blue
    SECONDARY: '#3b82f6', // uphsd-light
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    INFO: '#3b82f6',
  },
};
