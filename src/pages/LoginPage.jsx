import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import authService from '../services/authService';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async () => {
        setError('');
        setLoading(true);

        try {
            const result = await authService.login(email, password);

            if (result.success) {
                toast.success('Login successful! Welcome back.');
                // Navigate to dashboard
                setTimeout(() => navigate('/dashboard'), 500);
            } else {
                setError(result.message);
                toast.error(result.message);
            }
        } catch (err) {
            setError('Login failed. Please try again.');
            toast.error('Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b border-gray-200">
                <div className="m:px-8 px-4 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-ssh-red rounded-lg flex items-center justify-center text-white font-bold text-xl">
                            SSH
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Short Stay Hotel</h1>
                            <p className="text-xs text-gray-600">Admin Portal</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex items-center justify-center md:px-4 py-6 lg:py-12">
                <div className="lg:px-8 px-4 w-full grid lg:grid-cols-2 gap-12">
                    {/* left part */}
                    <div className="flex flex-col justify-center lg:space-y-8 space-y-4">
                        <div className="inline-block">
                            <span className="px-4 py-2 bg-ssh-red text-white rounded-full text-sm font-medium">
                                Pay By Hour • Save Money
                            </span>
                        </div>

                        <h2 className="md:text-4xl text-2xl lg:text-5xl font-bold text-gray-900 leading-tight">
                            Manage Your Hotel Network with Ease
                        </h2>

                        <p className="lg:text-lg text-gray-600 leading-relaxed">
                            SSH Admin Portal empowers you to manage clean and hygienic hotels & PGs
                            across your network. Control bookings, staff, and operations all in one place.
                        </p>

                        <div className="md:space-y-6 space-y-3">
                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold flex-shrink-0">
                                    ✓
                                </div>
                                <div>
                                    <h3 className="md:text-lg text-base font-semibold text-gray-900">Real-time Dashboard</h3>
                                    <p className="md:text-base text-sm text-gray-600">Monitor bookings and revenue in real-time</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold flex-shrink-0">
                                    ✓
                                </div>
                                <div>
                                    <h3 className="md:text-lg text-base font-semibold text-gray-900">Staff Management</h3>
                                    <p className="md:text-base text-sm text-gray-600">Add and manage staff across all locations</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold flex-shrink-0">
                                    ✓
                                </div>
                                <div>
                                    <h3 className="md:text-lg text-base font-semibold text-gray-900">Analytics & Reports</h3>
                                    <p className="md:text-base text-sm text-gray-600">Track performance with detailed insights</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* right part */}
                    <div className="flex items-center justify-center">
                        <div className="w-full lg:max-w-md bg-white rounded-2xl shadow-xl md:p-8 p-4 space-y-6">
                            <div className="space-y-2">
                                <h3 className="md:text-2xl text-lg font-bold text-gray-900">Admin Login</h3>
                                <p className="text-gray-600 md:text-base text-sm">Enter your credentials to access the portal</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="admin.ssh@ssh.com"
                                        className="w-full md:px-4 md:py-3 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ssh-red focus:border-transparent outline-none transition"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                                            placeholder="Enter your password"
                                            className="w-full md:px-4 md:py-3 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ssh-red focus:border-transparent outline-none transition pr-12"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-5 h-5" />
                                            ) : (
                                                <Eye className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                        {error}
                                    </div>
                                )}

                                <button
                                    onClick={handleLogin}
                                    disabled={loading}
                                    className="w-full md:px-4 md:py-3 p-2 bg-ssh-red hover:bg-ssh-dark-red text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Signing In...' : 'Sign In'}
                                </button>

                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="bg-white border-t border-gray-200 py-4">
                <p className="text-center text-gray-600 md:text-sm text-xs">&copy; 2025 Short Stay Hotel. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LoginPage;