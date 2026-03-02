// FIX: Implemented the full component to replace the placeholder content.
// This resolves module import errors in App.tsx and provides the necessary functionality for viewing store details.
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { useData } from '../DataContext';
import { Comment, TurnoverHistory, ActionTaken } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { HorizontalBarChartCard } from '../components/ChartCards';
import StatCard from '../components/StatCard';
import { AnonymousAvatarIcon } from '../components/Icons';
// FIX: Changed import to a named import to resolve module loading issue.
import { WordCloudCard } from '../components/WordCloudCard';

// TurnoverHistoryCard Component (adapted from AnalyticsPage)
const TurnoverHistoryCard: React.FC<{ history: TurnoverHistory[]; storeName: string }> = ({ history, storeName }) => {
    if (!history || history.length === 0) {
        return (
            <div className="card">
                <h3 className="card-title" style={{ padding: '0 0 1.5rem 0' }}>Aylık Turnover Geçmişi</h3>
                <div className="placeholder-card" style={{ minHeight: '340px', border: 'none', background: 'var(--app-bg-color)' }}>
                    <p className="placeholder-text">{storeName} için turnover verisi bulunmuyor.</p>
                </div>
            </div>
        );
    }

    const monthOrder = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const sortedHistory = [...history].sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));

    return (
        <div className="card">
            <h3 className="card-title" style={{ padding: '0 0 1.5rem 0' }}>Aylık Turnover Geçmişi</h3>
            <div className="turnover-history-grid">
                <div className="turnover-chart-container" style={{ height: '300px' }}>
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
                <div className="turnover-table-container" style={{ maxHeight: '300px' }}>
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

const ActionItem: React.FC<{ action: ActionTaken; commentId: string; actionIndex: number }> = ({ action, commentId, actionIndex }) => {
    const { toggleReactionOnAction, deleteCommentAction, editCommentAction, currentUser, getUserImageUrlByName } = useData();
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(action.text);
    const availableReactions = ['👍', '❤️', '👏', '🎉', '💡', '🤔'];
    const authorImageUrl = getUserImageUrlByName(action.author);

    const handleEditSave = () => {
        if (editText.trim() !== action.text) {
            editCommentAction(commentId, actionIndex, editText.trim());
        }
        setIsEditing(false);
    };

    const isCurrentUserAction = action.author === currentUser?.name;

    return (
        <div className={`action-item`}>
            <div className="action-author-avatar" style={authorImageUrl ? { backgroundImage: `url("${authorImageUrl}")` } : {}}>
                {!authorImageUrl && <AnonymousAvatarIcon />}
            </div>
            <div className="action-content">
                <div className="action-header">
                     <div className="action-header-info">
                        <span className="action-author">{action.author}</span>
                        <span className="action-timestamp">{new Date(action.timestamp).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                     <div className="action-controls">
                        {isCurrentUserAction && !isEditing && (
                            <>
                                <button onClick={() => setIsEditing(true)} className="btn-icon" title="Düzenle">
                                    <span className="material-symbols-outlined" style={{fontSize: '1rem'}}>edit</span>
                                </button>
                                <button onClick={() => deleteCommentAction(commentId, actionIndex)} className="btn-icon-danger" title="Sil">
                                    <span className="material-symbols-outlined" style={{fontSize: '1rem'}}>delete</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
                {isEditing ? (
                    <div className="action-edit-form">
                        <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="action-edit-textarea"
                            rows={3}
                        />
                        <div className="action-edit-buttons">
                            <button onClick={handleEditSave} className="btn btn-primary btn-sm">Kaydet</button>
                            <button onClick={() => setIsEditing(false)} className="btn btn-secondary btn-sm">İptal</button>
                        </div>
                    </div>
                ) : (
                     <>
                        <p className="action-text">{action.text}</p>
                        <div className="action-footer">
                            <div className="action-reactions">
                                {availableReactions.map(emoji => {
                                    const reactors = action.reactions?.[emoji] || [];
                                    const hasReacted = reactors.includes(currentUser?.name || '');
                                    return (
                                        <button
                                            key={emoji}
                                            className={`reaction-btn ${hasReacted ? 'reacted' : ''}`}
                                            onClick={() => toggleReactionOnAction(commentId, actionIndex, emoji)}
                                            title={reactors.join(', ')}
                                        >
                                            {emoji} {reactors.length > 0 && <span className="reaction-count">{reactors.length}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const getRatingClass = (rating: number | undefined): string => {
    if (rating === undefined) return '';
    if (rating < 3) return 'rating-low'; // 1-2 points
    if (rating < 4) return 'rating-medium'; // 3 points
    return 'rating-high'; // 4-5 points
};

const CommentCard: React.FC<{ comment: Comment, isHighlighted: boolean }> = ({ comment, isHighlighted }) => {
    const { addCommentAction, profileImageUrl } = useData();
    const [actionText, setActionText] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleAddAction = (e: React.FormEvent) => {
        e.preventDefault();
        if (actionText.trim()) {
            addCommentAction(comment.id, actionText.trim());
            setActionText('');
        }
    };
    
    return (
        <div id={comment.id} className={`card comment-card sentiment-border-${comment.sentiment} ${isHighlighted ? 'comment-highlighted' : ''}`}>
            <div className="comment-card-container">
                <div className="comment-avatar-column">
                    <div className="comment-avatar">
                        <AnonymousAvatarIcon />
                    </div>
                </div>
                <div className="comment-main-content">
                    <div className="comment-header">
                        <div className="comment-header-main">
                            <span className="comment-category">{comment.category}</span>
                            {comment.rating !== undefined && (
                                <span className={`comment-rating ${getRatingClass(comment.rating)}`}>
                                    <span className="material-symbols-outlined">star</span>
                                    {comment.rating.toFixed(1)} / 5
                                </span>
                            )}
                        </div>
                        <span className="comment-date">{new Date(comment.date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <p className="comment-text">{comment.text}</p>
                    <div className="comment-actions-section">
                        {comment.actions && comment.actions.length > 0 && (
                            <div className="actions-list">
                                {comment.actions.map((action, index) => (
                                    <ActionItem key={index} action={action} commentId={comment.id} actionIndex={index} />
                                ))}
                            </div>
                        )}
                        <form onSubmit={handleAddAction} className="action-form">
                             <div className="action-author-avatar" style={profileImageUrl ? { backgroundImage: `url("${profileImageUrl}")` } : {}}>
                                {!profileImageUrl && <AnonymousAvatarIcon />}
                            </div>
                            <input
                                ref={inputRef}
                                value={actionText}
                                onChange={(e) => setActionText(e.target.value)}
                                placeholder="Bir aksiyon notu ekle..."
                                className="action-input-field"
                            />
                            <button type="submit" className="action-submit-btn" disabled={!actionText.trim()} aria-label="Aksiyonu Gönder">
                                <span className="material-symbols-outlined">send</span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StoreDetailPageSkeleton: React.FC = () => (
    <MainLayout>
        <div className="content-container">
            <div className="page-header" style={{ alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                <div className="loading-bar" style={{ height: '24px', width: '180px', borderRadius: 'var(--border-radius)' }}></div>
                <div style={{ flexGrow: 1 }}>
                    <div className="loading-bar" style={{ height: '36px', width: 'clamp(250px, 50%, 400px)', borderRadius: 'var(--border-radius)' }}></div>
                    <div className="loading-bar" style={{ height: '20px', width: 'clamp(200px, 40%, 300px)', marginTop: '0.75rem', borderRadius: 'var(--border-radius)' }}></div>
                </div>
            </div>
            <div className="dashboard-grid-3col">
                <div className="card loading-bar" style={{ height: '120px', padding: 0, border: 'none' }}></div>
                <div className="card loading-bar" style={{ height: '120px', padding: 0, border: 'none' }}></div>
                <div className="card loading-bar" style={{ height: '120px', padding: 0, border: 'none' }}></div>
            </div>
            <div className="dashboard-grid-2col" style={{ marginTop: '1.5rem' }}>
                <div className="card loading-bar" style={{ height: '400px', padding: 0, border: 'none' }}></div>
                <div className="card loading-bar" style={{ height: '400px', padding: 0, border: 'none' }}></div>
            </div>
            <div className="section">
                <div className="card loading-bar" style={{ height: '400px', padding: 0, border: 'none' }}></div>
            </div>
            <div className="section">
                <div className="loading-bar" style={{ height: '30px', width: '250px', marginBottom: '1rem', borderRadius: 'var(--border-radius)' }}></div>
                <div className="card loading-bar" style={{ height: '88px', padding: 0, border: 'none' }}></div>
            </div>
             <div className="section">
                <div className="card loading-bar" style={{ height: '200px', padding: 0, border: 'none' }}></div>
            </div>
        </div>
    </MainLayout>
);


const StoreDetailPage: React.FC = () => {
    const { storeId } = useParams<{ storeId: string }>();
    const location = useLocation();
    const { getStoreById, getCommentsForStore, loading, getManagerForStore } = useData();

    const [sentimentFilter, setSentimentFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [selectedWeek, setSelectedWeek] = useState('all');
    const [selectedAboutWhom, setSelectedAboutWhom] = useState('all');
    const [highlightedComment, setHighlightedComment] = useState<string | null>(null);
    // FIX: Added state for interactive keyword filtering from the word cloud.
    const [keywordFilter, setKeywordFilter] = useState('');


    useEffect(() => {
        const commentId = location.hash.substring(1);
        let scrollTimer: number | undefined;
        let highlightTimer: number | undefined;

        if (commentId) {
            // Using a timer to ensure the element is in the DOM after render
            scrollTimer = window.setTimeout(() => {
                const element = document.getElementById(commentId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setHighlightedComment(commentId);
                    
                    // Remove highlight after animation
                    highlightTimer = window.setTimeout(() => {
                        setHighlightedComment(null);
                    }, 3000);
                }
            }, 100);
        }

        // Cleanup function to clear timers if the component unmounts or hash changes
        return () => {
            if (scrollTimer) clearTimeout(scrollTimer);
            if (highlightTimer) clearTimeout(highlightTimer);
        };
    }, [location.hash, loading]); // Rerun when hash changes or data finishes loading


    const store = useMemo(() => storeId ? getStoreById(storeId) : undefined, [storeId, getStoreById]);
    
    const storeComments = useMemo(() => {
        if (!store) return [];
        return getCommentsForStore(store.name);
    }, [store, getCommentsForStore]);
    
    const manager = useMemo(() => store ? getManagerForStore(store.name) : 'N/A', [store, getManagerForStore]);
    
    const availableCategories = useMemo(() => {
        const uniqueCategories = new Set(storeComments.map(c => c.category));
        return ['all', ...Array.from(uniqueCategories).sort()];
    }, [storeComments]);
    
    const availableWeeks = useMemo(() => {
        const uniqueWeeks = [...new Set(storeComments.map(c => c.week).filter(Boolean) as string[])];
        uniqueWeeks.sort().reverse();
        return ['all', ...uniqueWeeks];
    }, [storeComments]);

    const availableAboutWhom = useMemo(() => {
        const uniqueValues = [...new Set(storeComments.map(c => c.aboutWhom).filter(Boolean) as string[])]
            .filter(value => value !== 'Kişisel Konular'); // Remove "Kişisel Konular"
        uniqueValues.sort();
        return ['all', ...uniqueValues];
    }, [storeComments]);

    const displayComments = useMemo(() => {
        return storeComments
            .filter(comment => sentimentFilter === 'all' || comment.sentiment === sentimentFilter)
            .filter(comment => categoryFilter === 'all' || comment.category === categoryFilter)
            .filter(comment => selectedWeek === 'all' || comment.week === selectedWeek)
            .filter(comment => selectedAboutWhom === 'all' || comment.aboutWhom === selectedAboutWhom)
            .filter(comment => keywordFilter === '' || comment.text.toLowerCase().includes(keywordFilter.toLowerCase()))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [storeComments, sentimentFilter, categoryFilter, selectedWeek, selectedAboutWhom, keywordFilter]);
    
     const actionNeededCount = useMemo(() => {
        return storeComments.filter(c => c.sentiment === 'negative' && (!c.actions || c.actions.length === 0)).length;
    }, [storeComments]);
    
    if (loading) {
        return <StoreDetailPageSkeleton />;
    }

    if (!store) {
        return <MainLayout><div className="content-container" style={{ justifyContent: 'center', alignItems: 'center' }}><p>Mağaza bulunamadı.</p></div></MainLayout>;
    }

    return (
        <MainLayout>
            <div className="content-container">
                <div className="page-header">
                    <Link to="/stores" className="back-link">
                        <span className="material-symbols-outlined">arrow_back</span>
                        Tüm Mağazalar
                    </Link>
                    <div>
                        <p className="page-title">{store.name}</p>
                        <p className="page-subtitle">Bölge Müdürü: <strong>{manager}</strong></p>
                    </div>
                </div>

                <div className="dashboard-grid-3col">
                     <StatCard 
                        icon="sentiment_satisfied" 
                        title="Genel Memnuniyet" 
                        value={`${store.satisfaction.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / 5`}
                        tooltipText="Bu mağazadaki çalışanların verdiği 1-5 arası puanların ortalaması."
                    />
                    <StatCard 
                        icon="rate_review" 
                        title="Toplam Geri Bildirim" 
                        value={store.feedbackCount.toLocaleString()} 
                        tooltipText="Bu mağaza için alınan toplam geri bildirim sayısı."
                    />
                     <StatCard 
                        icon="checklist" 
                        title="Aksiyon Bekleyen" 
                        value={actionNeededCount.toString()} 
                        subtitle="Olumsuz yorum"
                        tooltipText="Henüz aksiyon alınmamış olumsuz yorumların sayısı."
                    />
                </div>

                <div className="dashboard-grid-2col" style={{marginTop: '1.5rem'}}>
                    <HorizontalBarChartCard
                        title="Geri Bildirim Kategorileri"
                        data={store.feedbackByCategory}
                    />
                    <WordCloudCard comments={displayComments} setKeywordFilter={setKeywordFilter} activeKeyword={keywordFilter} />
                </div>
                
                <div className="section">
                    <TurnoverHistoryCard history={store.turnoverHistory} storeName={store.name} />
                </div>

                <div className="section">
                    <h3 className="section-title">Mağaza Yorumları ({displayComments.length})</h3>
                    <div className="card comments-filters-bar">
                         <div className="filter-group">
                            <label htmlFor="sentiment-filter">Duygu</label>
                            <select id="sentiment-filter" className="filter-select" value={sentimentFilter} onChange={e => setSentimentFilter(e.target.value)}>
                                <option value="all">Tümü</option>
                                <option value="positive">Olumlu</option>
                                <option value="negative">Olumsuz</option>
                                <option value="neutral">Nötr</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <label htmlFor="category-filter">Kategori</label>
                            <select id="category-filter" className="filter-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                                {availableCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat === 'all' ? 'Tüm Kategoriler' : cat}</option>
                                ))}
                            </select>
                        </div>
                         {availableAboutWhom.length > 1 && (
                            <div className="filter-group">
                                <label htmlFor="about-whom-filter">İlgili Konu</label>
                                <select id="about-whom-filter" className="filter-select" value={selectedAboutWhom} onChange={e => setSelectedAboutWhom(e.target.value)}>
                                    {availableAboutWhom.map(item => (
                                        <option key={item} value={item}>{item === 'all' ? 'Tümü' : item}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {availableWeeks.length > 1 && (
                            <div className="filter-group">
                                <label htmlFor="week-filter">Hafta</label>
                                <select id="week-filter" className="filter-select" value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)}>
                                    {availableWeeks.map(week => (
                                        <option key={week} value={week}>
                                            {week === 'all' ? 'Tüm Haftalar' : `${week.split('-W')[1]}. Hafta (${week.split('-W')[0]})`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="comments-list">
                    {displayComments.length > 0 ? (
                        displayComments.map(comment => <CommentCard key={comment.id} comment={comment} isHighlighted={comment.id === highlightedComment} />)
                    ) : (
                        <div className="placeholder-card">
                             <p className="placeholder-text">Seçilen filtrelere uygun yorum bulunamadı.</p>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
};

export default StoreDetailPage;