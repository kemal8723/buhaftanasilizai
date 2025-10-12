import React, { useState, useMemo, useEffect } from 'react';
import MainLayout from '../components/MainLayout';
import { useData } from '../DataContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AIInsightsCard from '../components/AIInsightsCard';
import { Comment, TurnoverHistory, StoreData } from '../types';

// Helper function to get week of year (local to this component)
const getWeekOfYear = (dateString: string): string => {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Bilinmeyen';
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    } catch (e) {
        return 'Bilinmeyen';
    }
};

// Helper function to calculate monthly trends (local to this component)
const calculateSentimentTrends = (comments: Comment[]): any[] => {
    const trendsByMonth: { [key: string]: { olumlu: number, olumsuz: number, notr: number } } = {};
    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

    comments.forEach(comment => {
        try {
            const date = new Date(comment.date);
            if (isNaN(date.getTime())) return;
            const year = date.getFullYear();
            const monthIndex = date.getMonth();
            const monthKey = `${year}-${String(monthIndex).padStart(2, '0')}`;

            if (!trendsByMonth[monthKey]) {
                trendsByMonth[monthKey] = { olumlu: 0, olumsuz: 0, notr: 0 };
            }

            if (comment.sentiment === 'positive') trendsByMonth[monthKey].olumlu++;
            else if (comment.sentiment === 'negative') trendsByMonth[monthKey].olumsuz++;
            else trendsByMonth[monthKey].notr++;
        } catch (e) {
            console.warn(`Invalid date format for trend calculation: ${comment.date}`);
        }
    });

    return Object.keys(trendsByMonth).sort().map(key => {
        const monthIndex = parseInt(key.split('-')[1]);
        return { name: monthNames[monthIndex], ...trendsByMonth[key] };
    });
};

// Helper function to calculate weekly trends (local to this component)
const calculateWeeklySentimentTrends = (comments: Comment[]): any[] => {
    const trendsByWeek: { [key: string]: { olumlu: number, olumsuz: number, notr: number } } = {};
    comments.forEach(comment => {
        const weekKey = getWeekOfYear(comment.date);
        if (weekKey === 'Bilinmeyen') return;
        if (!trendsByWeek[weekKey]) {
            trendsByWeek[weekKey] = { olumlu: 0, olumsuz: 0, notr: 0 };
        }
        if (comment.sentiment === 'positive') trendsByWeek[weekKey].olumlu++;
        else if (comment.sentiment === 'negative') trendsByWeek[weekKey].olumsuz++;
        else trendsByWeek[weekKey].notr++;
    });
    return Object.keys(trendsByWeek).sort().map(key => ({ name: key, ...trendsByWeek[key] }));
};

// TurnoverHistoryCard component (copied from StoreDetailPage and adapted)
const TurnoverHistoryCard: React.FC<{ history: TurnoverHistory[]; storeName: string }> = ({ history, storeName }) => {
    if (!history || history.length === 0) {
        return (
            <div className="card">
                <h3 className="card-title" style={{padding: '0 0 1.5rem 0'}}>Aylık Turnover Geçmişi</h3>
                <div className="placeholder-card" style={{minHeight: '340px', border: 'none', background: 'var(--app-bg-color)'}}>
                    <p className="placeholder-text">Seçilen mağaza ({storeName}) için turnover verisi bulunmuyor.</p>
                </div>
            </div>
        )
    }

    const monthOrder = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const sortedHistory = [...history].sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));

    return (
        <div className="card">
            <h3 className="card-title" style={{padding: '0 0 1.5rem 0'}}>Aylık Turnover Geçmişi: {storeName}</h3>
            <div className="turnover-history-grid">
                <div className="turnover-chart-container" style={{height: '300px'}}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sortedHistory} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="month" tick={{ fill: 'var(--text-color-light)' }} />
                            <YAxis tickFormatter={(value) => `${value.toLocaleString('tr-TR')}%`} tick={{ fill: 'var(--text-color-light)' }} />
                            <Tooltip
                                formatter={(value: number) => [`${value.toLocaleString('tr-TR')}%`, 'Turnover Oranı']}
                                contentStyle={{
                                    backgroundColor: 'var(--card-bg-color)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--border-radius)',
                                }}
                            />
                            <Line type="monotone" dataKey="rate" stroke="var(--secondary-color)" strokeWidth={2} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="turnover-table-container" style={{maxHeight: '300px'}}>
                    <table className="turnover-table">
                        <thead>
                            <tr>
                                <th>Ay</th>
                                <th>Oran</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedHistory.map(item => (
                                <tr key={item.month}>
                                    <td>{item.month}</td>
                                    <td>{item.rate.toLocaleString('tr-TR')}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const AnalyticsPage: React.FC = () => {
    const { 
        comments, 
        storeData, 
        loading,
        managers,
        getManagerForStore,
        currentUser,
        weekFilterOptions,
        monthFilterOptions,
        soms,
        getSomForStore,
        getManagersForSom
    } = useData();

    const [selectedSom, setSelectedSom] = useState('Tümü');
    const [selectedManager, setSelectedManager] = useState('Tümü');
    const [selectedStore, setSelectedStore] = useState('Tümü');
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [selectedWeek, setSelectedWeek] = useState('all');
    // FIX: Removed state for interactive keyword filtering from the word cloud.
    // const [keywordFilter, setKeywordFilter] = useState('');
    
    const canFilterBySom = currentUser && !['Bölge Müdürü', 'Satış Operasyon Müdürü'].includes(currentUser.role);

    const availableManagers = useMemo(() => {
        if (!canFilterBySom) return [];
        if (selectedSom === 'Tümü') {
            return managers;
        }
        const managersForSom = getManagersForSom(selectedSom);
        return ['Tümü', ...managersForSom.sort()];
    }, [selectedSom, managers, canFilterBySom, getManagersForSom]);

    useEffect(() => {
        if (!availableManagers.includes(selectedManager)) {
            setSelectedManager('Tümü');
        }
    }, [availableManagers, selectedManager]);
    
    const availableStores = useMemo(() => {
        let stores = storeData;
        if (canFilterBySom) {
            if (selectedSom !== 'Tümü') {
                stores = stores.filter(s => getSomForStore(s.name) === selectedSom);
            }
            if (selectedManager !== 'Tümü') {
                stores = stores.filter(s => getManagerForStore(s.name) === selectedManager);
            }
        }
        return stores.sort((a, b) => a.name.localeCompare(b.name));
    }, [storeData, selectedSom, selectedManager, canFilterBySom, getSomForStore, getManagerForStore]);
    
    React.useEffect(() => {
        if (selectedStore !== 'Tümü' && !availableStores.find(s => s.name === selectedStore)) {
            setSelectedStore('Tümü');
        }
    }, [selectedManager, availableStores, selectedStore, selectedSom]);

    const filteredComments = useMemo(() => {
        const validStoreNames = new Set(availableStores.map(s => s.name));
        
        return comments.filter(comment => {
            if (!validStoreNames.has(comment.store)) {
                return false;
            }
            const storeMatch = selectedStore === 'Tümü' || comment.store === selectedStore;
            const monthMatch = selectedMonth === 'all' || comment.month === selectedMonth;
            const weekMatch = selectedWeek === 'all' || comment.week === selectedWeek;
            // const keywordMatch = keywordFilter === '' || comment.text.toLowerCase().includes(keywordFilter.toLowerCase());
            return storeMatch && monthMatch && weekMatch;
        });
    }, [comments, availableStores, selectedStore, selectedMonth, selectedWeek]);
    
    const filteredStoreData = useMemo(() => {
        const storeNamesInFilteredComments = new Set(filteredComments.map(c => c.store));
        if (selectedStore !== 'Tümü') {
             return storeData.filter(s => s.name === selectedStore);
        }
        return storeData.filter(s => storeNamesInFilteredComments.has(s.name));
    }, [filteredComments, storeData, selectedStore]);


    const monthlyChartData = useMemo(() => calculateSentimentTrends(filteredComments), [filteredComments]);
    const weeklyChartData = useMemo(() => calculateWeeklySentimentTrends(filteredComments), [filteredComments]);
    
    const selectedStoreData = useMemo(() => {
        if (selectedStore === 'Tümü') return null;
        return storeData.find(s => s.name === selectedStore);
    }, [selectedStore, storeData]);

    const handleResetFilters = () => {
        setSelectedSom('Tümü');
        setSelectedManager('Tümü');
        setSelectedStore('Tümü');
        setSelectedMonth('all');
        setSelectedWeek('all');
        // setKeywordFilter('');
    };

    const filtersAreActive = selectedSom !== 'Tümü' || selectedManager !== 'Tümü' || selectedStore !== 'Tümü' || selectedMonth !== 'all' || selectedWeek !== 'all';

    if (loading) {
        return (
            <MainLayout>
                <div className="content-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
                    <p>Yükleniyor...</p>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="content-container">
                <div className="page-header">
                     <div>
                        <p className="page-title">Detaylı Analizler</p>
                        <p className="page-subtitle">Duygu trendlerini ve yapay zeka odaklı mağaza analizlerini inceleyin.</p>
                    </div>
                </div>

                <div className="card comments-filters-bar">
                    {canFilterBySom && (
                        <div className="filter-group">
                            <label htmlFor="som-filter">SOM</label>
                            <select id="som-filter" className="filter-select" value={selectedSom} onChange={(e) => setSelectedSom(e.target.value)}>
                                {soms.map(som => (
                                    <option key={som} value={som}>{som}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {canFilterBySom && (
                        <div className="filter-group">
                            <label htmlFor="manager-filter">Bölge Müdürü</label>
                            <select id="manager-filter" className="filter-select" value={selectedManager} onChange={(e) => setSelectedManager(e.target.value)}>
                                {availableManagers.map(manager => (
                                    <option key={manager} value={manager}>{manager}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="filter-group">
                        <label htmlFor="store-filter">Mağaza</label>
                        <select id="store-filter" className="filter-select" value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
                            <option value="Tümü">Tüm Mağazalar</option>
                            {availableStores.map(store => (
                                <option key={store.id} value={store.name}>{store.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label htmlFor="month-filter">Ay</label>
                        <select id="month-filter" className="filter-select" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                            {monthFilterOptions.map(month => (
                                <option key={month.value} value={month.value}>{month.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                            <label htmlFor="week-filter">Hafta</label>
                        <select id="week-filter" className="filter-select" value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)}>
                            {weekFilterOptions.map(week => (
                                <option key={week.value} value={week.value}>{week.label}</option>
                            ))}
                        </select>
                    </div>
                    {filtersAreActive && (
                        <button onClick={handleResetFilters} className="btn-link" style={{fontSize: '0.8rem', height: '40px'}}>
                            <span className="material-symbols-outlined" style={{fontSize: '1.2rem'}}>close</span>
                            Sıfırla
                        </button>
                    )}
                </div>

                <div className="dashboard-grid-2col">
                    <div className="card" style={{ height: '450px', paddingBottom: '2.5rem' }}>
                        <div className="card-header">
                            <h3 className="card-title">Aylık Duygu Analizi Trendi</h3>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={monthlyChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5, }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis dataKey="name" tick={{ fill: 'var(--text-color-light)' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: 'var(--text-color-light)' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)' }} />
                                <Legend wrapperStyle={{ color: 'var(--text-color)' }} />
                                <Line type="monotone" dataKey="olumlu" name="Olumlu" stroke="var(--success-color)" strokeWidth={3} activeDot={{ r: 8 }} />
                                <Line type="monotone" dataKey="olumsuz" name="Olumsuz" stroke="var(--error-color)" strokeWidth={3} activeDot={{ r: 8 }} />
                                <Line type="monotone" dataKey="notr" name="Nötr" stroke="var(--text-color-light)" strokeWidth={3} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                     <div className="card" style={{ height: '450px', paddingBottom: '2.5rem' }}>
                        <div className="card-header">
                            <h3 className="card-title">Haftalık Duygu Analizi Trendi</h3>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={weeklyChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5, }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis dataKey="name" tick={{ fill: 'var(--text-color-light)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                <YAxis tick={{ fill: 'var(--text-color-light)' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)' }} />
                                <Legend wrapperStyle={{ color: 'var(--text-color)' }} />
                                <Line type="monotone" dataKey="olumlu" name="Olumlu" stroke="var(--success-color)" strokeWidth={3} activeDot={{ r: 8 }} />
                                <Line type="monotone" dataKey="olumsuz" name="Olumsuz" stroke="var(--error-color)" strokeWidth={3} activeDot={{ r: 8 }} />
                                <Line type="monotone" dataKey="notr" name="Nötr" stroke="var(--text-color-light)" strokeWidth={3} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="section">
                    {selectedStoreData ? (
                        <TurnoverHistoryCard history={selectedStoreData.turnoverHistory} storeName={selectedStoreData.name} />
                    ) : (
                        <div className="card">
                             <div className="placeholder-card" style={{minHeight: '418px'}}>
                                <span className="material-symbols-outlined placeholder-icon">trending_down</span>
                                <h3 className="page-title" style={{fontSize: '1.25rem', marginBottom: '0.5rem'}}>Mağaza Turnover Analizi</h3>
                                <p className="placeholder-text">Bir mağazanın aylık turnover geçmişini görmek için yukarıdaki filtrelerden bir mağaza seçin.</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="section section-centered-card">
                    <AIInsightsCard defaultTab="focus" storeData={filteredStoreData} comments={filteredComments} />
                </div>
            </div>
        </MainLayout>
    );
};

export default AnalyticsPage;