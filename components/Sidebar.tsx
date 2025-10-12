import React from 'react';
import { NavLink } from 'react-router-dom';
import LogoImage from './LogoImage';
import { useData } from '../DataContext';

interface SidebarProps {
    isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
    const { currentUser } = useData();
    
    const canViewAnalysisPages = currentUser && !['Bölge Müdürü', 'Satış Operasyon Müdürü'].includes(currentUser.role);

    return (
        <aside className={`sidebar ${!isOpen ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <NavLink to="/dashboard" className="sidebar-logo-link">
                    <LogoImage className="sidebar-logo-icon" />
                    <h2 className="sidebar-logo-text">Bu Hafta Nasılız AI</h2>
                </NavLink>
            </div>
            <nav className="sidebar-nav">
                <NavLink to="/dashboard" className="sidebar-nav-link" title="Ana Sayfa">
                    <span className="material-symbols-outlined sidebar-nav-icon">dashboard</span>
                    <span>Ana Sayfa</span>
                </NavLink>
                 <NavLink to="/stores" className="sidebar-nav-link" title="Mağazalar">
                    <span className="material-symbols-outlined sidebar-nav-icon">storefront</span>
                    <span>Mağazalar</span>
                </NavLink>
                <NavLink to="/upload" className="sidebar-nav-link" title="Veri Yükle">
                    <span className="material-symbols-outlined sidebar-nav-icon">upload_file</span>
                    <span>Veri Yükle</span>
                </NavLink>
                <NavLink to="/reports" className="sidebar-nav-link" title="Raporlar">
                    <span className="material-symbols-outlined sidebar-nav-icon">assessment</span>
                    <span>Raporlar</span>
                </NavLink>
                <NavLink to="/analytics" className="sidebar-nav-link" title="Analizler">
                    <span className="material-symbols-outlined sidebar-nav-icon">monitoring</span>
                    <span>Analizler</span>
                </NavLink>
                {canViewAnalysisPages && (
                    <NavLink to="/region-analysis" className="sidebar-nav-link" title="Bölge Analizi">
                        <span className="material-symbols-outlined sidebar-nav-icon">hub</span>
                        <span>Bölge Analizi</span>
                    </NavLink>
                )}
            </nav>
            <div className="sidebar-footer">
                <NavLink to="/settings" className="sidebar-nav-link" title="Ayarlar">
                    <span className="material-symbols-outlined sidebar-nav-icon">settings</span>
                    <span>Ayarlar</span>
                </NavLink>
            </div>
        </aside>
    );
};

export default Sidebar;