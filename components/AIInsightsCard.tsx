import React, { useState, useEffect } from 'react';
import { StoreData, Comment } from '../types';
import { Link } from 'react-router-dom';
import { useData } from '../DataContext';


interface AIInsightsCardProps {
    defaultTab?: 'summary' | 'focus' | 'turnover' | 'success' | 'anomalies';
    storeData: StoreData[];
    comments: Comment[];
}

const AIInsightsCard: React.FC<AIInsightsCardProps> = ({ defaultTab = 'summary', storeData, comments }) => {
    const [activeTab, setActiveTab] = useState<'summary' | 'focus' | 'turnover' | 'success' | 'anomalies'>(defaultTab);
    
    const { 
        aiAnalyses,
        generateSummary,
        generateFocus,
        generateTurnoverRisk,
        generateSuccess,
        generateAnomalies,
        resetAIAnalyses 
    } = useData();

    useEffect(() => {
        // When data filters change on the dashboard, this effect will trigger,
        // calling the context function to reset all analyses.
        // This ensures that stale analysis results are not displayed.
        resetAIAnalyses();
    }, [storeData, comments, resetAIAnalyses]);


    const renderLoadingState = () => (
        <div className="loading-placeholder">
            <div className="loading-bar" style={{width: '75%'}}></div>
            <div className="loading-bar" style={{width: '100%'}}></div>
            <div className="loading-bar" style={{width: '83%'}}></div>
        </div>
    );
    
    const renderSummaryContent = () => {
        const summaryInsight = aiAnalyses.summary.result || '';
        const insightItems = summaryInsight.split('\n').filter(line => line.trim().length > 0 && (line.includes('*') || line.includes('-') || /^\d+\./.test(line.trim())));
        
        const formatText = (text: string) => {
            const cleanedText = text.replace(/[-*]\s*|^\d+\.\s*/, '');
            const formattedText = cleanedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            return <span dangerouslySetInnerHTML={{ __html: formattedText }} />;
        };

        return (
            <div className="ai-content">
                {insightItems.length > 0 ? (
                    <ul>
                        {insightItems.map((item, index) => (
                            <li key={index}>{formatText(item)}</li>
                        ))}
                    </ul>
                ) : <p>{summaryInsight}</p>}
            </div>
        );
    };

    const renderSummaryInitialState = () => (
        <div className="ai-initial-state">
            <p className="ai-initial-text">Yapay zeka destekli yönetici özetini görüntülemek için analizi başlatın.</p>
            <button onClick={() => generateSummary(storeData, comments)} className="btn btn-primary" disabled={aiAnalyses.summary.loading || storeData.length < 3}>
                {aiAnalyses.summary.loading ? 'Oluşturuluyor...' : <><span className="material-symbols-outlined">auto_awesome</span> Özeti Oluştur</>}
            </button>
            {storeData.length < 3 && <p className="ai-initial-text" style={{fontSize: '0.75rem', marginTop: '0.5rem'}}>Analiz için en az 3 mağaza verisi gereklidir.</p>}
        </div>
    );
    
    const getTurnoverRiskClass = (risk: 'Yüksek' | 'Orta' | 'Düşük' | 'Çok Yüksek') => {
        if (risk === 'Çok Yüksek') return 'turnover-risk-very-high';
        if (risk === 'Yüksek') return 'turnover-risk-high';
        if (risk === 'Orta') return 'turnover-risk-medium';
        return 'turnover-risk-low';
    };

    const getScoreBarColor = (score: number) => {
        if (score > 70) return 'var(--error-color)';
        if (score > 40) return 'var(--warning-color)';
        return 'var(--primary-color)';
    };

    const renderFocusContent = () => {
        const focusAnalysis = aiAnalyses.focus.result;
        if (!focusAnalysis) return null;
        return (
            <div className="ai-content-container">
                <p className="ai-summary">{focusAnalysis.summary}</p>
                <div className="problem-stores-list">
                    {focusAnalysis.problematicStores.map((store, index) => {
                        const storeLink = storeData.find(s => s.name === store.storeName);
                        return (
                            <div key={index} className="problem-store-item">
                                <div className="store-header">
                                    <p className="store-name">
                                        {storeLink ? <Link to={`/store/${storeLink.id}`}>{store.storeName}</Link> : store.storeName}
                                    </p>
                                    <span className={`turnover-risk-tag ${getTurnoverRiskClass(store.turnoverRisk)}`}>{store.turnoverRisk} Risk</span>
                                </div>
                                <p className="store-reason"><strong>Kök Neden:</strong> {store.rootCause}</p>
                                <div className="factor-evidence" style={{marginBottom: '1rem'}}>
                                    <p className="factor-evidence-text"><em>"{store.evidence}"</em></p>
                                </div>
                                <div className="problem-score-bar-container" title={`Sorun Skoru: ${store.problemScore}`}>
                                    <div className="problem-score-bar" style={{ width: `${store.problemScore}%`, backgroundColor: getScoreBarColor(store.problemScore) }}></div>
                                    <span className="problem-score-text">Sorun Skoru: {store.problemScore}</span>
                                </div>
                                <div className="suggested-action">
                                    <span className="material-symbols-outlined suggested-action-icon">lightbulb</span>
                                    <p className="suggested-action-text"><strong>Öneri:</strong> {store.suggestedAction}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    };
    
    const renderFocusInitialState = () => (
         <div className="ai-initial-state">
            <p className="ai-initial-text">Odaklanılması gereken mağazaları ve sorunların kök nedenlerini belirlemek için yapay zeka analizini başlatın.</p>
            <button onClick={() => generateFocus(storeData, comments)} className="btn btn-primary" disabled={aiAnalyses.focus.loading || comments.length === 0}>
                {aiAnalyses.focus.loading ? 'Analiz Ediliyor...' : <><span className="material-symbols-outlined">filter_center_focus</span> Analizi Başlat</>}
            </button>
            {comments.length === 0 && <p className="ai-initial-text" style={{fontSize: '0.75rem', marginTop: '0.5rem'}}>Analiz için önce veri yüklenmelidir.</p>}
        </div>
    );
    
    const renderTurnoverRiskContent = () => {
        const turnoverAnalysis = aiAnalyses.turnover.result;
        if (!turnoverAnalysis) return null;
        return (
            <div className="ai-content-container">
                <p className="ai-summary">{turnoverAnalysis.summary}</p>
                <div className="turnover-risk-list">
                    {turnoverAnalysis.highRiskStores.map((store, index) => {
                        const storeLink = storeData.find(s => s.name === store.storeName);
                        return(
                            <div key={index} className="turnover-risk-item">
                                <div className="store-header">
                                    <p className="store-name">
                                        {storeLink ? <Link to={`/store/${storeLink.id}`}>{store.storeName}</Link> : store.storeName}
                                    </p>
                                    <span className={`risk-level-tag ${getTurnoverRiskClass(store.riskLevel)}`}>{store.riskLevel} Risk</span>
                                </div>
                                <div className="risk-details">
                                    <p className="risk-reason"><strong>Ana Neden:</strong> {store.primaryReason}</p>
                                    <p className="risk-evidence"><strong>Kanıt/Gözlem:</strong> <em>"{store.evidence}"</em></p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    };

    const renderTurnoverRiskInitialState = () => (
         <div className="ai-initial-state">
            <p className="ai-initial-text">Çalışan istifa (turnover) riski yüksek olan mağazaları tespit etmek için analizi başlatın.</p>
            <button onClick={() => generateTurnoverRisk(storeData, comments)} className="btn btn-primary" disabled={aiAnalyses.turnover.loading || comments.length < 10}>
                {aiAnalyses.turnover.loading ? 'Analiz Ediliyor...' : <><span className="material-symbols-outlined">trending_down</span> Risk Analizi Yap</>}
            </button>
            {comments.length < 10 && <p className="ai-initial-text" style={{fontSize: '0.75rem', marginTop: '0.5rem'}}>Analiz için en az 10 yorum gereklidir.</p>}
        </div>
    );

    const renderSuccessContent = () => {
        const successAnalysis = aiAnalyses.success.result;
        if (!successAnalysis) return null;
        return (
            <div className="ai-content-container">
                <p className="ai-summary">{successAnalysis.summary}</p>
                <div className="success-factors-list">
                    {successAnalysis.successFactors.map((factor, index) => (
                        <div key={index} className="success-factor-item">
                            <div className="factor-header">
                                <span className="material-symbols-outlined factor-icon">emoji_events</span>
                                <p className="factor-theme">{factor.theme}</p>
                            </div>
                            <p className="factor-description">{factor.description}</p>
                            <div className="factor-evidence">
                                <p className="factor-evidence-text"><em>"{factor.exampleComment}"</em></p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };
    
    const renderSuccessInitialState = () => (
        <div className="ai-initial-state">
           <p className="ai-initial-text">En başarılı mağazaların ortak yönlerini ve iyi uygulamalarını keşfetmek için başarı analizini başlatın.</p>
           <button onClick={() => generateSuccess(storeData, comments)} className="btn btn-primary" disabled={aiAnalyses.success.loading || storeData.length < 3}>
               {aiAnalyses.success.loading ? 'Analiz Ediliyor...' : <><span className="material-symbols-outlined">workspace_premium</span> Başarı Analizi Yap</>}
           </button>
           {storeData.length < 3 && <p className="ai-initial-text" style={{fontSize: '0.75rem', marginTop: '0.5rem'}}>Analiz için en az 3 mağaza verisi gereklidir.</p>}
       </div>
   );

    const renderAnomaliesContent = () => {
        const anomalyAnalysis = aiAnalyses.anomalies.result;
        if (!anomalyAnalysis) return null;
        return (
            <div className="ai-content-container">
                <p className="ai-summary">{anomalyAnalysis.summary}</p>
                <div className="anomalies-list">
                    {anomalyAnalysis.anomalies.length > 0 ? (
                        anomalyAnalysis.anomalies.map((anomaly, index) => (
                            <div key={index} className="anomaly-item">
                                <div className="anomaly-header">
                                    <span className="material-symbols-outlined anomaly-icon">warning</span>
                                    <p className="anomaly-type">{anomaly.anomalyType}</p>
                                    <span className="anomaly-period-tag">{anomaly.period}</span>
                                </div>
                                <p className="anomaly-store-name">{anomaly.storeName}</p>
                                <p className="anomaly-description">{anomaly.description}</p>
                            </div>
                        ))
                    ) : (
                        <p>Tespit edilen önemli bir anomali bulunmamaktadır.</p>
                    )}
                </div>
            </div>
        );
    };

    const renderAnomaliesInitialState = () => (
        <div className="ai-initial-state">
            <p className="ai-initial-text">Verilerdeki ani düşüşleri ve kritik sorunları proaktif olarak tespit etmek için anomali analizini başlatın.</p>
            <button onClick={() => generateAnomalies(storeData, comments)} className="btn btn-primary" disabled={aiAnalyses.anomalies.loading || comments.length < 20}>
                {aiAnalyses.anomalies.loading ? 'Taranıyor...' : <><span className="material-symbols-outlined">crisis_alert</span> Uyarıları Tara</>}
            </button>
            {comments.length < 20 && <p className="ai-initial-text" style={{fontSize: '0.75rem', marginTop: '0.5rem'}}>Anomali tespiti için en az 20 yorum gereklidir.</p>}
        </div>
    );
    
    const isLoading = aiAnalyses[activeTab].loading;
    const currentData = aiAnalyses[activeTab].result;
    const error = aiAnalyses[activeTab].error;
    
    let handleRefresh;
    if (activeTab === 'summary') {
        handleRefresh = () => generateSummary(storeData, comments);
    } else if (activeTab === 'focus') {
        handleRefresh = () => generateFocus(storeData, comments);
    } else if (activeTab === 'turnover') {
        handleRefresh = () => generateTurnoverRisk(storeData, comments);
    } else if (activeTab === 'success') {
        handleRefresh = () => generateSuccess(storeData, comments);
    } else { // anomalies
        handleRefresh = () => generateAnomalies(storeData, comments);
    }

    return (
        <div className="card ai-card">
            <div className="ai-header">
                <div className="ai-header-main">
                    <span className="material-symbols-outlined ai-icon">
                        {activeTab === 'summary' ? 'auto_awesome' : (activeTab === 'focus' ? 'filter_center_focus' : (activeTab === 'success' ? 'workspace_premium' : (activeTab === 'anomalies' ? 'crisis_alert' : 'trending_down')))}
                    </span>
                    <h3 className="ai-title">Yapay Zeka Analizi</h3>
                </div>
                <div className="ai-header-actions">
                    <div className="ai-tabs">
                        <button className={`ai-tab-btn ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>Özet</button>
                        <button className={`ai-tab-btn ${activeTab === 'focus' ? 'active' : ''}`} onClick={() => setActiveTab('focus')}>Odak Mağazalar</button>
                        <button className={`ai-tab-btn ${activeTab === 'success' ? 'active' : ''}`} onClick={() => setActiveTab('success')}>Başarı Analizi</button>
                        <button className={`ai-tab-btn ${activeTab === 'turnover' ? 'active' : ''}`} onClick={() => setActiveTab('turnover')}>Turnover Riski</button>
                        <button className={`ai-tab-btn ${activeTab === 'anomalies' ? 'active' : ''}`} onClick={() => setActiveTab('anomalies')}>Uyarılar</button>
                    </div>
                    {currentData && !isLoading && (
                        <button onClick={handleRefresh} className="btn-link" style={{ flexShrink: 0 }}>
                            <span className="material-symbols-outlined">refresh</span>
                            <span className="hide-on-mobile">Yenile</span>
                        </button>
                    )}
                </div>
            </div>
            {error && <p className="error-message" style={{ margin: '1rem', border: '1px solid var(--error-color)', background: '#FEF2F2', padding: '0.75rem', borderRadius: 'var(--border-radius)' }}>{error}</p>}
            
            {activeTab === 'summary' && (isLoading ? renderLoadingState() : (currentData ? renderSummaryContent() : renderSummaryInitialState()))}
            {activeTab === 'focus' && (isLoading ? renderLoadingState() : (currentData ? renderFocusContent() : renderFocusInitialState()))}
            {activeTab === 'success' && (isLoading ? renderLoadingState() : (currentData ? renderSuccessContent() : renderSuccessInitialState()))}
            {activeTab === 'turnover' && (isLoading ? renderLoadingState() : (currentData ? renderTurnoverRiskContent() : renderTurnoverRiskInitialState()))}
            {activeTab === 'anomalies' && (isLoading ? renderLoadingState() : (currentData ? renderAnomaliesContent() : renderAnomaliesInitialState()))}
        </div>
    );
};

export default AIInsightsCard;