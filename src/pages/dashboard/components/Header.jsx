import { Menu, X } from 'lucide-react';

const Header = ({ onProfileClick, onToggleSidebar, sidebarOpen }) => {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
            <div className="max-w-full mx-auto px-4 md:px-8 py-3 md:py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* mobile toggle inside header */}
                    <button
                        onClick={onToggleSidebar}
                        className="md:hidden p-2 rounded hover:bg-gray-100 mr-1"
                        aria-label="Toggle sidebar"
                    >
                        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>

                    <div className="w-10 h-10 bg-ssh-red rounded-lg flex items-center justify-center text-white font-bold text-xl">
                        SSH
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl font-bold text-gray-900">Short Stay Hotel</h1>
                        <p className="text-xs md:text-sm text-gray-600">Admin Dashboard</p>
                    </div>
                </div>

                <button
                    onClick={onProfileClick}
                    className="p-2 hover:bg-gray-100 rounded-full transition"
                >
                    <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </button>
            </div>
        </header>
    );
};

export default Header;
