import React, { useEffect, useState } from 'react';
import apiService from '../services/apiService';
import toast from 'react-hot-toast';

const Partners = () => {
    const [hotels, setHotels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [suspendModal, setSuspendModal] = useState({ open: false, hotel: null, reason: '' });

    const loadHotels = async () => {
        setLoading(true);
        try {
            // Only load hotels that are approved for the partners listing
            const data = await apiService.hotels.getAll({ status: 'approved' });
            setHotels(Array.isArray(data) ? data : (data.data.hotels || []));
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to load partners');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHotels();
    }, []);

    const openSuspend = (hotel) => setSuspendModal({ open: true, hotel, reason: '' });
    const closeSuspend = () => setSuspendModal({ open: false, hotel: null, reason: '' });

    const handleDisable = async (hotelId, reason) => {
        try {
            // update property_status to disabled
            await apiService.hotels.updatePropertyStatus(hotelId, 'disabled');
            // optionally send message
            if (reason) {
                await apiService.hotels.sendMessage(hotelId, 'Account Suspended', 'Your hotel account has been suspended.', reason);
            }
            toast.success('Hotel suspended');
            await loadHotels();
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to suspend hotel');
        }
        closeSuspend();
    };

    const handleEnable = async (hotelId) => {
        try {
            await apiService.hotels.updatePropertyStatus(hotelId, 'enabled');
            toast.success('Hotel enabled');
            await loadHotels();
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to enable hotel');
        }
    };

    return (
        <div style={{ padding: 10 }}>
            <h2 className="text-3xl font-bold text-gray-900 pb-4">Partners</h2>
            {error && <div style={{ color: '#dc2626', marginBottom: 12 }}>{error}</div>}

            <div className='overflow-x-auto' style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f9fafb' }}>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '12px 16px' }}>Hotel Name</th>
                            <th style={{ textAlign: 'left', padding: '12px 16px' }}>Owner Name</th>
                            <th style={{ textAlign: 'left', padding: '12px 16px' }}>City</th>
                            <th style={{ textAlign: 'left', padding: '12px 16px' }}>Status</th>
                            <th style={{ textAlign: 'left', padding: '12px 16px' }}>Action</th>
                        </tr>
                    </thead>

                    {/* body */}
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} style={{ padding: 20 }}>Loading...</td></tr>
                        ) : hotels.length === 0 ? (
                            <tr><td colSpan={5} style={{ padding: 20 }}>No partners found.</td></tr>
                        ) : (
                            hotels.map(h => (
                                <tr key={h.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '12px 16px' }}>{h.hotelName || h.name}</td>
                                    <td style={{ padding: '12px 16px' }}>{h.ownerName || h.owner_name || '—'}</td>
                                    <td style={{ padding: '12px 16px' }}>{h.city || h.hotel_city || '—'}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ padding: '4px 8px', borderRadius: 9999, background: h.propertyStatus === 'enabled' ? '#d1fae5' : '#fee2e2', color: h.propertyStatus === 'enabled' ? '#065f46' : '#991b1b', fontWeight: 600, fontSize: '12px' }}>
                                            { (h.propertyStatus || 'enabled').toUpperCase() }
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        { (h.propertyStatus || 'enabled') === 'enabled' ? (
                                            <>
                                                <button onClick={() => openSuspend(h)} style={{ marginRight: 8, padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6 }}>Disable</button>
                                            </>
                                        ) : (
                                            <button onClick={() => handleEnable(h.id)} style={{ padding: '8px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6 }}>Enable</button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* suspend modal */}
            {suspendModal.open && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', padding: 20, borderRadius: 8, width: 520 }} onClick={(e) => e.stopPropagation()}>
                        <h3>Disable Hotel: {suspendModal.hotel && (suspendModal.hotel.hotelName || suspendModal.hotel.name)}</h3>
                        <p style={{ color: '#6b7280' }}>Provide a reason that will be sent to the partner explaining why their hotel is suspended.</p>
                        <div style={{ marginTop: 12 }}>
                            <textarea value={suspendModal.reason} onChange={(e) => setSuspendModal(prev => ({ ...prev, reason: e.target.value }))} rows={5} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }} placeholder="Enter suspension reason for partner" />
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                            <button onClick={closeSuspend} style={{ padding: '8px 12px', borderRadius: 6, background: 'white', border: '1px solid #d1d5db' }}>Cancel</button>
                            <button onClick={() => handleDisable(suspendModal.hotel.id, suspendModal.reason)} style={{ padding: '8px 12px', borderRadius: 6, background: '#ef4444', color: 'white', border: 'none' }}>Disable & Notify</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Partners;
