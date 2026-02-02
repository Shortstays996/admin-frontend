import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatsCard from './StatsCard';
import RecentActivity from './RecentActivity';
import apiService from '../services/apiService';

const Overview = () => {
    const [stats, setStats] = useState({
        totalHotels: 0,
        activeBookings: 0,
        totalPartners: 0,
        totalRevenue: 0
    });
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        try {
            setLoading(true);

            // Fetch dashboard statistics from admin API
            const data = await apiService.dashboard.getStats();

            if (data.success && data.data) {
                setStats({
                    totalHotels: parseInt(data.data.total_hotels) || 0,
                    activeBookings: parseInt(data.data.active_bookings) || 0,
                    totalPartners: parseInt(data.data.total_partners) || 0,
                    totalRevenue: parseFloat(data.data.total_revenue) || 0
                });
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            // If API fails, keep default values
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl">
            <div className="mb-8 flex items-start justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Welcome Back, Admin!</h2>
                    <p className="text-gray-600 mt-2">Here's what's happening with your hotels today.</p>
                </div>

                {/* refresh button */}
                <div className="ml-4">
                    <button
                        onClick={fetchDashboardStats}
                        disabled={loading}
                        className={`inline-flex items-center px-3 py-2 border border-gray-200 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                        title="Refresh"
                    >
                        <svg className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582M20 20v-5h-.581M5.2 11a7 7 0 1113.6 0" />
                        </svg>
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatsCard
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
                    value={loading ? "..." : stats.totalHotels.toString()}
                    label="Total Hotels"
                    bgColor="bg-red-100"
                    onClick={() => navigate('/dashboard/hotel-approval')}
                />
                <StatsCard
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    value={loading ? "..." : stats.activeBookings.toString()}
                    label="Active Bookings"
                    bgColor="bg-green-100"
                    onClick={() => navigate('/dashboard/bookings')}
                />
                <StatsCard
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                    value={loading ? "..." : stats.totalPartners.toString()}
                    label="Active Partners"
                    bgColor="bg-blue-100"
                    onClick={() => navigate('/dashboard/hotel-approval')}
                />
                <StatsCard
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    value={loading ? "..." : `₹${(stats.totalRevenue / 1000).toFixed(1)}K`}
                    label="Total Revenue"
                    bgColor="bg-purple-100"
                    onClick={() => navigate('/dashboard/analytics')}
                />
            </div>

            <RecentActivity />
        </div>
    );
};

export default Overview;