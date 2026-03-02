import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import AIChatAssistant from './AIChatAssistant';

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    // Start with the sidebar closed by default on all devices.
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    // Close sidebar on route change on mobile
    useEffect(() => {
        if (window.innerWidth <= 992) {
            setIsSidebarOpen(false);
        }
    }, [location.pathname]);
    
    // Add resize listener to handle sidebar state changes for mobile view
    useEffect(() => {
        const handleResize = () => {
            // If window becomes mobile-sized, always ensure the sidebar is closed.
            if (window.innerWidth <= 992) {
                if (isSidebarOpen) {
                    setIsSidebarOpen(false);
                }
            }
            // For desktop, we don't automatically open it, respecting the user's choice.
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isSidebarOpen]);


    return (
        <div className={`app-layout ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
            <Sidebar isOpen={isSidebarOpen} />
            {/* The backdrop is only needed for the mobile overlay menu */}
            {isSidebarOpen && window.innerWidth <= 992 && (
                 <div className="sidebar-backdrop" onClick={toggleSidebar}></div>
            )}
            <main className="app-main">
                <MainHeader onToggleSidebar={toggleSidebar} />
                <div className="app-content">
                    {children}
                </div>
            </main>
            <AIChatAssistant />
        </div>
    );
};

export default MainLayout;