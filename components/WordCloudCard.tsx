// This component is no longer used on the Analytics page
// and has been replaced by the TurkeyTurnoverMapCard.
// The component is kept for the Store Detail Page but could be refactored or removed later.
import React, { useMemo } from 'react';
import { useData } from '../DataContext';
import { Comment, WordCloudWord } from '../types';

interface WordCloudCardProps {
    comments: Comment[];
    setKeywordFilter: (keyword: string) => void;
    activeKeyword: string;
}

// FIX: Changed to a named export to resolve module loading issues.
export const WordCloudCard: React.FC<WordCloudCardProps> = ({ comments, setKeywordFilter, activeKeyword }) => {
    const { storeData } = useData();

    const aggregatedWords = useMemo((): WordCloudWord[] => {
        const relevantStoreNames = new Set(comments.map(c => c.store));
        if (relevantStoreNames.size === 0 && activeKeyword) {
            // If a keyword filter is active but results in 0 comments,
            // we should still try to show a word cloud based on the broader dataset if possible.
            // This logic can be adjusted, but for now, we'll show words from all stores in context.
            const allStoreNames = new Set(storeData.map(s => s.name));
            if (allStoreNames.size === 0) return [];

            const allWords = new Map<string, WordCloudWord>();
            storeData.forEach(store => {
                if (store.wordCloudData) {
                    store.wordCloudData.forEach(word => {
                        const existing = allWords.get(word.text) || { text: word.text, value: 0, positive: 0, negative: 0, neutral: 0 };
                        existing.value += word.value;
                        existing.positive += word.positive;
                        existing.negative += word.negative;
                        existing.neutral += word.neutral;
                        allWords.set(word.text, existing);
                    });
                }
            });
             return Array.from(allWords.values())
                .sort((a, b) => b.value - a.value)
                .slice(0, 40);

        } else if (relevantStoreNames.size === 0) {
            return [];
        }

        const relevantStores = storeData.filter(s => relevantStoreNames.has(s.name));
        
        const wordCounts = new Map<string, WordCloudWord>();
        relevantStores.forEach(store => {
            if (store.wordCloudData) {
                store.wordCloudData.forEach(word => {
                    const existing = wordCounts.get(word.text) || { text: word.text, value: 0, positive: 0, negative: 0, neutral: 0 };
                    existing.value += word.value;
                    existing.positive += word.positive;
                    existing.negative += word.negative;
                    existing.neutral += word.neutral;
                    wordCounts.set(word.text, existing);
                });
            }
        });
        
        return Array.from(wordCounts.values())
            .sort((a, b) => b.value - a.value)
            .slice(0, 40);

    }, [comments, storeData, activeKeyword]);

    const handleWordClick = (word: string) => {
        if (activeKeyword === word) {
            setKeywordFilter('');
        } else {
            setKeywordFilter(word);
        }
    };
    
    const calculateStyle = (word: WordCloudWord, maxValue: number, index: number) => {
        const minFontSize = 14;
        const maxFontSize = 48;
        
        const normalizedValue = Math.sqrt(word.value) / Math.sqrt(maxValue);
        const fontSize = minFontSize + (maxFontSize - minFontSize) * normalizedValue;

        // Sentiment-based coloring
        let color = 'var(--text-color-light)'; // Default/Neutral
        const totalSentiment = word.positive + word.negative;
        if (totalSentiment > 1) { // Require at least 2 sentimental comments for color
            const sentimentRatio = word.positive / totalSentiment;
            if (sentimentRatio > 0.66) color = 'var(--success-color)';
            else if (sentimentRatio < 0.33) color = 'var(--error-color)';
        } else if (word.negative > word.positive) {
            color = 'var(--error-color)';
        } else if (word.positive > word.negative) {
            color = 'var(--success-color)';
        }

        // Organic layout with slight rotation
        const rotation = (word.text.length % 5 - 2) * 4; // Generates -8, -4, 0, 4, 8 degrees

        return { 
            fontSize: `${fontSize}px`,
            color,
            animationDelay: `${index * 0.05}s`,
            transform: `rotate(${rotation}deg)`,
        };
    };
    
    const renderContent = () => {
        if (aggregatedWords.length > 0) {
            const maxValue = aggregatedWords.length > 0 ? aggregatedWords[0].value : 1;
            return (
                <div className="word-cloud-display">
                    {aggregatedWords.map((word, index) => {
                        const tooltipText = `Sıklık: ${word.value}\nOlumlu: ${word.positive}\nOlumsuz: ${word.negative}\nNötr: ${word.neutral}`;
                        return (
                            <button
                                key={`${word.text}-${index}`}
                                className={`word-cloud-word ${activeKeyword === word.text ? 'active' : ''}`}
                                style={calculateStyle(word, maxValue, index)}
                                title={tooltipText}
                                onClick={() => handleWordClick(word.text)}
                            >
                                {word.text}
                            </button>
                        )
                    })}
                </div>
            );
        }
        
        return (
            <div className="placeholder-card" style={{minHeight: '280px', border: 'none', background: 'var(--card-bg-color)'}}>
                <span className="material-symbols-outlined placeholder-icon" style={{fontSize: '2.5rem'}}>cloud_off</span>
                <p className="placeholder-text" style={{maxWidth: '35ch'}}>
                    Kelime bulutu oluşturmak için yeterli yorum bulunmuyor.
                </p>
            </div>
        );
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">Öne Çıkan Kelimeler</h3>
                {activeKeyword && (
                     <div className="active-keyword-filter">
                         <span>Filtre: <strong>{activeKeyword}</strong></span>
                         <button onClick={() => setKeywordFilter('')} className="btn-icon" title="Filtreyi Temizle">
                             <span className="material-symbols-outlined">close</span>
                         </button>
                     </div>
                )}
            </div>
            <div className="word-cloud-container">
                {renderContent()}
            </div>
        </div>
    );
};