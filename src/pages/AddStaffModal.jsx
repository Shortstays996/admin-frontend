import { useState } from 'react';

const AddStaffModal = ({ onClose }) => {
    const [staffName, setStaffName] = useState('');
    const [staffEmail, setStaffEmail] = useState('');
    const [staffRole, setStaffRole] = useState('Manager');
    const [staffLocation, setStaffLocation] = useState('Hotel Sunshine');

    const handleSubmit = () => {
        if (staffName && staffEmail) {
            alert('Staff member added successfully!');
            onClose();
        } else {
            alert('Please fill all fields');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Add New Staff</h3>
                    <button onClick={onClose} className="close-button">
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="modal-body">
                    <div className="form-group">
                        <label>Full Name</label>
                        <input
                            type="text"
                            value={staffName}
                            onChange={(e) => setStaffName(e.target.value)}
                            placeholder="Enter staff name"
                        />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={staffEmail}
                            onChange={(e) => setStaffEmail(e.target.value)}
                            placeholder="staff@ssh.com"
                        />
                    </div>

                    <div className="form-group">
                        <label>Role</label>
                        <select value={staffRole} onChange={(e) => setStaffRole(e.target.value)}>
                            <option>Manager</option>
                            <option>Receptionist</option>
                            <option>Housekeeping</option>
                            <option>Maintenance</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Hotel Location</label>
                        <select value={staffLocation} onChange={(e) => setStaffLocation(e.target.value)}>
                            <option>Hotel Sunshine</option>
                            <option>Hotel Paradise</option>
                            <option>Hotel Comfort</option>
                            <option>Hotel Elite</option>
                        </select>
                    </div>

                    <div className="modal-actions">
                        <button onClick={onClose} className="cancel-button">Cancel</button>
                        <button onClick={handleSubmit} className="submit-button">Add Staff</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddStaffModal;