
import { useState, useEffect } from 'react';
import apiService from '../services/apiService';

const RecentActivity = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecentBookings();
    }, []);

    const fetchRecentBookings = async () => {
        try {
            setLoading(true);
            const response = await apiService.dashboard.getRecentBookings(10);
            setBookings(response.data);
        } catch (error) {
            console.error('Error fetching recent bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) {
            return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
        } else {
            return date.toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'short',
                year: 'numeric'
            });
        }
    };

    const getStatusColorClass = (status) => {
        switch (status) {
            case 'confirmed': return 'bg-green-500';
            case 'checked-in': return 'bg-blue-500';
            case 'completed': return 'bg-purple-500';
            case 'checked-out': return 'bg-amber-500';
            case 'cancelled': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Bookings</h3>
            {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : bookings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No bookings this month</div>
            ) : (
                <div className="space-y-4">
                    {bookings.map((booking) => (
                        <div key={booking.id} className="py-3 border-b border-gray-100 last:border-0">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-start gap-3">
                                    <div className={`w-2 h-2 rounded-full mt-2 ${getStatusColorClass(booking.booking_status)}`}></div>
                                    <div>
                                        <p className="text-gray-900 font-medium">{booking.hotel_name}</p>
                                        <p className="text-sm text-gray-600">Booked by: {booking.user_name}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-green-600 font-semibold">₹{booking.total_price.toLocaleString('en-IN')}</p>
                                    <p className="text-xs text-gray-500">{formatDateTime(booking.booking_date)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RecentActivity;