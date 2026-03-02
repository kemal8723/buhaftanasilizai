import React, { useState, useMemo } from 'react';
import MainLayout from '../components/MainLayout';
import { useData } from '../DataContext';
import { Comment, StoreData, User } from '../types';
import * as XLSX from 'xlsx';
import SatisfactionDistributionCard from '../components/SatisfactionDistributionCard';

// FIX: Added local helper function, as it's required for the Excel export logic.
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

interface PerformanceMetric {
    name: string;
    storeCount: number;
    satisfaction: number;
    feedbackCount: number;
    positiveCount: number;
    negativeCount: number;
    avgTurnover: number;
    unresolvedNegativeCount: number;
}

const PerformanceRankingCard: React.FC<{ title: string; data: PerformanceMetric[] }> = ({ title, data }) => {
    return (
        <div className="card performance-ranking-card">
            <h3 className="section-title" style={{marginBottom: '1rem'}}>{title}</h3>
            <div className="table-container">
                <table className="ranking-table">
                    <thead>
                        <tr>
                            <th style={{width: '5%'}}>#</th>
                            <th style={{width: '20%'}}>İsim</th>
                            <th style={{width: '35%'}}>Memnuniyet</th>
                            <th style={{width: '15%', textAlign: 'center'}}>Duygu (+/-)</th>
                            <th style={{width: '15%', textAlign: 'center'}}>Aksiyon Bekleyen</th>
                            <th style={{width: '10%', textAlign: 'center'}}>Ort. Turnover</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item, index) => (
                            <tr key={item.name}>
                                <td className="rank-cell">{index + 1}</td>
                                <td className="name-cell">
                                    {item.name}
                                    <span className="store-count">{item.storeCount} Mağaza</span>
                                </td>
                                <td>
                                    <div className="satisfaction-cell">
                                        <span className="satisfaction-value">{item.satisfaction.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / 5</span>
                                        <div className="satisfaction-bar-container">
                                            <div 
                                                className={`satisfaction-bar ${item.satisfaction >= 4.0 ? 'satisfaction-bar-high' : item.satisfaction >= 3.0 ? 'satisfaction-bar-medium' : 'satisfaction-bar-low'}`} 
                                                style={{ width: `${(item.satisfaction / 5) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </td>
                                <td className="sentiment-counts-cell" style={{justifyContent: 'center'}}>
                                    <span className="positive-count" title="Olumlu Yorumlar">{item.positiveCount}</span> / 
                                    <span className="negative-count" title="Olumsuz Yorumlar">{item.negativeCount}</span>
                                </td>
                                <td style={{textAlign: 'center'}}>
                                    <span className="unresolved-count" title="Aksiyon Bekleyen Olumsuz Yorumlar">{item.unresolvedNegativeCount}</span>
                                </td>
                                 <td style={{textAlign: 'center'}}>
                                    {item.avgTurnover > 0 ? `${item.avgTurnover.toFixed(1)}%` : 'N/A'}
                                 </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {data.length === 0 && (
                    <div className="placeholder-card" style={{minHeight: '150px', border: 'none', borderRadius: 0}}>
                        <p className="placeholder-text">Analiz için yeterli veri bulunamadı.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const RegionAnalysisPage: React.FC = () => {
    const { 
        currentUser, 
        storeData, 
        comments, 
        getManagerForStore, 
        getSomForStore, 
        soms, 
        managers, 
        weekFilterOptions,
        allUsers,
    } = useData();
    
    const [selectedWeek, setSelectedWeek] = useState('all');
    const [exportType, setExportType] = useState('unresolved'); // 'unresolved', 'resolved', 'all'

    const isAuthorized = currentUser && !['Bölge Müdürü', 'Satış Operasyon Müdürü'].includes(currentUser.role);

    const processPerformanceData = (
        groupNames: string[],
        getGroupForStore: (storeName: string) => string | undefined
    ): PerformanceMetric[] => {
        const relevantGroupNames = groupNames.filter(name => name !== 'Tümü');
        if (relevantGroupNames.length === 0 || storeData.length === 0) return [];

        const metrics: PerformanceMetric[] = relevantGroupNames.map(name => {
            const groupStores = storeData.filter(store => getGroupForStore(store.name) === name);
            const groupStoreNames = new Set(groupStores.map(s => s.name));
            const groupComments = comments.filter(comment => groupStoreNames.has(comment.store));

            const storeCount = groupStores.length;
            if (storeCount === 0) return null;

            const feedbackCount = groupComments.length;
            const positiveCount = groupComments.filter(c => c.sentiment === 'positive').length;
            const negativeCount = groupComments.filter(c => c.sentiment === 'negative').length;
            
            const unresolvedNegativeCount = groupComments.filter(c => c.sentiment === 'negative' && (!c.actions || c.actions.length === 0)).length;

            const totalSatisfaction = groupStores.reduce((acc, store) => acc + store.satisfaction, 0);
            const satisfaction = storeCount > 0 ? totalSatisfaction / storeCount : 0;

            const storesWithTurnover = groupStores.filter(s => s.latestTurnoverRate !== undefined);
            const totalTurnover = storesWithTurnover.reduce((acc, store) => acc + (store.latestTurnoverRate || 0), 0);
            const avgTurnover = storesWithTurnover.length > 0 ? totalTurnover / storesWithTurnover.length : 0;

            return {
                name,
                storeCount,
                satisfaction,
                feedbackCount,
                positiveCount,
                negativeCount,
                avgTurnover,
                unresolvedNegativeCount
            };
        }).filter((item): item is PerformanceMetric => item !== null);

        return metrics.sort((a, b) => b.satisfaction - a.satisfaction);
    };

    const somPerformanceData = useMemo(() => processPerformanceData(soms, getSomForStore), [soms, storeData, comments, getSomForStore]);
    const bmPerformanceData = useMemo(() => processPerformanceData(managers, getManagerForStore), [managers, storeData, comments, getManagerForStore]);
    
    const somSatisfactionDistribution = useMemo(() => {
        const distribution = {
            'Yüksek (4.0+)': 0,
            'Orta (3.0-3.99)': 0,
            'Düşük (<3.0)': 0,
        };

        const somPerformances = soms.map(som => {
            if (som === 'Tümü') return null;
            const somStores = storeData.filter(store => getSomForStore(store.name) === som);
            if (somStores.length === 0) return null;
            return somStores.reduce((acc, store) => acc + store.satisfaction, 0) / somStores.length;
        }).filter((avg): avg is number => avg !== null);

        somPerformances.forEach(avg => {
            if (avg >= 4.0) {
                distribution['Yüksek (4.0+)']++;
            } else if (avg >= 3.0) {
                distribution['Orta (3.0-3.99)']++;
            } else {
                distribution['Düşük (<3.0)']++;
            }
        });

        return Object.entries(distribution)
            .map(([name, value]) => ({ name, value }))
            .filter(d => d.value > 0);
    }, [soms, storeData, getSomForStore]);

    const bmSatisfactionDistribution = useMemo(() => {
        const distribution = {
            'Yüksek (4.0+)': 0,
            'Orta (3.0-3.99)': 0,
            'Düşük (<3.0)': 0,
        };
        
        const managerPerformances = managers.map(manager => {
            if (manager === 'Tümü') return null;
            const managerStores = storeData.filter(store => getManagerForStore(store.name) === manager);
            if (managerStores.length === 0) return null;
            return managerStores.reduce((acc, store) => acc + store.satisfaction, 0) / managerStores.length;
        }).filter((avg): avg is number => avg !== null);

        managerPerformances.forEach(avg => {
            if (avg >= 4.0) {
                distribution['Yüksek (4.0+)']++;
            } else if (avg >= 3.0) {
                distribution['Orta (3.0-3.99)']++;
            } else {
                distribution['Düşük (<3.0)']++;
            }
        });

        return Object.entries(distribution)
            .map(([name, value]) => ({ name, value }))
            .filter(d => d.value > 0);
    }, [managers, storeData, getManagerForStore]);
    
    const handleExportToExcel = () => {
        const userNameToTitleMap = new Map<string, string>();
        allUsers.forEach(user => {
            userNameToTitleMap.set(user.name, user.title);
        });

        let filteredComments = comments.filter(c => selectedWeek === 'all' || c.week === selectedWeek);

        if (exportType === 'unresolved') {
            filteredComments = filteredComments.filter(c => c.sentiment === 'negative' && (!c.actions || c.actions.length === 0));
        } else if (exportType === 'resolved') {
            filteredComments = filteredComments.filter(c => c.actions && c.actions.length > 0);
        }

        if (filteredComments.length === 0) {
            alert("Seçilen filtrelere uygun yorum bulunamadı.");
            return;
        }

        // Sheet 1: Detailed Comments
        const actionTitles = new Set<string>();
        filteredComments.forEach(comment => {
            if (comment.actions) {
                comment.actions.forEach(action => {
                    const title = userNameToTitleMap.get(action.author);
                    if (title) actionTitles.add(title);
                });
            }
        });
        const sortedActionTitles = Array.from(actionTitles).sort();

        const dataForExcel = filteredComments.map(comment => {
            const row: { [key: string]: any } = {
                'Hafta': comment.week || getWeekOfYear(comment.date),
                'Mağaza': comment.store,
                'SOM': getSomForStore(comment.store) || 'N/A',
                'Bölge Müdürü': getManagerForStore(comment.store) || 'N/A',
                'Yorum': comment.text,
                'Duygu': comment.sentiment,
                'Kategori': comment.category,
                'Tarih': new Date(comment.date).toLocaleDateString('tr-TR'),
                'Aksiyon Durumu': (comment.actions && comment.actions.length > 0) ? 'Aksiyon Alındı' : 'Bekliyor',
            };
            sortedActionTitles.forEach(title => { row[title] = ''; });

            if (comment.actions) {
                comment.actions.forEach(action => {
                    const title = userNameToTitleMap.get(action.author);
                    if (title && sortedActionTitles.includes(title)) {
                        const actionDetails = `${action.text} (${new Date(action.timestamp).toLocaleDateString('tr-TR')})`;
                        row[title] = row[title] ? `${row[title]}\n${actionDetails}` : actionDetails;
                    }
                });
            }
            return row;
        });
        const worksheet1 = XLSX.utils.json_to_sheet(dataForExcel);

        // Sheet 2: Summary Report
        const totalComments = filteredComments.length;
        const resolvedCount = filteredComments.filter(c => c.actions && c.actions.length > 0).length;
        const unresolvedCount = totalComments - resolvedCount;
        const resolutionRate = totalComments > 0 ? ((resolvedCount / totalComments) * 100).toFixed(1) + '%' : 'N/A';

        const categoryStats: { [key: string]: { resolved: number, unresolved: number } } = {};
        filteredComments.forEach(c => {
            if (!categoryStats[c.category]) categoryStats[c.category] = { resolved: 0, unresolved: 0 };
            if (c.actions && c.actions.length > 0) categoryStats[c.category].resolved++;
            else categoryStats[c.category].unresolved++;
        });

        const bmStats: { [key: string]: { resolved: number, unresolved: number } } = {};
        filteredComments.forEach(c => {
            const manager = getManagerForStore(c.store) || 'Atanmamış';
            if (!bmStats[manager]) bmStats[manager] = { resolved: 0, unresolved: 0 };
            if (c.actions && c.actions.length > 0) bmStats[manager].resolved++;
            else bmStats[manager].unresolved++;
        });

        const summaryDataAOA: (string | number)[][] = [];
        summaryDataAOA.push(['ÖZET RAPORU']);
        summaryDataAOA.push([]);
        summaryDataAOA.push(['Genel Metrikler']);
        summaryDataAOA.push(['Metrik', 'Değer']);
        summaryDataAOA.push(['Rapor Tipi', exportType === 'unresolved' ? 'Aksiyon Bekleyen' : exportType === 'resolved' ? 'Aksiyon Alınmış' : 'Tüm Yorumlar']);
        summaryDataAOA.push(['Hafta Filtresi', selectedWeek === 'all' ? 'Tüm Haftalar' : selectedWeek]);
        summaryDataAOA.push(['Toplam Yorum Sayısı', totalComments]);
        summaryDataAOA.push(['Aksiyon Alınan Yorum Sayısı', resolvedCount]);
        summaryDataAOA.push(['Aksiyon Bekleyen Yorum Sayısı', unresolvedCount]);
        summaryDataAOA.push(['Aksiyon Alınma Oranı', resolutionRate]);
        summaryDataAOA.push([]);
        summaryDataAOA.push(['Kategori Bazında Aksiyon Durumu']);
        summaryDataAOA.push(['Kategori', 'Aksiyon Alınan', 'Aksiyon Bekleyen']);
        Object.entries(categoryStats).forEach(([category, stats]) => {
            summaryDataAOA.push([category, stats.resolved, stats.unresolved]);
        });
        summaryDataAOA.push([]);
        summaryDataAOA.push(['Bölge Müdürü Bazında Aksiyon Durumu']);
        summaryDataAOA.push(['Bölge Müdürü', 'Aksiyon Alınan', 'Aksiyon Bekleyen']);
        Object.entries(bmStats).sort((a,b) => b[1].unresolved - a[1].unresolved).forEach(([manager, stats]) => {
             summaryDataAOA.push([manager, stats.resolved, stats.unresolved]);
        });

        const worksheet2 = XLSX.utils.aoa_to_sheet(summaryDataAOA);
        worksheet2['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }];

        // Create and download workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet1, "Detaylı Yorumlar");
        XLSX.utils.book_append_sheet(workbook, worksheet2, "Özet Raporu");
        
        const exportTypeStr = {unresolved: 'Aksiyon_Bekleyen', resolved: 'Aksiyon_Alinmis', all: 'Tum_Yorumlar'}[exportType] || 'Rapor';
        const weekStr = selectedWeek === 'all' ? 'Tum_Haftalar' : selectedWeek;
        const fileName = `${exportTypeStr}_${weekStr}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    if (!isAuthorized) {
        return (
            <MainLayout>
                <div className="content-container">
                    <div className="page-header">
                        <div>
                            <p className="page-title">Bölge Karşılaştırma Analizi</p>
                            <p className="page-subtitle">SOM ve Bölge Müdürü bazında performans metriklerini karşılaştırın.</p>
                        </div>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                        <span className="material-symbols-outlined placeholder-icon">lock</span>
                        <p className="placeholder-text" style={{ maxWidth: '45ch', margin: '0 auto', fontSize: '1rem' }}>
                            Bu sayfayı görüntüleme yetkiniz bulunmamaktadır. Bu analiz yalnızca genel merkez rollerine açıktır.
                        </p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="content-container">
                <div className="page-header">
                    <div>
                        <p className="page-title">Bölge Karşılaştırma Analizi</p>
                        <p className="page-subtitle">SOM ve Bölge Müdürü bazında memnuniyet metriklerini karşılaştırın.</p>
                    </div>
                </div>

                <div className="card export-card">
                    <div className="export-card-info">
                        <span className="material-symbols-outlined export-card-icon">task_alt</span>
                        <div>
                            <p className="export-card-title">Raporları Dışa Aktar</p>
                            <p className="export-card-subtitle">Filtrelenmiş yorumları detaylı bir şekilde Excel'e aktarın.</p>
                        </div>
                    </div>
                    <div className="export-card-actions">
                        <div className="filter-group">
                             <label htmlFor="export-type-filter">Rapor Tipi</label>
                            <select id="export-type-filter" className="filter-select" value={exportType} onChange={e => setExportType(e.target.value)}>
                                 <option value="unresolved">Aksiyon Bekleyen Yorumlar</option>
                                <option value="resolved">Aksiyon Alınmış Yorumlar</option>
                                <option value="all">Tüm Yorumlar</option>
                            </select>
                        </div>
                        <div className="filter-group">
                             <label htmlFor="week-filter-export">Hafta Filtresi (Opsiyonel)</label>
                            <select id="week-filter-export" className="filter-select" value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)}>
                                {weekFilterOptions.map(week => (
                                    <option key={week.value} value={week.value}>{week.label}</option>
                                ))}
                            </select>
                        </div>
                        <button onClick={handleExportToExcel} className="btn btn-primary">
                             <span className="material-symbols-outlined">download</span>
                            Excel'e Aktar
                        </button>
                    </div>
                </div>
                
                <div className="section">
                    <div className="dashboard-grid-2col">
                         <PerformanceRankingCard title="SOM Memnuniyet Sıralaması" data={somPerformanceData} />
                         <SatisfactionDistributionCard 
                            title="SOM Memnuniyet Dağılımı" 
                            data={somSatisfactionDistribution} 
                            tooltipValueSuffix="SOM"
                        />
                    </div>
                </div>

                <div className="section">
                     <div className="dashboard-grid-2col">
                         <PerformanceRankingCard title="Bölge Müdürü Memnuniyet Sıralaması" data={bmPerformanceData} />
                         <SatisfactionDistributionCard 
                            title="BM Memnuniyet Dağılımı" 
                            data={bmSatisfactionDistribution}
                            tooltipValueSuffix="BM"
                        />
                    </div>
                </div>

            </div>
        </MainLayout>
    );
};

export default RegionAnalysisPage;