import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../DataContext';
import { StoreData, Comment } from '../types';
import MainLayout from '../components/MainLayout';

type SortableKeys = keyof Pick<StoreData, 'name' | 'satisfaction' | 'feedbackCount'> | 'manager';

const getSatisfactionBarClass = (satisfaction: number) => {
    if (satisfaction >= 4.0) return 'satisfaction-bar-high';
    if (satisfaction >= 3.0) return 'satisfaction-bar-medium';
    return 'satisfaction-bar-low';
};

const SortIndicator: React.FC<{ sortConfig: { key: SortableKeys, direction: 'ascending' | 'descending' } | null, sortKey: SortableKeys }> = ({ sortConfig, sortKey }) => {
    if (!sortConfig || sortConfig.key !== sortKey) {
        return <span className="sort-indicator material-symbols-outlined">unfold_more</span>;
    }
    return (
        <span className="sort-indicator active material-symbols-outlined">
            {sortConfig.direction === 'ascending' ? 'expand_less' : 'expand_more'}
        </span>
    );
};

const StoresListPage: React.FC = () => {
    const { 
        storeData, 
        comments, 
        managers, 
        getManagerForStore, 
        currentUser, 
        weekFilterOptions,
        soms,
        getSomForStore,
        getManagersForSom 
    } = useData();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedManager, setSelectedManager] = useState('Tümü');
    const [selectedSom, setSelectedSom] = useState('Tümü');
    const [selectedCategory, setSelectedCategory] = useState('Tümü');
    const [selectedWeek, setSelectedWeek] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys, direction: 'ascending' | 'descending' }>({ key: 'satisfaction', direction: 'descending' });

    const categories = useMemo(() => {
        const uniqueCategories = new Set(comments.map(c => c.category));
        return ['Tümü', ...Array.from(uniqueCategories).sort()];
    }, [comments]);
    
    const canFilterByManager = currentUser?.role === 'Direktör' || currentUser?.role === 'İnsan Kaynakları' || currentUser?.role === 'Yönetici';

    const availableManagers = useMemo(() => {
        if (!canFilterByManager) return [];
        if (selectedSom === 'Tümü') {
            return managers; // The full list from context
        }
        const managersForSom = getManagersForSom(selectedSom);
        return ['Tümü', ...managersForSom.sort()];
    }, [selectedSom, managers, canFilterByManager, getManagersForSom]);

    useEffect(() => {
        if (!availableManagers.includes(selectedManager)) {
            setSelectedManager('Tümü');
        }
    }, [availableManagers, selectedManager]);

    const commentsByStore = useMemo(() => {
        const map = new Map<string, Comment[]>();
        comments.forEach(comment => {
            if (!map.has(comment.store)) {
                map.set(comment.store, []);
            }
            map.get(comment.store)!.push(comment);
        });
        return map;
    }, [comments]);

    const sortedAndFilteredStores = useMemo(() => {
        // Step 1: Filter stores based on all criteria first.
        const filteredStores = storeData.filter(store => {
            const searchMatch = store.name.toLowerCase().includes(searchQuery.toLowerCase());
            const somMatch = selectedSom === 'Tümü' || getSomForStore(store.name) === selectedSom;
            const managerMatch = !canFilterByManager || selectedManager === 'Tümü' || getManagerForStore(store.name) === selectedManager;
            
            if (!searchMatch || !somMatch || !managerMatch) {
                return false;
            }
    
            // If category/week filters are active, the store must have at least one comment matching them.
            if (selectedCategory !== 'Tümü' || selectedWeek !== 'all') {
                const relevantComments = (commentsByStore.get(store.name) || []).filter(comment => {
                    const categoryMatch = selectedCategory === 'Tümü' || comment.category === selectedCategory;
                    const weekMatch = selectedWeek === 'all' || comment.week === selectedWeek;
                    return categoryMatch && weekMatch;
                });
                return relevantComments.length > 0;
            }
    
            return true;
        });
    
        // Step 2: Map over the already filtered stores to calculate display metrics.
        const processedStores = filteredStores.map(store => {
            const relevantComments = (commentsByStore.get(store.name) || []).filter(comment => {
                const categoryMatch = selectedCategory === 'Tümü' || comment.category === selectedCategory;
                const weekMatch = selectedWeek === 'all' || comment.week === selectedWeek;
                return categoryMatch && weekMatch;
            });
    
            const filteredFeedbackCount = relevantComments.length;
            const commentsWithRating = relevantComments.filter(c => typeof c.rating === 'number' && c.rating >= 1 && c.rating <= 5);
            const filteredSatisfaction = commentsWithRating.length > 0
                ? (commentsWithRating.reduce((sum, c) => sum + c.rating!, 0) / commentsWithRating.length)
                : 0;
            
            return {
                ...store,
                satisfaction: filteredSatisfaction,
                feedbackCount: filteredFeedbackCount,
            };
        });
    
        // Step 3: Sort the final processed list.
        if (sortConfig) {
            processedStores.sort((a, b) => {
                const key = sortConfig.key;
                const direction = sortConfig.direction;
                
                let aValue: string | number, bValue: string | number;
    
                if (key === 'manager') {
                    aValue = getManagerForStore(a.name) || '';
                    bValue = getManagerForStore(b.name) || '';
                } else {
                    aValue = a[key];
                    bValue = b[key];
                }
    
                if (aValue < bValue) {
                    return direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        
        return processedStores;
    
    }, [
        storeData, 
        commentsByStore, 
        searchQuery, 
        selectedManager, 
        selectedSom, 
        selectedCategory, 
        selectedWeek, 
        sortConfig,
        canFilterByManager, 
        getManagerForStore, 
        getSomForStore
    ]);
    
    const handleSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setSelectedManager('Tümü');
        setSelectedSom('Tümü');
        setSelectedCategory('Tümü');
        setSelectedWeek('all');
    };

    const filtersAreActive = searchQuery !== '' || selectedManager !== 'Tümü' || selectedSom !== 'Tümü' || selectedCategory !== 'Tümü' || selectedWeek !== 'all';

    return (
        <MainLayout>
            <div className="content-container">
                <div className="page-header">
                    <div>
                        <p className="page-title">Mağaza Listesi</p>
                        <p className="page-subtitle">Tüm mağazaların memnuniyet verilerini görüntüleyin, filtreleyin ve karşılaştırın.</p>
                    </div>
                </div>

                <div className="card" style={{height: 'auto', padding: '1rem 1.5rem'}}>
                    <div className="comment-filters">
                        <div className="filter-group" style={{flexGrow: 1, minWidth: '200px'}}>
                            <label htmlFor="store-search">Mağaza Adı</label>
                            <div className="search-input-wrapper">
                                <span className="material-symbols-outlined search-icon" style={{left: '0.75rem'}}>search</span>
                                <input 
                                    id="store-search"
                                    placeholder="Mağaza adıyla ara..." 
                                    className="search-input"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                         <div className="filter-group">
                             <label htmlFor="week-filter">Hafta</label>
                            <select id="week-filter" className="filter-select" value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)}>
                                {weekFilterOptions.map(week => (
                                    <option key={week.value} value={week.value}>{week.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label htmlFor="category-filter">Kategori</label>
                            <select id="category-filter" className="filter-select" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                                {categories.map(category => (
                                    <option key={category} value={category}>{category === 'Tümü' ? 'Tüm Kategoriler' : category}</option>
                                ))}
                            </select>
                        </div>
                        {canFilterByManager && (
                            <>
                                <div className="filter-group">
                                    <label htmlFor="som-filter">SOM</label>
                                    <select id="som-filter" className="filter-select" value={selectedSom} onChange={(e) => setSelectedSom(e.target.value)}>
                                        {soms.map(som => (
                                            <option key={som} value={som}>{som}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="filter-group">
                                    <label htmlFor="manager-filter">Bölge Müdürü</label>
                                    <select id="manager-filter" className="filter-select" value={selectedManager} onChange={(e) => setSelectedManager(e.target.value)}>
                                        {availableManagers.map(manager => (
                                            <option key={manager} value={manager}>{manager === 'Tümü' ? 'Tüm Yöneticiler' : manager}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}
                        {filtersAreActive && (
                            <button onClick={handleResetFilters} className="btn-link" style={{fontSize: '0.8rem', height: '40px'}}>
                                <span className="material-symbols-outlined" style={{fontSize: '1.2rem'}}>close</span>
                                Sıfırla
                            </button>
                        )}
                    </div>
                </div>

                <div className="section" style={{marginTop: '1.5rem'}}>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{width: '5%'}}>#</th>
                                    <th className="sortable" style={{width: '30%'}} onClick={() => handleSort('name')}>Mağaza Adı <SortIndicator sortConfig={sortConfig} sortKey="name" /></th>
                                    <th className="sortable" style={{width: '25%'}} onClick={() => handleSort('manager')}>Bölge Müdürü <SortIndicator sortConfig={sortConfig} sortKey="manager" /></th>
                                    <th className="sortable" style={{width: '30%'}} onClick={() => handleSort('satisfaction')}>Memnuniyet Puanı <SortIndicator sortConfig={sortConfig} sortKey="satisfaction" /></th>
                                    <th className="sortable" style={{width: '10%'}} onClick={() => handleSort('feedbackCount')}>G.Bildirim <SortIndicator sortConfig={sortConfig} sortKey="feedbackCount" /></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedAndFilteredStores.map((store, index) => (
                                    <tr key={store.id} className="clickable-table-row">
                                         <td><Link to={`/store/${store.id}`} tabIndex={-1} style={{display: 'block', padding: '1rem 1.5rem'}}>{index + 1}</Link></td>
                                        <td><Link to={`/store/${store.id}`} tabIndex={-1} style={{fontWeight: 600, display: 'block', padding: '1rem 1.5rem'}}>{store.name}</Link></td>
                                        <td className="light-text"><Link to={`/store/${store.id}`} tabIndex={-1} style={{display: 'block', padding: '1rem 1.5rem'}}>{getManagerForStore(store.name) || 'N/A'}</Link></td>
                                        <td>
                                            <Link to={`/store/${store.id}`} tabIndex={-1} style={{display: 'block', padding: '1rem 1.5rem'}}>
                                                <div className="satisfaction-cell">
                                                    <span className="satisfaction-value">{store.satisfaction.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / 5</span>
                                                    <div className="satisfaction-bar-container">
                                                        <div className={`satisfaction-bar ${getSatisfactionBarClass(store.satisfaction)}`} style={{ width: `${(store.satisfaction / 5) * 100}%` }}></div>
                                                    </div>
                                                </div>
                                            </Link>
                                        </td>
                                        <td><Link to={`/store/${store.id}`} tabIndex={-1} style={{display: 'block', padding: '1rem 1.5rem'}}>{store.feedbackCount}</Link></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                         {sortedAndFilteredStores.length === 0 && (
                            <div className="placeholder-card" style={{height: 'auto', padding: '2rem', borderRadius: '0 0 var(--border-radius-xl) var(--border-radius-xl)'}}>
                                <p className="placeholder-text">Seçilen filtrelere uygun mağaza bulunamadı.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default StoresListPage;