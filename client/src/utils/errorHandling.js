/**
 * Error Handling Utilities
 */

import { ERROR_MESSAGES } from './constants';

/**
 * Parse API error response
 */
export const parseApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const message = error.response.data?.message || error.response.data?.error;
    
    return {
      status,
      message: message || getDefaultErrorMessage(status),
      data: error.response.data,
    };
  } else if (error.request) {
    // Request made but no response
    return {
      status: 0,
      message: ERROR_MESSAGES.NETWORK_ERROR,
      data: null,
    };
  } else {
    // Error in request setup
    return {
      status: -1,
      message: error.message || 'An unexpected error occurred',
      data: null,
    };
  }
};

/**
 * Get default error message by status code
 */
export const getDefaultErrorMessage = (status) => {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return ERROR_MESSAGES.UNAUTHORIZED;
    case 403:
      return 'Access denied. You do not have permission to perform this action.';
    case 404:
      return ERROR_MESSAGES.NOT_FOUND;
    case 409:
      return 'Conflict. The resource already exists.';
    case 422:
      return ERROR_MESSAGES.VALIDATION_ERROR;
    case 500:
      return ERROR_MESSAGES.SERVER_ERROR;
    case 503:
      return 'Service temporarily unavailable. Please try again later.';
    default:
      return 'An error occurred. Please try again.';
  }
};

/**
 * Handle form submission errors
 */
export const handleFormError = (error, setErrors) => {
  const parsedError = parseApiError(error);
  
  if (parsedError.data?.errors) {
    // Field-specific validation errors
    setErrors(parsedError.data.errors);
  } else {
    // General error
    setErrors({ general: parsedError.message });
  }
  
  return parsedError;
};

/**
 * Display user-friendly error message
 */
export const getUserErrorMessage = (error) => {
  const parsedError = parseApiError(error);
  
  // Check for specific error types
  if (parsedError.status === 401) {
    return ERROR_MESSAGES.UNAUTHORIZED;
  } else if (parsedError.status === 404) {
    return ERROR_MESSAGES.NOT_FOUND;
  } else if (parsedError.status === 0) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  } else if (parsedError.data?.alreadySubmitted) {
    return ERROR_MESSAGES.ALREADY_SUBMITTED;
  }
  
  return parsedError.message;
};

/**
 * Log error to console (in development)
 */
export const logError = (context, error) => {
  if (import.meta.env.DEV) {
    console.group(`❌ Error in ${context}`);
    console.error('Error object:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    console.groupEnd();
  }
};

/**
 * Create error toast configuration
 */
export const createErrorToast = (error, defaultMessage = 'An error occurred') => {
  const message = getUserErrorMessage(error) || defaultMessage;
  
  return {
    type: 'error',
    message,
    duration: 5000,
  };
};

/**
 * Check if error is network error
 */
export const isNetworkError = (error) => {
  return !error.response && error.request;
};

/**
 * Check if error is authentication error
 */
export const isAuthError = (error) => {
  return error.response && error.response.status === 401;
};

/**
 * Check if error is validation error
 */
export const isValidationError = (error) => {
  return error.response && (error.response.status === 400 || error.response.status === 422);
};

/**
 * Format validation errors for display
 */
export const formatValidationErrors = (errors) => {
  if (typeof errors === 'string') {
    return [errors];
  }
  
  if (Array.isArray(errors)) {
    return errors;
  }
  
  if (typeof errors === 'object') {
    return Object.values(errors).flat();
  }
  
  return ['Validation error occurred'];
};

/**
 * Retry failed request with exponential backoff
 */
export const retryRequest = async (requestFn, maxRetries = 3, initialDelay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx)
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

/**
 * Create error boundary fallback
 */
export const createErrorBoundaryFallback = (error, resetError) => {
  return {
    title: 'Something went wrong',
    message: error.message || 'An unexpected error occurred',
    action: {
      label: 'Try again',
      onClick: resetError,
    },
  };
};

/**
 * Safe JSON parse with error handling
 */
export const safeJsonParse = (str, defaultValue = null) => {
  try {
    return JSON.parse(str);
  } catch (error) {
    logError('JSON Parse', error);
    return defaultValue;
  }
};

/**
 * Wrap async function with error handling
 */
export const withErrorHandling = (fn, onError) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (onError) {
        onError(error);
      } else {
        logError(fn.name || 'Anonymous function', error);
      }
      throw error;
    }
  };
};
