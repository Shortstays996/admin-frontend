import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/apiService';
import * as XLSX from 'xlsx';

const shiftDateByMinutes = (value/*, minutes*/) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d;
};

const shiftMinus530 = (value) => shiftDateByMinutes(value);

const Bookings = () => {
    const [bookings, setBookings] = useState([]);
    const [filteredBookings, setFilteredBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        loadBookings();
    }, []);

    const loadBookings = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await apiService.bookings.getAll();
            setBookings(response.data || []);
        } catch (err) {
            console.error('Failed to load bookings:', err);
            setError('Failed to load bookings. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const filterBookings = useCallback(() => {
        let filtered = [...bookings];

        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(booking =>
                booking.guestName?.toLowerCase().includes(search) ||
                booking.propertyName?.toLowerCase().includes(search) ||
                booking.guestEmail?.toLowerCase().includes(search) ||
                booking.guestPhone?.includes(search)
            );
        }

        if (statusFilter) {
            if (statusFilter === 'completed_or_refund_rejected') {
                filtered = filtered.filter(booking => {
                    const s = (booking.paymentStatus || '').toLowerCase();
                    return s === 'completed' || s === 'refund_rejected';
                });
            } else {
                filtered = filtered.filter(booking =>
                    booking.paymentStatus?.toLowerCase() === statusFilter.toLowerCase()
                );
            }
        }

        if (startDate) {
            filtered = filtered.filter(booking => {
                const bookingDate = shiftMinus530(booking.checkInDate) || new Date(booking.checkInDate);
                const start = new Date(startDate);
                return bookingDate >= start;
            });
        }

        if (endDate) {
            filtered = filtered.filter(booking => {
                const bookingDate = shiftMinus530(booking.checkInDate) || new Date(booking.checkInDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                return bookingDate <= end;
            });
        }

        setFilteredBookings(filtered);
    }, [bookings, searchTerm, statusFilter, startDate, endDate]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCheckInOutDate = (dateString) => {
        if (!dateString) return 'N/A';
        const d = shiftMinus530(dateString) || new Date(dateString);
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount) => {
        return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
    };

    const getStatusBadgeClass = (status) => {
        const normalized = status?.toLowerCase();
        if (normalized === 'confirmed' || normalized === 'completed') {
            return 'badge-confirmed';
        }
        if (normalized === 'refunded') {
            return 'badge-refunded';
        }
        return 'badge-pending';
    };

    const getTotalGuests = (adults, children) => {
        return (Number(adults || 0) + Number(children || 0));
    };

    const getDurationLabel = (booking) => {
        if (!booking) return 'N/A';
        const type = (booking.propertyType || '').toString().toLowerCase();

        const hours = booking.hours !== undefined && booking.hours !== null ? Number(booking.hours) : null;
        const daysField = booking.days !== undefined && booking.days !== null ? Number(booking.days) : null;

        // If check-in and check-out are available, compute days difference as a fallback
        let computedDays = null;
        if (booking.checkInDate && booking.checkOutDate) {
            try {
                const inDate = shiftMinus530(booking.checkInDate) || new Date(booking.checkInDate);
                const outDate = shiftMinus530(booking.checkOutDate) || new Date(booking.checkOutDate);
                const diffMs = outDate - inDate;
                computedDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
            } catch (e) {
                computedDays = null;
            }
        }

        if (type === 'hotel') {
            if (hours) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
            return 'N/A';
        }

        if (type === 'pg_coliving') {
            const d = daysField || computedDays;
            if (d) return `${d} ${d === 1 ? 'day' : 'days'}`;
            return 'N/A';
        }

        if (type === 'resort') {
            // Resorts can be booked for hours or days depending on package
            if (hours === 12) return '12 hours';
            if (hours === 1 || daysField === 1 || computedDays === 1) return '1 day';
            // Prefer hours if present, otherwise days
            if (hours) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
            const d = daysField || computedDays;
            if (d) return `${d} ${d === 1 ? 'day' : 'days'}`;
            return 'N/A';
        }

        // Default fallback: show hours if available else days if available
        if (hours) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
        const d = daysField || computedDays;
        if (d) return `${d} ${d === 1 ? 'day' : 'days'}`;
        return 'N/A';
    };

    const downloadReport = () => {
        if (filteredBookings.length === 0) {
            alert('No bookings to export');
            return;
        }

        const exportData = filteredBookings.map((booking, index) => ({
            'Sr No': index + 1,
            'Booking ID': booking.id,
            'Guest Name': booking.guestName || 'N/A',
            'Email': booking.guestEmail || 'N/A',
            'Phone': booking.guestPhone || 'N/A',
            'Hotel Name': booking.propertyName || 'N/A',
            'Hotel Type': booking.propertyType || 'N/A',
            'Room Type': booking.roomType || 'N/A',
            'Location': booking.propertyLocation || 'N/A',
            'Duration': getDurationLabel(booking),
            'Check-in Date': booking.checkInDate ? (shiftMinus530(booking.checkInDate) || new Date(booking.checkInDate)).toLocaleDateString('en-US') : 'N/A',
            'Check-out Date': booking.checkOutDate ? (shiftMinus530(booking.checkOutDate) || new Date(booking.checkOutDate)).toLocaleDateString('en-US') : 'N/A',
            'Adults': booking.adults || 0,
            'Children': booking.children || 0,
            'Total Guests': getTotalGuests(booking.adults, booking.children),
            'Total Price (₹)': booking.totalPrice || 0,
            'Booking Status': booking.bookingStatus || 'N/A',
            'Payment Status': booking.paymentStatus || 'Pending',
            'Payment Method': booking.paymentMethod || 'N/A',
            'Booked On': booking.createdAt ? new Date(booking.createdAt).toLocaleString('en-US') : 'N/A'
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Bookings');

        // Set column widths
        const columnWidths = [
            { wch: 8 },  // Sr No
            { wch: 12 }, // Booking ID
            { wch: 20 }, // Guest Name
            { wch: 25 }, // Email
            { wch: 15 }, // Phone
            { wch: 25 }, // Hotel Name
            { wch: 15 }, // Hotel Type
            { wch: 15 }, // Room Type
            { wch: 25 }, // Location
            { wch: 12 }, // Duration
            { wch: 15 }, // Check-in
            { wch: 15 }, // Check-out
            { wch: 10 }, // Adults
            { wch: 10 }, // Children
            { wch: 12 }, // Total Guests
            { wch: 15 }, // Total Price
            { wch: 15 }, // Booking Status
            { wch: 15 }, // Payment Status
            { wch: 15 }, // Payment Method
            { wch: 20 }  // Booked On
        ];
        worksheet['!cols'] = columnWidths;

        const dateRange = startDate || endDate ? `_${startDate || 'start'}_to_${endDate || 'end'}` : '';
        const fileName = `Bookings_Report${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        XLSX.writeFile(workbook, fileName);
    };

    useEffect(() => {
        filterBookings();
    }, [filterBookings]);

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading bookings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container lg:!p-4 !p-2">
            {/* heading, refresh and download */}
            <div className="page-header ">
                <div>
                    <h2>All Bookings</h2>
                    <p>View and manage all hotel bookings</p>
                </div>

                <div className="header-actions ">
                    <div className="date-filter-header">
                        <label>FROM:</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="date-input-header"
                        />
                    </div>
                    <div className="date-filter-header">
                        <label>TO:</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="date-input-header"
                        />
                    </div>
                    <button onClick={downloadReport} className="btn-download">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{marginRight: '0.5rem'}}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download Report
                    </button>
                    <button onClick={loadBookings} className="btn-refresh">
                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-banner">
                    ❌ {error}
                    <button onClick={loadBookings} className="retry-button">
                        Retry
                    </button>
                </div>
            )}

            {/* search and filters */}
            <div className="filters-section">
                <div className="filter-group">
                    <input
                        type="text"
                        placeholder="Search by guest name, hotel, email, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="filter-group">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">All Payment Status</option>
                        <option value="failed">Failed</option>
                        <option value="completed_or_refund_rejected">Completed / Refund Rejected</option>
                        <option value="refund_success">Refunded</option>
                    </select>
                </div>

                {(searchTerm || statusFilter || startDate || endDate) && (
                    <button
                        onClick={() => { setSearchTerm(''); setStatusFilter(''); setStartDate(''); setEndDate(''); }}
                        className="btn-clear-filters"
                    >
                        Clear Filters
                    </button>
                )}
            </div>
            
            {/* cards */}
            <div className="stats-cards !grid !grid-cols-1 md:!grid-cols-2 xl:!grid-cols-4">
                <div className="stat-card">
                    <h3>Total Bookings</h3>
                    <p className="stat-value md:!text-4xl !text-2xl">{filteredBookings.length}</p>
                </div>
                <div className="stat-card">
                    <h3>Total Revenue</h3>
                    <p className="stat-value md:!text-4xl !text-2xl">
                        {formatCurrency(filteredBookings.filter(b => b.paymentStatus?.toLowerCase() !== 'failed' && b.paymentStatus?.toLowerCase() !== 'refund_success').reduce((sum, b) => sum + Number(b.totalPrice || 0), 0))}
                    </p>
                </div>
                <div className="stat-card">
                    <h3>Confirmed</h3>
                    <p className="stat-value md:!text-4xl !text-2xl confirmed">
                        {filteredBookings.filter(b => ['completed','refund_rejected', 'refund_initiated', 'refund_progress'].includes((b.paymentStatus || '').toLowerCase())).length}
                    </p>
                </div>
                <div className="stat-card">
                    <h3>Refunded</h3>
                    <p className="stat-value md:!text-4xl !text-2xl refunded">
                        {filteredBookings.filter(b => b.paymentStatus?.toLowerCase() === 'refund_success' || b.paymentStatus?.toLowerCase() === 'refunded').length}
                    </p>
                </div>
            </div>
            
            {/* bookings table */}
            <div className="bookings-table-container">
                <table className="bookings-table">
                    <thead>
                        <tr>
                            <th>Booking ID</th>
                            <th>Guest Name</th>
                            <th>Contact</th>
                            <th>Hotel Name</th>
                            <th>Guests</th>
                            <th>Total Price</th>
                            <th>Payment Status</th>
                            <th>Check-in</th>
                            <th>Actions</th>
                        </tr>
                    </thead>

                    {/* body */}
                    <tbody>
                        {filteredBookings.length === 0 ? (
                            <tr>
                                <td colSpan="9" className="empty-state">
                                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem'}}>
                                        <div style={{fontSize: '2rem'}}>📭</div>
                                        <div className="empty-title" style={{fontWeight: 700, color: '#374151'}}>No bookings to display</div>
                                        <div className="empty-desc" style={{color: '#6b7280', textAlign: 'center', maxWidth: '60%'}}>
                                            {bookings.length === 0
                                                ? 'There are currently no bookings in the system.'
                                                : 'No bookings match the current filters. Try clearing filters or adjusting the date range.'}
                                        </div>
                                        <div className="empty-actions" style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                                            {(searchTerm || statusFilter || startDate || endDate) && (
                                                <button
                                                    onClick={() => { setSearchTerm(''); setStatusFilter(''); setStartDate(''); setEndDate(''); }}
                                                    className="empty-button"
                                                    style={{padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', background: '#fff'}}
                                                >
                                                    Clear filters
                                                </button>
                                            )}
                                            <button
                                                onClick={loadBookings}
                                                className="empty-button"
                                                style={{padding: '0.5rem 0.75rem', borderRadius: '0.375rem', background: '#3b82f6', color: '#fff', border: 'none'}}
                                            >
                                                Refresh
                                            </button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredBookings.map((booking) => (
                                <tr key={booking.id}>
                                    <td className="booking-id">#{String(booking.id || '').substring(0, 8)}</td>
                                    <td className="guest-name">{booking.guestName || 'N/A'}</td>
                                    <td className="contact-info">
                                        <div>{booking.guestPhone || 'N/A'}</div>
                                        <div className="email">{booking.guestEmail || 'N/A'}</div>
                                    </td>
                                    <td className="property-name">{booking.propertyName || 'N/A'}</td>
                                    <td className="guests-count">
                                        <div className="guests-badge">
                                            👥 {getTotalGuests(booking.adults, booking.children)}
                                        </div>
                                        <div className="guests-detail">
                                            {booking.adults || 0} Adults, {booking.children || 0} Children
                                        </div>
                                    </td>
                                    <td className="price">{formatCurrency(booking.totalPrice)}</td>
                                    <td>
                                        <span className={`status-badge ${getStatusBadgeClass(booking.paymentStatus)}`}>
                                            {booking.paymentStatus || 'Pending'}
                                        </span>
                                    </td>
                                    <td className="date">{formatCheckInOutDate(booking.checkInDate)}</td>
                                    <td>
                                        <button
                                            onClick={() => setSelectedBooking(booking)}
                                            className="btn-view"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* booking details modal */}
            {selectedBooking && (
                <div className="modal-overlay" onClick={() => setSelectedBooking(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Booking Details</h3>
                            <button onClick={() => setSelectedBooking(null)} className="close-button">
                                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* body */}
                        <div className="modal-body">
                            {/* Guest Information */}
                            <div className="detail-section">
                                <h4>Guest Information</h4>
                                <table className="info-table">
                                    <tbody>
                                        <tr>
                                            <td><strong>Name:</strong></td>
                                            <td>{selectedBooking.guestName || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Email:</strong></td>
                                            <td>{selectedBooking.guestEmail || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Phone:</strong></td>
                                            <td>{selectedBooking.guestPhone || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Adults:</strong></td>
                                            <td>{selectedBooking.adults || 0}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Children:</strong></td>
                                            <td>{selectedBooking.children || 0}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Total Guests:</strong></td>
                                            <td>{getTotalGuests(selectedBooking.adults, selectedBooking.children)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Booking Information */}
                            <div className="detail-section">
                                <h4>Booking Information</h4>
                                <table className="info-table">
                                    <tbody>
                                        <tr>
                                            <td><strong>Booking ID:</strong></td>
                                            <td>#{selectedBooking.id}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Booking Status:</strong></td>
                                            <td>{selectedBooking.bookingStatus || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Hotel Name:</strong></td>
                                            <td>{selectedBooking.propertyName || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Hotel Type:</strong></td>
                                            <td>{selectedBooking.propertyType || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Hotel Location:</strong></td>
                                            <td>{selectedBooking.propertyLocation || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Room Type:</strong></td>
                                            <td>{selectedBooking.roomType || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Check-in:</strong></td>
                                            <td>{formatCheckInOutDate(selectedBooking.checkInDate)}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Check-out:</strong></td>
                                            <td>{formatCheckInOutDate(selectedBooking.checkOutDate)}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Duration:</strong></td>
                                            <td>{getDurationLabel(selectedBooking)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Payment Information */}
                            <div className="detail-section">
                                <h4>Payment Breakdown</h4>
                                <table className="info-table">
                                    <tbody>
                                        <tr>
                                            <td><strong>Base Price (Partner Revenue):</strong></td>
                                            <td>{formatCurrency(selectedBooking.basePrice || 0)}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Commission Amount:</strong></td>
                                            <td>{formatCurrency(selectedBooking.commissionAmount || 0)}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Extra Marketing Charges:</strong></td>
                                            <td>{formatCurrency(selectedBooking.extraMarketingCharges || 0)}</td>
                                        </tr>
                                        <tr style={{borderTop: '2px solid #e5e7eb'}}>
                                            <td><strong>Customer Base Price:</strong></td>
                                            <td><strong>{formatCurrency((Number(selectedBooking.basePrice || 0) + Number(selectedBooking.commissionAmount || 0) + Number(selectedBooking.extraMarketingCharges || 0)))}</strong></td>
                                        </tr>
                                        <tr>
                                            <td><strong>GST Amount:</strong></td>
                                            <td>{formatCurrency(selectedBooking.gstAmount || 0)}</td>
                                        </tr>
                                        <tr style={{borderTop: '2px solid #e5e7eb'}}>
                                            <td><strong>Total Price (Before Discount):</strong></td>
                                            <td><strong>{formatCurrency((Number(selectedBooking.basePrice || 0) + Number(selectedBooking.commissionAmount || 0) + Number(selectedBooking.extraMarketingCharges || 0) + Number(selectedBooking.gstAmount || 0)))}</strong></td>
                                        </tr>
                                        {selectedBooking.couponValue && Number(selectedBooking.couponValue) > 0 && (
                                            <>
                                                <tr style={{background: '#fef3c7'}}>
                                                    <td><strong>Coupon Discount Applied:</strong></td>
                                                    <td style={{color: '#16a34a', fontWeight: 600}}>- {formatCurrency(selectedBooking.couponValue)}</td>
                                                </tr>
                                                {selectedBooking.couponCode && (
                                                    <tr style={{background: '#fef3c7'}}>
                                                        <td><strong>Coupon Code:</strong></td>
                                                        <td style={{fontFamily: 'monospace', fontWeight: 600, color: '#d97706'}}>{selectedBooking.couponCode}</td>
                                                    </tr>
                                                )}
                                            </>
                                        )}
                                        <tr style={{borderTop: '3px solid #d11528', background: '#fef2f2'}}>
                                            <td><strong style={{fontSize: '1.05rem'}}>Final Amount Paid:</strong></td>
                                            <td className="price-highlight" style={{fontSize: '1.25rem'}}>{formatCurrency((Number(selectedBooking.basePrice || 0) + Number(selectedBooking.commissionAmount || 0) + Number(selectedBooking.extraMarketingCharges || 0) + Number(selectedBooking.gstAmount || 0) - Number(selectedBooking.couponValue || 0)))}</td>
                                        </tr>
                                        <tr style={{borderTop: '2px solid #e5e7eb'}}>
                                            <td><strong>Payment Status:</strong></td>
                                            <td>
                                                <span className={`status-badge ${getStatusBadgeClass(selectedBooking.paymentStatus)}`}>
                                                    {selectedBooking.paymentStatus || 'Completed'}
                                                </span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>Booked On:</strong></td>
                                            <td>{formatDate(selectedBooking.createdAt)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Refund Information - Only show if refund_success */}
                            {(selectedBooking.paymentStatus?.toLowerCase() === 'refund_success' || selectedBooking.paymentStatus?.toLowerCase() === 'refunded') && (
                                <div className="detail-section" style={{background: '#fef2f2', padding: '1.5rem', borderRadius: '0.5rem'}}>
                                    <h4 style={{color: '#dc2626'}}>Refund Information</h4>
                                    <table className="info-table">
                                        <tbody>
                                            <tr>
                                                <td><strong>Original Booking Amount:</strong></td>
                                                <td>{formatCurrency(selectedBooking.totalPrice || 0)}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Refunded Amount:</strong></td>
                                                <td style={{color: '#16a34a', fontWeight: 700, fontSize: '1.1rem'}}>
                                                    {formatCurrency(selectedBooking.refundedAmount || 0)}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td><strong>Refund Percentage:</strong></td>
                                                <td style={{fontWeight: 600}}>
                                                    <span style={{
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '0.375rem',
                                                        background: selectedBooking.refundPercentage === 100 ? '#d1fae5' : 
                                                                   selectedBooking.refundPercentage === 50 ? '#fef3c7' : 
                                                                   selectedBooking.refundPercentage === 25 ? '#fed7aa' : '#fee2e2',
                                                        color: selectedBooking.refundPercentage === 100 ? '#065f46' : 
                                                              selectedBooking.refundPercentage === 50 ? '#92400e' : 
                                                              selectedBooking.refundPercentage === 25 ? '#9a3412' : '#991b1b'
                                                    }}>
                                                        {selectedBooking.refundPercentage || 0}%
                                                    </span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td><strong>Remaining Amount (Not Refunded):</strong></td>
                                                <td style={{color: '#dc2626', fontWeight: 600}}>
                                                    {formatCurrency(selectedBooking.remainingAmount || 0)}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td><strong>Booking Cancelled On:</strong></td>
                                                <td style={{fontWeight: 600}}>{formatDate(selectedBooking.updatedAt)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .page-container {
                    padding: 20px;
                    background: #f8fafc;
                    min-height: 100vh;
                }

                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem;
                    color: #6b7280;
                }

                .loading-spinner {
                    width: 50px;
                    height: 50px;
                    border: 4px solid #e5e7eb;
                    border-top-color: #d11528;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 1rem;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }

                .page-header h2 {
                    font-size: 1.875rem;
                    font-weight: bold;
                    color: #1e293b;
                    margin: 0 0 0.5rem 0;
                }

                .page-header p {
                    color: #6b7280;
                    margin: 0;
                }

                .header-actions {
                    display: flex;
                    gap: 0.75rem;
                    align-items: flex-end;
                }

                .date-filter-header {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .date-filter-header label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #6b7280;
                    text-transform: uppercase;
                }

                .date-input-header {
                    padding: 0.625rem 1rem;
                    border: 1px solid #d1d5db;
                    border-radius: 0.5rem;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                    min-width: 180px;
                }

                .date-input-header:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .btn-download {
                    padding: 0.625rem 1.25rem;
                    background: #10b981;
                    color: white;
                    border: none;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    font-weight: 600;
                    transition: background-color 0.2s;
                    display: flex;
                    align-items: center;
                }

                .btn-download:hover {
                    background: #059669;
                }

                .btn-refresh {
                    padding: 0.625rem 1.25rem;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    font-weight: 600;
                    transition: background-color 0.2s;
                }

                .btn-refresh:hover {
                    background: #2563eb;
                }

                .error-banner {
                    background: #fee2e2;
                    border: 1px solid #fecaca;
                    color: #dc2626;
                    padding: 1rem;
                    border-radius: 0.5rem;
                    margin-bottom: 1.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .retry-button {
                    padding: 0.5rem 1rem;
                    background: #dc2626;
                    color: white;
                    border: none;
                    border-radius: 0.375rem;
                    cursor: pointer;
                    font-weight: 500;
                }

                .filters-section {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 2rem;
                    flex-wrap: wrap;
                }

                .filter-group {
                    flex: 1;
                    min-width: 200px;
                    display: flex;
                    flex-direction: column;
                }

                .filter-group.date-filter {
                    flex: 0 1 220px;
                    min-width: 220px;
                }

                .filter-group.date-filter label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #6b7280;
                    text-transform: uppercase;
                    margin-bottom: 0.5rem;
                }

                .date-input {
                    width: 100%;
                    padding: 0.625rem 1rem;
                    border: 1px solid #d1d5db;
                    border-radius: 0.5rem;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                }

                .date-input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .search-input,
                .filter-select {
                    width: 100%;
                    padding: 0.625rem 1rem;
                    border: 1px solid #d1d5db;
                    border-radius: 0.5rem;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                }

                .search-input:focus,
                .filter-select:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .btn-clear-filters {
                    padding: 0.625rem 1rem;
                    background: #f3f4f6;
                    color: #6b7280;
                    border: 1px solid #d1d5db;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                }

                .btn-clear-filters:hover {
                    background: #e5e7eb;
                }

                .stats-cards {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }

                .stat-card {
                    background: white;
                    padding: 1.5rem;
                    border-radius: 0.75rem;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    border-left: 4px solid #3b82f6;
                }

                .stat-card h3 {
                    font-size: 0.875rem;
                    color: #6b7280;
                    margin: 0 0 0.5rem 0;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .stat-value {
                    font-size: 1.875rem;
                    font-weight: bold;
                    color: #1e293b;
                    margin: 0;
                }

                .stat-value.confirmed {
                    color: #10b981;
                }

                .stat-value.refunded {
                    color: #ef4444;
                }

                .bookings-table-container {
                    background: white;
                    border-radius: 0.75rem;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    overflow-x: auto;
                }

                .bookings-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .bookings-table thead {
                    background: #f9fafb;
                    border-bottom: 2px solid #e5e7eb;
                }

                .bookings-table th {
                    padding: 1rem;
                    text-align: left;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .bookings-table td {
                    padding: 1rem;
                    border-bottom: 1px solid #f3f4f6;
                    font-size: 0.875rem;
                    color: #374151;
                }

                .bookings-table tbody tr:hover {
                    background: #f9fafb;
                }

                .booking-id {
                    font-family: monospace;
                    font-weight: 600;
                    color: #6b7280;
                }

                .guest-name {
                    font-weight: 600;
                    color: #1e293b;
                }

                .contact-info {
                    line-height: 1.6;
                }

                .contact-info .email {
                    font-size: 0.75rem;
                    color: #6b7280;
                }

                .property-name {
                    font-weight: 500;
                }

                .guests-count {
                    text-align: center;
                }

                .guests-badge {
                    display: inline-block;
                    padding: 0.25rem 0.75rem;
                    background: #dbeafe;
                    color: #1e40af;
                    border-radius: 0.375rem;
                    font-size: 0.875rem;
                    font-weight: 600;
                    margin-bottom: 0.25rem;
                }

                .guests-detail {
                    font-size: 0.75rem;
                    color: #6b7280;
                }

                .price {
                    font-weight: 700;
                    color: #d11528;
                    font-size: 1rem;
                }

                .status-badge {
                    display: inline-block;
                    padding: 0.375rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: capitalize;
                }

                .badge-confirmed {
                    background: #d1fae5;
                    color: #065f46;
                }

                .badge-refunded {
                    background: #fee2e2;
                    color: #991b1b;
                }

                .badge-pending {
                    background: #fef3c7;
                    color: #92400e;
                }

                .date {
                    color: #6b7280;
                    font-size: 0.8125rem;
                }

                .btn-view {
                    padding: 0.5rem 1rem;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 0.375rem;
                    cursor: pointer;
                    font-size: 0.875rem;
                    font-weight: 500;
                    transition: all 0.2s;
                }

                .btn-view:hover {
                    background: #2563eb;
                }

                .empty-state {
                    text-align: center;
                    padding: 3rem;
                    color: #9ca3af;
                    font-style: italic;
                }

                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                    z-index: 50;
                }

                .modal-content {
                    background: white;
                    border-radius: 0.75rem;
                    max-width: 700px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    padding: 0;
                }

                .modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1.5rem;
                    border-bottom: 1px solid #e5e7eb;
                    position: sticky;
                    top: 0;
                    background: white;
                    z-index: 10;
                }

                .modal-header h3 {
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: #1e293b;
                    margin: 0;
                }

                .close-button {
                    background: none;
                    border: none;
                    color: #9ca3af;
                    cursor: pointer;
                    padding: 0;
                    display: flex;
                }

                .close-button:hover {
                    color: #6b7280;
                }

                .modal-body {
                    padding: 1.5rem;
                }

                .detail-section {
                    margin-bottom: 2rem;
                    padding-bottom: 1.5rem;
                    border-bottom: 1px solid #f3f4f6;
                }

                .detail-section:last-child {
                    border-bottom: none;
                    margin-bottom: 0;
                }

                .detail-section h4 {
                    font-size: 1rem;
                    font-weight: 600;
                    color: #1e293b;
                    margin: 0 0 1rem 0;
                }

                .info-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .info-table td {
                    padding: 0.75rem;
                    border-bottom: 1px solid #f3f4f6;
                    font-size: 0.875rem;
                }

                .info-table td:first-child {
                    width: 40%;
                    color: #6b7280;
                }

                .info-table td:last-child {
                    color: #374151;
                }

                .info-table tr:last-child td {
                    border-bottom: none;
                }

                .price-highlight {
                    font-size: 1.125rem;
                    font-weight: 700;
                    color: #d11528;
                }

                @media (max-width: 1024px) {
                    .page-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1rem;
                    }

                    .header-actions {
                        width: 100%;
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .date-filter-header {
                        width: 100%;
                    }

                    .date-input-header {
                        width: 100%;
                        min-width: 100%;
                    }

                    .btn-download,
                    .btn-refresh {
                        width: 100%;
                        justify-content: center;
                    }

                    .filters-section {
                        flex-direction: column;
                    }

                    .stats-cards {
                        grid-template-columns: repeat(2, 1fr);
                    }

                    .bookings-table {
                        font-size: 0.75rem;
                    }

                    .bookings-table th,
                    .bookings-table td {
                        padding: 0.5rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default Bookings;
