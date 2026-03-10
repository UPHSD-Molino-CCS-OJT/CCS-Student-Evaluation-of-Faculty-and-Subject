/**
 * General Helper Utilities
 */

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>): void => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Throttle function
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>): void => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Deep clone object
 */
export const deepClone = <T>(obj: T): T => {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.error('Error cloning object:', error);
    return obj;
  }
};

/**
 * Check if object is empty
 */
export const isEmpty = (obj: any): boolean => {
  if (obj === null || obj === undefined) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
};

/**
 * Capitalize first letter
 */
export const capitalize = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Convert to title case
 */
export const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
};

/**
 * Truncate string
 */
export const truncate = (str: string, length: number = 50, suffix: string = '...'): string => {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length).trim() + suffix;
};

/**
 * Generate random ID
 */
export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Sleep/delay function
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Get initials from name
 */
export const getInitials = (firstName?: string, lastName?: string): string => {
  const first = firstName ? firstName.charAt(0).toUpperCase() : '';
  const last = lastName ? lastName.charAt(0).toUpperCase() : '';
  return `${first}${last}`;
};

/**
 * Get full name
 */
export const getFullName = (firstName?: string, middleName?: string, lastName?: string): string => {
  const parts = [firstName, middleName, lastName].filter(Boolean);
  return parts.join(' ');
};

/**
 * Sort array by property
 */
export const sortBy = <T extends Record<string, any>>(
  array: T[],
  property: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aVal = a[property];
    const bVal = b[property];
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Group array by property
 */
export const groupBy = <T extends Record<string, any>>(
  array: T[],
  property: keyof T
): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const key = String(item[property]);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

/**
 * Calculate average
 */
export const average = (numbers: number[]): number => {
  if (!Array.isArray(numbers) || numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, num) => acc + num, 0);
  return sum / numbers.length;
};

/**
 * Calculate percentage
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

/**
 * Format number with commas
 */
export const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Clamp number between min and max
 */
export const clamp = (num: number, min: number, max: number): number => {
  return Math.min(Math.max(num, min), max);
};

/**
 * Check if value is numeric
 */
export const isNumeric = (value: any): boolean => {
  return !isNaN(parseFloat(value)) && isFinite(value);
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    // Fallback method
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  }
};

/**
 * Download as file
 */
export const downloadAsFile = (content: string, filename: string, mimeType: string = 'text/plain'): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Scroll to element
 */
export const scrollToElement = (element: Element | null, options: ScrollIntoViewOptions = {}): void => {
  if (!element) return;
  
  const defaultOptions: ScrollIntoViewOptions = {
    behavior: 'smooth',
    block: 'start',
    ...options,
  };
  
  element.scrollIntoView(defaultOptions);
};

/**
 * Get query parameter from URL
 */
export const getQueryParam = (param: string): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
};

/**
 * Update query parameter in URL
 */
export const updateQueryParam = (param: string, value: string): void => {
  const url = new URL(window.location.href);
  url.searchParams.set(param, value);
  window.history.pushState({}, '', url);
};

/**
 * Remove query parameter from URL
 */
export const removeQueryParam = (param: string): void => {
  const url = new URL(window.location.href);
  url.searchParams.delete(param);
  window.history.pushState({}, '', url);
};

/**
 * Check if user is on mobile device
 */
export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Get browser name
 */
export const getBrowserName = (): string => {
  const userAgent = navigator.userAgent;
  
  if (userAgent.indexOf('Firefox') > -1) return 'Firefox';
  if (userAgent.indexOf('Chrome') > -1) return 'Chrome';
  if (userAgent.indexOf('Safari') > -1) return 'Safari';
  if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident') > -1) return 'IE';
  if (userAgent.indexOf('Edge') > -1) return 'Edge';
  
  return 'Unknown';
};

/**
 * Feature types for support checking
 */
export type SupportedFeature = 'localStorage' | 'clipboard' | 'notifications';

/**
 * Check if feature is supported
 */
export const isFeatureSupported = (feature: SupportedFeature): boolean => {
  switch (feature) {
    case 'localStorage':
      try {
        const test = '__test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch (e) {
        return false;
      }
    case 'clipboard':
      return !!navigator.clipboard;
    case 'notifications':
      return 'Notification' in window;
    default:
      return false;
  }
};

/**
 * Create URL-friendly slug
 */
export const createSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
};

/**
 * Parse CSV string
 */
export const parseCSV = (csvString: string): Record<string, string>[] => {
  const lines = csvString.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    return headers.reduce((obj, header, index) => {
      obj[header] = values[index];
      return obj;
    }, {} as Record<string, string>);
  });
};

/**
 * Export array to CSV
 */
export const exportToCSV = <T extends Record<string, any>>(
  data: T[],
  filename: string = 'export.csv'
): void => {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => row[header]).join(','))
  ].join('\n');
  
  downloadAsFile(csvContent, filename, 'text/csv');
};
