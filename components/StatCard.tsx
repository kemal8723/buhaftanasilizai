import React from 'react';

interface StatCardProps {
    icon: string;
    title: string;
    value: string;
    secondarySubtitle?: string;
    change?: string;
    changeType?: 'positive' | 'negative';
    subtitle?: string;
    tooltipText?: string;
    headerAddon?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, secondarySubtitle, change, changeType, subtitle, tooltipText, headerAddon }) => {
    const changeColorClass = changeType === 'positive' ? 'positive' : 'negative';

    return (
        <div className="card stat-card">
            {tooltipText && (
                <div className="card-tooltip-container">
                    <span className="material-symbols-outlined">help</span>
                    <div className="card-tooltip">{tooltipText}</div>
                </div>
            )}
            <div className="stat-card-header">
                <div className="stat-card-header-main">
                    <div className="stat-card-icon-container">
                        <span className="material-symbols-outlined">{icon}</span>
                    </div>
                    <p className="stat-card-title">{title}</p>
                </div>
                {headerAddon}
            </div>
            <p className="stat-card-value">{value}</p>
            {secondarySubtitle && (
                 <p className="stat-card-secondary-subtitle">{secondarySubtitle}</p>
            )}
            <div className="stat-card-footer">
                {change && changeType && (
                    <p className={`stat-card-change ${changeColorClass}`}>{change}</p>
                )}
                {subtitle && (
                     <p className="stat-card-subtitle">{subtitle}</p>
                )}
            </div>
        </div>
    );
};

export default StatCard;