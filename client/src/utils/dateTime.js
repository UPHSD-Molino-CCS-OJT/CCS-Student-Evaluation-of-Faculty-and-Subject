/**
 * Date and Time Formatting Utilities
 */

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  };
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', defaultOptions);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Format date to short string (MM/DD/YYYY)
 */
export const formatDateShort = (date) => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
export const formatDateISO = (date) => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Format time to readable string
 */
export const formatTime = (date, options = {}) => {
  if (!date) return '';
  
  const defaultOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString('en-US', defaultOptions);
  } catch (error) {
    console.error('Error formatting time:', error);
    return '';
  }
};

/**
 * Format date and time together
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return '';
  }
};

/**
 * Format date relative to now (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now - dateObj;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);
    
    if (diffSec < 60) {
      return 'just now';
    } else if (diffMin < 60) {
      return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    } else if (diffHour < 24) {
      return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    } else if (diffDay < 7) {
      return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    } else if (diffWeek < 4) {
      return `${diffWeek} week${diffWeek > 1 ? 's' : ''} ago`;
    } else if (diffMonth < 12) {
      return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
    } else {
      return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`;
    }
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return '';
  }
};

/**
 * Get academic year from date
 */
export const getAcademicYear = (date = new Date()) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1; // JavaScript months are 0-indexed
  
  // Academic year starts in August (month 8)
  if (month >= 8) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
};

/**
 * Get semester from date
 */
export const getSemester = (date = new Date()) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const month = dateObj.getMonth() + 1;
  
  // 1st semester: August - December (8-12)
  // 2nd semester: January - May (1-5)
  // Summer: June - July (6-7)
  if (month >= 8 && month <= 12) {
    return '1st Semester';
  } else if (month >= 1 && month <= 5) {
    return '2nd Semester';
  } else {
    return 'Summer';
  }
};

/**
 * Parse birthdate input (YYYY-MM-DD)
 */
export const parseBirthdate = (birthdateStr) => {
  if (!birthdateStr) return null;
  
  try {
    const date = new Date(birthdateStr);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch (error) {
    console.error('Error parsing birthdate:', error);
    return null;
  }
};

/**
 * Calculate age from birthdate
 */
export const calculateAge = (birthdate) => {
  if (!birthdate) return null;
  
  try {
    const birthdateObj = typeof birthdate === 'string' ? new Date(birthdate) : birthdate;
    const today = new Date();
    let age = today.getFullYear() - birthdateObj.getFullYear();
    const monthDiff = today.getMonth() - birthdateObj.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdateObj.getDate())) {
      age--;
    }
    
    return age;
  } catch (error) {
    console.error('Error calculating age:', error);
    return null;
  }
};

/**
 * Check if date is valid
 */
export const isValidDate = (date) => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj instanceof Date && !isNaN(dateObj.getTime());
  } catch (error) {
    return false;
  }
};

/**
 * Check if date is in the past
 */
export const isPastDate = (date) => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    return dateObj < now;
  } catch (error) {
    return false;
  }
};

/**
 * Check if date is in the future
 */
export const isFutureDate = (date) => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    return dateObj > now;
  } catch (error) {
    return false;
  }
};

/**
 * Get date range string
 */
export const getDateRangeString = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  
  try {
    const start = formatDateShort(startDate);
    const end = formatDateShort(endDate);
    return `${start} - ${end}`;
  } catch (error) {
    console.error('Error formatting date range:', error);
    return '';
  }
};

/**
 * Get current timestamp
 */
export const getCurrentTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Format duration in milliseconds to human readable
 */
export const formatDuration = (durationMs) => {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Create date from components
 */
export const createDate = (year, month, day) => {
  try {
    return new Date(year, month - 1, day);
  } catch (error) {
    console.error('Error creating date:', error);
    return null;
  }
};

/**
 * Get date components
 */
export const getDateComponents = (date) => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return {
      year: dateObj.getFullYear(),
      month: dateObj.getMonth() + 1,
      day: dateObj.getDate(),
      hours: dateObj.getHours(),
      minutes: dateObj.getMinutes(),
      seconds: dateObj.getSeconds(),
    };
  } catch (error) {
    console.error('Error getting date components:', error);
    return null;
  }
};
