import React, { useState, useMemo, useEffect } from 'react';
import { StoreData, Comment, AIAnalysisResponse, TurnoverRiskAnalysis, SuccessAnalysisResponse, AnomalyDetectionResponse, RiskRadarResponse, ActionAnalysisResponse } from '../types';
import { Link } from 'react-router-dom';
import { useData } from '../DataContext';


interface AIInsightsCardProps {
    defaultTab?: 'summary' | 'focus' | 'turnover' | 'success' | 'anomalies' | 'riskRadar' | 'actionAnalysis';
    storeData: StoreData[];
    comments: Comment[];
}

const createAnalysisFingerprint = (storeData: StoreData[], comments: Comment[]): string => {
    if (!storeData || storeData.length === 0) return 'no-data';
    const storeIds = storeData.map(s => s.id).sort().join(',');
    const commentCount = comments.length;
    return `${storeData.length}-${commentCount}-${storeIds}`;
};


const AIInsightsCard: React.FC<AIInsightsCardProps> = ({ defaultTab = 'summary', storeData, comments }) => {
    const [activeTab, setActiveTab] = useState<'summary' | 'focus' | 'turnover' | 'success' | 'anomalies' | 'riskRadar' | 'actionAnalysis'>(defaultTab);
    const [loadingMessage, setLoadingMessage] = useState('Analiz başlatılıyor...');
    
    const { 
        aiAnalyses,
        generateSummary,
        generateFocus,
        generateTurnoverRisk,
        generateSuccess,
        generateAnomalies,
        generateRiskRadar,
        generateActionAnalysis,
    } = useData();

    const currentFingerprint = useMemo(() => createAnalysisFingerprint(storeData, comments), [storeData, comments]);
    
    const analysisState = aiAnalyses[activeTab];
    const isDataStale = analysisState.fingerprint !== currentFingerprint;
    const isLoading = analysisState.loading && !isDataStale;

    useEffect(() => {
        let intervalId: number | undefined;
        if (isLoading) {
            const messages = [
                "Veriler hazırlanıyor ve ön işleme alınıyor...",
                "Yorumlar analiz ediliyor, duygu ve temalar çıkarılıyor...",
                "Kök nedenler ve kritik içgörüler belirleniyor...",
                "Eyleme yönelik öneriler oluşturuluyor...",
                "Sonuçlar derleniyor ve rapor hazırlanıyor..."
            ];
            let messageIndex = 0;
            setLoadingMessage(messages[messageIndex]);
    
            intervalId = window.setInterval(() => {
                messageIndex = (messageIndex + 1) % messages.length;
                setLoadingMessage(messages[messageIndex]);
            }, 2500);
        }
        return () => clearInterval(intervalId);
    }, [isLoading]);

    const renderLoadingState = () => (
        <div className="loading-placeholder enhanced-loading">
            <div className="spinner"></div>
            <p className="loading-text">{loadingMessage}</p>
            <div className="loading-dots">
                <span>.</span><span>.</span><span>.</span>
            </div>
        </div>
    );
    
    const renderSummaryContent = (summaryInsight: string | null) => {
        if (!summaryInsight) return renderSummaryInitialState();
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

    const renderFocusContent = (focusAnalysis: AIAnalysisResponse | null) => {
        if (!focusAnalysis) return renderFocusInitialState();
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
    
    const renderTurnoverRiskContent = (turnoverAnalysis: TurnoverRiskAnalysis | null) => {
        if (!turnoverAnalysis) return renderTurnoverRiskInitialState();
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

    const renderSuccessContent = (successAnalysis: SuccessAnalysisResponse | null) => {
        if (!successAnalysis) return renderSuccessInitialState();
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

    const renderAnomaliesContent = (anomalyAnalysis: AnomalyDetectionResponse | null) => {
        if (!anomalyAnalysis) return renderAnomaliesInitialState();
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
    
    const renderRiskRadarContent = (riskRadarAnalysis: RiskRadarResponse | null) => {
        if (!riskRadarAnalysis) return renderRiskRadarInitialState();
        return (
            <div className="ai-content-container">
                <p className="ai-summary">{riskRadarAnalysis.summary}</p>
                <div className="turnover-risk-list">
                    {riskRadarAnalysis.potentialRisks.map((risk, index) => {
                         const storeLink = storeData.find(s => s.name === risk.storeName);
                         return (
                            <div key={index} className="turnover-risk-item">
                                <div className="store-header">
                                    <p className="store-name">
                                        {storeLink ? <Link to={`/store/${storeLink.id}`}>{risk.storeName}</Link> : risk.storeName}
                                    </p>
                                    <span className={`risk-level-tag ${risk.urgency === 'Yüksek' ? 'turnover-risk-high' : 'turnover-risk-medium'}`}>{risk.urgency} Öncelik</span>
                                </div>
                                <div className="risk-details">
                                    <p className="risk-reason"><strong>Risk Tipi:</strong> {risk.riskType}</p>
                                    <p className="risk-reason"><strong>Tespit:</strong> {risk.description}</p>
                                    <p className="risk-evidence"><strong>Kanıt:</strong> <em>"{risk.evidence}"</em></p>
                                </div>
                            </div>
                         )
                    })}
                </div>
            </div>
        );
    };

    const renderRiskRadarInitialState = () => (
        <div className="ai-initial-state">
            <p className="ai-initial-text">Gelecekteki potansiyel sorunları (düşen performans, tükenmişlik sinyalleri vb.) proaktif olarak tespit etmek için risk radarı analizini başlatın.</p>
            <button onClick={() => generateRiskRadar(storeData, comments)} className="btn btn-primary" disabled={aiAnalyses.riskRadar.loading || comments.length < 20}>
                {aiAnalyses.riskRadar.loading ? 'Analiz Ediliyor...' : <><span className="material-symbols-outlined">radar</span> Riskleri Tara</>}
            </button>
            {comments.length < 20 && <p className="ai-initial-text" style={{fontSize: '0.75rem', marginTop: '0.5rem'}}>Risk radarı için en az 20 yorum gereklidir.</p>}
        </div>
    );
    
    const renderActionAnalysisContent = (actionAnalysis: ActionAnalysisResponse | null) => {
        if (!actionAnalysis) return renderActionAnalysisInitialState();
        const getAnalysisClass = (analysis: string) => {
            if (analysis === 'Pozitif Değişim') return 'positive';
            if (analysis === 'Negatif Değişim') return 'negative';
            return 'neutral';
        }
        return (
            <div className="ai-content-container">
                <p className="ai-summary">{actionAnalysis.summary}</p>
                 <div className="success-factors-list">
                    {actionAnalysis.analyzedActions.map((item, index) => (
                        <div key={index} className="success-factor-item">
                            <div className="factor-header">
                                <p className="factor-theme">{item.storeName}: {item.topic}</p>
                                <span className={`sentiment-badge sentiment-${getAnalysisClass(item.analysis)}`}>{item.analysis}</span>
                            </div>
                            <p className="factor-description"><strong>Aksiyon:</strong> {item.actionTaken}</p>
                            <div className="factor-evidence">
                                <p className="factor-evidence-text"><em>"{item.evidence}"</em></p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderActionAnalysisInitialState = () => (
        <div className="ai-initial-state">
            <p className="ai-initial-text">Yöneticiler tarafından alınan aksiyonların ne kadar etkili olduğunu ve sorunları çözüp çözmediğini analiz edin.</p>
            <button onClick={() => generateActionAnalysis(storeData, comments)} className="btn btn-primary" disabled={aiAnalyses.actionAnalysis.loading || comments.filter(c => c.actions && c.actions.length > 0).length < 3}>
                {aiAnalyses.actionAnalysis.loading ? 'Analiz Ediliyor...' : <><span className="material-symbols-outlined">fact_check</span> Aksiyonları Analiz Et</>}
            </button>
            {comments.filter(c => c.actions && c.actions.length > 0).length < 3 && <p className="ai-initial-text" style={{fontSize: '0.75rem', marginTop: '0.5rem'}}>Analiz için en az 3 aksiyon alınmış yorum gereklidir.</p>}
        </div>
    );


    
    const currentData = analysisState.result;
    const error = analysisState.error;

    const renderCurrentTab = () => {
        if (isLoading) {
            return renderLoadingState();
        }

        if (isDataStale || !currentData) {
            switch (activeTab) {
                case 'summary': return renderSummaryInitialState();
                case 'focus': return renderFocusInitialState();
                case 'turnover': return renderTurnoverRiskInitialState();
                case 'success': return renderSuccessInitialState();
                case 'anomalies': return renderAnomaliesInitialState();
                case 'riskRadar': return renderRiskRadarInitialState();
                case 'actionAnalysis': return renderActionAnalysisInitialState();
                default: return null;
            }
        }
        
        // Data is not stale and we have a result
        switch (activeTab) {
            case 'summary': return renderSummaryContent(currentData as string | null);
            case 'focus': return renderFocusContent(currentData as AIAnalysisResponse | null);
            case 'turnover': return renderTurnoverRiskContent(currentData as TurnoverRiskAnalysis | null);
            case 'success': return renderSuccessContent(currentData as SuccessAnalysisResponse | null);
            case 'anomalies': return renderAnomaliesContent(currentData as AnomalyDetectionResponse | null);
            case 'riskRadar': return renderRiskRadarContent(currentData as RiskRadarResponse | null);
            case 'actionAnalysis': return renderActionAnalysisContent(currentData as ActionAnalysisResponse | null);
            default: return null;
        }
    };

    let handleRefresh;
    if (activeTab === 'summary') {
        handleRefresh = () => generateSummary(storeData, comments);
    } else if (activeTab === 'focus') {
        handleRefresh = () => generateFocus(storeData, comments);
    } else if (activeTab === 'turnover') {
        handleRefresh = () => generateTurnoverRisk(storeData, comments);
    } else if (activeTab === 'success') {
        handleRefresh = () => generateSuccess(storeData, comments);
    } else if (activeTab === 'anomalies') {
        handleRefresh = () => generateAnomalies(storeData, comments);
    } else if (activeTab === 'riskRadar') {
        handleRefresh = () => generateRiskRadar(storeData, comments);
    } else { // actionAnalysis
        handleRefresh = () => generateActionAnalysis(storeData, comments);
    }

    const getIconForTab = (tab: typeof activeTab) => {
        switch (tab) {
            case 'summary': return 'auto_awesome';
            case 'focus': return 'filter_center_focus';
            case 'success': return 'workspace_premium';
            case 'turnover': return 'trending_down';
            case 'anomalies': return 'crisis_alert';
            case 'riskRadar': return 'radar';
            case 'actionAnalysis': return 'fact_check';
            default: return 'help';
        }
    }

    return (
        <div className="card ai-card">
            <div className="ai-header">
                <div className="ai-header-main">
                    <span className="material-symbols-outlined ai-icon">
                        {getIconForTab(activeTab)}
                    </span>
                    <h3 className="ai-title">Yapay Zeka Analizi</h3>
                </div>
                <div className="ai-header-actions">
                    <div className="ai-tabs">
                        <button className={`ai-tab-btn ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>Özet</button>
                        <button className={`ai-tab-btn ${activeTab === 'focus' ? 'active' : ''}`} onClick={() => setActiveTab('focus')}>Odak Mağazalar</button>
                        <button className={`ai-tab-btn ${activeTab === 'success' ? 'active' : ''}`} onClick={() => setActiveTab('success')}>Başarı Analizi</button>
                        <button className={`ai-tab-btn ${activeTab === 'actionAnalysis' ? 'active' : ''}`} onClick={() => setActiveTab('actionAnalysis')}>Aksiyon Analizi</button>
                        <button className={`ai-tab-btn ${activeTab === 'turnover' ? 'active' : ''}`} onClick={() => setActiveTab('turnover')}>Turnover Riski</button>
                        <button className={`ai-tab-btn ${activeTab === 'riskRadar' ? 'active' : ''}`} onClick={() => setActiveTab('riskRadar')}>Risk Radarı</button>
                        <button className={`ai-tab-btn ${activeTab === 'anomalies' ? 'active' : ''}`} onClick={() => setActiveTab('anomalies')}>Uyarılar</button>
                    </div>
                    {currentData && !isLoading && !isDataStale && (
                        <button onClick={handleRefresh} className="btn-link" style={{ flexShrink: 0 }}>
                            <span className="material-symbols-outlined">refresh</span>
                            <span className="hide-on-mobile">Yenile</span>
                        </button>
                    )}
                </div>
            </div>
            {error && !isDataStale && <p className="error-message" style={{ margin: '1rem', border: '1px solid var(--error-color)', background: '#FEF2F2', padding: '0.75rem', borderRadius: 'var(--border-radius)' }}>{error}</p>}
            
            {renderCurrentTab()}
        </div>
    );
};

export default AIInsightsCard;