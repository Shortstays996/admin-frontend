
const ProfileMenu = ({ onLogout }) => {
    return (
        <div className="absolute right-8 top-16 bg-white shadow-lg rounded-lg border border-gray-200 py-2 min-w-[180px] z-50">
            <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-red-50 hover:text-ssh-red transition"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="font-medium">Logout</span>
            </button>
        </div>
    );
};

export default ProfileMenu;