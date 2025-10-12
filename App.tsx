
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import ReportsPage from './pages/ReportsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import StoreDetailPage from './pages/StoreDetailPage';
import StoresListPage from './pages/StoresListPage';
import RegionAnalysisPage from './pages/RegionAnalysisPage';
import { DataProvider, useData } from './DataContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useData();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

const AppRoutes: React.FC = () => {
    const { isAuthenticated } = useData();
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/region-analysis" element={<ProtectedRoute><RegionAnalysisPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/store/:storeId" element={<ProtectedRoute><StoreDetailPage /></ProtectedRoute>} />
            <Route path="/stores" element={<ProtectedRoute><StoresListPage /></ProtectedRoute>} />
            <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
        </Routes>
    );
}

const App: React.FC = () => {
    return (
        <DataProvider>
            <Router>
                <AppRoutes />
            </Router>
        </DataProvider>
    );
};

export default App;