/**
 * Form Validation Utilities
 */

/**
 * Validate student login form
 */
export const validateStudentLogin = (studentNumber, birthdate) => {
  const errors = {};

  if (!studentNumber || studentNumber.trim() === '') {
    errors.studentNumber = 'Student number is required';
  } else if (!/^\d{2}-\d{4}-\d{3}$/.test(studentNumber.trim())) {
    errors.studentNumber = 'Invalid student number format (XX-XXXX-XXX)';
  }

  if (!birthdate || birthdate.trim() === '') {
    errors.birthdate = 'Birthdate is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate admin login form
 */
export const validateAdminLogin = (username, password) => {
  const errors = {};

  if (!username || username.trim() === '') {
    errors.username = 'Username is required';
  }

  if (!password || password.trim() === '') {
    errors.password = 'Password is required';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate evaluation form
 */
export const validateEvaluation = (formData, questions) => {
  const errors = {};
  const missingFields = [];

  // Check all required rating questions
  questions.forEach((question) => {
    if (!formData[question.id] || formData[question.id] === '') {
      missingFields.push(question.text);
      errors[question.id] = 'This field is required';
    }
  });

  // Validate rating values (1-5)
  Object.keys(formData).forEach((key) => {
    if (key.startsWith('q') && formData[key]) {
      const value = parseInt(formData[key]);
      if (isNaN(value) || value < 1 || value > 5) {
        errors[key] = 'Rating must be between 1 and 5';
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    missingFields,
  };
};

/**
 * Validate teacher form
 */
export const validateTeacher = (data) => {
  const errors = {};

  if (!data.firstName || data.firstName.trim() === '') {
    errors.firstName = 'First name is required';
  }

  if (!data.lastName || data.lastName.trim() === '') {
    errors.lastName = 'Last name is required';
  }

  if (!data.email || data.email.trim() === '') {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Invalid email format';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate program form
 */
export const validateProgram = (data) => {
  const errors = {};

  if (!data.code || data.code.trim() === '') {
    errors.code = 'Program code is required';
  }

  if (!data.name || data.name.trim() === '') {
    errors.name = 'Program name is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate course form
 */
export const validateCourse = (data) => {
  const errors = {};

  if (!data.code || data.code.trim() === '') {
    errors.code = 'Course code is required';
  }

  if (!data.name || data.name.trim() === '') {
    errors.name = 'Course name is required';
  }

  if (!data.program) {
    errors.program = 'Program is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate student form
 */
export const validateStudent = (data) => {
  const errors = {};

  if (!data.studentNumber || data.studentNumber.trim() === '') {
    errors.studentNumber = 'Student number is required';
  } else if (!/^\d{2}-\d{4}-\d{3}$/.test(data.studentNumber.trim())) {
    errors.studentNumber = 'Invalid student number format (XX-XXXX-XXX)';
  }

  if (!data.firstName || data.firstName.trim() === '') {
    errors.firstName = 'First name is required';
  }

  if (!data.lastName || data.lastName.trim() === '') {
    errors.lastName = 'Last name is required';
  }

  if (!data.birthdate) {
    errors.birthdate = 'Birthdate is required';
  }

  if (!data.program) {
    errors.program = 'Program is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Sanitize input to prevent XSS
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Format student number (add dashes if missing)
 */
export const formatStudentNumber = (input) => {
  // Remove all non-digits
  const digits = input.replace(/\D/g, '');
  
  // Format as XX-XXXX-XXX
  if (digits.length >= 9) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 9)}`;
  } else if (digits.length >= 6) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  } else if (digits.length >= 2) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }
  
  return digits;
};
