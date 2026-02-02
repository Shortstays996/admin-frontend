# SSH Admin Portal - Frontend Structure

## 📁 Directory Structure

```
admin-portal/
├── public/
│   ├── index.html          # HTML template
│   ├── manifest.json       # PWA manifest
│   └── robots.txt          # SEO robots file
│
├── src/
│   ├── components/         # React components (all .jsx)
│   │   ├── AddStaffModal.jsx      # Modal for adding staff
│   │   ├── Analytics.jsx          # Analytics dashboard page
│   │   ├── ChartComponent.jsx     # Reusable chart component
│   │   ├── Commission.jsx         # Commission management page
│   │   ├── Dashboard.jsx          # Main dashboard layout with routing
│   │   ├── Header.jsx             # Top navigation header
│   │   ├── HotelApproval.jsx      # Hotel approval management page
│   │   ├── LoginPage.jsx          # Login page with authentication
│   │   ├── Marketing.jsx          # Marketing campaigns page
│   │   ├── Overview.jsx           # Dashboard overview/home page
│   │   ├── ProfileMenu.jsx        # User profile dropdown menu
│   │   ├── RecentActivity.jsx     # Recent activity widget
│   │   ├── Sidebar.jsx            # Navigation sidebar with routes
│   │   ├── StatsCard.jsx          # Reusable statistics card
│   │   └── UserSupport.jsx        # User support/tickets page
│   │
│   ├── styles/             # CSS stylesheets
│   │   ├── Dashboard.css          # Dashboard and global styles
│   │   └── LoginPage.css          # Login page styles
│   │
│   ├── App.jsx             # Main app component with React Router
│   ├── App.css             # App-level styles
│   ├── index.js            # Application entry point
│   ├── index.css           # Global styles
│   ├── reportWebVitals.js  # Performance monitoring
│   └── setupTests.js       # Test setup configuration
│
├── package.json            # Dependencies and scripts
└── STRUCTURE.md           # This file
```

## 🚀 Routing Structure

### Routes Configuration

```
/ (root)
├── /login                  # Public route - Login page
│   └── Redirects to /dashboard if authenticated
│
└── /dashboard              # Protected route - Main dashboard layout
    ├── /dashboard (index)          → Overview component
    ├── /dashboard/overview         → Overview component
    ├── /dashboard/hotel-approval   → HotelApproval component
    ├── /dashboard/analytics        → Analytics component
    ├── /dashboard/commission       → Commission component
    ├── /dashboard/user-support     → UserSupport component
    └── /dashboard/marketing        → Marketing component
```

### Route Protection

- **Public Routes**: Accessible without authentication
  - `/login` - Redirects to dashboard if already logged in

- **Protected Routes**: Require authentication token
  - All `/dashboard/*` routes check for `adminToken` in localStorage
  - Redirects to `/login` if not authenticated

## 🔑 Authentication Flow

1. User visits `/` → Redirected to `/login` or `/dashboard` based on auth status
2. User enters credentials on `/login`
3. On successful login:
   - `adminToken` stored in localStorage
   - User redirected to `/dashboard`
4. On logout:
   - `adminToken` removed from localStorage
   - User redirected to `/login`

## 🧩 Component Hierarchy

```
App.jsx (Router Provider)
└── Routes
    ├── LoginPage.jsx
    └── Dashboard.jsx (Layout with Outlet)
        ├── Header.jsx
        │   └── ProfileMenu.jsx
        ├── Sidebar.jsx (NavLink navigation)
        └── Outlet (Renders nested route components)
            ├── Overview.jsx
            ├── HotelApproval.jsx
            ├── Analytics.jsx
            ├── Commission.jsx
            ├── UserSupport.jsx
            └── Marketing.jsx
```

## 📦 Key Dependencies

- **react**: ^19.2.0
- **react-dom**: ^19.2.0
- **react-router-dom**: ^7.x (for routing)
- **chart.js**: ^4.5.1 (for analytics charts)
- **react-scripts**: 5.0.1 (CRA build tools)

## 🎨 Styling Approach

- **CSS Modules**: No, using traditional CSS
- **Approach**: Component-scoped CSS files
- **Main Styles**: 
  - `Dashboard.css` - Dashboard layout, sidebar, components
  - `LoginPage.css` - Login page specific styles
- **Theme Colors**:
  - Primary: `#d11528` (SSH Red)
  - Background: `#f9fafb`
  - Text: `#6b7280`, `#111827`

## 🔧 Development Scripts

```bash
# Start development server
npm start                    # Runs on http://localhost:3000

# Build for production
npm run build               # Creates optimized production build

# Run tests
npm test                    # Runs test suite

# Eject from CRA (irreversible)
npm run eject               # Ejects from Create React App
```

## 🌐 API Integration

Currently using demo credentials. Update `LoginPage.jsx` to integrate with backend:

```javascript
// Replace demo login with actual API call
const response = await fetch('http://localhost:8000/api/admin/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
```

## 📝 File Naming Conventions

- **Components**: PascalCase with `.jsx` extension (e.g., `Dashboard.jsx`)
- **Styles**: PascalCase matching component with `.css` extension
- **Utilities**: camelCase with `.js` extension
- **Config files**: lowercase with hyphens (e.g., `package.json`)

## 🔄 Recent Changes

### Restructuring Updates

1. ✅ Converted all component files from `.js` to `.jsx`
2. ✅ Implemented React Router v6 for navigation
3. ✅ Created protected route wrapper for authentication
4. ✅ Updated `Sidebar.jsx` to use `NavLink` for active route highlighting
5. ✅ Updated `Dashboard.jsx` to use `Outlet` for nested routing
6. ✅ Updated `LoginPage.jsx` to use `useNavigate` hook
7. ✅ Added CSS support for NavLink styling (text-decoration: none)

## 🚧 Next Steps

- [ ] Integrate with backend API endpoints
- [ ] Add error boundaries for better error handling
- [ ] Implement real authentication with JWT
- [ ] Add loading states and skeletons
- [ ] Implement form validation
- [ ] Add toast notifications
- [ ] Optimize bundle size with code splitting
- [ ] Add unit and integration tests
- [ ] Implement responsive design improvements
- [ ] Add accessibility features (ARIA labels, keyboard navigation)

## 📚 Navigation Usage

### In Components
```jsx
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();
  
  // Navigate programmatically
  navigate('/dashboard/overview');
  
  // Navigate with replace
  navigate('/login', { replace: true });
}
```

### In Sidebar/Links
```jsx
import { NavLink } from 'react-router-dom';

<NavLink 
  to="/dashboard/overview"
  className={({ isActive }) => isActive ? 'active' : ''}
>
  Overview
</NavLink>
```

## 🔐 Protected Route Pattern

```jsx
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  return token ? children : <Navigate to="/login" replace />;
};

// Usage in App.jsx
<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```
