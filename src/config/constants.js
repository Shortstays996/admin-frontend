// Session duration (7 days in milliseconds)
export const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

// Storage keys
export const STORAGE_KEYS = {
    TOKEN: 'adminToken',
    EMAIL: 'adminEmail',
    LOGIN_TIME: 'adminLoginTime'
};

// API base URL (if needed for future backend integration)
export const API_BASE_URL = process.env.REACT_APP_API_URL || "https://d2pp8hh5hl2x44.cloudfront.net" || 'http://localhost:8001';
