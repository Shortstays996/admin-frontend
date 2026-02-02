
import { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import * as XLSX from 'xlsx';

const Commission = () => {
    const [commissionData, setCommissionData] = useState([]);
    const [summary, setSummary] = useState({
        totalCommission: 0,
        totalBookings: 0,
        totalRevenue: 0,
        averageRate: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingHotel, setEditingHotel] = useState(null);
    const [newRate, setNewRate] = useState('');
    const [editingMarketing, setEditingMarketing] = useState(null);
    const [newMarketingCharge, setNewMarketingCharge] = useState('');
    const [editingGst, setEditingGst] = useState(null);
    const [newGst, setNewGst] = useState('');
    const [viewingHotel, setViewingHotel] = useState(null);

    useEffect(() => {
        loadCommissionData();
    }, []);

    const loadCommissionData = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await apiService.commission.getData();
            setCommissionData(response.data.hotels || []);
            setSummary(response.data.summary || {
                totalCommission: 0,
                totalBookings: 0,
                totalRevenue: 0,
                averageRate: 0
            });
        } catch (err) {
            console.error('Failed to load commission data:', err);
            setError('Failed to load commission data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const exportCommissionData = () => {
        if (!commissionData || commissionData.length === 0) {
            alert('No commission data to export');
            return;
        }

        const rows = commissionData.map((item, idx) => {
            const partnerRevenue = Number(item.partnerRevenue ?? item.revenue ?? 0);
            const commissionRate = Number(item.commissionRate || 0);
            const commissionAmount = Number(item.commissionAmount || 0);
            const bookings = Number(item.bookings || 0);
            const extraMarketingPerBooking = Number(item.extraMarketingCharges || 0);
            const extraMarketingTotal = Number(item.extraMarketing || 0);
            const gstRate = Number(item.gst || 18);
            const gstAmount = Number(item.gstAmount || 0);
            const customerBasePrice = Number(item.customerBasePrice || 0);
            const customerPaid = Number(item.customerPaid || 0);
            const adminCouponApplied = Number(item.adminCouponDiscountTotal ?? 0);
            const hotelCouponApplied = Number(item.hotelCouponDiscountTotal ?? 0);
            const totalCouponApplied = adminCouponApplied + hotelCouponApplied;

            // Admin profit = commission + gstAmount + extraMarketing - adminCoupon
            const adminProfit = Number(item.totalCommission || 0);
            const amountToPayPartner = partnerRevenue;
            const updatedAtRaw = item.updatedAt ?? item.updated_at ?? item.updatedAtText ?? item.updatedAtDate;
            const updatedAt = formatDateTime(updatedAtRaw, { emptyValue: '' });

            return {
                'Sr No': idx + 1,
                'Hotel ID': item.id || '',
                'Hotel Name': item.hotelName || item.name || 'N/A',
                'Location': item.location || 'N/A',
                'Bookings': bookings,
                'Partner Revenue (₹)': partnerRevenue,
                'Commission Rate (%)': commissionRate,
                'Commission Amount (₹)': commissionAmount,
                'Extra Marketing / Booking (₹)': extraMarketingPerBooking,
                'Extra Marketing Total (₹)': extraMarketingTotal,
                'Customer Base Price (₹)': customerBasePrice,
                'GST Rate (%)': gstRate,
                'GST Amount (₹)': gstAmount,
                'Customer Paid (₹)': customerPaid,
                'Admin Coupon Applied (₹)': adminCouponApplied,
                'Hotel/PG/Resort Coupon Applied (₹)': hotelCouponApplied,
                'Amount to Pay Partner (₹)': amountToPayPartner,
                'Admin Profit (₹)': adminProfit,
                'Updated At': updatedAt
            };
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Commission');

        const fileName = `Commission_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    const handleEditRate = (hotel) => {
        setEditingHotel(hotel.id);
        setNewRate(hotel.commissionRate.toString());
    };

    const handleSaveRate = async (hotelId) => {
        const rate = parseFloat(newRate);
        
        if (isNaN(rate) || rate < 0 || rate > 100) {
            alert('Please enter a valid commission rate between 0 and 100');
            return;
        }

        try {
            await apiService.commission.updateRate(hotelId, rate);
            setEditingHotel(null);
            setNewRate('');
            loadCommissionData();
        } catch (err) {
            console.error('Failed to update commission rate:', err);
            alert('Failed to update commission rate. Please try again.');
        }
    };

    const handleCancelEdit = () => {
        setEditingHotel(null);
        setNewRate('');
    };

    const handleEditMarketing = (hotel) => {
        setEditingMarketing(hotel.id);
        setNewMarketingCharge((hotel.extraMarketingCharges || 0).toString());
    };

    const handleSaveMarketing = async (hotelId) => {
        const charge = parseFloat(newMarketingCharge);
        
        if (isNaN(charge) || charge < 0) {
            alert('Please enter a valid marketing charge (0 or positive number)');
            return;
        }

        try {
            await apiService.commission.updateMarketingCharge(hotelId, charge);
            setEditingMarketing(null);
            setNewMarketingCharge('');
            loadCommissionData();
            setViewingHotel(false);
        } catch (err) {
            console.error('Failed to update marketing charge:', err);
            alert('Failed to update marketing charge. Please try again.');
        }
    };

    const handleCancelMarketing = () => {
        setEditingMarketing(null);
        setNewMarketingCharge('');
    };

    const handleEditGst = (hotel) => {
        setEditingGst(hotel.id);
        setNewGst((hotel.gst || 18).toString());
    };

    const handleSaveGst = async (hotelId) => {
        const gst = parseFloat(newGst);
        
        if (isNaN(gst) || gst < 0 || gst > 100) {
            alert('Please enter a valid GST rate between 0 and 100');
            return;
        }

        try {
            await apiService.commission.updateGst(hotelId, gst);
            setEditingGst(null);
            setNewGst('');
            loadCommissionData();
            setViewingHotel(false);
        } catch (err) {
            console.error('Failed to update GST:', err);
            alert('Failed to update GST. Please try again.');
        }
    };

    const handleCancelGst = () => {
        setEditingGst(null);
        setNewGst('');
    };

    const calculateDetails = (item) => {
        const partnerRevenue = Number(item.partnerRevenue ?? item.revenue ?? 0);
        const commissionRate = Number(item.commissionRate || 0);
        const commissionAmount = Number(item.commissionAmount || 0);
        const extraMarketingPerBooking = Number(item.extraMarketingCharges || 0);
        const extraMarketingTotal = Number(item.extraMarketing || 0);
        const gstRate = Number(item.gst || 18);
        const gstAmount = Number(item.gstAmount || 0);
        const customerBasePrice = Number(item.customerBasePrice || 0);
        const customerPaid = Number(item.customerPaid || 0);
        const adminCouponApplied = Number(item.adminCouponDiscountTotal ?? 0);
        const hotelCouponApplied = Number(item.hotelCouponDiscountTotal ?? 0);
        const totalCouponApplied = adminCouponApplied + hotelCouponApplied;
        const amountToPayPartner = partnerRevenue;
        const adminProfit = Number(item.totalCommission || 0);
        const profitFromRefund = Number(item.remainingAmount || item.profitFromRefund || 0);

        return {
            partnerRevenue,
            commissionAmount,
            extraMarketingPerBooking,
            extraMarketingTotal,
            customerBasePrice,
            gstRate,
            gstAmount,
            customerPaid,
            adminCouponApplied,
            hotelCouponApplied,
            amountToPayPartner,
            adminProfit,
            profitFromRefund
        };
    };

    const formatCurrency = (amount) => {
        return `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDateTime = (value, options = {}) => {
        const emptyValue = options.emptyValue ?? '—';
        if (!value) return emptyValue;

        // Parse whatever comes in to a Date object
        let date = new Date(value);
        
        if (Number.isNaN(date.getTime())) return emptyValue;

        const adjusted = new Date(date.getTime());

        // Format as d/m/yyyy, h:mm:ss am/pm
        const day = adjusted.getDate();
        const month = adjusted.getMonth() + 1;
        const year = adjusted.getFullYear();
        const minutes = String(adjusted.getMinutes()).padStart(2, '0');
        const seconds = String(adjusted.getSeconds()).padStart(2, '0');

        let hours = adjusted.getHours();
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        if (hours === 0) hours = 12;

        return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl">
            <div className="mb-8">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="xl:text-3xl md:text-2xl text-xl font-bold text-gray-900">Commission Management</h2>
                        <p className="text-sm md:text-base text-gray-600 mt-2">Track commission earnings from hotels and locations</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={loadCommissionData} className="md:px-3 md:py-2 p-1.5 md:text-base text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Refresh</button>
                        <button onClick={exportCommissionData} className="md:px-3 md:py-2 p-1.5 md:text-base text-sm bg-green-600 text-white rounded hover:bg-green-700">Export</button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                    <button onClick={loadCommissionData} className="ml-4 underline">
                        Retry
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Total Commission</h3>
                    <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary.totalCommission)}</p>
                    <span className="text-sm text-gray-500">All Time</span>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Total Revenue</h3>
                    <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary.totalRevenue)}</p>
                    <span className="text-sm text-gray-500">From bookings</span>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Average Rate</h3>
                    <p className="text-3xl font-bold text-gray-900">{summary.averageRate}%</p>
                    <span className="text-sm text-gray-500">Across all hotels</span>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Total Bookings</h3>
                    <p className="text-3xl font-bold text-gray-900">{summary.totalBookings}</p>
                    <span className="text-sm text-gray-500">Confirmed/Completed</span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Hotel Name</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Location</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Bookings</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Rate (%)</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Updated At</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {commissionData.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        No commission data available
                                    </td>
                                </tr>
                            ) : (
                                commissionData.map((item) => {
                                    const details = calculateDetails(item);
                                    const updatedAtRaw = item.updatedAt ?? item.updated_at ?? item.updatedAtText ?? item.updatedAtDate;
                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">{item.hotelName}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{item.location}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900">{item.bookings}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {editingHotel === item.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={newRate}
                                                            onChange={(e) => setNewRate(e.target.value)}
                                                            min="0"
                                                            max="100"
                                                            step="0.1"
                                                            className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                                                        />
                                                        <span>%</span>
                                                    </div>
                                                ) : (
                                                    <span>{item.commissionRate}%</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {formatDateTime(updatedAtRaw)}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        onClick={() => setViewingHotel(item)}
                                                        className="px-3 py-1 bg-gray-900 text-white rounded hover:bg-gray-800 transition text-xs"
                                                    >
                                                        View Details
                                                    </button>
                                                    {editingHotel === item.id ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleSaveRate(item.id)}
                                                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-xs"
                                                            >
                                                                Save Rate
                                                            </button>
                                                            <button
                                                                onClick={handleCancelEdit}
                                                                className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition text-xs"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleEditRate(item)}
                                                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-xs"
                                                        >
                                                            Edit Rate
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {viewingHotel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setViewingHotel(null)}
                    />

                    <div className="relative w-full max-w-4xl h-[70vh] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                        <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-200">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Payment Details</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    {viewingHotel.hotelName} • {viewingHotel.location}
                                </p>
                            </div>

                            <button
                                onClick={() => setViewingHotel(null)}
                                className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition text-sm"
                            >
                                Close
                            </button>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto">
                            {(() => {
                                const details = calculateDetails(viewingHotel);
                                const updatedAtRaw = viewingHotel.updatedAt ?? viewingHotel.updated_at ?? viewingHotel.updatedAtText ?? viewingHotel.updatedAtDate;
                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <div className="text-sm text-gray-600">Partner Revenue</div>
                                            <div className="text-lg font-semibold text-gray-900">{formatCurrency(details.partnerRevenue)}</div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <div className="text-sm text-gray-600">Commission</div>
                                            <div className="text-lg font-semibold text-gray-900">{formatCurrency(details.commissionAmount)}</div>
                                            {/* <div className="text-sm text-gray-600 mt-1">Rate: {Number(viewingHotel.commissionRate || 0)}%</div> */}
                                        </div>

                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <div className="text-sm text-gray-600">Extra Marketing / Booking</div>
                                            <div className="text-lg font-semibold text-gray-900">{formatCurrency(details.extraMarketingPerBooking)}</div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <div className="text-sm text-gray-600">Extra Marketing Total</div>
                                            <div className="text-lg font-semibold text-gray-900">{formatCurrency(details.extraMarketingTotal)}</div>
                                        </div>

                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <div className="text-sm text-gray-600">Customer Base Price</div>
                                            <div className="text-lg font-semibold text-gray-900">{formatCurrency(details.customerBasePrice)}</div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <div className="text-sm text-gray-600">GST</div>
                                            <div className="text-lg font-semibold text-gray-900">{formatCurrency(details.gstAmount)}</div>
                                            {/* <div className="text-sm text-gray-600 mt-1">Rate: {details.gstRate}%</div> */}
                                        </div>

                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <div className="text-sm text-gray-600">Customer Paid</div>
                                            <div className="text-lg font-semibold text-gray-900">{formatCurrency(details.customerPaid)}</div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <div className="text-sm text-gray-600">Coupons Applied</div>
                                            <div className="text-sm text-gray-700 mt-1">Admin Coupon: <span className="font-semibold">{formatCurrency(details.adminCouponApplied)}</span></div>
                                            <div className="text-sm text-gray-700">Hotel/PG/Resort Coupon: <span className="font-semibold">{formatCurrency(details.hotelCouponApplied)}</span></div>
                                        </div>

                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <div className="text-sm text-gray-600">Amount to Pay Partner</div>
                                            <div className="text-lg font-semibold text-gray-900">{formatCurrency(details.amountToPayPartner)}</div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <div className="text-sm text-gray-600">Admin Profit</div>
                                            <div className="text-lg font-semibold text-gray-900">{formatCurrency(details.adminProfit)}</div>
                                            <div className="text-xs text-gray-500 mt-1">Commission + GST + Marketing - Coupons + Refund Profit</div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <div className="text-sm text-gray-600">Profit from Refund</div>
                                            <div className="text-lg font-semibold text-green-700">{formatCurrency(details.profitFromRefund)}</div>
                                        </div>

                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <div className="text-sm text-gray-600">Updated At</div>
                                            <div className="text-sm font-semibold text-gray-900 mt-1">{formatDateTime(updatedAtRaw)}</div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="p-6 border-t border-gray-200">
                            <div className="flex flex-wrap gap-2">
                                {editingMarketing === viewingHotel.id ? (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <input
                                            type="number"
                                            value={newMarketingCharge}
                                            onChange={(e) => setNewMarketingCharge(e.target.value)}
                                            min="0"
                                            step="0.01"
                                            className="w-32 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                                        />
                                        <button
                                            onClick={() => handleSaveMarketing(viewingHotel.id)}
                                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-xs"
                                        >
                                            Save Marketing
                                        </button>
                                        <button
                                            onClick={handleCancelMarketing}
                                            className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition text-xs"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleEditMarketing(viewingHotel)}
                                        className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition text-xs"
                                    >
                                        Edit Marketing
                                    </button>
                                )}

                                {editingGst === viewingHotel.id ? (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <input
                                            type="number"
                                            value={newGst}
                                            onChange={(e) => setNewGst(e.target.value)}
                                            min="0"
                                            max="100"
                                            step="0.1"
                                            className="w-28 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                                        />
                                        <button
                                            onClick={() => handleSaveGst(viewingHotel.id)}
                                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-xs"
                                        >
                                            Save GST
                                        </button>
                                        <button
                                            onClick={handleCancelGst}
                                            className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition text-xs"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleEditGst(viewingHotel)}
                                        className="px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 transition text-xs"
                                    >
                                        Edit GST
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Commission;
