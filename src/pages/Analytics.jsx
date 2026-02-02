import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import apiService from '../services/apiService';

const Analytics = () => {
    const [timeframe, setTimeframe] = useState('daily');
    const [metrics, setMetrics] = useState(null);
    const [bookingTrends, setBookingTrends] = useState(null);
    const [locationData, setLocationData] = useState(null);
    const [paymentData, setPaymentData] = useState(null);
    const [loading, setLoading] = useState(false);

    const formatRevenueShort = (value) => {
        const amount = Number(value);
        if (!Number.isFinite(amount)) return '0';
        if (Math.abs(amount) < 1000) return amount.toLocaleString();
        return `${(amount / 1000).toFixed(2)}k`;
    };

    const navigate = useNavigate();

    const safeNumber = (v) => Number(v || 0);

    const computeTrendChange = (arr, key = 'bookings') => {
        if (!Array.isArray(arr) || arr.length < 2) return { percent: 0, diff: 0 };
        const last = safeNumber(arr[arr.length - 1][key]);
        const prev = safeNumber(arr[arr.length - 2][key]);
        const diff = last - prev;
        const percent = prev === 0 ? (last === 0 ? 0 : 100) : (diff / prev) * 100;
        return { percent: Math.round(percent), diff };
    };

    // Helper: find first matching key in trend items from a list of candidates
    const findTrendKey = (arr, candidates = []) => {
        if (!Array.isArray(arr) || arr.length === 0) return null;
        for (const key of candidates) {
            if (arr.some(item => typeof item?.[key] !== 'undefined')) return key;
        }
        return null;
    };

    const computeTrendChangeUsingKeys = (arr, candidates) => {
        const key = findTrendKey(arr, candidates);
        return key ? computeTrendChange(arr, key) : { percent: 0, diff: 0 };
    };

    const bookingTrendChange = computeTrendChangeUsingKeys(bookingTrends, ['bookings', 'count', 'totalBookings', 'total_bookings', 'bookingsCount']);
    const revenueTrendChange = computeTrendChangeUsingKeys(bookingTrends, ['revenue', 'amount', 'totalRevenue', 'total_revenue']);
    const hotelsTrendChange = computeTrendChangeUsingKeys(bookingTrends, ['hotels', 'activeHotels', 'hotelCount', 'hotel_count']);
    const usersTrendChange = computeTrendChangeUsingKeys(bookingTrends, ['users', 'totalUsers', 'userCount', 'user_count']);
    const refundsTrendChange = computeTrendChangeUsingKeys(bookingTrends, ['refunds', 'cancellations', 'refund_count', 'refundsCount']);

    const totalRefundsAmount = Array.isArray(paymentData)
        ? paymentData.reduce((s, p) => s + safeNumber(p?.refunded), 0)
        : 0;

    const totalRefundsCount = Array.isArray(paymentData)
        ? paymentData.reduce((s, p) => s + (Number(p?.refundCount || 0)), 0)
        : 0;

    const handleChartClick = (type, payload) => {
        // Navigate to bookings page with filters encoded in query params
        const params = new URLSearchParams();
        if (type === 'period' && payload?.period) params.set('period', payload.period);
        if (type === 'location' && payload?.location) params.set('location', payload.location);
        if (type === 'hotel' && payload?.hotelName) params.set('hotel', payload.hotelName);
        params.set('timeframe', timeframe);
        navigate(`/dashboard/bookings?${params.toString()}`);
    };

    const exportAnalytics = () => {
        const wb = XLSX.utils.book_new();

        const metricsSheet = XLSX.utils.json_to_sheet([{
            timeframe,
            bookings: metrics?.bookings || 0,
            revenue: metrics?.revenue || 0,
            hotels: metrics?.hotels || 0,
            users: metrics?.users || 0,
            totalRefundsAmount,
            totalRefundsCount
        }]);
        XLSX.utils.book_append_sheet(wb, metricsSheet, 'Metrics');

        if (Array.isArray(bookingTrends) && bookingTrends.length > 0) {
            const trendsSheet = XLSX.utils.json_to_sheet(bookingTrends);
            XLSX.utils.book_append_sheet(wb, trendsSheet, 'Trends');
        }

        if (Array.isArray(locationData) && locationData.length > 0) {
            const locSheet = XLSX.utils.json_to_sheet(locationData);
            XLSX.utils.book_append_sheet(wb, locSheet, 'Locations');
        }

        if (Array.isArray(paymentData) && paymentData.length > 0) {
            const paySheet = XLSX.utils.json_to_sheet(paymentData);
            XLSX.utils.book_append_sheet(wb, paySheet, 'Payments');
        }

        const fileName = `Analytics_${timeframe}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    const hasLocationRevenue = Array.isArray(locationData)
        ? locationData.some((l) => Number(l?.revenue || 0) > 0)
        : false;

    const bookingsLabel = timeframe === 'daily'
        ? "Today's Bookings"
        : timeframe === 'weekly'
            ? 'This Week Bookings'
            : 'This Month Bookings';

    const revenueLabel = timeframe === 'daily'
        ? "Today's Revenue"
        : timeframe === 'weekly'
            ? 'This Week Revenue'
            : 'This Month Revenue';

    // Chart color schemes
    const chartColors = {
        primary: 'rgba(59, 130, 246, 0.8)',
        secondary: 'rgba(16, 185, 129, 0.8)',
        accent: 'rgba(139, 92, 246, 0.8)',
        background: 'rgba(59, 130, 246, 0.2)',
        pie: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444']
    };

    const loadAnalyticsData = async (selectedTimeframe) => {
        setLoading(true);
        try {
            const response = await apiService.analytics.get(selectedTimeframe);
            const data = response?.data;
            setMetrics(data?.metrics || { bookings: 0, revenue: 0, hotels: 0, users: 0 });
            setBookingTrends(Array.isArray(data?.trends) ? data.trends : []);
            setLocationData(Array.isArray(data?.locations) ? data.locations : []);
            setPaymentData(Array.isArray(data?.payments) ? data.payments : []);
        } catch (err) {
            console.error('Failed to load analytics:', err);
            setMetrics({ bookings: 0, revenue: 0, hotels: 0, users: 0 });
            setBookingTrends([]);
            setLocationData([]);
            setPaymentData([]);
        } finally {
            setLoading(false);
        }
    };

    // Compute period ranges (current and previous) based on timeframe
    const getPeriodRanges = (tf) => {
        const now = new Date();
        const startOfDay = (d) => { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; };
        const endOfDay = (d) => { const r = new Date(d); r.setHours(23, 59, 59, 999); return r; };

        if (tf === 'daily') {
            const todayStart = startOfDay(now);
            const todayEnd = endOfDay(now);
            const yesterday = new Date(todayStart); yesterday.setDate(yesterday.getDate() - 1);
            const prevStart = startOfDay(yesterday);
            const prevEnd = endOfDay(yesterday);
            return { currentStart: todayStart, currentEnd: todayEnd, prevStart, prevEnd };
        }

        if (tf === 'weekly') {
            // ISO week start on Monday
            const day = now.getDay(); // 0 Sun .. 6 Sat
            const daysSinceMonday = (day + 6) % 7;
            const monday = new Date(now); monday.setDate(now.getDate() - daysSinceMonday); monday.setHours(0, 0, 0, 0);
            const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
            const prevMonday = new Date(monday); prevMonday.setDate(monday.getDate() - 7); prevMonday.setHours(0, 0, 0, 0);
            const prevSunday = new Date(prevMonday); prevSunday.setDate(prevMonday.getDate() + 6); prevSunday.setHours(23, 59, 59, 999);
            return { currentStart: monday, currentEnd: sunday, prevStart: prevMonday, prevEnd: prevSunday };
        }

        // monthly
        const first = new Date(now.getFullYear(), now.getMonth(), 1); first.setHours(0, 0, 0, 0);
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0); last.setHours(23, 59, 59, 999);
        const prevFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1); prevFirst.setHours(0, 0, 0, 0);
        const prevLast = new Date(now.getFullYear(), now.getMonth(), 0); prevLast.setHours(23, 59, 59, 999);
        return { currentStart: first, currentEnd: last, prevStart: prevFirst, prevEnd: prevLast };
    };

    const safeDate = (v) => {
        if (!v) return null;
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? null : d;
    };

    const computePeriodMetricsFromBookings = (bookingsArr, start, end) => {
        const filtered = bookingsArr.filter(b => {
            const d = safeDate(b.createdAt ?? b.created_at ?? b.bookedAt ?? null);
            return d && d >= start && d <= end;
        });

        const bookingsCount = filtered.length;
        // Revenue only counts bookings where payment_status is 'completed' or 'refund_rejected'
        const revenue = filtered.reduce((s, b) => {
            const ps = (b.paymentStatus || b.payment_status || '').toString().toLowerCase();
            if (ps === 'completed' || ps === 'refund_rejected') {
                return s + Number(b.totalPrice ?? b.total_price ?? b.amount ?? 0);
            }
            return s;
        }, 0);
        const usersSet = new Set(filtered.map(b => (b.guestEmail || b.guest_email || b.email || '').toLowerCase()).filter(Boolean));
        const usersCount = usersSet.size;
        // Refunds are counted when payment_status = 'refund_success'
        const refunds = filtered.filter(b => (b.paymentStatus || b.payment_status || '').toString().toLowerCase() === 'refund_success');
        const refundsCount = refunds.length;
        const refundsAmount = refunds.reduce((s, b) => s + Number(b.totalPrice ?? b.total_price ?? b.amount ?? 0), 0);

        return { bookingsCount, revenue, usersCount, refundsCount, refundsAmount };
    };

    const computePercent = (curr, prev) => {
        const c = Number(curr || 0);
        const p = Number(prev || 0);
        if (p === 0) return c === 0 ? 0 : 100;
        return Math.round(((c - p) / p) * 100);
    };

    const [periodComparisons, setPeriodComparisons] = useState(null);

    const computeComparisons = async (tf) => {
        try {
            const ranges = getPeriodRanges(tf);
            // fetch bookings and hotels
            const bResp = await apiService.bookings.getAll();
            const bookingsArr = bResp?.data || [];
            const hResp = await apiService.hotels.getAll();
            const hotelsArr = hResp?.data || [];

            const curr = computePeriodMetricsFromBookings(bookingsArr, ranges.currentStart, ranges.currentEnd);
            const prev = computePeriodMetricsFromBookings(bookingsArr, ranges.prevStart, ranges.prevEnd);

            // Only count active hotels: hotel_status = 'open' AND property_status = 'enabled'
            const hotelIsActive = (h) => {
                const hs = (h.hotel_status || h.hotelStatus || '').toString().toLowerCase();
                const ps = (h.property_status || h.propertyStatus || '').toString().toLowerCase();
                return hs === 'open' && ps === 'enabled';
            };

            const hotelsCurr = hotelsArr.filter(h => {
                const d = safeDate(h.createdAt ?? h.created_at);
                return d && d >= ranges.currentStart && d <= ranges.currentEnd && hotelIsActive(h);
            }).length;
            const hotelsPrev = hotelsArr.filter(h => {
                const d = safeDate(h.createdAt ?? h.created_at);
                return d && d >= ranges.prevStart && d <= ranges.prevEnd && hotelIsActive(h);
            }).length;

            const comparisons = {
                bookings: { percent: computePercent(curr.bookingsCount, prev.bookingsCount), diff: curr.bookingsCount - prev.bookingsCount },
                revenue: { percent: computePercent(curr.revenue, prev.revenue), diff: curr.revenue - prev.revenue },
                hotels: { percent: computePercent(hotelsCurr, hotelsPrev), diff: hotelsCurr - hotelsPrev },
                users: { percent: computePercent(curr.usersCount, prev.usersCount), diff: curr.usersCount - prev.usersCount },
                refunds: { percent: computePercent(curr.refundsCount, prev.refundsCount), diff: curr.refundsCount - prev.refundsCount, amountDiff: curr.refundsAmount - prev.refundsAmount }
            };

            setPeriodComparisons(comparisons);
        } catch (err) {
            console.error('Failed to compute period comparisons:', err);
            setPeriodComparisons(null);
        }
    };

    useEffect(() => {
        loadAnalyticsData(timeframe);
        computeComparisons(timeframe);
    }, [timeframe]);

    // Choose display trend: prefer periodComparisons if available
    const displayBookingTrend = periodComparisons?.bookings ?? bookingTrendChange;
    const displayRevenueTrend = periodComparisons?.revenue ?? revenueTrendChange;
    const displayHotelsTrend = periodComparisons?.hotels ?? hotelsTrendChange;
    const displayUsersTrend = periodComparisons?.users ?? usersTrendChange;
    const displayRefundsTrend = periodComparisons?.refunds ?? refundsTrendChange;

    const renderPieChart = () => {
        if (!locationData) return null;

        let currentAngle = 0;
        const totalRevenue = locationData.reduce((sum, loc) => sum + Number(loc?.revenue || 0), 0);
        if (!(totalRevenue > 0)) return null;

        return (
            <div className="simple-pie-chart">
                <div className="pie-container">
                    <svg width="200" height="200" viewBox="0 0 200 200">
                        {locationData.map((location, index) => {
                            const percentage = (location.revenue / totalRevenue) * 100;
                            const angle = (percentage / 100) * 360;
                            const largeArcFlag = angle > 180 ? 1 : 0;

                            const x1 = 100 + 80 * Math.cos(currentAngle * Math.PI / 180);
                            const y1 = 100 + 80 * Math.sin(currentAngle * Math.PI / 180);

                            const x2 = 100 + 80 * Math.cos((currentAngle + angle) * Math.PI / 180);
                            const y2 = 100 + 80 * Math.sin((currentAngle + angle) * Math.PI / 180);

                            const pathData = [
                                `M 100 100`,
                                `L ${x1} ${y1}`,
                                `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                                `Z`
                            ].join(' ');

                            const slice = (
                                <path
                                    key={index}
                                    d={pathData}
                                    fill={chartColors.pie[index]}
                                    stroke="#fff"
                                    strokeWidth="2"
                                    style={{ cursor: 'pointer' }}
                                    title={`${location.location}: ₹${location.revenue?.toLocaleString()}`}
                                    onClick={() => handleChartClick('location', { location: location.location })}
                                />
                            );

                            currentAngle += angle;
                            return slice;
                        })}
                        <circle cx="100" cy="100" r="50" fill="white" />
                    </svg>
                </div>

                <div className="pie-legend">
                    {locationData.map((location, index) => (
                        <div key={index} className="legend-item">
                            <div
                                className="legend-color"
                                style={{ backgroundColor: chartColors.pie[index] }}
                            ></div>
                            <span>{location.location}: {location.percentage}%</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderBarChart = () => {
        if (!locationData) return null;

        const maxRevenue = Math.max(0, ...locationData.map(loc => Number(loc?.revenue || 0)));
        if (!(maxRevenue > 0)) return null;

        return (
            <div className="simple-bar-chart">
                {locationData.map((location, index) => {
                    const barHeight = (location.revenue / maxRevenue) * 100;

                    return (
                        <div key={index} className="bar-column">
                            <div
                                className="bar"
                                style={{
                                    height: `${barHeight}%`,
                                    backgroundColor: chartColors.pie[index],
                                    cursor: 'pointer'
                                }}
                                title={`₹${location.revenue.toLocaleString()}`}
                                onClick={() => handleChartClick('location', { location: location.location })}
                            >
                                <span className="bar-value">₹{formatRevenueShort(location.revenue)}</span>
                            </div>
                            <span className="bar-label">{location.location}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderRefundsChart = () => {
        // If bookingTrends contains refunds/cancellations field, render a line chart
        const hasRefundsInTrends = Array.isArray(bookingTrends) && bookingTrends.some(t => Number(t?.refunds || t?.cancellations || 0) > 0);

        if (hasRefundsInTrends) {
            const maxRefunds = Math.max(0, ...bookingTrends.map(item => Number(item.refunds || item.cancellations || 0)));
            return (
                <div className="chart-section">
                    <h3>Cancellations / Refunds Over Time</h3>
                    <div className="chart-container">
                        <div className="simple-line-chart">
                            <div className="chart-lines">
                                {bookingTrends.map((item, index) => {
                                    const refundVal = Number(item.refunds || item.cancellations || 0);
                                    const height = maxRefunds > 0 ? (refundVal / maxRefunds) * 100 : 0;
                                    return (
                                        <div key={index} className="chart-column">
                                            <div className="column-container">
                                                <div
                                                    className="revenue-bar"
                                                    style={{ height: `${height}%`, cursor: 'pointer', background: '#ef4444' }}
                                                    title={`${refundVal} refunds`}
                                                    onClick={() => handleChartClick('period', { period: item.period })}
                                                ></div>
                                            </div>
                                            <span className="period-label">{item.period}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Fallback: use paymentData to show refunds by hotel as a pie chart
        if (Array.isArray(paymentData) && paymentData.length > 0) {
            const refundItems = paymentData.map(p => ({ label: p.hotelName || p.hotel || 'Unknown', value: Number(p.refunded || 0) })).filter(x => x.value > 0);
            if (refundItems.length === 0) return (
                <div className="chart-section">
                    <h3>Cancellations / Refunds</h3>
                    <div className="chart-container">
                        <div className="no-data">No refund data available</div>
                    </div>
                </div>
            );

            // build simple pie from refundItems
            let curr = 0;
            const total = refundItems.reduce((s, r) => s + r.value, 0);
            return (
                <div className="chart-section">
                    <h3>Cancellations / Refunds by Hotel</h3>
                    <div className="chart-container">
                        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                            <svg width="200" height="200" viewBox="0 0 200 200">
                                {refundItems.map((it, i) => {
                                    const perc = (it.value / total) * 100;
                                    const angle = (perc / 100) * 360;
                                    const largeArc = angle > 180 ? 1 : 0;
                                    const x1 = 100 + 80 * Math.cos(curr * Math.PI / 180);
                                    const y1 = 100 + 80 * Math.sin(curr * Math.PI / 180);
                                    const x2 = 100 + 80 * Math.cos((curr + angle) * Math.PI / 180);
                                    const y2 = 100 + 80 * Math.sin((curr + angle) * Math.PI / 180);
                                    const path = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;
                                    const color = chartColors.pie[i % chartColors.pie.length];
                                    curr += angle;
                                    return (
                                        <path key={i} d={path} fill={color} stroke="#fff" strokeWidth="2" style={{ cursor: 'pointer' }} title={`${it.label}: ₹${it.value.toLocaleString()}`} onClick={() => handleChartClick('hotel', { hotelName: it.label })} />
                                    );
                                })}
                                <circle cx="100" cy="100" r="50" fill="white" />
                            </svg>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {refundItems.map((it, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <div style={{ width: 12, height: 12, background: chartColors.pie[i % chartColors.pie.length], borderRadius: 3 }}></div>
                                        <div style={{ fontWeight: 600 }}>{it.label}</div>
                                        <div style={{ marginLeft: 8, color: '#6b7280' }}>₹{it.value.toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="chart-section">
                <h3>Cancellations / Refunds</h3>
                <div className="chart-container">
                    <div className="no-data">No refund data available</div>
                </div>
            </div>
        );
    };

    const handleTimeframeChange = (newTimeframe) => {
        setTimeframe(newTimeframe);
    };

    if (loading && !metrics) {
        return (
            <div className="page-container">
                <div className="loading">Loading analytics data...</div>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* heading */}
            <div className="page-header">
                <h2 className=''>Analytics Dashboard</h2>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="timeframe-selector">
                        <button
                            className={timeframe === 'daily' ? 'active' : ''}
                            onClick={() => handleTimeframeChange('daily')}
                        >
                            Daily
                        </button>
                        <button
                            className={timeframe === 'weekly' ? 'active' : ''}
                            onClick={() => handleTimeframeChange('weekly')}
                        >
                            Weekly
                        </button>
                        <button
                            className={timeframe === 'monthly' ? 'active' : ''}
                            onClick={() => handleTimeframeChange('monthly')}
                        >
                            Monthly
                        </button>
                    </div>
                    <button onClick={exportAnalytics} style={{ padding: '8px 12px', borderRadius: 8, background: '#10b981', color: 'white', border: 'none', cursor: 'pointer' }}>Export</button>
                </div>
            </div>

            {loading ? (
                <div className="loading">Updating data...</div>
            ) : (
                <>
                    {/* Metrics Cards */}
                    <div className="analytics-grid !grid !grid-cols-1 md:!grid-cols-2 xl:!grid-cols-4">
                        <div className="analytics-card">
                            <h3>{bookingsLabel}</h3>
                            <p className="metric-value">{metrics?.bookings || 0}</p>
                            {/* <span className={`metric-change ${displayBookingTrend.percent >= 0 ? 'positive' : 'negative'}`}>
                                {displayBookingTrend.percent >= 0 ? '+' : ''}{displayBookingTrend.percent}% from previous
                            </span> */}
                        </div>
                        <div className="analytics-card">
                            <h3>{revenueLabel}</h3>
                            <p className="metric-value">₹{formatRevenueShort(metrics?.revenue || 0)}</p>
                            {/* <span className={`metric-change ${displayRevenueTrend.percent >= 0 ? 'positive' : 'negative'}`}>
                                {displayRevenueTrend.percent >= 0 ? '+' : ''}{displayRevenueTrend.percent}% from previous
                            </span> */}
                        </div>
                        <div className="analytics-card">
                            <h3>Total Users</h3>
                            <p className="metric-value">{metrics?.users || 0}</p>
                            {/* <span className={`metric-change ${displayUsersTrend.percent >= 0 ? 'positive' : 'negative'}`}>
                                {displayUsersTrend.percent >= 0 ? '+' : ''}{displayUsersTrend.percent}% from previous
                            </span> */}
                        </div>
                        <div className="analytics-card">
                            <h3>Total Refunds</h3>
                            <p className="metric-value">₹{formatRevenueShort(totalRefundsAmount)}</p>
                            {/* <span className={`metric-change ${displayRefundsTrend.percent >= 0 ? 'positive' : 'negative'}`}>
                                {displayRefundsTrend.percent >= 0 ? '+' : ''}{displayRefundsTrend.percent}% from previous
                            </span> */}
                        </div>
                    </div>

                    {/* Location Revenue Charts */}
                    <div className="charts-grid !grid !grid-cols-1 xl:!grid-cols-2 gap-8">
                        <div className="chart-section">
                            <h3>Revenue by Location - Distribution</h3>
                            <div className="chart-container">
                                {locationData && locationData.length > 0 && hasLocationRevenue ? (
                                    renderPieChart()
                                ) : (
                                    <div className="no-data">No location data available</div>
                                )}
                            </div>
                        </div>

                        {/* Cancellations / Refunds Analytics */}
                        {renderRefundsChart()}
                    </div>
                    
                    {/* Revenue by Location - Comparison */}
                    <div className="chart-section">
                        <h3>Revenue by Location - Comparison</h3>
                        <div className="chart-container">
                            {locationData && locationData.length > 0 && hasLocationRevenue ? (
                                renderBarChart()
                            ) : (
                                <div className="no-data">No location data available</div>
                            )}
                        </div>
                    </div>

                    {/* Location Progress Bars */}
                    <div className="chart-section">
                        <h3>Revenue Share by Location</h3>
                        <div className="location-stats">
                            {locationData && locationData.map((location, index) => (
                                <div key={index} className="location-item">
                                    <div className="location-header">
                                        <span className="location-name">{location.location}</span>
                                        <span className="location-revenue">₹{location.revenue?.toLocaleString()}</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{
                                                width: `${location.percentage}%`,
                                                backgroundColor: chartColors.pie[index]
                                            }}
                                        >
                                            <span className="percentage-text">{location.percentage}%</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Payment Analytics */}
                    <div className="chart-section">
                        <h3>Hotel-wise Payment Status</h3>

                        {/* Payment Summary Cards */}
                        <div className="payment-summary">
                            <div className="payment-card completed">
                                <div className="payment-icon">✓</div>
                                <div className="payment-info">
                                    <span className="payment-label">Total Payments (Completed)</span>
                                    <span className="payment-amount">
                                        ₹{(paymentData?.reduce((sum, hotel) => sum + Number(hotel?.completed || 0), 0) || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            <div className="payment-card refunded">
                                <div className="payment-icon">↩</div>
                                <div className="payment-info">
                                    <span className="payment-label">Total Refunds</span>
                                    <span className="payment-amount">
                                        ₹{(paymentData?.reduce((sum, hotel) => sum + Number(hotel?.refunded || 0), 0) || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Hotel-wise Payment Chart */}
                        <div className="payment-chart">
                            {paymentData && paymentData.length > 0 ? (
                                paymentData.map((hotel, index) => {
                                    const completedAmount = Number(hotel?.completed || 0);
                                    const refundedAmount = Number(hotel?.refunded || 0);
                                    const totalAmount = completedAmount + refundedAmount;
                                    const completedPercentage = totalAmount > 0 ? (completedAmount / totalAmount) * 100 : 0;
                                    const refundedPercentage = totalAmount > 0 ? (refundedAmount / totalAmount) * 100 : 0;

                                    return (
                                        <div key={index} className="hotel-payment-item">
                                            <div className="hotel-payment-header">
                                                <span className="hotel-name">{hotel?.hotelName || 'Unknown Hotel'}</span>
                                                <span className="hotel-total">Total: ₹{totalAmount.toLocaleString()}</span>
                                            </div>
                                            <div className="payment-bars">
                                                <div className="payment-bar-row">
                                                    <span className="bar-label completed-label">Completed</span>
                                                    <div className="bar-container">
                                                        <div
                                                            className="bar-fill completed-bar"
                                                            style={{ width: `${completedPercentage}%` }}
                                                        >
                                                            <span className="bar-text">₹{completedAmount.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                    <span className="bar-percentage">{completedPercentage.toFixed(1)}%</span>
                                                </div>
                                                <div className="payment-bar-row">
                                                    <span className="bar-label refunded-label">Refunded</span>
                                                    <div className="bar-container">
                                                        <div
                                                            className="bar-fill refunded-bar"
                                                            style={{ width: `${refundedPercentage}%` }}
                                                        >
                                                            <span className="bar-text">₹{refundedAmount.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                    <span className="bar-percentage">{refundedPercentage.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="no-data">No payment data available</div>
                            )}
                        </div>
                    </div>
                </>
            )}

            <style jsx>{`
                .page-container {
                padding: 20px;
                background: #f8fafc;
                min-height: 100vh;
                }
                
                .page-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                flex-wrap: wrap;
                gap: 15px;
                }
                
                .page-header h2 {
                color: #1e293b;
                margin: 0;
                font-size: 1.8rem;
                }
                
                .timeframe-selector {
                display: flex;
                gap: 10px;
                background: white;
                padding: 5px;
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                
                .timeframe-selector button {
                padding: 8px 16px;
                border: none;
                background: transparent;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s;
                font-weight: 500;
                color: #64748b;
                }
                
                .timeframe-selector button:hover {
                background: #f1f5f9;
                }
                
                .timeframe-selector button.active {
                background: #3b82f6;
                color: white;
                }
                
                .analytics-grid {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 20px;
                margin-bottom: 30px;
                padding-bottom: 8px;
                }
                
                .analytics-card {
                background: white;
                padding: 25px;
                border-radius: 12px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                border-left: 4px solid #3b82f6;
                transition: transform 0.2s, box-shadow 0.2s;
                width: 100%;
                max-width: none;
                }
                
                .analytics-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                
                .analytics-card h3 {
                margin: 0 0 15px 0;
                color: #64748b;
                font-size: 0.9rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                }
                
                .metric-value {
                font-size: 2.5rem;
                font-weight: bold;
                margin: 10px 0;
                color: #1e293b;
                line-height: 1;
                }
                
                .metric-change {
                font-size: 0.85rem;
                font-weight: 500;
                }
                
                .metric-change.positive {
                color: #10b981;
                }
                
                .metric-change.negative {
                color: #ef4444;
                }

                .metric-change.neutral {
                color: #6b7280;
                }
                
                .chart-section {
                background: white;
                padding: 25px;
                border-radius: 12px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                margin-bottom: 25px;
                }
                
                .chart-section h3 {
                margin: 0 0 20px 0;
                color: #1e293b;
                font-size: 1.3rem;
                font-weight: 600;
                }
                
                .charts-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 25px;
                margin-bottom: 25px;
                }
                
                .chart-container {
                height: 400px;
                margin-top: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                }
                
                /* Simple Line Chart Styles */
                .simple-line-chart {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                }
                
                .chart-lines {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                height: 300px;
                padding: 20px;
                border-bottom: 2px solid #e2e8f0;
                }
                
                .chart-column {
                display: flex;
                flex-direction: column;
                align-items: center;
                flex: 1;
                margin: 0 5px;
                }
                
                .column-container {
                display: flex;
                align-items: flex-end;
                gap: 4px;
                height: 100%;
                width: 30px;
                }
                
                .booking-bar {
                background: ${chartColors.primary};
                width: 12px;
                border-radius: 3px 3px 0 0;
                transition: all 0.3s ease;
                }
                
                .revenue-bar {
                background: ${chartColors.secondary};
                width: 12px;
                border-radius: 3px 3px 0 0;
                transition: all 0.3s ease;
                }
                
                .booking-bar:hover, .revenue-bar:hover {
                opacity: 0.8;
                transform: scale(1.1);
                }
                
                .period-label {
                margin-top: 8px;
                font-size: 0.8rem;
                color: #64748b;
                font-weight: 500;
                }
                
                .chart-legend {
                display: flex;
                justify-content: center;
                gap: 20px;
                margin-top: 15px;
                }
                
                .legend-item {
                display: flex;
                align-items: center;
                gap: 8px;
                }
                
                .legend-color {
                width: 16px;
                height: 16px;
                border-radius: 3px;
                }
                
                .legend-color.booking {
                background: ${chartColors.primary};
                }
                
                .legend-color.revenue {
                background: ${chartColors.secondary};
                }
                
                /* Simple Pie Chart Styles */
                .simple-pie-chart {
                display: flex;
                align-items: center;
                gap: 30px;
                width: 100%;
                height: 100%;
                }
                
                .pie-container {
                flex-shrink: 0;
                }
                
                .pie-legend {
                display: flex;
                flex-direction: column;
                gap: 12px;
                }
                
                /* Simple Bar Chart Styles */
                .simple-bar-chart {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                height: 300px;
                width: 100%;
                padding: 20px;
                }
                
                .bar-column {
                display: flex;
                flex-direction: column;
                align-items: center;
                flex: 1;
                margin: 0 10px;
                }
                
                .bar {
                width: 40px;
                border-radius: 4px 4px 0 0;
                transition: all 0.3s ease;
                display: flex;
                justify-content: center;
                align-items: flex-start;
                position: relative;
                }
                
                .bar:hover {
                opacity: 0.8;
                transform: scale(1.05);
                }
                
                .bar-value {
                color: white;
                font-weight: bold;
                font-size: 0.7rem;
                margin-top: 5px;
                text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                }
                
                .bar-label {
                margin-top: 8px;
                font-size: 0.8rem;
                color: #64748b;
                font-weight: 500;
                }
                
                .location-stats {
                margin-top: 20px;
                }
                
                .location-item {
                margin-bottom: 20px;
                }
                
                .location-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
                align-items: center;
                }
                
                .location-name {
                font-weight: 600;
                color: #374151;
                font-size: 0.95rem;
                }
                
                .location-revenue {
                color: #6b7280;
                font-weight: 500;
                font-size: 0.9rem;
                }
                
                .progress-bar {
                width: 100%;
                height: 32px;
                background: #f1f5f9;
                border-radius: 16px;
                overflow: hidden;
                position: relative;
                box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
                }
                
                .progress-fill {
                height: 100%;
                border-radius: 16px;
                transition: width 0.5s ease;
                display: flex;
                align-items: center;
                justify-content: flex-end;
                padding: 0 15px;
                min-width: 60px;
                }
                
                .percentage-text {
                color: white;
                font-weight: 600;
                font-size: 0.8rem;
                text-shadow: 0 1px 2px rgba(0,0,0,0.2);
                }
                
                .loading, .no-data {
                text-align: center;
                padding: 40px;
                background: white;
                border-radius: 10px;
                margin: 20px 0;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                
                .loading {
                color: #64748b;
                font-size: 1.1rem;
                }
                
                .no-data {
                color: #6b7280;
                font-style: italic;
                }
                
                @media (max-width: 768px) {
                .page-container {
                    padding: 15px;
                }
                
                .charts-grid {
                    grid-template-columns: 1fr;
                    gap: 20px;
                }
                
                .page-header {
                    flex-direction: column;
                    align-items: flex-start;
                }
                
                .timeframe-selector {
                    width: 100%;
                    justify-content: center;
                }
                
                .analytics-grid {
                    grid-template-columns: 1fr;
                    gap: 15px;
                }
                
                .chart-container {
                    height: 300px;
                }
                
                .metric-value {
                    font-size: 2rem;
                }
                
                .simple-pie-chart {
                    flex-direction: column;
                    gap: 20px;
                }
                }
                
                /* Payment Analytics Styles */
                .payment-summary {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }
                
                .payment-card {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    padding: 25px;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                
                .payment-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
                }
                
                .payment-card.completed {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                }
                
                .payment-card.refunded {
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    color: white;
                }
                
                .payment-icon {
                    font-size: 3rem;
                    background: rgba(255,255,255,0.2);
                    width: 70px;
                    height: 70px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                }
                
                .payment-info {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                
                .payment-label {
                    font-size: 0.9rem;
                    opacity: 0.95;
                    font-weight: 500;
                }
                
                .payment-amount {
                    font-size: 2rem;
                    font-weight: bold;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                
                .payment-chart {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                
                .hotel-payment-item {
                    background: #f8fafc;
                    padding: 20px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                }
                
                .hotel-payment-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }
                
                .hotel-name {
                    font-weight: 600;
                    color: #1e293b;
                    font-size: 1.1rem;
                }
                
                .hotel-total {
                    font-weight: 600;
                    color: #64748b;
                    font-size: 0.95rem;
                }
                
                .payment-bars {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .payment-bar-row {
                    display: grid;
                    grid-template-columns: 100px 1fr 80px;
                    gap: 12px;
                    align-items: center;
                }
                
                .bar-label {
                    font-size: 0.85rem;
                    font-weight: 600;
                }
                
                .completed-label {
                    color: #10b981;
                }
                
                .refunded-label {
                    color: #ef4444;
                }
                
                .bar-container {
                    height: 35px;
                    background: #e2e8f0;
                    border-radius: 17px;
                    overflow: hidden;
                    box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
                }
                
                .bar-fill {
                    height: 100%;
                    border-radius: 17px;
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    padding: 0 12px;
                    transition: width 0.5s ease;
                    min-width: 80px;
                }
                
                .completed-bar {
                    background: linear-gradient(90deg, #10b981 0%, #059669 100%);
                }
                
                .refunded-bar {
                    background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
                }
                
                .bar-text {
                    color: white;
                    font-weight: 600;
                    font-size: 0.8rem;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.2);
                    white-space: nowrap;
                }
                
                .bar-percentage {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #64748b;
                    text-align: right;
                }
                
                @media (max-width: 480px) {
                .chart-section {
                    padding: 20px 15px;
                }
                
                .analytics-card {
                    padding: 20px;
                }
                
                .payment-summary {
                    grid-template-columns: 1fr;
                }
                
                .payment-bar-row {
                    grid-template-columns: 80px 1fr 60px;
                    gap: 8px;
                }
                
                .bar-label {
                    font-size: 0.75rem;
                }
                
                .payment-icon {
                    width: 60px;
                    height: 60px;
                    font-size: 2.5rem;
                }
                
                .payment-amount {
                    font-size: 1.6rem;
                }
                }
            `}</style>
        </div>
    );
};

export default Analytics;