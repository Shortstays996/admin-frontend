import { API_BASE_URL, STORAGE_KEYS } from '../config/constants';
import { storage, isSessionExpired, isValidEmail } from '../utils/helpers';

const authService = {
    // Login with email and password
    login: async (email, password) => {
        try {
            // Validate input
            if (!email || !password) {
                return {
                    success: false,
                    message: 'Email and password are required'
                };
            }

            // Validate email format
            if (!isValidEmail(email)) {
                return {
                    success: false,
                    message: 'Invalid email format'
                };
            }

            // Call backend API
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Login failed'
                };
            }

            if (data.success && data.data.tokens) {
                const loginTime = Date.now();
                
                // Store authentication data
                storage.setItem(STORAGE_KEYS.TOKEN, data.data.tokens.accessToken);
                storage.setItem(STORAGE_KEYS.EMAIL, data.data.admin.email);
                storage.setItem(STORAGE_KEYS.LOGIN_TIME, loginTime.toString());
                
                // Store admin info
                storage.setItem('adminInfo', JSON.stringify(data.data.admin));

                return {
                    success: true,
                    message: data.message,
                    token: data.data.tokens.accessToken,
                    email: data.data.admin.email,
                    admin: data.data.admin
                };
            } else {
                return {
                    success: false,
                    message: 'Invalid response from server'
                };
            }
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: error.message || 'Network error. Please try again.'
            };
        }
    },

    // Logout and clear session
    logout: () => {
        storage.removeItem(STORAGE_KEYS.TOKEN);
        storage.removeItem(STORAGE_KEYS.EMAIL);
        storage.removeItem(STORAGE_KEYS.LOGIN_TIME);
        storage.removeItem('adminInfo');
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        const token = storage.getItem(STORAGE_KEYS.TOKEN);
        const loginTime = storage.getItem(STORAGE_KEYS.LOGIN_TIME);

        if (!token || !loginTime) {
            return false;
        }

        // Check if session expired
        if (isSessionExpired()) {
            authService.logout();
            return false;
        }

        return true;
    },

    // Get current user info
    getCurrentUser: () => {
        if (!authService.isAuthenticated()) {
            return null;
        }

        const adminInfoStr = storage.getItem('adminInfo');
        const adminInfo = adminInfoStr ? JSON.parse(adminInfoStr) : null;

        return {
            email: storage.getItem(STORAGE_KEYS.EMAIL),
            loginTime: storage.getItem(STORAGE_KEYS.LOGIN_TIME),
            ...adminInfo
        };
    },

    // Get authentication token
    getToken: () => {
        return storage.getItem(STORAGE_KEYS.TOKEN);
    },

    // Refresh session (extend login time)
    refreshSession: () => {
        if (authService.isAuthenticated()) {
            const newLoginTime = Date.now();
            storage.setItem(STORAGE_KEYS.LOGIN_TIME, newLoginTime.toString());
        }
    },

    // Get session expiry time
    getSessionExpiry: () => {
        const loginTime = storage.getItem(STORAGE_KEYS.LOGIN_TIME);
        if (!loginTime) return null;

        const expiryTime = parseInt(loginTime) + (7 * 24 * 60 * 60 * 1000); // 7 days
        return new Date(expiryTime);
    }
};

export default authService;
