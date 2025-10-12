import React, { useState } from 'react';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import AIChatAssistant from './AIChatAssistant';

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className={`app-layout ${!isSidebarOpen ? 'sidebar-collapsed' : ''}`}>
            <Sidebar isOpen={isSidebarOpen} />
            <div className="sidebar-backdrop" onClick={toggleSidebar}></div>
            <div className="app-main">
                <MainHeader onToggleSidebar={toggleSidebar} />
                <div className="app-content">
                    {children}
                </div>
            </div>
            <AIChatAssistant />
        </div>
    );
};

export default MainLayout;
