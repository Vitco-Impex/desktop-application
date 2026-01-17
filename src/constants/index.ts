/**
 * Application Constants
 * Centralized constants to avoid magic numbers and strings
 */

// API Configuration
export const API_TIMEOUT = 30000; // 30 seconds

// Date/Time Constants
export const DATE_FORMAT_OPTIONS = {
  SHORT: { format: 'short' as const },
  MEDIUM: { format: 'medium' as const },
  LONG: { format: 'long' as const },
  WITH_TIME: { includeTime: true },
  WITH_SECONDS: { includeTime: true, includeSeconds: true },
};

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Debounce Delays
export const DEBOUNCE_DELAYS = {
  SEARCH: 300,
  INPUT: 500,
  RESIZE: 250,
};

// Cache Times (in milliseconds)
export const CACHE_TIMES = {
  SHORT: 1 * 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 15 * 60 * 1000, // 15 minutes
};

// Retry Configuration
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second base delay
};

// Text Limits
export const TEXT_LIMITS = {
  TRUNCATE_DEFAULT: 100,
  TRUNCATE_SHORT: 50,
  TRUNCATE_LONG: 150,
  TITLE_MAX: 200,
  DESCRIPTION_MAX: 1000,
};

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

// Role Permissions
export const ROLES = {
  ADMIN: 'admin',
  HR: 'hr',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
} as const;

// Status Values
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
