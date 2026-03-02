import React, { useMemo, useState } from 'react';
import MainLayout from '../components/MainLayout';
import { useData } from '../DataContext';
import { AreaChartCard, HorizontalBarChartCard, MultiLineChartCard } from '../components/ChartCards';
import AIInsightsCard from '../components/AIInsightsCard';
import StatCard from '../components/StatCard';
import { Link } from 'react-router-dom';
import { ChartData, Comment, StoreData } from '../types';
import PerformanceKPICard from '../components/PerformanceKPICard';

// --- START: Local Type Definitions for Dashboard Metrics ---
interface HistoryAndMetrics {
    history: ChartData[];
    current: number;
    change: number;
}

interface PeriodMetrics {
    monthly: HistoryAndMetrics;
    weekly: HistoryAndMetrics;
}

interface DashboardChartMetrics {
    satisfaction: PeriodMetrics;
    feedbackCount: PeriodMetrics;
    activeStores: PeriodMetrics;
    actionRate: PeriodMetrics;
}
// --- END: Local Type Definitions for Dashboard Metrics ---


// --- START: DASHBOARD METRIC CALCULATION LOGIC (MOVED FROM DATACONTEXT) ---

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

const calculateSentimentDistribution = (comments: Comment[]): ChartData[] => {
    if (!comments || comments.length === 0) return [];
    const positive = comments.filter(c => c.sentiment === 'positive').length;
    const negative = comments.filter(c => c.sentiment === 'negative').length;
    const neutral = comments.filter(c => c.sentiment === 'neutral').length;
    return [
        { name: 'Olumlu', value: positive },
        { name: 'Olumsuz', value: negative },
        { name: 'Nötr', value: neutral },
    ].sort((a,b) => b.value - a.value);
};

const processHistory = (history: ChartData[]): HistoryAndMetrics => {
    if (history.length === 0) return { history, current: 0, change: 0 };
    const current = history[history.length - 1].value;
    const previous = history.length > 1 ? history[history.length - 2].value : 0;
    const change = current - previous;
    return { history, current, change };
};

const calculateHistory = (
    comments: Comment[], 
    period: 'monthly' | 'weekly',
    calculator: (group: Comment[]) => number
): ChartData[] => {
    const historyByPeriod: { [key: string]: Comment[] } = {};
    const monthOrder = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const shortMonthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
    
    comments.forEach(comment => {
        let key: string | undefined;
        
        if (period === 'monthly') {
            try {
                const date = new Date(comment.date);
                if (isNaN(date.getTime())) return;
                
                const year = date.getFullYear();
                // Prioritize the 'month' string field from the comment if it exists and is valid
                const monthIndex = comment.month ? monthOrder.indexOf(comment.month) : date.getMonth();
                
                if (monthIndex > -1) {
                    // Create a sortable key like '2024-01' (for January)
                    key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
                }
            } catch { return; }
        } else { // weekly
            key = comment.week || getWeekOfYear(comment.date);
        }

        if (!key || key === 'Bilinmeyen') return;
        if (!historyByPeriod[key]) historyByPeriod[key] = [];
        historyByPeriod[key].push(comment);
    });

    return Object.keys(historyByPeriod)
        .sort()
        .map(key => {
            let name = key;
            if(period === 'monthly') {
                // Convert '2024-01' back to a display name 'Oca'
                const monthIndex = parseInt(key.split('-')[1]) - 1; 
                name = shortMonthNames[monthIndex];
            } else {
                name = `W${key.split('-W')[1]}`;
            }
            return {
                name,
                value: calculator(historyByPeriod[key])
            };
        });
};

const calculateAllDashboardMetrics = (comments: Comment[]): DashboardChartMetrics => {
    const initialHistoryAndMetrics: HistoryAndMetrics = { history: [], current: 0, change: 0 };
    if (comments.length === 0) return {
        satisfaction: { monthly: initialHistoryAndMetrics, weekly: initialHistoryAndMetrics },
        feedbackCount: { monthly: initialHistoryAndMetrics, weekly: initialHistoryAndMetrics },
        activeStores: { monthly: initialHistoryAndMetrics, weekly: initialHistoryAndMetrics },
        actionRate: { monthly: initialHistoryAndMetrics, weekly: initialHistoryAndMetrics },
    };

    const satisfactionCalc = (group: Comment[]) => {
        const commentsWithRating = group.filter(c => typeof c.rating === 'number' && c.rating >= 1 && c.rating <= 5);
        if (commentsWithRating.length === 0) return 0;
        const averageRating = commentsWithRating.reduce((sum, c) => sum + c.rating!, 0) / commentsWithRating.length;
        return averageRating;
    };
    const feedbackCountCalc = (group: Comment[]) => group.length;
    const activeStoresCalc = (group: Comment[]) => new Set(group.map(c => c.store)).size;
    const actionRateCalc = (group: Comment[]) => {
        const negative = group.filter(c => c.sentiment === 'negative');
        if (negative.length === 0) return 100; // If no negative comments, 100% of actions are taken.
        const withAction = negative.filter(c => c.actions && c.actions.length > 0).length;
        return (withAction / negative.length) * 100;
    };

    return {
        satisfaction: {
            monthly: processHistory(calculateHistory(comments, 'monthly', satisfactionCalc)),
            weekly: processHistory(calculateHistory(comments, 'weekly', satisfactionCalc)),
        },
        feedbackCount: {
            monthly: processHistory(calculateHistory(comments, 'monthly', feedbackCountCalc)),
            weekly: processHistory(calculateHistory(comments, 'weekly', feedbackCountCalc)),
        },
        activeStores: {
            monthly: processHistory(calculateHistory(comments, 'monthly', activeStoresCalc)),
            weekly: processHistory(calculateHistory(comments, 'weekly', activeStoresCalc)),
        },
        actionRate: {
            monthly: processHistory(calculateHistory(comments, 'monthly', actionRateCalc)),
            weekly: processHistory(calculateHistory(comments, 'weekly', actionRateCalc)),
        },
    };
};

const calculateCategoryTrends = (comments: Comment[]): { trendData: any[], categories: string[] } => {
    if (!comments || comments.length === 0) return { trendData: [], categories: [] };
    
    const trendsByMonth: { [key: string]: { [key: string]: number } } = {};
    const shortMonthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
    const allCategories = new Set<string>();

    comments.forEach(comment => {
        if (!comment.date || !comment.category) return;
        try {
            const date = new Date(comment.date);
            if (isNaN(date.getTime())) return;
            
            const year = date.getFullYear();
            const monthIndex = date.getMonth();
            const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
            
            if (!trendsByMonth[key]) {
                trendsByMonth[key] = {};
            }
            
            trendsByMonth[key][comment.category] = (trendsByMonth[key][comment.category] || 0) + 1;
            allCategories.add(comment.category);
        } catch { return; }
    });

    if (allCategories.size === 0) return { trendData: [], categories: [] };

    const categoryTotals = Array.from(allCategories).map(cat => {
        const total = Object.values(trendsByMonth).reduce((sum, monthData) => sum + (monthData[cat] || 0), 0);
        return { name: cat, total };
    }).sort((a,b) => b.total - a.total).slice(0, 5);
    
    const topCategories = categoryTotals.map(c => c.name);

    const trendData = Object.keys(trendsByMonth)
        .sort()
        .map(key => {
            const monthIndex = parseInt(key.split('-')[1]) - 1; 
            const name = shortMonthNames[monthIndex];
            const monthData = trendsByMonth[key];
            
            const row: { [key: string]: any } = { name };
            topCategories.forEach(cat => {
                row[cat] = monthData[cat] || 0;
            });
            
            return row;
        });

    return { trendData, categories: topCategories };
};


// --- END: DASHBOARD METRIC CALCULATION LOGIC ---

// --- START: RENDER HELPER FUNCTIONS (MOVED OUTSIDE COMPONENT) ---
const renderChange = (change: number, options: { unit?: string; isInteger?: boolean } = {}) => {
    const { unit = '', isInteger = false } = options;
    if (isNaN(change) || !isFinite(change)) return null;
    
    const sign = change > 0 ? '+' : '';
    const value = Math.abs(change).toFixed(isInteger ? 0 : 2).replace('.', ',');

    if (parseFloat(value.replace(',', '.')) === 0) {
        return isInteger ? `0${unit}` : `0,00${unit}`;
    }
    return `${sign}${value}${unit}`;
};

const renderTurnoverCell = (rate: number | undefined) => {
    if (rate === undefined) {
        return <span className="light-text">N/A</span>;
    }
    return (
        <span>{rate.toLocaleString('tr-TR')}%</span>
    );
};

const getSatisfactionBarClass = (satisfaction: number) => {
    if (satisfaction >= 4.0) return 'satisfaction-bar-high';
    if (satisfaction >= 3.0) return 'satisfaction-bar-medium';
    return 'satisfaction-bar-low';
};


const DashboardPage: React.FC = () => {
    const { 
        storeData,
        comments, 
        loading, 
        currentUser,
        soms,
        getSomForStore,
    } = useData();

    const [satisfactionPeriod, setSatisfactionPeriod] = useState<'monthly' | 'weekly'>('monthly');
    const [metricsPeriod, setMetricsPeriod] = useState<'monthly' | 'weekly'>('monthly');
    const [selectedSom, setSelectedSom] = useState('Tümü');
    
    const canFilterBySom = currentUser && !['Bölge Müdürü', 'Satış Operasyon Müdürü'].includes(currentUser.role);
    
    // Filter data based on SOM selection
    const somFilteredStores = useMemo(() => {
        if (!canFilterBySom || selectedSom === 'Tümü') return storeData;
        return storeData.filter(s => getSomForStore(s.name) === selectedSom);
    }, [selectedSom, storeData, getSomForStore, canFilterBySom]);

    const somFilteredComments = useMemo(() => {
        if (!canFilterBySom || selectedSom === 'Tümü') return comments;
        const storeNames = new Set(somFilteredStores.map(s => s.name));
        return comments.filter(c => storeNames.has(c.store));
    }, [selectedSom, comments, somFilteredStores, canFilterBySom]);

    // Recalculate all metrics and chart data based on filtered data
    const sentimentChartData = useMemo(() => calculateSentimentDistribution(somFilteredComments), [somFilteredComments]);
    const dashboardChartMetrics = useMemo(() => calculateAllDashboardMetrics(somFilteredComments), [somFilteredComments]);
    
    const { trendData: categoryTrendData, categories: categoryKeys } = useMemo(() => calculateCategoryTrends(somFilteredComments), [somFilteredComments]);

    const totalSentimentComments = sentimentChartData.reduce((sum, item) => sum + item.value, 0);
    const primarySentiment = sentimentChartData.length > 0 ? sentimentChartData[0] : { name: 'Veri Yok', value: 0 };
    
    const topStores = useMemo(() => {
        return [...somFilteredStores].sort((a, b) => b.satisfaction - a.satisfaction).slice(0, 10);
    }, [somFilteredStores]);

    const bottomStores = useMemo(() => {
        return [...somFilteredStores].sort((a, b) => a.satisfaction - b.satisfaction).slice(0, 10);
    }, [somFilteredStores]);
    
    // Metrics for charts
    const satisfactionMetrics = dashboardChartMetrics.satisfaction[satisfactionPeriod];
    
    // Metrics for StatCards (now dynamic based on metricsPeriod)
    const feedbackMetrics = dashboardChartMetrics.feedbackCount[metricsPeriod];
    const activeStoresMetrics = dashboardChartMetrics.activeStores[metricsPeriod];
    const actionRateMetrics = dashboardChartMetrics.actionRate[metricsPeriod];

    if (loading) {
        return <MainLayout><div className="content-container" style={{justifyContent: 'center', alignItems: 'center'}}><p>Yükleniyor...</p></div></MainLayout>;
    }
    
    const metricsSubtitle = metricsPeriod === 'monthly' ? "Önceki aya göre" : "Önceki haftaya göre";
    
    return (
        <MainLayout>
            <div className="content-container">
                <div className="page-header">
                    <div>
                        <p className="page-title">
                            Hoş Geldiniz, <span className="welcome-name">{currentUser?.name.split(' ')[0] || 'Kullanıcı'}</span>
                            <span className="wave-emoji">👋</span>
                        </p>
                        <p className="page-subtitle">İşte şirketinizin çalışan memnuniyetine dair genel trendler.</p>
                    </div>
                     {canFilterBySom && (
                        <div className="page-header-actions">
                            <div className="filter-group">
                                <label htmlFor="som-filter-dashboard">Bölge</label>
                                <select 
                                    id="som-filter-dashboard" 
                                    className="filter-select" 
                                    value={selectedSom} 
                                    onChange={(e) => setSelectedSom(e.target.value)}
                                >
                                    {soms.map(som => <option key={som} value={som}>{som === 'Tümü' ? 'Tüm Türkiye' : som}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="dashboard-grid-2col">
                    <AreaChartCard 
                        title="Genel Memnuniyet Trendi"
                        value={`${satisfactionMetrics.current.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / 5`}
                        change={renderChange(satisfactionMetrics.change)}
                        changeType={satisfactionMetrics.change >= 0 ? 'positive' : 'negative'}
                        data={satisfactionMetrics.history}
                        headerAddon={
                            <div className="chart-filter-tabs">
                                <button onClick={() => setSatisfactionPeriod('monthly')} className={`chart-filter-btn ${satisfactionPeriod === 'monthly' ? 'active' : ''}`}>Aylık</button>
                                <button onClick={() => setSatisfactionPeriod('weekly')} className={`chart-filter-btn ${satisfactionPeriod === 'weekly' ? 'active' : ''}`}>Haftalık</button>
                            </div>
                        }
                        tooltipText="Bu grafik, çalışanların verdiği 1-5 arası puanların ortalamasını gösterir. Zaman içindeki memnuniyet değişimini yansıtır."
                    />
                    <PerformanceKPICard />
                </div>

                <div className="section">
                    <div className="section-header">
                        <h3 className="section-title">Diğer Önemli Metrikler</h3>
                        <div className="chart-filter-tabs">
                            <button onClick={() => setMetricsPeriod('monthly')} className={`chart-filter-btn ${metricsPeriod === 'monthly' ? 'active' : ''}`}>Aylık</button>
                            <button onClick={() => setMetricsPeriod('weekly')} className={`chart-filter-btn ${metricsPeriod === 'weekly' ? 'active' : ''}`}>Haftalık</button>
                        </div>
                    </div>
                     <div className="dashboard-grid-3col" style={{marginTop: '1rem'}}>
                        <StatCard
                            icon="rate_review"
                            title="Toplam Geri Bildirim"
                            value={feedbackMetrics.current.toString()}
                            change={renderChange(feedbackMetrics.change, { isInteger: true })}
                            changeType={feedbackMetrics.change >= 0 ? 'positive' : 'negative'}
                            subtitle={metricsSubtitle}
                            tooltipText={`Seçilen son ${metricsPeriod === 'monthly' ? 'aydaki' : 'haftadaki'} toplam geri bildirim sayısı ve bir önceki ${metricsPeriod === 'monthly' ? 'ayla' : 'haftayla'} karşılaştırması.`}
                        />
                         <StatCard
                            icon="storefront"
                            title="Aktif Mağaza Sayısı"
                            value={activeStoresMetrics.current.toString()}
                            change={renderChange(activeStoresMetrics.change, { isInteger: true })}
                            changeType={activeStoresMetrics.change >= 0 ? 'positive' : 'negative'}
                            subtitle={metricsSubtitle}
                            tooltipText={`Seçilen son ${metricsPeriod === 'monthly' ? 'ayda' : 'haftada'} geri bildirim gönderen benzersiz mağaza sayısı ve bir önceki ${metricsPeriod === 'monthly' ? 'ayla' : 'haftayla'} karşılaştırması.`}
                        />
                         <StatCard
                            icon="checklist"
                            title="Aksiyon Alma Oranı"
                            value={`${actionRateMetrics.current.toFixed(0)}%`}
                            change={renderChange(actionRateMetrics.change, { unit: '%' })}
                            changeType={actionRateMetrics.change >= 0 ? 'positive' : 'negative'}
                            subtitle={metricsSubtitle}
                            tooltipText={`Seçilen son ${metricsPeriod === 'monthly' ? 'aydaki' : 'haftadaki'} olumsuz yorumlara alınan aksiyonların oranı ve bir önceki ${metricsPeriod === 'monthly' ? 'ayla' : 'haftayla'} karşılaştırması.`}
                        />
                     </div>
                </div>

                <div className="dashboard-grid-2col">
                    <MultiLineChartCard
                        title="Aylık Geri Bildirim Kategori Trendleri"
                        data={categoryTrendData}
                        xAxisKey="name"
                        dataKeys={categoryKeys}
                        tooltipText="En sık karşılaşılan ilk 5 geri bildirim kategorisinin aylık değişimini gösterir. Bu, hangi konuların zaman içinde önem kazandığını veya azaldığını anlamanıza yardımcı olur."
                    />
                    <HorizontalBarChartCard
                        title="Genel Duygu Dağılımı"
                        value={`${totalSentimentComments} Geri Bildirim`}
                        subtitle={primarySentiment.value > 0 ? `En Yaygın: ${primarySentiment.name} (${primarySentiment.value})` : ''}
                        data={sentimentChartData}
                        totalValue={totalSentimentComments}
                        tooltipText="Filtrelenmiş geri bildirimlerin duyguya göre dağılımını gösterir."
                   />
                </div>

                <div className="section">
                    <AIInsightsCard storeData={somFilteredStores} comments={somFilteredComments} />
                </div>
                
                <div className="dashboard-grid-2col">
                     <div className="card">
                        <div className="section-header" style={{marginBottom: 0}}>
                            <h3 className="section-title">En Yüksek Memnuniyetli Mağazalar</h3>
                            <Link to="/stores" className="btn-link">Tümünü Gör &rarr;</Link>
                        </div>
                         <div className="table-container" style={{border: 'none', borderRadius: 0, marginTop: '1rem'}}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{width: '40%'}}>Mağaza Adı</th>
                                        <th style={{width: '40%'}}>Memnuniyet</th>
                                        <th style={{width: '20%'}}>Turnover</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topStores.map(store => (
                                        <tr key={store.id}>
                                            <td><Link to={`/store/${store.id}`} style={{fontWeight: 600}}>{store.name}</Link></td>
                                            <td>
                                                <div className="satisfaction-cell">
                                                    <span className="satisfaction-value">{store.satisfaction.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / 5</span>
                                                    <div className="satisfaction-bar-container">
                                                        <div className={`satisfaction-bar ${getSatisfactionBarClass(store.satisfaction)}`} style={{ width: `${(store.satisfaction / 5) * 100}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{renderTurnoverCell(store.latestTurnoverRate)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                     <div className="card">
                        <div className="section-header" style={{marginBottom: 0}}>
                            <h3 className="section-title">En Düşük Memnuniyetli Mağazalar</h3>
                            <Link to="/stores" className="btn-link">Tümünü Gör &rarr;</Link>
                        </div>
                         <div className="table-container" style={{border: 'none', borderRadius: 0, marginTop: '1rem'}}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{width: '40%'}}>Mağaza Adı</th>
                                        <th style={{width: '40%'}}>Memnuniyet</th>
                                        <th style={{width: '20%'}}>Turnover</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bottomStores.map(store => (
                                        <tr key={store.id}>
                                            <td><Link to={`/store/${store.id}`} style={{fontWeight: 600}}>{store.name}</Link></td>
                                            <td>
                                                <div className="satisfaction-cell">
                                                    <span className="satisfaction-value">{store.satisfaction.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / 5</span>
                                                    <div className="satisfaction-bar-container">
                                                        <div className={`satisfaction-bar ${getSatisfactionBarClass(store.satisfaction)}`} style={{ width: `${(store.satisfaction / 5) * 100}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{renderTurnoverCell(store.latestTurnoverRate)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default DashboardPage;