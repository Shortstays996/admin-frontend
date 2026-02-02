import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ProfileMenu from './components/ProfileMenu';
import authService from '../../services/authService';
// icons moved into Header; no direct icons needed here

const Dashboard = () => {
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogout = () => {
        authService.logout();
        toast.success('Logged out successfully');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header
                onProfileClick={() => setShowProfileMenu(!showProfileMenu)}
                showProfileMenu={showProfileMenu}
                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                sidebarOpen={sidebarOpen}
            />

            {showProfileMenu && (
                <ProfileMenu onLogout={handleLogout} />
            )}

            {/* Sidebar overlay (mobile) */}
            {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

            {/* Sidebar panel - slides in from left on mobile, fixed on left for md+ */}
            <div className={`fixed top-0 left-0 z-40 h-full w-64 bg-white md:fixed md:bg-white md:pt-0 transform transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                <Sidebar />
            </div>

            <div className="pt-[73px] md:pl-64">
                <div className="p-4 md:p-8">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;