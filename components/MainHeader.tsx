

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProfileDropdown from './ProfileDropdown';
import { useData } from '../DataContext';
import { StoreData, Comment } from '../types';

interface MainHeaderProps {
    onToggleSidebar: () => void;
}

type SearchResult = {
    type: 'store';
    data: StoreData;
} | {
    type: 'comment';
    data: Comment;
    storeId: string | undefined;
}

const MainHeader: React.FC<MainHeaderProps> = ({ onToggleSidebar }) => {
    const { storeData, comments } = useData();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    
    const searchResults = useMemo((): SearchResult[] => {
        if (query.length < 2) return [];

        const lowerCaseQuery = query.toLowerCase();
        
        const storeResults: SearchResult[] = storeData
            .filter(store => store.name.toLowerCase().includes(lowerCaseQuery))
            .map(store => ({ type: 'store', data: store }));

        const commentResults: SearchResult[] = comments
            .filter(comment => comment.text.toLowerCase().includes(lowerCaseQuery))
            .map(comment => {
                const store = storeData.find(s => s.name === comment.store);
                return { type: 'comment', data: comment, storeId: store?.id };
            });

        return [...storeResults, ...commentResults].slice(0, 10);
    }, [query, storeData, comments]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleResultClick = (path: string) => {
        setQuery('');
        setIsSearchOpen(false);
        navigate(path);
    };

    return (
        <header className="main-header">
            <div className="header-left">
                <button 
                    onClick={onToggleSidebar} 
                    className="sidebar-toggle-btn" 
                    aria-label="Toggle sidebar"
                >
                    <span className="material-symbols-outlined">menu</span>
                </button>
                 <div className="global-search" ref={searchRef}>
                    <div className="search-input-wrapper">
                        <div className="search-icon">
                            <span className="material-symbols-outlined">search</span>
                        </div>
                        <input 
                            placeholder="Mağaza veya yorum ara..." 
                            className="search-input" 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={() => setIsSearchOpen(true)}
                        />
                    </div>
                    {isSearchOpen && query.length > 1 && (
                        <div className="search-results">
                            {searchResults.length > 0 ? (
                                searchResults.map((result, index) => (
                                    result.type === 'store' ? (
                                         <button key={`store-${result.data.id}-${index}`} className="search-result-item" onClick={() => handleResultClick(`/store/${result.data.id}`)}>
                                             <span className="material-symbols-outlined result-icon">storefront</span>
                                            <div className="result-text">
                                                <p className="result-title">{result.data.name}</p>
                                                <p className="result-subtitle">Mağaza</p>
                                            </div>
                                        </button>
                                    ) : (
                                        result.storeId && (
                                            <button key={`comment-${result.data.id}-${index}`} className="search-result-item" onClick={() => handleResultClick(`/store/${result.storeId}#${result.data.id}`)}>
                                                 <span className="material-symbols-outlined result-icon">chat_bubble</span>
                                                <div className="result-text">
                                                    <p className="result-title">{`"${result.data.text.substring(0, 40)}..."`}</p>
                                                    <p className="result-subtitle">{result.data.store} yorumu</p>
                                                </div>
                                            </button>
                                        )
                                    )
                                ))
                            ) : (
                                <div className="search-no-results">
                                    <p>Sonuç bulunamadı.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className="header-right">
                <ProfileDropdown />
            </div>
        </header>
    );
};

export default MainHeader;