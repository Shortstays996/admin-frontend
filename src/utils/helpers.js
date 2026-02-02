import { STORAGE_KEYS, SESSION_DURATION } from '../config/constants';

export const storage = {
    // Set item in localStorage
    setItem: (key, value) => {
        try {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        } catch (error) {
            console.error('Error setting item in localStorage:', error);
        }
    },

    // Get item from localStorage
    getItem: (key, parse = false) => {
        try {
            const item = localStorage.getItem(key);
            return parse && item ? JSON.parse(item) : item;
        } catch (error) {
            console.error('Error getting item from localStorage:', error);
            return null;
        }
    },

    // Remove item from localStorage
    removeItem: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Error removing item from localStorage:', error);
        }
    },

    // Clear all items from localStorage
    clear: () => {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Error clearing localStorage:', error);
        }
    }
};

// Generate a secure random token
export const generateToken = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `admin_${timestamp}_${random}`;
};

// Check if session is expired
export const isSessionExpired = () => {
    const loginTime = storage.getItem(STORAGE_KEYS.LOGIN_TIME);
    if (!loginTime) return true;
    
    const currentTime = Date.now();
    const elapsedTime = currentTime - parseInt(loginTime);
    
    return elapsedTime > SESSION_DURATION;
};

// Format date for display
export const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Validate email format
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
