/**
 * Local Storage Utilities
 * For auto-save functionality and draft management
 */

import { PRIVACY_CONFIG } from './constants';

/**
 * Save evaluation draft to localStorage
 */
export const saveDraft = (enrollmentId, formData) => {
  try {
    const key = `${PRIVACY_CONFIG.AUTO_SAVE_KEY_PREFIX}${enrollmentId}`;
    const draft = {
      formData,
      timestamp: new Date().toISOString(),
      enrollmentId,
    };
    localStorage.setItem(key, JSON.stringify(draft));
    return true;
  } catch (error) {
    console.error('Error saving draft:', error);
    return false;
  }
};

/**
 * Load evaluation draft from localStorage
 */
export const loadDraft = (enrollmentId) => {
  try {
    const key = `${PRIVACY_CONFIG.AUTO_SAVE_KEY_PREFIX}${enrollmentId}`;
    const draftStr = localStorage.getItem(key);
    
    if (!draftStr) return null;
    
    const draft = JSON.parse(draftStr);
    return draft;
  } catch (error) {
    console.error('Error loading draft:', error);
    return null;
  }
};

/**
 * Clear evaluation draft from localStorage
 */
export const clearDraft = (enrollmentId) => {
  try {
    const key = `${PRIVACY_CONFIG.AUTO_SAVE_KEY_PREFIX}${enrollmentId}`;
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error clearing draft:', error);
    return false;
  }
};

/**
 * Check if draft exists
 */
export const hasDraft = (enrollmentId) => {
  try {
    const key = `${PRIVACY_CONFIG.AUTO_SAVE_KEY_PREFIX}${enrollmentId}`;
    return localStorage.getItem(key) !== null;
  } catch (error) {
    console.error('Error checking draft:', error);
    return false;
  }
};

/**
 * Get all draft keys
 */
export const getAllDrafts = () => {
  try {
    const drafts = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PRIVACY_CONFIG.AUTO_SAVE_KEY_PREFIX)) {
        const draftStr = localStorage.getItem(key);
        if (draftStr) {
          drafts.push(JSON.parse(draftStr));
        }
      }
    }
    return drafts;
  } catch (error) {
    console.error('Error getting all drafts:', error);
    return [];
  }
};

/**
 * Clear all evaluation drafts
 */
export const clearAllDrafts = () => {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PRIVACY_CONFIG.AUTO_SAVE_KEY_PREFIX)) {
        keys.push(key);
      }
    }
    keys.forEach(key => localStorage.removeItem(key));
    return true;
  } catch (error) {
    console.error('Error clearing all drafts:', error);
    return false;
  }
};

/**
 * Get draft age in minutes
 */
export const getDraftAge = (enrollmentId) => {
  try {
    const draft = loadDraft(enrollmentId);
    if (!draft || !draft.timestamp) return null;
    
    const draftTime = new Date(draft.timestamp);
    const now = new Date();
    const diffMs = now - draftTime;
    const diffMinutes = Math.floor(diffMs / 60000);
    
    return diffMinutes;
  } catch (error) {
    console.error('Error calculating draft age:', error);
    return null;
  }
};

/**
 * Store user session data
 */
export const storeSession = (key, data) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error storing session:', error);
    return false;
  }
};

/**
 * Get user session data
 */
export const getSession = (key) => {
  try {
    const data = sessionStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
};

/**
 * Clear user session data
 */
export const clearSession = (key) => {
  try {
    if (key) {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.clear();
    }
    return true;
  } catch (error) {
    console.error('Error clearing session:', error);
    return false;
  }
};

/**
 * Store preference
 */
export const storePreference = (key, value) => {
  try {
    localStorage.setItem(`pref_${key}`, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Error storing preference:', error);
    return false;
  }
};

/**
 * Get preference
 */
export const getPreference = (key, defaultValue = null) => {
  try {
    const value = localStorage.getItem(`pref_${key}`);
    return value ? JSON.parse(value) : defaultValue;
  } catch (error) {
    console.error('Error getting preference:', error);
    return defaultValue;
  }
};

/**
 * Check if localStorage is available
 */
export const isStorageAvailable = () => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get storage usage (approximate)
 */
export const getStorageSize = () => {
  try {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return {
      bytes: total,
      kb: (total / 1024).toFixed(2),
      mb: (total / 1024 / 1024).toFixed(2),
    };
  } catch (error) {
    console.error('Error calculating storage size:', error);
    return null;
  }
};
