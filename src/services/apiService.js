import { API_BASE_URL } from '../config/constants';
import authService from './authService';

const apiService = {
    // Base request method
    request: async (endpoint, options = {}) => {
        const token = authService.getToken();
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    },

    // GET request
    get: (endpoint) => {
        return apiService.request(endpoint, { method: 'GET' });
    },

    // POST request
    post: (endpoint, data) => {
        return apiService.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // PUT request
    put: (endpoint, data) => {
        return apiService.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    // DELETE request
    delete: (endpoint) => {
        return apiService.request(endpoint, { method: 'DELETE' });
    },

    // Hotel APIs
    hotels: {
        // Get all hotels with optional filters
        getAll: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return apiService.get(`/api/admin/hotels${queryString ? `?${queryString}` : ''}`);
        },

        // Get hotel by ID
        getById: (id) => {
            return apiService.get(`/api/admin/hotels/${id}`);
        },

        // Update hotel status
        updateStatus: (id, status, rejectionReason = null) => {
            return apiService.put(`/api/admin/hotels/${id}/status`, {
                status,
                rejectionReason
            });
        },
        // Update property_status (enabled/disabled)
        updatePropertyStatus: (id, propertyStatus) => {
            return apiService.put(`/api/admin/hotels/${id}/property-status`, {
                property_status: propertyStatus
            });
        },

        // Send message to partner
        sendMessage: (id, subject, message, description = '') => {
            return apiService.post(`/api/admin/hotels/${id}/message`, {
                subject,
                message,
                description
            });
        },

        // Update hotel room types (pricing / amenities / counts)
        updateRoomTypes: (hotelId, roomTypes) => {
            return apiService.put(`/api/admin/hotels/${hotelId}/room-types`, { roomTypes });
        }
    },

    // Dashboard APIs
    dashboard: {
        // Get dashboard statistics
        getStats: () => {
            return apiService.get('/api/admin/dashboard/stats');
        },

        // Get recent bookings
        getRecentBookings: (limit = 10) => {
            return apiService.get(`/api/admin/dashboard/recent-bookings?limit=${limit}`);
        }
    },

    // Analytics APIs
    analytics: {
        get: (timeframe = 'daily') => {
            return apiService.get(`/api/admin/analytics?timeframe=${encodeURIComponent(timeframe)}`);
        }
    },

    // Bookings APIs
    bookings: {
        // Get all bookings
        getAll: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return apiService.get(`/api/admin/bookings${queryString ? `?${queryString}` : ''}`);
        },

        // Get booking by ID
        getById: (id) => {
            return apiService.get(`/api/admin/bookings/${id}`);
        }
    },

    // Commission APIs
    commission: {
        // Get commission data for all hotels
        getData: () => {
            return apiService.get('/api/admin/commission');
        },

        // Update commission rate for a hotel
        updateRate: (hotelId, commissionRate) => {
            return apiService.put(`/api/admin/commission/${hotelId}`, { commissionRate });
        },

        // Update extra marketing charges for a hotel
        updateMarketingCharge: (hotelId, extraMarketingCharges) => {
            return apiService.put(`/api/admin/commission/${hotelId}/marketing`, { extraMarketingCharges });
        },

        // Update GST for a hotel
        updateGst: (hotelId, gst) => {
            return apiService.put(`/api/admin/commission/${hotelId}/gst`, { gst });
        }
    },

    // Promotions APIs
    promotions: {
        // Create new promotion
        create: (promotionData) => {
            return apiService.post('/api/admin/promotions', promotionData);
        },

        // Get all promotions
        getAll: (filters = {}) => {
            const params = new URLSearchParams(filters).toString();
            return apiService.get(`/api/admin/promotions${params ? '?' + params : ''}`);
        },

        // Get promotion by ID
        getById: (id) => {
            return apiService.get(`/api/admin/promotions/${id}`);
        },

        // Update promotion
        update: (id, promotionData) => {
            return apiService.put(`/api/admin/promotions/${id}`, promotionData);
        },

        // Toggle promotion status (activate/pause)
        updateStatus: (id, status) => {
            return apiService.put(`/api/admin/promotions/${id}/status`, { status });
        },

        // Delete promotion
        delete: (id) => {
            return apiService.delete(`/api/admin/promotions/${id}`);
        },

        // Get usage report
        getReport: (id, filters = {}) => {
            const params = new URLSearchParams(filters).toString();
            return apiService.get(`/api/admin/promotions/${id}/report${params ? '?' + params : ''}`);
        },

        // Validate promotion code
        validate: (validationData) => {
            return apiService.post('/api/admin/promotions/validate', validationData);
        },

        // Get all users who used promotions
        getAllUsers: () => {
            return apiService.get('/api/admin/promotions/usage/users');
        }
    },

    // (Room-types update is under apiService.hotels.updateRoomTypes)
};

export default apiService;