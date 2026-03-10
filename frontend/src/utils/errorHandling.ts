/**
 * Error Handling Utilities
 */

import { ERROR_MESSAGES } from './constants';

/**
 * API Error with response information
 */
export interface ApiError extends Error {
  response?: {
    status: number;
    data?: any;
  };
  request?: any;
}

/**
 * Parsed error response structure
 */
export interface ParsedError {
  status: number;
  message: string;
  data: any;
}

/**
 * Form errors object
 */
export interface FormErrors {
  [key: string]: string | undefined;
}

/**
 * Toast configuration
 */
export interface ToastConfig {
  type: 'error' | 'success' | 'info' | 'warning';
  message: string;
  duration: number;
}

/**
 * Error boundary fallback configuration
 */
export interface ErrorBoundaryFallback {
  title: string;
  message: string;
  action: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Parse API error response
 */
export const parseApiError = (error: ApiError): ParsedError => {
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
export const getDefaultErrorMessage = (status: number): string => {
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
export const handleFormError = (
  error: ApiError,
  setErrors: (errors: FormErrors) => void
): ParsedError => {
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
export const getUserErrorMessage = (error: ApiError): string => {
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
export const logError = (context: string, error: ApiError | Error): void => {
  if (import.meta.env.DEV) {
    console.group(`❌ Error in ${context}`);
    console.error('Error object:', error);
    if ('response' in error && error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    console.groupEnd();
  }
};

/**
 * Create error toast configuration
 */
export const createErrorToast = (error: ApiError, defaultMessage: string = 'An error occurred'): ToastConfig => {
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
export const isNetworkError = (error: ApiError): boolean => {
  return !error.response && !!error.request;
};

/**
 * Check if error is authentication error
 */
export const isAuthError = (error: ApiError): boolean => {
  return !!error.response && error.response.status === 401;
};

/**
 * Check if error is validation error
 */
export const isValidationError = (error: ApiError): boolean => {
  return !!error.response && (error.response.status === 400 || error.response.status === 422);
};

/**
 * Format validation errors for display
 */
export const formatValidationErrors = (errors: string | string[] | Record<string, any>): string[] => {
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
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: ApiError | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as ApiError;
      
      // Don't retry on client errors (4xx)
      if (lastError.response && lastError.response.status >= 400 && lastError.response.status < 500) {
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
export const createErrorBoundaryFallback = (error: Error, resetError: () => void): ErrorBoundaryFallback => {
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
export const safeJsonParse = <T = any>(str: string, defaultValue: T | null = null): T | null => {
  try {
    return JSON.parse(str);
  } catch (error) {
    logError('JSON Parse', error as Error);
    return defaultValue;
  }
};

/**
 * Wrap async function with error handling
 */
export const withErrorHandling = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  onError?: (error: Error) => void
): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (onError) {
        onError(error as Error);
      } else {
        logError(fn.name || 'Anonymous function', error as Error);
      }
      throw error;
    }
  };
};
