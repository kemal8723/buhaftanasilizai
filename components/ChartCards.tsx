// FIX: Created file content to provide chart components required by other pages.
import React from 'react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ChartData } from '../types';

interface ChartCardProps {
    title: string;
    value?: string;
    subtitle?: string;
    change?: string;
    changeType?: 'positive' | 'negative';
    data: ChartData[];
    filterId?: string; // For HorizontalBarChartCard
    headerAddon?: React.ReactNode;
    totalValue?: number;
    tooltipText?: string;
}

export const AreaChartCard: React.FC<ChartCardProps> = ({ title, value, change, changeType, data, headerAddon, tooltipText }) => {
    const changeColorClass = changeType === 'positive' ? 'positive' : 'negative';
    return (
        <div className="card chart-card">
            {tooltipText && (
                <div className="card-tooltip-container">
                    <span className="material-symbols-outlined">help</span>
                    <div className="card-tooltip">{tooltipText}</div>
                </div>
            )}
            <div className="card-header">
                <div>
                    <h3 className="card-title">{title}</h3>
                    <div className="card-header-stats">
                        {value && <p className="card-header-value">{value}</p>}
                        {change && <p className={`card-header-change ${changeColorClass}`}>{change}</p>}
                    </div>
                </div>
                 {headerAddon}
            </div>
            <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                        <XAxis dataKey="name" tick={{ fill: 'var(--text-color-light)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'var(--text-color-light)' }} axisLine={false} tickLine={false} />
                        <Tooltip 
                            contentStyle={{
                                backgroundColor: 'var(--card-bg-color)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--border-radius)',
                            }}
                        />
                        <Area type="monotone" dataKey="value" stroke="var(--primary-color)" strokeWidth={3} fillOpacity={1} fill="url(#colorUv)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const CustomSentimentTooltip: React.FC<any> = ({ active, payload, label, totalValue }) => {
    if (active && payload && payload.length && typeof totalValue === 'number') {
        const data = payload[0].payload;
        const percentage = totalValue > 0 ? ((data.value / totalValue) * 100).toFixed(1) : 0;
        return (
            <div className="custom-tooltip">
                <p className="label">{`${label}`}</p>
                <p className="intro">{`Geri Bildirim Sayısı: ${data.value}`}</p>
                <p className="desc">{`Dönem Toplamına Oranı: %${percentage}`}</p>
            </div>
        );
    }
    return null;
};

export const HorizontalBarChartCard: React.FC<ChartCardProps> = ({ title, value, subtitle, change, changeType, data, headerAddon, totalValue, tooltipText }) => {
    const changeColorClass = changeType === 'positive' ? 'positive' : 'negative';
    
    const sortedData = [...data].sort((a, b) => a.value - b.value);

    const getColor = (name: string) => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('olumlu')) return 'var(--success-color)';
        if (lowerName.includes('olumsuz')) return 'var(--error-color)';
        return 'var(--text-color-light)'; // For Nötr
    };
    
    return (
        <div className="card chart-card">
            {tooltipText && (
                <div className="card-tooltip-container">
                    <span className="material-symbols-outlined">help</span>
                    <div className="card-tooltip">{tooltipText}</div>
                </div>
            )}
            <div className="card-header">
                <div>
                    <h3 className="card-title">{title}</h3>
                    <div className="card-header-stats">
                        {value && <p className="card-header-value">{value}</p>}
                        {subtitle && <p className="card-header-subtitle">{subtitle}</p>}
                        {change && <p className={`card-header-change ${changeColorClass}`}>{change}</p>}
                    </div>
                </div>
                 {headerAddon}
            </div>
            <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sortedData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis 
                            type="category" 
                            dataKey="name" 
                            width={100} 
                            tickLine={false} 
                            axisLine={false}
                            tick={{ fill: 'var(--text-color)' }}
                        />
                        <Tooltip 
                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                            content={<CustomSentimentTooltip totalValue={totalValue} />}
                        />
                        <Bar dataKey="value" barSize={15} radius={[0, 10, 10, 0]}>
                            {sortedData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};