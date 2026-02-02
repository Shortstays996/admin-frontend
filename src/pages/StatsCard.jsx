
const StatsCard = ({ icon, value, label, bgColor, onClick }) => {
    return (
        <div
            className={`bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition cursor-pointer select-none ${onClick ? 'hover:bg-gray-50 active:scale-[0.98]' : ''}`}
            onClick={onClick}
            tabIndex={onClick ? 0 : undefined}
            role={onClick ? 'button' : undefined}
            aria-pressed="false"
        >
            <div className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center text-gray-700 mb-4`}>
                {icon}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
            <p className="text-sm text-gray-600">{label}</p>
        </div>
    );
};

export default StatsCard;