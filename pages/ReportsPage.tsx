
import React, { useState, useRef, useMemo, useEffect } from 'react';
import MainLayout from '../components/MainLayout';
import { useData } from '../DataContext';
import { StoreData, ChartData, Comment } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import LogoImage from '../components/LogoImage';
import { HorizontalBarChartCard } from '../components/ChartCards';
import SatisfactionDistributionCard from '../components/SatisfactionDistributionCard';
// FIX: Updated deprecated GoogleGenerativeAI to GoogleGenAI.
import { GoogleGenAI } from "@google/genai";


interface ReportData {
    manager: string;
    dateRangeText: string;
    generationDate: string;
    overallSatisfaction: string;
    totalFeedback: number;
    storesNeedingActionCount: number;
    satisfactionDistribution: ChartData[];
    overallFeedbackByCategory: ChartData[];
    topStores: StoreData[];
    bottomStores: StoreData[];
    allStoresInReport: StoreData[];
    aiSummary: string;
}

const getSatisfactionBarClass = (satisfaction: number) => {
    if (satisfaction >= 70) return 'satisfaction-bar-high';
    if (satisfaction >= 50) return 'satisfaction-bar-medium';
    return 'satisfaction-bar-low';
};

const ReportPreview: React.FC<{ reportData: ReportData; getManagerForStore: (storeName: string) => string | undefined }> = ({ reportData, getManagerForStore }) => {
    return (
        <div className="report-preview-a4">
            <header className="report-header">
                <LogoImage className="report-logo" />
                <div className="report-header-text">
                    <h1>Çalışan Memnuniyeti Raporu</h1>
                    <p><strong>Kapsam:</strong> {reportData.manager}</p>
                    <p><strong>Dönem:</strong> {reportData.dateRangeText}</p>
                    <p><strong>Oluşturma Tarihi:</strong> {reportData.generationDate}</p>
                </div>
            </header>

            <main className="report-main">
                <section className="report-section">
                    <h2 className="report-h2">1. Yönetici Özeti</h2>
                    <div className="report-ai-summary-card">
                        <p>{reportData.aiSummary}</p>
                    </div>
                </section>
                
                <section className="report-section">
                    <h2 className="report-h2">2. Genel Performans Göstergeleri</h2>
                    <div className="report-kpi-grid">
                        <div className="report-kpi-card">
                            <h3>Genel Memnuniyet</h3>
                            <p>{reportData.overallSatisfaction}%</p>
                        </div>
                        <div className="report-kpi-card">
                            <h3>Filtrelenmiş Geri Bildirim</h3>
                            <p className="small">{reportData.totalFeedback}</p>
                        </div>
                        <div className="report-kpi-card">
                            <h3>Aksiyon Bekleyen Mağaza</h3>
                            <p className="small">{reportData.storesNeedingActionCount}</p>
                        </div>
                    </div>
                </section>

                <section className="report-section">
                    <h2 className="report-h2">3. Mağaza Performansları</h2>
                    <div className="report-performance-grid">
                        <div className="report-performance-column">
                            <h3 className="report-h3 success">Performans Liderleri (En Yüksek 3)</h3>
                            {reportData.topStores.map(store => (
                                <div key={store.id} className="report-store-card">
                                    <div className="report-store-card-header">
                                        <span className="report-store-card-name">{store.name}</span>
                                        <span className="report-store-card-score">{store.satisfaction}%</span>
                                    </div>
                                    <div className="report-store-card-bar">
                                        <div className="satisfaction-bar-container">
                                            <div className={`satisfaction-bar ${getSatisfactionBarClass(store.satisfaction)}`} style={{ width: `${store.satisfaction}%` }}></div>
                                        </div>
                                    </div>
                                     <p className="report-store-card-meta">{store.feedbackCount} Geri Bildirim</p>
                                </div>
                            ))}
                        </div>
                        <div className="report-performance-column">
                            <h3 className="report-h3 danger">Fırsat Alanları (En Düşük 3)</h3>
                            {reportData.bottomStores.map(store => (
                               <div key={store.id} className="report-store-card">
                                    <div className="report-store-card-header">
                                        <span className="report-store-card-name">{store.name}</span>
                                        <span className="report-store-card-score">{store.satisfaction}%</span>
                                    </div>
                                    <div className="report-store-card-bar">
                                        <div className="satisfaction-bar-container">
                                            <div className={`satisfaction-bar ${getSatisfactionBarClass(store.satisfaction)}`} style={{ width: `${store.satisfaction}%` }}></div>
                                        </div>
                                    </div>
                                    <p className="report-store-card-meta">{store.feedbackCount} Geri Bildirim</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="report-section">
                    <h2 className="report-h2">4. Öne Çıkan Geri Bildirim Konuları</h2>
                    <div className="report-chart-container">
                        <HorizontalBarChartCard
                            title=""
                            data={reportData.overallFeedbackByCategory.slice(0, 5)}
                        />
                    </div>
                </section>
                
                 <section className="report-section">
                    <h2 className="report-h2">5. Mağaza Memnuniyet Dağılımı</h2>
                    <div className="report-chart-container">
                         <SatisfactionDistributionCard 
                            title="" 
                            data={reportData.satisfactionDistribution}
                            tooltipValueSuffix="mağaza" 
                        />
                    </div>
                </section>

                <section className="report-section">
                    <h2 className="report-h2">6. Detaylı Mağaza Verileri</h2>
                    <div className="report-table-container">
                        <table className="report-detail-table">
                            <thead>
                                <tr>
                                    <th>Mağaza Adı</th>
                                    <th>Yönetici</th>
                                    <th>Memnuniyet</th>
                                    <th>G.Bildirim</th>
                                    <th>Turnover</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.allStoresInReport.map(store => (
                                    <tr key={store.id}>
                                        <td>{store.name}</td>
                                        <td>{getManagerForStore(store.name) || 'N/A'}</td>
                                        <td>
                                            <div className="satisfaction-cell">
                                                <span className="satisfaction-value">{store.satisfaction}%</span>
                                                <div className="satisfaction-bar-container">
                                                    <div className={`satisfaction-bar ${getSatisfactionBarClass(store.satisfaction)}`} style={{ width: `${store.satisfaction}%` }}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{store.feedbackCount}</td>
                                        <td>{store.latestTurnoverRate !== undefined ? `${store.latestTurnoverRate}%` : 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>

            <footer className="report-footer">
                <p>Bu rapor "Bu Hafta Nasılız AI" platformu tarafından oluşturulmuştur.</p>
            </footer>
        </div>
    );
};


const ReportsPage: React.FC = () => {
    const { storeData, comments, managers, getManagerForStore, weekFilterOptions, monthFilterOptions, soms, getSomForStore, getManagersForSom } = useData();
    const [selectedManager, setSelectedManager] = useState('Tümü');
    const [selectedSom, setSelectedSom] = useState('Tümü');
    const [selectedWeek, setSelectedWeek] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [keywordFilter, setKeywordFilter] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationMessage, setGenerationMessage] = useState('');
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const reportPreviewRef = useRef<HTMLDivElement>(null);

    const availableManagers = useMemo(() => {
        if (selectedSom === 'Tümü') {
            return managers;
        }
        const managersForSom = getManagersForSom(selectedSom);
        return ['Tümü', ...managersForSom.sort()];
    }, [selectedSom, managers, getManagersForSom]);

    useEffect(() => {
        if (!availableManagers.includes(selectedManager)) {
            setSelectedManager('Tümü');
        }
    }, [availableManagers, selectedManager]);
    
    const handleGenerateReport = async () => {
        setIsGenerating(true);
        setReportData(null);
        setGenerationMessage('Veriler filtreleniyor...');
        
        await new Promise(resolve => setTimeout(resolve, 200));

        let dateRangeText = "Tüm Zamanlar";
        if (selectedMonth !== 'all' && selectedWeek !== 'all') {
            dateRangeText = `Ay: ${selectedMonth}, Hafta: ${selectedWeek.split('-W')[1]}`;
        } else if (selectedMonth !== 'all') {
            dateRangeText = `Ay: ${selectedMonth}`;
        } else if (selectedWeek !== 'all') {
            dateRangeText = `Hafta: ${selectedWeek.split('-W')[1]}`;
        }

        const dateFilteredComments = comments.filter(comment => {
            const weekMatch = selectedWeek === 'all' || comment.week === selectedWeek;
            const monthMatch = selectedMonth === 'all' || comment.month === selectedMonth;
            return weekMatch && monthMatch;
        });
        
        const somFilteredStoreNames = new Set(
            selectedSom === 'Tümü'
            ? storeData.map(s => s.name)
            : storeData.filter(s => getSomForStore(s.name) === selectedSom).map(s => s.name)
        );

        const managerStoreNames = new Set(
            selectedManager === 'Tümü'
            ? Array.from(somFilteredStoreNames)
            : storeData.filter(s => somFilteredStoreNames.has(s.name) && getManagerForStore(s.name) === selectedManager).map(s => s.name)
        );

        const managerFilteredComments = dateFilteredComments.filter(c => managerStoreNames.has(c.store));

        const keywordFilteredComments = keywordFilter.trim()
            ? managerFilteredComments.filter(comment =>
                comment.text.toLowerCase().includes(keywordFilter.trim().toLowerCase())
              )
            : managerFilteredComments;
        
        setGenerationMessage('Metrikler hesaplanıyor...');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // --- START: REPORT-SPECIFIC DATA CALCULATION ---
        let reportStoresData;
        const isKeywordReport = keywordFilter.trim() !== '';

        if (isKeywordReport) {
            const storesWithKeywordComments = new Map<string, { comments: Comment[] }>();
            keywordFilteredComments.forEach(comment => {
                if (!storesWithKeywordComments.has(comment.store)) {
                    storesWithKeywordComments.set(comment.store, { comments: [] });
                }
                storesWithKeywordComments.get(comment.store)!.comments.push(comment);
            });
            
            reportStoresData = Array.from(storesWithKeywordComments.entries()).map(([storeName, data]) => {
                const originalStore = storeData.find(s => s.name === storeName)!;
                const feedbackCount = data.comments.length;
                const positiveCount = data.comments.filter(c => c.sentiment === 'positive').length;
                const satisfaction = feedbackCount > 0 ? Math.round((positiveCount / feedbackCount) * 100) : 0;
                return {
                    ...originalStore,
                    satisfaction,
                    feedbackCount
                };
            });

        } else {
             reportStoresData = storeData.filter(s => managerStoreNames.has(s.name));
        }
        // --- END: REPORT-SPECIFIC DATA CALCULATION ---

        const storesWithUnaddressedNegativeComments = new Set<string>();
        keywordFilteredComments.forEach(comment => {
            if(managerStoreNames.has(comment.store)) {
                if (comment.sentiment === 'negative' && (!comment.actions || comment.actions.length === 0)) {
                    storesWithUnaddressedNegativeComments.add(comment.store);
                }
            }
        });
        const storesNeedingActionCount = storesWithUnaddressedNegativeComments.size;

        const overallSatisfaction = reportStoresData.length > 0 ? (reportStoresData.reduce((acc, store) => acc + store.satisfaction, 0) / reportStoresData.length).toFixed(1) : '0';
        const satisfactionDistribution = [
            { name: 'Yüksek (>70%)', value: reportStoresData.filter(s => s.satisfaction >= 70).length },
            { name: 'Orta (50-69%)', value: reportStoresData.filter(s => s.satisfaction >= 50 && s.satisfaction < 70).length },
            { name: 'Düşük (<50%)', value: reportStoresData.filter(s => s.satisfaction < 50).length },
        ].filter(d => d.value > 0);
        const sortedStores = [...reportStoresData].sort((a, b) => b.satisfaction - a.satisfaction);
        const topStores = sortedStores.slice(0, 3);
        const bottomStores = sortedStores.slice(-3).reverse();

        const totalFeedback = keywordFilteredComments.length;
        const categoryMap: { [key: string]: number } = {};
        keywordFilteredComments.forEach(comment => {
            categoryMap[comment.category] = (categoryMap[comment.category] || 0) + 1;
        });
        const overallFeedbackByCategory = Object.entries(categoryMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        
        setGenerationMessage('Yapay zeka özeti oluşturuluyor...');
        let aiSummary = "Yapay zeka özeti oluşturulamadı.";
        if (process.env.API_KEY && keywordFilteredComments.length > 0) {
            try {
                // FIX: Updated deprecated GoogleGenerativeAI to GoogleGenAI.
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                
                const keywordPromptPart = isKeywordReport 
                    ? `Bu rapor, özellikle "${keywordFilter.trim()}" anahtar kelimesini içeren yorumlara odaklanmıştır. Analizini bu konuya yoğunlaştır. Bu kelimenin geçtiği yorumlardaki ana duygu nedir? Hangi mağazalarda bu konu daha belirgin? Bu durumun şirket için stratejik sonuçları neler olabilir?` 
                    : `Özetinde, en büyük başarıyı ve en önemli risk alanını vurgula.`;
                
                const prompt = `Bir yönetici için, aşağıdaki çalışan memnuniyeti verilerini analiz ederek 2-3 cümlelik bir özet çıkar. Özet, ${selectedSom !== 'Tümü' ? `SOM ${selectedSom}'a bağlı` : ''} ${selectedManager !== 'Tümü' ? `Bölge Müdürü ${selectedManager}'a bağlı` : (selectedSom === 'Tümü' ? 'tüm' : '')} mağazalar için ${dateRangeText} dönemini kapsamalıdır. ${keywordPromptPart}

                - Genel Memnuniyet (Filtrelenen Mağaza Ortalaması): ${overallSatisfaction}%
                - En İyi Mağazalar (Bu konudaki): ${topStores.map(s => `${s.name} (${s.satisfaction}%)`).join(', ')}
                - En Zayıf Mağazalar (Bu konudaki): ${bottomStores.map(s => `${s.name} (${s.satisfaction}%)`).join(', ')}
                - İlgili Yorum Sayısı: ${totalFeedback}
                - Öne Çıkan Konular: ${overallFeedbackByCategory.slice(0, 2).map(c => c.name).join(', ')}
                `;
                const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
                aiSummary = response.text;
            } catch (error) {
                console.error("AI summary generation failed:", error);
                aiSummary = "Yapay zeka analizi sırasında bir hata oluştu.";
            }
        } else if (keywordFilteredComments.length === 0) {
            aiSummary = `Filtrelerle eşleşen yorum bulunamadığı için bu döneme ait yapay zeka özeti oluşturulamamıştır.`;
        }
        
        let finalDateRangeText = dateRangeText;
        if (isKeywordReport) {
            finalDateRangeText += ` (Filtre: "${keywordFilter.trim()}")`;
        }
        
        const managerText = selectedManager === 'Tümü' 
            ? (selectedSom === 'Tümü' ? 'Tüm Şirket' : selectedSom) 
            : selectedManager;

        setReportData({
            manager: managerText,
            dateRangeText: finalDateRangeText,
            generationDate: new Date().toLocaleDateString('tr-TR'),
            overallSatisfaction,
            totalFeedback,
            satisfactionDistribution,
            topStores,
            bottomStores,
            overallFeedbackByCategory,
            aiSummary,
            storesNeedingActionCount,
            allStoresInReport: sortedStores,
        });
        setIsGenerating(false);
        setGenerationMessage('');
    };

    const handleDownloadPdf = async () => {
        const reportElement = reportPreviewRef.current;
        if (!reportElement) return;

        setIsGenerating(true); 
        setGenerationMessage('PDF oluşturuluyor...');

        const canvas = await html2canvas(reportElement, { 
            scale: 2,
            useCORS: true, 
            logging: false 
        });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Rapor_${selectedManager}_${new Date().toISOString().split('T')[0]}.pdf`);
        setIsGenerating(false);
        setGenerationMessage('');
    };
    
    const handleResetFilters = () => {
        setSelectedManager('Tümü');
        setSelectedSom('Tümü');
        setSelectedMonth('all');
        setSelectedWeek('all');
        setKeywordFilter('');
    };

    const filtersAreActive = selectedManager !== 'Tümü' || selectedSom !== 'Tümü' || selectedMonth !== 'all' || selectedWeek !== 'all' || keywordFilter !== '';

    return (
        <MainLayout>
            <div className="content-container">
                <div className="page-header">
                    <div>
                        <p className="page-title">Rapor Oluşturucu</p>
                        <p className="page-subtitle">Bölge müdürü bazında özet raporlar oluşturun ve PDF olarak indirin.</p>
                    </div>
                </div>

                <div className="card report-controls-card">
                    <div className="comment-filters">
                         <div className="filter-group">
                            <label htmlFor="som-select">SOM</label>
                            <select id="som-select" className="filter-select" value={selectedSom} onChange={(e) => setSelectedSom(e.target.value)}>
                                {soms.map(som => (
                                    <option key={som} value={som}>{som}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label htmlFor="manager-select">Bölge Müdürü</label>
                            <select id="manager-select" className="filter-select" value={selectedManager} onChange={(e) => setSelectedManager(e.target.value)}>
                                {availableManagers.map(manager => (
                                    <option key={manager} value={manager}>{manager}</option>
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
                        <div className="filter-group" style={{flexGrow: 1}}>
                            <label htmlFor="keyword-filter" className="label-with-tooltip">
                                <span>Anahtar Kelime (Opsiyonel)</span>
                                <div className="tooltip-icon-wrapper">
                                    <span className="material-symbols-outlined">help</span>
                                    <div className="tooltip-text">
                                        Bu alana bir kelime (örn: "maaş", "yönetici", "stres") yazarak, yalnızca o kelimeyi içeren yorumlara dayalı odaklanmış bir rapor oluşturabilirsiniz. Yapay zeka özeti de bu anahtar kelimeye göre şekillenecektir.
                                    </div>
                                </div>
                            </label>
                             <input
                                id="keyword-filter"
                                type="text"
                                className="filter-select"
                                placeholder="Yorumlarda ara..."
                                value={keywordFilter}
                                onChange={(e) => setKeywordFilter(e.target.value)}
                            />
                        </div>
                         {filtersAreActive && (
                            <button onClick={handleResetFilters} className="btn-link" style={{fontSize: '0.8rem', height: '40px'}}>
                                <span className="material-symbols-outlined" style={{fontSize: '1.2rem'}}>close</span>
                                Sıfırla
                            </button>
                        )}
                    </div>
                    <div className="report-actions">
                         <button className="btn btn-secondary" onClick={handleGenerateReport} disabled={isGenerating}>
                            {isGenerating ? 'Oluşturuluyor...' : 'Rapor Oluştur'}
                        </button>
                        {reportData && (
                            <button className="btn btn-primary" onClick={handleDownloadPdf} disabled={isGenerating}>
                                {isGenerating ? 'İndiriliyor...' : (
                                    <>
                                        <span className="material-symbols-outlined">download</span>
                                        PDF Olarak İndir
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                <div className="section">
                    {isGenerating && !reportData && (
                        <div className="placeholder-card"><p>{generationMessage}</p></div>
                    )}
                    {!reportData && !isGenerating && (
                         <div className="placeholder-card">
                            <span className="material-symbols-outlined placeholder-icon">summarize</span>
                            <h2 className="page-title" style={{fontSize: '1.75rem', marginBottom: '1rem'}}>Rapor Önizlemesi</h2>
                            <p className="placeholder-text" style={{maxWidth: '50ch'}}>
                                Filtreleri seçip "Rapor Oluştur" düğmesine tıklayarak başlayın.
                            </p>
                        </div>
                    )}
                    {reportData && (
                        <div className="report-preview-container">
                            <div ref={reportPreviewRef}>
                                <ReportPreview reportData={reportData} getManagerForStore={getManagerForStore}/>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </MainLayout>
    );
};

export default ReportsPage;