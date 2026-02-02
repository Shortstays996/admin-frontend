import React, { useEffect, useState } from 'react';
import apiService from '../services/apiService';

const UserSupport = () => {
    const [activeTab, setActiveTab] = useState('complaints');
    const [selectedTicket, setSelectedTicket] = useState(null); // { kind: 'complaint'|'refund', ...data }
    const [complaints, setComplaints] = useState([]);
    const [refunds, setRefunds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [refundDetails, setRefundDetails] = useState(null); // extra info for selected refund
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState(null);
    const [adminNoteText, setAdminNoteText] = useState('');
    const [rejectModal, setRejectModal] = useState({ open: false, refund: null, reason: '' });
    const [successModal, setSuccessModal] = useState({ open: false, message: '', type: '' });

    const formatDateTime = (value) => {
        if (!value) return '—';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return String(value);
        return d.toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const shiftDateByMinutes = (value/*, minutes*/) => {
        if (!value) return null;
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return null;
        return d;
    };

    const detectPriority = (issue) => {
        const text = String(issue || "").toLowerCase().trim();

        // Priority detection rules
        const HIGH = [
            "urgent", "immediately", "asap", "payment failed", "cannot login",
            "login failed", "security issue", "account locked", "double charged",
            "booking cancelled automatically", "refund not received"
        ];

        const MEDIUM = [
            "error", "not working", "stuck", "slow", "issue", "crashing",
            "otp not received", "unable to book", "wrong amount shown"
        ];

        const LOW = [
            "help needed", "how to", "guidance", "support",
            "change details", "update info", "general query", "doubt"
        ];

        // Detect Priority
        if (HIGH.some(keyword => text.includes(keyword))) return "High";
        if (MEDIUM.some(keyword => text.includes(keyword))) return "Medium";
        if (LOW.some(keyword => text.includes(keyword))) return "Low";

        // Default fallback if unknown
        return "Low";
    };

    const sortComplaints = (list) => {
        const priorityRank = { 'High': 3, 'Medium': 2, 'Low': 1 };
        return [...list].sort((a, b) => {
            const aStatus = String(a.status || '').toLowerCase();
            const bStatus = String(b.status || '').toLowerCase();

            // Open tickets should always be on top
            const aOpen = aStatus === 'open';
            const bOpen = bStatus === 'open';
            if (aOpen && !bOpen) return -1;
            if (!aOpen && bOpen) return 1;

            // Closed tickets should always go to the bottom
            const aClosed = aStatus === 'closed';
            const bClosed = bStatus === 'closed';
            if (aClosed && !bClosed) return 1;
            if (!aClosed && bClosed) return -1;

            // Then sort by priority (High -> Medium -> Low)
            const pr = (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0);
            if (pr !== 0) return pr;

            // Fallback: newer first
            return new Date(b.date) - new Date(a.date);
        });
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Complaints
                const compRes = await apiService.get('/api/admin/complaints?limit=50');
                const compList = compRes?.data?.complaints || [];
                const mappedComplaints = compList.map((c) => ({
                    kind: 'complaint',
                    id: c.complaintId,
                    user: c.userName || 'Unknown',
                    email: c.userEmail || '',
                    hotel: c.hotelName || '—',
                    issue: c.description || '',
                    type: c.type,
                    status: (c.status || 'open'),
                    priority: detectPriority(c.description || ''),
                    date: c.complaintDate,
                    bookingId: c.bookingId,
                    updatedAt: c.updatedAt || c.updated_at || null,
                }));

                // Sort complaints using the reusable helper (open first, closed last, then priority)
                const mappedSorted = sortComplaints(mappedComplaints);
                // replace mappedComplaints with sorted version
                mappedComplaints.length = 0;
                mappedComplaints.push(...mappedSorted);

                // Bookings (Refunds)
                const bookingsRes = await apiService.get('/api/admin/bookings');
                const allBookings = bookingsRes?.data || [];
                const refunded = allBookings.filter((b) => {
                    const st = String(b.paymentStatus || '').toLowerCase();
                    return st !== 'completed' && st !== 'failed';
                });
                const mappedRefunds = refunded.map((b) => {
                    const statusRaw = String(b.paymentStatus || '').toLowerCase();
                    const totalPrice = parseFloat(b.totalPrice || 0);
                    const checkInDate = b.checkInDate ? shiftDateByMinutes(b.checkInDate) : null;
                    const now = new Date();
                    
                    // Calculate refund percentage based on cancellation policy
                    let refundPercentage = 0;
                    if (checkInDate) {
                        const hoursUntilCheckIn = (checkInDate - now) / (1000 * 60 * 60);
                        if (hoursUntilCheckIn >= 12) {
                            refundPercentage = 100;
                        } else if (hoursUntilCheckIn >= 6) {
                            refundPercentage = 50;
                        } else if (hoursUntilCheckIn >= 3) {
                            refundPercentage = 25;
                        } else {
                            refundPercentage = 0;
                        }
                    }
                    
                    const refundAmount = (totalPrice * refundPercentage) / 100;
                    
                    return ({
                        kind: 'refund',
                        id: b.id,
                        user: b.guestName,
                        email: b.guestEmail,
                        amount: totalPrice,
                        refundAmount: refundAmount,
                        refundPercentage: refundPercentage,
                        status: statusRaw,
                        date: b.createdAt,
                        updatedAt: b.updatedAt || b.updated_at || null,
                        bookingId: b.id,
                        propertyName: b.propertyName || '—',
                        refundNote: b.refund_note || null,
                        checkInDate: b.checkInDate
                    });
                });

                setComplaints(mappedComplaints);
                setRefunds(mappedRefunds);
            } catch (e) {
                setError(e.message || 'Failed to load data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    
    // Close modal on Escape key
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') setSelectedTicket(null);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);
    
    const updateComplaintInState = (id, updates) => {
        setComplaints((prev) => {
            const updated = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
            return sortComplaints(updated);
        });
        setSelectedTicket((curr) => (curr && curr.id === id ? { ...curr, ...updates } : curr));
    };

    const updateRefundInState = (id, updates) => {
        setRefunds((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
        setSelectedTicket((curr) => (curr && curr.id === id ? { ...curr, ...updates } : curr));
    };

    const handleApproveRefund = async (refund) => {
        try {
            setActionError(null);
            setActionLoading(true);
            const res = await apiService.request(`/api/admin/bookings/${refund.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'refund_progress' })
            });
            if (res?.success) {
                const updatedAt = res.data?.updated_at || res.data?.updatedAt || new Date().toISOString();
                updateRefundInState(refund.id, { status: 'refund_progress', updatedAt });
                setSuccessModal({ open: true, message: 'Refund Approved Successfully!', type: 'success' });
                setTimeout(() => setSuccessModal({ open: false, message: '', type: '' }), 3000);
            } else {
                setActionError(res?.message || 'Failed to approve refund');
            }
        } catch (e) {
            setActionError(e.message || 'Failed to approve refund');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectRefund = (refund) => {
        setActionError(null);
        setRejectModal({ open: true, refund, reason: refund.refundNote || '' });
    };

    const submitRejectRefund = async () => {
        const { refund, reason } = rejectModal;
        if (!refund) return setRejectModal({ open: false, refund: null, reason: '' });
        try {
            setActionError(null);
            setActionLoading(true);
            const res = await apiService.request(`/api/admin/bookings/${refund.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'refund_rejected', refund_note: reason })
            });
            if (res?.success) {
                const updatedAt = res.data?.updated_at || res.data?.updatedAt || new Date().toISOString();
                updateRefundInState(refund.id, { status: 'refund_rejected', refundNote: reason, updatedAt });
                setRejectModal({ open: false, refund: null, reason: '' });
                setSuccessModal({ open: true, message: 'Refund Rejected!', type: 'error' });
                setTimeout(() => setSuccessModal({ open: false, message: '', type: '' }), 3000);
            } else {
                setActionError(res?.message || 'Failed to reject refund');
            }
        } catch (e) {
            setActionError(e.message || 'Failed to reject refund');
        } finally {
            setActionLoading(false);
        }
    };

    const cancelReject = () => setRejectModal({ open: false, refund: null, reason: '' });

    const handleMarkRefundSuccess = async (refund) => {
        try {
            setActionError(null);
            setActionLoading(true);
            const res = await apiService.request(`/api/admin/bookings/${refund.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'refund_success' })
            });
            if (res?.success) {
                const updatedAt = res.data?.updated_at || res.data?.updatedAt || new Date().toISOString();
                updateRefundInState(refund.id, { status: 'refund_success', updatedAt });
                setSuccessModal({ open: true, message: 'Refund Successful!', type: 'success' });
                setTimeout(() => setSuccessModal({ open: false, message: '', type: '' }), 3000);
            } else {
                setActionError(res?.message || 'Failed to mark refund success');
            }
        } catch (e) {
            setActionError(e.message || 'Failed to mark refund success');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAssignToHotel = async (ticket) => {
        try {
            setActionError(null);
            setActionLoading(true);
            const detail = await apiService.get(`/api/admin/complaints/${ticket.id}`);
            const complaint = detail?.data;
            const hotelId = complaint?.hotel_id;
            if (!hotelId) {
                setActionError('No hotel linked to this complaint to assign.');
                return;
            }

            if (adminNoteText.trim()) {
                const noteRes = await apiService.request(`/api/admin/complaints/${ticket.id}/response`, {
                    method: 'PATCH',
                    body: JSON.stringify({ note: adminNoteText.trim() })
                });
                if (noteRes?.success) {
                    updateComplaintInState(ticket.id, { adminNotes: noteRes?.data?.admin_notes || noteRes?.data?.adminNotes || null });
                }
            }

            const res = await apiService.request(`/api/admin/complaints/${ticket.id}/assign`, {
                method: 'PATCH',
                body: JSON.stringify({ assigned_hotel_id: hotelId })
            });
            if (res?.success) {
                updateComplaintInState(ticket.id, { status: 'in_progress' });
                setAdminNoteText('');
                setSuccessModal({ open: true, message: 'Complaint Assigned to Hotel!', type: 'success' });
                setTimeout(() => setSuccessModal({ open: false, message: '', type: '' }), 3000);
            }
        } catch (e) {
            setActionError(e.message || 'Failed to assign to hotel');
        } finally {
            setActionLoading(false);
        }
    };

    const handleMarkResolved = async (ticket) => {
        try {
            setActionError(null);
            setActionLoading(true);

            if (adminNoteText.trim()) {
                const noteRes = await apiService.request(`/api/admin/complaints/${ticket.id}/response`, {
                    method: 'PATCH',
                    body: JSON.stringify({ note: adminNoteText.trim() })
                });
                if (noteRes?.success) {
                    updateComplaintInState(ticket.id, { adminNotes: noteRes?.data?.admin_notes || noteRes?.data?.adminNotes || null });
                }
            }

            const res = await apiService.request(`/api/admin/complaints/${ticket.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'resolved' })
            });
            if (res?.success) {
                updateComplaintInState(ticket.id, { status: 'resolved' });
                setAdminNoteText('');
                setSuccessModal({ open: true, message: 'Complaint Marked as Resolved!', type: 'success' });
                setTimeout(() => setSuccessModal({ open: false, message: '', type: '' }), 3000);
            }
        } catch (e) {
            setActionError(e.message || 'Failed to update status');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCloseComplaint = async (ticket) => {
        try {
            setActionError(null);
            setActionLoading(true);
            const res = await apiService.request(`/api/admin/complaints/${ticket.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'closed' })
            });
            if (res?.success) {
                updateComplaintInState(ticket.id, { status: 'closed' });
                setSuccessModal({ open: true, message: 'Complaint Closed Successfully!', type: 'success' });
                setTimeout(() => setSuccessModal({ open: false, message: '', type: '' }), 3000);
            }
        } catch (e) {
            setActionError(e.message || 'Failed to close complaint');
        } finally {
            setActionLoading(false);
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High': return 'bg-red-100 text-red-700';
            case 'Medium': return 'bg-yellow-100 text-yellow-700';
            case 'Low': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusColor = (status) => {
        const key = String(status || '').toLowerCase().replace(/[ _]/g, '-');
        switch (key) {
            case 'open': return 'bg-blue-100 text-blue-700';
            case 'in-progress': return 'bg-yellow-100 text-yellow-700';
            case 'pending': return 'bg-orange-100 text-orange-700';
            case 'approved': return 'bg-green-100 text-green-700';
            case 'resolved': return 'bg-green-100 text-green-700';
            case 'refunded': return 'bg-purple-100 text-purple-700';
            case 'refund-initiated': return 'bg-indigo-100 text-indigo-700';
            case 'refund-progress': return 'bg-yellow-100 text-yellow-700';
            case 'refund-success': return 'bg-green-100 text-green-700';
            case 'refund-rejected': return 'bg-red-100 text-red-700';
            case 'closed': return 'bg-gray-200 text-gray-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getTypeColor = (type) => {
        const key = String(type || '').toLowerCase();
        switch (key) {
            case 'hotel': return 'bg-indigo-100 text-indigo-700';
            case 'booking': return 'bg-pink-100 text-pink-700';
            case 'general': return 'bg-teal-100 text-teal-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="max-w-7xl">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900">User Support</h2>
                <p className="text-gray-600 mt-2">Manage customer complaints, refunds, and support tickets</p>
            </div>

            <div className="flex gap-2 mb-6">
                <button
                    className={`px-6 py-2.5 rounded-lg font-medium transition ${activeTab === 'complaints' ? 'bg-ssh-red text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
                    onClick={() => setActiveTab('complaints')}
                >
                    Complaints ({complaints.length})
                </button>
                <button
                    className={`px-6 py-2.5 rounded-lg font-medium transition ${activeTab === 'refunds' ? 'bg-ssh-red text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
                    onClick={() => setActiveTab('refunds')}
                >
                    Refunds ({refunds.length})
                </button>
            </div>

            {loading && (
                <div className="mb-4 text-gray-600">Loading...</div>
            )}
            {error && (
                <div className="mb-4 text-red-600">{error}</div>
            )}

            {activeTab === 'complaints' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">ID</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">User</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Priority</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Hotel</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Issue</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Type</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Action</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-200">
                                {complaints.map((ticket) => (
                                    <tr key={ticket.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 text-sm text-gray-900">#{ticket.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{ticket.user}</div>
                                            {ticket.email ? (
                                                <div className="text-xs text-gray-500">{ticket.email}</div>
                                            ) : null}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                                                {ticket.priority}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{ticket.hotel}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{ticket.issue}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getTypeColor(ticket.type)}`}>
                                                {ticket.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                                {ticket.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{formatDateTime(ticket.date)}</td>
                                        <td className="px-6 py-4">
                                            <button
                                                className="text-sm text-ssh-red hover:text-ssh-dark-red font-medium"
                                                onClick={async () => {
                                                    setActionError(null);
                                                    setAdminNoteText('');
                                                    setSelectedTicket(ticket);
                                                    try {
                                                        const detail = await apiService.get(`/api/admin/complaints/${ticket.id}`);
                                                        const complaint = detail?.data;
                                                        const adminNotes = complaint?.admin_notes || null;
                                                        const hotelResponse = complaint?.hotel_response || null;
                                                        setSelectedTicket((curr) => (curr && curr.id === ticket.id ? { ...curr, adminNotes } : curr));
                                                        setSelectedTicket((curr) => (curr && curr.id === ticket.id ? { ...curr, hotelResponse } : curr));
                                                    } catch (e) {
                                                        // ignore detail load failures; base ticket is still shown
                                                    }
                                                }}
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'refunds' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">ID</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">User</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Total Amount</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Refund Amount</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Hotel</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {refunds.map((refund) => (
                                    <tr key={refund.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 text-sm text-gray-900">#{refund.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{refund.user}</div>
                                            {refund.email ? (
                                                <div className="text-xs text-gray-500">{refund.email}</div>
                                            ) : null}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">₹{Number(refund.amount || 0).toLocaleString('en-IN')}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-semibold text-green-700">₹{Number(refund.refundAmount || 0).toLocaleString('en-IN')}</div>
                                            <div className="text-xs text-gray-600 mt-0.5">
                                                <span className={`px-2 py-0.5 rounded-full ${refund.refundPercentage === 100 ? 'bg-green-100 text-green-700' : refund.refundPercentage === 50 ? 'bg-yellow-100 text-yellow-700' : refund.refundPercentage === 25 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                                    {refund.refundPercentage}% Refund
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{refund.propertyName}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(refund.status)}`}>
                                                {refund.status?.toLowerCase() === 'refund_initiated' ? 'Refund Initiated' :
                                                refund.status?.toLowerCase() === 'refund_progress' ? 'In Progress' :
                                                refund.status?.toLowerCase() === 'refund_success' ? 'Refunded' :
                                                refund.status?.toLowerCase() === 'refund_rejected' ? 'Rejected' :
                                                refund.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{formatDateTime(refund.date)}</td>
                                        <td className="px-6 py-4 flex items-center gap-2">
                                            <button
                                                className="text-sm text-ssh-red hover:text-ssh-dark-red font-medium"
                                                onClick={() => setSelectedTicket(refund)}
                                            >
                                                View
                                            </button>
                                            {refund.status === 'refund_initiated' && (
                                                <>
                                                    <button
                                                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-md"
                                                        onClick={() => handleApproveRefund(refund)}
                                                        disabled={actionLoading}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        className="px-3 py-1 bg-red-600 text-white text-sm rounded-md"
                                                        onClick={() => handleRejectRefund(refund)}
                                                        disabled={actionLoading}
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            {refund.status === 'refund_progress' && (
                                                <button
                                                    className="px-3 py-1 bg-green-700 text-white text-sm rounded-md"
                                                    onClick={() => handleMarkRefundSuccess(refund)}
                                                    disabled={actionLoading}
                                                >
                                                    Refund Success
                                                </button>
                                            )}
                                            {refund.status === 'refund_rejected' && refund.refundNote && (
                                                <div className="text-sm pl-4 text-gray-600">Reason: {refund.refundNote}</div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selectedTicket && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start md:items-center justify-center p-6"
                    onClick={() => setSelectedTicket(null)}
                    aria-hidden={selectedTicket ? 'false' : 'true'}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label={selectedTicket.kind === 'refund' ? `Refund ${selectedTicket.id}` : `Complaint ${selectedTicket.id}`}
                        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-auto overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between p-6 border-b border-gray-200">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">{selectedTicket.kind === 'refund' ? 'Refund' : 'Complaint'} #{selectedTicket.id}</h3>
                                <p className="text-sm text-gray-500 mt-1">{selectedTicket.kind === 'refund' ? `Booking #${selectedTicket.bookingId}` : selectedTicket.user}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    aria-label="Close"
                                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                                >
                                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            {selectedTicket.kind === 'complaint' ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-900">User</h4>
                                            <p className="text-sm text-gray-600">{selectedTicket.user}</p>
                                            {selectedTicket.email && <p className="text-sm text-gray-600">{selectedTicket.email}</p>}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-900">Meta</h4>
                                            <p className="text-sm text-gray-600">Priority: <strong>{selectedTicket.priority}</strong></p>
                                            <p className="text-sm text-gray-600">Status: <strong>{selectedTicket.status}</strong></p>
                                            <p className="text-sm text-gray-600">Updated At: <strong>{formatDateTime(selectedTicket.updatedAt || selectedTicket.updated_at || selectedTicket.updatedAt)}</strong></p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Issue</h4>
                                        <div className="text-sm text-gray-700 whitespace-pre-line">{selectedTicket.issue}</div>
                                    </div>

                                    {String(selectedTicket.status).toLowerCase() === 'closed' && selectedTicket.adminNotes && (
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                            <div className="text-sm font-semibold text-gray-900 mb-2">Admin Note</div>
                                            <div className="text-sm text-gray-700 whitespace-pre-line">{selectedTicket.adminNotes}</div>
                                        </div>
                                    )}

                                    {String(selectedTicket.status).toLowerCase() === 'resolved' && selectedTicket.hotelResponse && (
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                            <div className="text-sm font-semibold text-gray-900 mb-2">Hotel Response</div>
                                            <div className="text-sm text-gray-700 whitespace-pre-line">{selectedTicket.hotelResponse}</div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <RefundDetails
                                    ticket={selectedTicket}
                                    refundDetails={refundDetails}
                                    setRefundDetails={setRefundDetails}
                                    onClose={() => setSelectedTicket(null)}
                                />
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-white flex flex-wrap items-center gap-3 justify-end">
                            {selectedTicket.kind === 'complaint' ? (
                                <>
                                    {String(selectedTicket.status).toLowerCase() === 'open' && (
                                        <button
                                            className="px-4 py-2 bg-ssh-red text-white rounded-md"
                                            onClick={() => handleAssignToHotel(selectedTicket)}
                                            disabled={actionLoading}
                                        >
                                            {actionLoading ? 'Assigning...' : 'Assign to Hotel'}
                                        </button>
                                    )}
                                    {String(selectedTicket.status).toLowerCase() === 'in_progress' && (
                                        <button
                                            className="px-4 py-2 bg-ssh-red text-white rounded-md"
                                            onClick={() => handleMarkResolved(selectedTicket)}
                                            disabled={actionLoading}
                                        >
                                            {actionLoading ? 'Updating...' : 'Mark as Resolved'}
                                        </button>
                                    )}
                                    {String(selectedTicket.status).toLowerCase() === 'resolved' && (
                                        <button
                                            className="px-4 py-2 bg-ssh-red text-white rounded-md"
                                            onClick={() => handleCloseComplaint(selectedTicket)}
                                            disabled={actionLoading}
                                        >
                                            {actionLoading ? 'Closing...' : 'Close Complaint'}
                                        </button>
                                    )}
                                </>
                            ) : (
                                <>
                                    {selectedTicket.status === 'refund_initiated' && (
                                        <>
                                            <button className="px-4 py-2 bg-green-600 text-white rounded-md" onClick={() => handleApproveRefund(selectedTicket)} disabled={actionLoading}>Approve</button>
                                            <button className="px-4 py-2 bg-red-600 text-white rounded-md" onClick={() => handleRejectRefund(selectedTicket)} disabled={actionLoading}>Reject</button>
                                        </>
                                    )}
                                    {selectedTicket.status === 'refund_progress' && (
                                        <button className="px-4 py-2 bg-green-700 text-white rounded-md" onClick={() => handleMarkRefundSuccess(selectedTicket)} disabled={actionLoading}>Mark Refund Success</button>
                                    )}
                                </>
                            )}

                            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md" onClick={() => setSelectedTicket(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {rejectModal.open && (
                <div className="fixed inset-0 bg-black bg-opacity-40 z-60 flex items-center justify-center p-4" onClick={cancelReject}>
                    <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                        <h3 className="text-lg font-semibold text-gray-900">Reject Refund</h3>
                        <p className="text-sm text-gray-600 mt-1">Provide a reason for rejecting the refund for booking #{rejectModal.refund?.bookingId || rejectModal.refund?.id}.</p>
                        <textarea
                            className="w-full border border-gray-300 rounded-md p-3 mt-4 text-sm text-gray-900"
                            rows={4}
                            placeholder="Reason for rejection (required)"
                            value={rejectModal.reason}
                            onChange={(e) => setRejectModal((s) => ({ ...s, reason: e.target.value }))}
                            disabled={actionLoading}
                        />
                        {actionError && <div className="text-sm text-red-600 mt-2">{actionError}</div>}
                        <div className="mt-4 flex justify-end gap-3">
                            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md" onClick={cancelReject} disabled={actionLoading}>Cancel</button>
                            <button className="px-4 py-2 bg-red-600 text-white rounded-md" onClick={submitRejectRefund} disabled={actionLoading || !rejectModal.reason.trim()}>{actionLoading ? 'Submitting...' : 'Submit Rejection'}</button>
                        </div>
                    </div>
                </div>
            )}

            {successModal.open && (
                <div className="fixed top-4 right-4 z-[70] animate-slide-in">
                    <div className={`rounded-lg shadow-2xl p-4 pr-12 min-w-[300px] relative ${successModal.type === 'success' ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}`}>
                        <button
                            onClick={() => setSuccessModal({ open: false, message: '', type: '' })}
                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                        >
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <div className="flex items-center gap-3">
                            {successModal.type === 'success' ? (
                                <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            )}
                            <p className={`font-semibold ${successModal.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                                {successModal.message}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

    const RefundDetails = ({ ticket, refundDetails, setRefundDetails, onClose }) => {
    const shiftDateByMinutes = (value/*, minutes*/) => {
        if (!value) return null;
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return null;
        return d;
    };

    const formatCheckInOutLocal = (value) => {
        if (!value) return '—';
        const d = shiftDateByMinutes(value) || new Date(value);
        if (Number.isNaN(d.getTime())) return String(value);
        return d.toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const formatDateTimeLocal = (value) => {
        if (!value) return '—';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return String(value);
        return d.toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    useEffect(() => {
        const loadDetails = async () => {
            try {
                // 1) Get booking details (to obtain propertyId)
                const bookingRes = await apiService.get(`/api/admin/bookings/${ticket.bookingId}`);
                const booking = bookingRes?.data;
                // 2) Get hotel details from hotels table
                let hotel = null;
                if (booking?.propertyId) {
                    const hotelRes = await apiService.get(`/api/admin/hotels/${booking.propertyId}`);
                    hotel = hotelRes?.data;
                }
                setRefundDetails({ booking, hotel });
            } catch (e) {
                setRefundDetails({ error: e.message || 'Failed to load details' });
            }
        };
        setRefundDetails(null);
        loadDetails();
    }, [ticket?.bookingId, setRefundDetails]);

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Refund Summary</h4>
                <p className="text-sm text-gray-600"><strong className="font-medium text-gray-900">Guest:</strong> {ticket.user}</p>
                {ticket.email ? (
                    <p className="text-sm text-gray-600"><strong className="font-medium text-gray-900">Guest Email:</strong> {ticket.email}</p>
                ) : null}
                <p className="text-sm text-gray-600"><strong className="font-medium text-gray-900">Status:</strong> {ticket.status}</p>
                <p className="text-sm text-gray-600"><strong className="font-medium text-gray-900">Total Booking Amount:</strong> ₹{Number(ticket.amount || 0).toLocaleString('en-IN')}</p>
                <p className="text-sm text-gray-600">
                    <strong className="font-medium text-gray-900">Refund Amount:</strong> 
                    <span className="text-green-700 font-semibold ml-2">₹{Number(ticket.refundAmount || 0).toLocaleString('en-IN')}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${ticket.refundPercentage === 100 ? 'bg-green-100 text-green-700' : ticket.refundPercentage === 50 ? 'bg-yellow-100 text-yellow-700' : ticket.refundPercentage === 25 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                        {ticket.refundPercentage}% Refund
                    </span>
                </p>
                <p className="text-sm text-gray-600"><strong className="font-medium text-gray-900">Ticket Date:</strong> {formatDateTimeLocal(ticket.date)}</p>
                <p className="text-sm text-gray-600"><strong className="font-medium text-gray-900">Updated At:</strong> {formatDateTimeLocal(ticket.updatedAt)}</p>
            </div>
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Hotel Details</h4>
                {!refundDetails && <p className="text-sm text-gray-600">Loading details...</p>}
                {refundDetails?.error && <p className="text-sm text-red-600">{refundDetails.error}</p>}
                {refundDetails?.hotel && (
                    <>
                        <p className="text-sm text-gray-600"><strong className="font-medium text-gray-900">Hotel Name (from DB):</strong> {refundDetails.hotel.hotelName}</p>
                        <p className="text-sm text-gray-600"><strong className="font-medium text-gray-900">Hotel Type:</strong> {refundDetails.hotel.propertyType}</p>
                    </>
                )}
                {!refundDetails?.hotel && (
                    <p className="text-sm text-gray-600"><strong className="font-medium text-gray-900">Hotel (from booking):</strong> {ticket.propertyName}</p>
                )}
                {refundDetails?.booking && (
                    <>
                        <p className="text-sm text-gray-600"><strong className="font-medium text-gray-900">Booking ID:</strong> {refundDetails.booking.id}</p>
                        <p className="text-sm text-gray-600"><strong className="font-medium text-gray-900">Room Type:</strong> {refundDetails.booking.roomType}</p>
                        <p className="text-sm text-gray-600"><strong className="font-medium text-gray-900">Check In:</strong> {formatCheckInOutLocal(refundDetails.booking.checkInDate)}</p>
                        <p className="text-sm text-gray-600"><strong className="font-medium text-gray-900">Check Out:</strong> {formatCheckInOutLocal(refundDetails.booking.checkOutDate)}</p>
                    </>
                )}
            </div>
            <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                    onClick={onClose}
                >
                    Close
                </button>
            </div>
        </div>
    );
};

export default UserSupport;
