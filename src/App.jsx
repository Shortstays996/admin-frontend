import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/dashboard';
import Overview from './pages/Overview';
import HotelApproval from './pages/HotelApproval';
import Partners from './pages/Partners';
import Bookings from './pages/Bookings';
import Analytics from './pages/Analytics';
import Commission from './pages/Commission';
import UserSupport from './pages/UserSupport';
import Marketing from './pages/Marketing';
import authService from './services/authService';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const isAuthenticated = authService.isAuthenticated();
    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirect to dashboard if already logged in)
const PublicRoute = ({ children }) => {
    const isAuthenticated = authService.isAuthenticated();
    return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

function App() {
    return (
        <Router>
            <Toaster position="top-right" />
            <div className="App">
                <Routes>
                    {/* Public Routes */}
                    <Route
                        path="/login"
                        element={
                            <PublicRoute>
                                <LoginPage />
                            </PublicRoute>
                        }
                    />

                    {/* Protected Routes */}
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    >
                        {/* Nested Routes */}
                        <Route index element={<Overview />} />
                        <Route path="overview" element={<Overview />} />
                        <Route path="hotel-approval" element={<HotelApproval />} />
                        <Route path="partners" element={<Partners />} />
                        <Route path="bookings" element={<Bookings />} />
                        <Route path="analytics" element={<Analytics />} />
                        <Route path="commission" element={<Commission />} />
                        <Route path="user-support" element={<UserSupport />} />
                        <Route path="marketing" element={<Marketing />} />
                    </Route>

                    {/* Redirect root to login or dashboard based on auth */}
                    <Route
                        path="/"
                        element={
                            authService.isAuthenticated()
                                ? <Navigate to="/dashboard" replace />
                                : <Navigate to="/login" replace />
                        }
                    />

                    {/* 404 - Redirect to dashboard or login */}
                    <Route
                        path="*"
                        element={
                            authService.isAuthenticated()
                                ? <Navigate to="/dashboard" replace />
                                : <Navigate to="/login" replace />
                        }
                    />
                </Routes>
            </div>
        </Router>
    );
}

export default App;