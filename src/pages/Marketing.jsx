import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import apiService from '../services/apiService';

const Marketing = () => {
    const [showAddModal, setShowAddModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedPromotion, setSelectedPromotion] = useState(null);
    const [promotions, setPromotions] = useState([]);
    const [hotels, setHotels] = useState([]);
    const [viewFilter, setViewFilter] = useState('all'); // 'all' | 'active'
    const [couponUsers, setCouponUsers] = useState([]);
    const [showCouponUsersModal, setShowCouponUsersModal] = useState(false);
    const [loadingCouponUsers, setLoadingCouponUsers] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        discountType: 'percentage',
        discountValue: '',
        propertyType: 'all',
        applicableHotels: 'all',
        selectedHotels: [],
        bookingDuration: [],
        startDate: '',
        endDate: '',
        totalUsageLimit: '',
        perUserLimit: '',
        isAutoApplied: false
    });

    const normalizePropertyType = (value) => {
        if (!value) return '';
        const raw = String(value).trim().toLowerCase();
        // Normalize separators (space, dash, slash) to underscore
        const cleaned = raw.replace(/[\s\-/]+/g, '_');

        // Canonicalize known variants
        const compact = cleaned.replace(/_/g, '');
        if (compact.includes('coliving') || compact === 'pgcoliving' || compact === 'pgco_living') return 'pg_coliving';
        if (compact === 'hotel' || compact === 'hotels') return 'hotel';
        if (compact === 'resort' || compact === 'resorts') return 'resort';

        if (cleaned === 'pg_coliving' || cleaned === 'pgco_living' || cleaned === 'pg_coliving') return 'pg_coliving';
        return cleaned;
    };

    const getHotelName = (hotel) => {
        return (
            hotel?.hotelName ||
            hotel?.hotel_name ||
            hotel?.name ||
            hotel?.propertyName ||
            hotel?.property_name ||
            'Unnamed Hotel'
        );
    };

    const getHotelCity = (hotel) => {
        return hotel?.city || hotel?.location || hotel?.propertyLocation || hotel?.property_location || '';
    };

    const getHotelPropertyType = (hotel) => {
        const v = hotel?.propertyType || hotel?.property_type || hotel?.type;
        return normalizePropertyType(v);
    };

    const getApplicableHotelsLabels = () => {
        if (formData.propertyType === 'hotel') return { all: 'All Hotels', selected: 'Selected Hotels' };
        if (formData.propertyType === 'pg_coliving') return { all: 'All PG/Co-living', selected: 'Selected PG/Co-living' };
        if (formData.propertyType === 'resort') return { all: 'All Resorts', selected: 'Selected Resorts' };
        return { all: 'All Hotels', selected: 'Selected Hotels' };
    };

    const getFilteredHotels = () => {
        if (formData.propertyType === 'all') return hotels;
        const wanted = formData.propertyType;

        const filtered = hotels.filter((h) => getHotelPropertyType(h) === wanted);
        // If hotel records don't have propertyType populated, avoid showing an empty list.
        if (filtered.length === 0) {
            const anyHasType = hotels.some((h) => Boolean(getHotelPropertyType(h)));
            if (!anyHasType) return hotels;
        }
        return filtered;
    };

    useEffect(() => {
        loadPromotions();
        loadHotels();
    }, []);

    const loadPromotions = async () => {
        setLoading(true);
        try {
            const response = await apiService.promotions.getAll();
            setPromotions(response.data || []);
        } catch (error) {
            console.error('Failed to load promotions:', error);
            toast.error('Failed to load promotions');
        } finally {
            setLoading(false);
        }
    };

    const handleShowPromotions = (filter) => {
        setViewFilter(filter || 'all');
        // ensure promotions list is visible (already on this page)
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleShowCouponUsers = async () => {
        setLoadingCouponUsers(true);
        try {
            const resp = await apiService.promotions.getAllUsers();
            const payload = resp.data ?? resp;
            console.log('All Bookings for Coupons:', payload);

            // support multiple response shapes:
            // 1) { usageHistory: [...] } (promotions usage endpoint)
            // 2) array of bookings
            // 3) { data: [...] }
            let items = [];
            if (Array.isArray(payload)) {
                items = payload;
            } else if (payload && Array.isArray(payload.usageHistory)) {
                items = payload.usageHistory;
            } else if (payload && Array.isArray(payload.data)) {
                items = payload.data;
            }

            const filtered = items.map(b => {
                // detect promotions-usage shape (contains promotion_code / booking_id)
                if (b && (b.promotion_code || b.promotion_id || b.booking_id)) {
                    const propId = b.property_id ?? b.propertyId ?? b.property;
                    void propId;

                    return {
                        id: b.booking_id ?? b.id,
                        name: b.user_name || b.userName || b.guestName || b.name || 'N/A',
                        email: b.user_email || b.userEmail || b.guestEmail || b.email || 'N/A',
                        actualPrice: Number(b.original_amount ?? b.originalAmount ?? b.amount ?? 0),
                        couponCode: b.promotion_code || b.promotionCode || b.promotion_name || b.promotionName || 'N/A',
                        discountedPrice: Number(b.final_amount ?? b.finalAmount ?? b.final ?? 0),
                        used_at: formatDateTime(b.used_at ?? b.usedAt ?? b.usedAtTimestamp ?? b.usedAtTime ?? b.usedAtDate ?? b.used),
                    };
                }

                // fallback: booking object shape
                const couponFields = ['couponCode','coupon_code','coupon','promoCode','promo_code','promotionCode','promotion_code','appliedPromotion','promotion'];
                const hasCoupon = couponFields.some(key => Boolean(b && b[key])) || (b && b.promotion) || (b && b.appliedPromotion);
                if (!hasCoupon) return null;

                return {
                    id: b.id,
                    name: b.guestName || b.name || b.customerName || 'N/A',
                    email: b.guestEmail || b.email || b.customerEmail || 'N/A',
                    actualPrice: Number(b.totalPrice ?? b.total_price ?? b.amount ?? 0),
                    couponCode: b.couponCode || b.coupon_code || b.coupon || b.promoCode || b.promo_code || (b.promotion && b.promotion.code) || (b.appliedPromotion && b.appliedPromotion.code) || 'N/A',
                    discountedPrice: Number(b.finalPrice ?? b.payable ?? b.paidAmount ?? b.amountPaid ?? b.totalPrice ?? 0),
                    used_at: formatDateTime(b.used_at ?? b.usedAt ?? b.createdAt ?? b.created_at ?? b.booked_at)
                };
            }).filter(Boolean);

            setCouponUsers(filtered);
            setShowCouponUsersModal(true);
        } catch (err) {
            console.error('Failed to load bookings for coupons:', err);
            toast.error('Failed to load coupon bookings');
        } finally {
            setLoadingCouponUsers(false);
        }
    };

    const loadHotels = async () => {
        try {
            const response = await apiService.hotels.getAll();
            // Normalize response shapes:
            // - array
            // - { success: true, data: { hotels: [...] } } (admin backend)
            // - { data: [...] }
            // - { hotels: [...] }
            const payload = response?.data ?? response;
            let list = [];

            if (Array.isArray(payload)) {
                list = payload;
            } else if (payload && Array.isArray(payload.hotels)) {
                list = payload.hotels;
            } else if (payload && Array.isArray(payload.data)) {
                list = payload.data;
            } else if (payload?.data && Array.isArray(payload.data.hotels)) {
                list = payload.data.hotels;
            }

            setHotels(Array.isArray(list) ? list : []);
        } catch (error) {
            console.error('Failed to load hotels:', error);
            toast.error('Failed to load hotels');
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleHotelSelection = (hotelId) => {
        const normalizedId = String(hotelId);
        setFormData(prev => ({
            ...prev,
            selectedHotels: prev.selectedHotels.includes(normalizedId)
                ? prev.selectedHotels.filter(id => id !== normalizedId)
                : [...prev.selectedHotels, normalizedId]
        }));
    };

    const handleDurationToggle = (duration) => {
        setFormData(prev => ({
            ...prev,
            bookingDuration: prev.bookingDuration.includes(duration)
                ? prev.bookingDuration.filter(d => d !== duration)
                : [...prev.bookingDuration, duration]
        }));
    };

    const validateForm = () => {
        if (!formData.code.trim()) {
            toast.error('Promotion code is required');
            return false;
        }
        if (!formData.name.trim()) {
            toast.error('Promotion name is required');
            return false;
        }
        if (!formData.discountValue || formData.discountValue <= 0) {
            toast.error('Discount value must be greater than 0');
            return false;
        }
        if (formData.discountType === 'percentage' && formData.discountValue > 100) {
            toast.error('Percentage discount cannot exceed 100%');
            return false;
        }
        if (!formData.startDate) {
            toast.error('Start date is required');
            return false;
        }
        if (!formData.endDate) {
            toast.error('End date is required');
            return false;
        }
        if (new Date(formData.endDate) < new Date(formData.startDate)) {
            toast.error('End date must be after start date');
            return false;
        }
        if (formData.bookingDuration.length === 0) {
            toast.error('Please select at least one booking duration');
            return false;
        }
        if (formData.propertyType !== 'all' && formData.applicableHotels === 'selected' && formData.selectedHotels.length === 0) {
            toast.error('Please select at least one hotel');
            return false;
        }
        return true;
    };

    const handleCreatePromotion = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const payload = {
                ...formData,
                selectedHotels: Array.isArray(formData.selectedHotels) ? formData.selectedHotels : [],
            };

            if (payload.propertyType === 'all') {
                payload.applicableHotels = 'all';
                payload.selectedHotels = [];
            }

            await apiService.promotions.create(payload);
            
            toast.success('Promotion created successfully!');
            setShowAddModal(false);
            resetForm();
            loadPromotions();
        } catch (error) {
            console.error('Failed to create promotion:', error);
            toast.error(error.response?.data?.message || 'Failed to create promotion');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (promotionId, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'paused' : 'active';
        
        try {
            await apiService.promotions.updateStatus(promotionId, newStatus);
            
            toast.success(`Promotion ${newStatus === 'active' ? 'activated' : 'paused'} successfully`);
            loadPromotions();
        } catch (error) {
            console.error('Failed to update promotion status:', error);
            toast.error(error.response?.data?.message || 'Failed to update promotion status');
        }
    };

    const handleViewReport = (promotion) => {
        setSelectedPromotion(promotion);
        setShowReportModal(true);
    };

    const resetForm = () => {
        setFormData({
            code: '',
            name: '',
            description: '',
            discountType: 'percentage',
            discountValue: '',
            propertyType: 'all',
            applicableHotels: 'all',
            selectedHotels: [],
            bookingDuration: [],
            startDate: '',
            endDate: '',
            totalUsageLimit: '',
            perUserLimit: '',
            isAutoApplied: false
        });
    };

    const durationOptions = {
        hotel: [
            { value: '3hrs', label: '3 Hours' },
            { value: '6hrs', label: '6 Hours' },
            { value: '9hrs', label: '9 Hours' },
            { value: '12hrs', label: '12 Hours' },
            { value: '24hrs', label: '24 Hours' }
        ],
        pg_coliving: [
            { value: '1day', label: '1 Day' },
            { value: '5days', label: '5 Days' },
            { value: '10days', label: '10 Days' },
            { value: '1month', label: '1 Month' }
        ],
        resort: [
            { value: '12hrs', label: '12 Hours' },
            { value: '1day', label: '1 Day' }
        ],
        all: [
            { value: '3hrs', label: '3 Hours' },
            { value: '6hrs', label: '6 Hours' },
            { value: '12hrs', label: '12 Hours' },
            { value: '24hrs', label: '24 Hours' },
            { value: '1day', label: '1 Day' },
            { value: '5days', label: '5 Days' },
            { value: '10days', label: '10 Days' },
            { value: '1month', label: '1 Month' }
        ]
    };

    const getAvailableDurations = () => {
        return durationOptions[formData.propertyType] || durationOptions.all;
    };

    const isExpired = (promo) => {
        if (!promo || !promo.endDate) return false;
        const end = new Date(promo.endDate);
        end.setHours(23, 59, 59, 999);
        return end < new Date();
    };

    const getPromoStatus = (promo) => {
        if (isExpired(promo)) return 'expired';
        return promo.status || 'paused';
    };

    const formatDateTime = (d) => {
        if (!d) return 'N/A';
        try {
            const date = new Date(d);
            if (Number.isNaN(date.getTime())) return 'N/A';
            return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
        } catch (e) {
            return 'N/A';
        }
    };

    const [deletingId, setDeletingId] = useState(null);

    const handleDeletePromotion = async (promotionId) => {
        const ok = window.confirm('Are you sure you want to delete this promotion? This action cannot be undone.');
        if (!ok) return;
        try {
            setDeletingId(promotionId);
            await apiService.promotions.delete(promotionId);
            toast.success('Promotion deleted successfully');
            await loadPromotions();
        } catch (err) {
            console.error('Failed to delete promotion:', err);
            toast.error(err.message || 'Failed to delete promotion');
        } finally {
            setDeletingId(null);
        }
    };

    console.log("promotions:", promotions);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-2 lg:px-8 md:py-8 py-2">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="xl:text-3xl md:text-2xl text-xl font-bold text-gray-900">Promotions Management</h2>
                    <p className="text-sm md:text-base text-gray-600 mt-1">Create and manage platform-level promotions</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        className="md:px-6 md:py-3 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                        onClick={() => setShowAddModal(true)}
                    >
                        + Create Promotion
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                <button onClick={() => handleShowPromotions('all')} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-left">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Total Promotions</h3>
                    <p className="text-3xl font-bold text-gray-900">{promotions.length}</p>
                </button>
                <button onClick={() => handleShowPromotions('active')} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-left">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Active Promotions</h3>
                    <p className="text-3xl font-bold text-green-600">
                        {promotions.filter(p => p.status === 'active' && !isExpired(p)).length}
                    </p>
                </button>
                <button onClick={handleShowCouponUsers} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-left">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Total Bookings</h3>
                    <p className="text-3xl font-bold text-gray-900">
                        {promotions.reduce((sum, p) => sum + (p.totalBookings || 0), 0)}
                    </p>
                </button>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Total Discount Given</h3>
                    <p className="text-3xl font-bold text-red-600">
                        ₹{promotions.reduce((sum, p) => sum + (p.totalDiscountGiven || 0), 0).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Promotions Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Code</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Name</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Discount</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Property Type</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Uses</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Validity</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                            </tr>
                        </thead>

                        {/* body */}
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                                        Loading promotions...
                                    </td>
                                </tr>
                            ) : promotions.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                                        No promotions found. Create your first promotion!
                                    </td>
                                </tr>
                            ) : (
                                (viewFilter === 'active' ? promotions.filter(p => p.status === 'active' && !isExpired(p)) : promotions).map((promo) => (
                                    <tr key={promo.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{promo.code}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{promo.name}</td>
                                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                            {promo.discountType === 'percentage' 
                                                ? `${promo.discountValue}%` 
                                                : `₹${promo.discountValue}`}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                                            {promo.propertyType === 'pg_coliving' ? 'PG/Co-living' : promo.propertyType}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {promo.currentUsageCount} / {promo.totalUsageLimit || '∞'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(promo.startDate).toLocaleDateString()} - {new Date(promo.endDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {(() => {
                                                const status = getPromoStatus(promo);
                                                const classes = status === 'active'
                                                    ? 'bg-green-100 text-green-700'
                                                    : status === 'paused'
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : 'bg-red-400 text-gray-100';
                                                const label = status === 'active' ? 'Active' : status === 'paused' ? 'Paused' : 'Expired';
                                                return (
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${classes}`}>
                                                        {label}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2 items-center">
                                                {!isExpired(promo) && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleToggleStatus(promo.id, promo.status)}
                                                            className={`text-sm font-medium ${
                                                                promo.status === 'active' 
                                                                    ? 'text-yellow-600 hover:text-yellow-700' 
                                                                    : 'text-green-600 hover:text-green-700'
                                                            }`}
                                                        >
                                                            {promo.status === 'active' ? 'Pause' : 'Activate'}
                                                        </button>
                                                        <span className="text-gray-300">|</span>
                                                    </>
                                                )}
                                                <button 
                                                    onClick={() => handleViewReport(promo)}
                                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                                >
                                                    Report
                                                </button>
                                                <span className="text-gray-300">|</span>
                                                <button
                                                    onClick={() => handleDeletePromotion(promo.id)}
                                                    disabled={deletingId === promo.id}
                                                    className={`text-sm font-medium text-red-600 hover:text-red-700 ${deletingId === promo.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                >
                                                    {deletingId === promo.id ? 'Deleting...' : 'Delete'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Promotion Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-2xl font-bold text-gray-900">Create New Promotion</h3>
                            <button onClick={() => { setShowAddModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-lg transition">
                                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {/* Basic Information */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-900">Promotion Code *</label>
                                    <input 
                                        type="text" 
                                        name="code"
                                        value={formData.code}
                                        onChange={handleInputChange}
                                        placeholder="e.g., WELCOME50" 
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition uppercase"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-900">Promotion Name *</label>
                                    <input 
                                        type="text" 
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Welcome Offer" 
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-900">Description (Optional)</label>
                                <textarea 
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="Describe this promotion for internal reference..."
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition resize-none"
                                />
                            </div>

                            {/* Discount Type and Value */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-900">Discount Type *</label>
                                    <select 
                                        name="discountType"
                                        value={formData.discountType}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                                    >
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="flat">Flat Amount (₹)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-900">Discount Value *</label>
                                    <input 
                                        type="number" 
                                        name="discountValue"
                                        value={formData.discountValue}
                                        onChange={handleInputChange}
                                        placeholder={formData.discountType === 'percentage' ? 'e.g., 50' : 'e.g., 300'} 
                                        min="0"
                                        max={formData.discountType === 'percentage' ? '100' : undefined}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                                    />
                                </div>
                            </div>

                            {/* Property Type */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-900">Applicable Property Type *</label>
                                <div className="grid grid-cols-4 gap-3">
                                    {['all', 'hotel', 'pg_coliving', 'resort'].map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    propertyType: type,
                                                    bookingDuration: [],
                                                    applicableHotels: 'all',
                                                    selectedHotels: []
                                                }));
                                            }}
                                            className={`py-3 px-4 rounded-lg border-2 font-medium transition ${
                                                formData.propertyType === type
                                                    ? 'border-red-600 bg-red-50 text-red-600'
                                                    : 'border-gray-300 hover:border-red-300'
                                            }`}
                                        >
                                            {type === 'all' ? 'All Properties' : type === 'pg_coliving' ? 'PG/Co-living' : type.charAt(0).toUpperCase() + type.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Applicable Hotels */}
                            {formData.propertyType !== 'all' && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-900">Applicable Hotels *</label>
                                    <div className="flex gap-3 mb-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, applicableHotels: 'all', selectedHotels: [] }))}
                                            className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition ${
                                                formData.applicableHotels === 'all'
                                                    ? 'border-red-600 bg-red-50 text-red-600'
                                                    : 'border-gray-300 hover:border-red-300'
                                            }`}
                                        >
                                            {getApplicableHotelsLabels().all}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, applicableHotels: 'selected' }))}
                                            className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition ${
                                                formData.applicableHotels === 'selected'
                                                    ? 'border-red-600 bg-red-50 text-red-600'
                                                    : 'border-gray-300 hover:border-red-300'
                                            }`}
                                        >
                                            {getApplicableHotelsLabels().selected}
                                        </button>
                                    </div>
                                    
                                    {formData.applicableHotels === 'selected' && (
                                        <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                                            {getFilteredHotels().length === 0 ? (
                                                <p className="text-gray-500 text-sm">No hotels available</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {getFilteredHotels().map((hotel) => {
                                                        const id = String(hotel.id);
                                                        const city = getHotelCity(hotel);
                                                        return (
                                                            <label key={id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.selectedHotels.includes(id)}
                                                                    onChange={() => handleHotelSelection(id)}
                                                                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                                                                />
                                                                <span className="text-sm text-gray-700">{getHotelName(hotel)}{city ? ` - ${city}` : ''}</span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Booking Duration */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-900">Applicable Booking Duration *</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {getAvailableDurations().map((duration) => (
                                        <button
                                            key={duration.value}
                                            type="button"
                                            onClick={() => handleDurationToggle(duration.value)}
                                            className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition ${
                                                formData.bookingDuration.includes(duration.value)
                                                    ? 'border-red-600 bg-red-50 text-red-600'
                                                    : 'border-gray-300 hover:border-red-300'
                                            }`}
                                        >
                                            {duration.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Validity Period */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-900">Start Date *</label>
                                    <input 
                                        type="date" 
                                        name="startDate"
                                        value={formData.startDate}
                                        onChange={handleInputChange}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-900">End Date *</label>
                                    <input 
                                        type="date" 
                                        name="endDate"
                                        value={formData.endDate}
                                        onChange={handleInputChange}
                                        min={formData.startDate || new Date().toISOString().split('T')[0]}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                                    />
                                </div>
                            </div>

                            {/* Usage Limits */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-900">Total Usage Limit</label>
                                    <input 
                                        type="number" 
                                        name="totalUsageLimit"
                                        value={formData.totalUsageLimit}
                                        onChange={handleInputChange}
                                        placeholder="Leave empty for unlimited" 
                                        min="1"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-900">Per User Limit</label>
                                    <input 
                                        type="number" 
                                        name="perUserLimit"
                                        value={formData.perUserLimit}
                                        onChange={handleInputChange}
                                        placeholder="Leave empty for unlimited" 
                                        min="1"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                <button 
                                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                                    onClick={() => { setShowAddModal(false); resetForm(); }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
                                    onClick={handleCreatePromotion}
                                    disabled={loading}
                                >
                                    {loading ? 'Creating...' : 'Create Promotion'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Usage Report Modal */}
            {showReportModal && selectedPromotion && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">Promotion Report</h3>
                                <p className="text-sm text-gray-600 mt-1">{selectedPromotion.code} - {selectedPromotion.name}</p>
                            </div>
                            <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {/* Report Summary Cards */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <div className="text-sm text-blue-600 font-medium">Total Bookings</div>
                                    <div className="text-2xl font-bold text-blue-900 mt-1">{selectedPromotion.totalBookings || 0}</div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-4">
                                    <div className="text-sm text-green-600 font-medium">Total Discount Given</div>
                                    <div className="text-2xl font-bold text-green-900 mt-1">₹{(selectedPromotion.totalDiscountGiven || 0).toLocaleString()}</div>
                                </div>
                                <div className="bg-purple-50 rounded-lg p-4">
                                    <div className="text-sm text-purple-600 font-medium">Remaining Uses</div>
                                    <div className="text-2xl font-bold text-purple-900 mt-1">
                                        {selectedPromotion.totalUsageLimit ? (selectedPromotion.totalUsageLimit - selectedPromotion.totalBookings) : '∞'}
                                    </div>
                                </div>
                            </div>

                            {/* Promotion Details */}
                            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                                <h4 className="font-semibold text-gray-900">Promotion Details</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-600">Discount:</span>
                                        <span className="ml-2 font-semibold text-gray-900">
                                            {selectedPromotion.discountType === 'percentage' 
                                                ? `${selectedPromotion.discountValue}%` 
                                                : `₹${selectedPromotion.discountValue}`}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Property Type:</span>
                                        <span className="ml-2 font-semibold text-gray-900 capitalize">
                                            {selectedPromotion.propertyType === 'pg_coliving' ? 'PG/Co-living' : selectedPromotion.propertyType}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Valid From:</span>
                                        <span className="ml-2 font-semibold text-gray-900">
                                            {new Date(selectedPromotion.startDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Valid Until:</span>
                                        <span className="ml-2 font-semibold text-gray-900">
                                            {new Date(selectedPromotion.endDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Usage Limit:</span>
                                        <span className="ml-2 font-semibold text-gray-900">
                                            {selectedPromotion.uses} / {selectedPromotion.totalUsageLimit || '∞'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Per User Limit:</span>
                                        <span className="ml-2 font-semibold text-gray-900">
                                            {selectedPromotion.perUserLimit || 'Unlimited'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button 
                                className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                                onClick={() => setShowReportModal(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Coupon Users Modal */}
            {showCouponUsersModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowCouponUsersModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-2xl font-bold text-gray-900">Bookings Using Coupons</h3>
                            <button onClick={() => setShowCouponUsersModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition">Close</button>
                        </div>
                        <div className="p-6">
                            {loadingCouponUsers ? (
                                <div className="text-center py-12">Loading...</div>
                            ) : couponUsers.length === 0 ? (
                                <div className="text-center py-12">No bookings found that used coupons.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-sm font-semibold">Name</th>
                                                <th className="px-4 py-2 text-left text-sm font-semibold">Email</th>
                                                <th className="px-4 py-2 text-left text-sm font-semibold">Actual Price (₹)</th>
                                                <th className="px-4 py-2 text-left text-sm font-semibold">Coupon Code</th>
                                                <th className="px-4 py-2 text-left text-sm font-semibold">Discounted Price (₹)</th>
                                                <th className="px-4 py-2 text-left text-sm font-semibold">Used At</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {couponUsers.map((u) => (
                                                <tr key={u.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">₹{u.actualPrice.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">{u.couponCode}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">₹{u.discountedPrice.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{u.used_at}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Marketing;
