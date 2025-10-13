import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
// FIX: Changed AnomalyDetection to AnomalyDetectionResponse to match the exported type from './types'.
import { StoreData, Comment, User, ChartData, TurnoverData, WeekFilterOption, MonthFilterOption, TurnoverHistory, UploadedFile, ActionTaken, AIAnalysisState, AIAnalysisResponse, TurnoverRiskAnalysis, SuccessAnalysisResponse, AnomalyDetectionResponse, WordCloudWord } from './types';
import * as XLSX from 'xlsx';
import { GoogleGenAI, Type } from "@google/genai";

// Helper function to normalize Turkish characters for robust header matching
const normalizeHeader = (header: string): string => {
    if (!header) return '';
    return header
        .toLocaleLowerCase('tr-TR')
        .replace(/ı/g, 'i')
        .replace(/ç/g, 'c')
        .replace(/ğ/g, 'g')
        .replace(/ö/g, 'o')
        .replace(/ş/g, 's')
        .replace(/ü/g, 'u')
        .replace(/\s+/g, ' ')
        .trim();
};

const normalizeTurkish = (str: string): string => {
    if (!str) return '';
    return str
        .toLocaleLowerCase('tr-TR')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ç/g, 'c')
        .replace(/ğ/g, 'g')
        .replace(/\s+/g, ' ')
        .trim();
};


// Helper to parse potential Excel dates (serial numbers or strings)
const parseExcelDate = (excelDate: any): Date | null => {
    if (typeof excelDate === 'number' && excelDate > 1) {
        // Excel serial date (days since 1900-01-01, with Excel's leap year bug)
        // JavaScript's epoch is 1970-01-01. The difference is 25569 days.
        const utc_days = Math.floor(excelDate - 25569);
        const utc_value = utc_days * 86400000;
        const date_info = new Date(utc_value);
        // Correct for timezone offset
        return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
    }
    if (typeof excelDate === 'string') {
        // Handle common date formats
        const d = new Date(excelDate);
        if (!isNaN(d.getTime())) {
            return d;
        }
        // Handle DD.MM.YYYY
        const parts = excelDate.split('.');
        if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const year = parseInt(parts[2]);
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                 const d2 = new Date(year, month, day);
                 if (!isNaN(d2.getTime()))
                    return d2;
            }
        }
    }
    return null;
};

const getApiErrorMessage = (error: any): string => {
    console.error("Gemini API Error:", JSON.stringify(error));
    if (typeof error === 'string' && error.toLowerCase().includes('quota')) {
         return "Yapay zeka analiz servisinde geçici bir yoğunluk var. Lütfen bir süre sonra tekrar deneyin.";
    }
    if (error?.message?.toLowerCase().includes('quota')) {
        return "Yapay zeka analiz servisinde geçici bir yoğunluk var. Lütfen bir süre sonra tekrar deneyin.";
    }
    return "Yapay zeka içgörüsü oluşturulurken bir hata oluştu. Lütfen bağlantınızı kontrol edip tekrar deneyin.";
};


const initialUsers: User[] = [
    { id: 'u1', name: 'Selin Vural', email: 'selin.vural@example.com', password: '123456', title:'Direktör', role: 'Direktör', status: 'Aktif' },
    { id: 'u2', name: 'Murat Demir', email: 'murat.demir@example.com', password: '123456', title: 'İnsan Kaynakları', role: 'İnsan Kaynakları', status: 'Aktif' },
    { id: 'u3', name: 'KEMAL GÜLCAN', email: 'kemal.gulcan@example.com', password: '123456', title: 'Bölge Müdürü', role: 'Bölge Müdürü', status: 'Aktif' },
    { id: 'u4', name: 'Elif Aydın', email: 'elif.aydin@example.com', password: '123456', title: 'Bölge Müdürü', role: 'Bölge Müdürü', status: 'Aktif' },
    { id: 'u5', name: 'Caner Öztürk', email: 'caner.ozturk@example.com', password: '123456', title: 'Bölge Müdürü', role: 'Bölge Müdürü', status: 'Aktif' },
    { id: 'u6', name: 'Zeynep Aslan', email: 'zeynep.aslan@example.com', password: '123456', title: 'Bölge Müdürü', role: 'Bölge Müdürü', status: 'Aktif' },
    { id: 'u7', name: 'Ayşe Kaya', email: 'ayse.kaya@example.com', password: '123456', title: 'Satış Operasyon Müdürü', role: 'Satış Operasyon Müdürü', status: 'Aktif' },
];

const mockStoreData: StoreData[] = [];
const mockComments: Comment[] = [];


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

// FIX: Added function to extract keywords from comments for word cloud generation.
// FIX: Upgraded keyword extraction to include n-grams (2-3 word phrases) and sentiment tracking for each keyword.
const extractKeywords = (comments: Comment[]): WordCloudWord[] => {
    const stopWords = new Set([
        've', 'ile', 'ama', 'fakat', 'lakin', 'ancak', 'çünkü', 'da', 'de', 'daha',
        'her', 'çok', 'az', 'bir', 'iki', 'üç', 'ben', 'sen', 'o', 'biz', 'siz', 'onlar',
        'gibi', 'için', 'kadar', 'diye', 'yok', 'var', 'olan', 'olarak', 'olsun', 'oluyor',
        'bu', 'şu', 'o', 'şey', 'mi', 'mı', 'mu', 'mü', 'acaba', 'aslında', 'bazen',
        'bazı', 'belki', 'bile', 'böyle', 'bütün', 'dahi', 'demek', 'diğer', 'eğer',
        'en', 'ise', 'hem', 'hiç', 'ise', 'kendi', 'kere', 'ki', 'kim', 'ne', 'neden',
        'nasıl', 'niye', 'niçin', 'sanki', 'şöyle', 'veya', 'veyahut', 'ya', 'yani',
        'zaten', 'dolayı', 'tarafından', 'üzere', 'gayet', 'sadece', 'tek', 'tüm'
    ]);

    const wordData = new Map<string, { positive: number; negative: number; neutral: number }>();

    comments.forEach(comment => {
        const sentiment = comment.sentiment;
        const text = comment.text.toLocaleLowerCase('tr-TR').replace(/[.,!?;:()"'-]/g, ' ');
        const words = text.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w) && isNaN(Number(w)));

        const updateSentiment = (key: string) => {
            const current = wordData.get(key) || { positive: 0, negative: 0, neutral: 0 };
            current[sentiment]++;
            wordData.set(key, current);
        };

        // Process single words
        words.forEach(word => {
            updateSentiment(word);
        });

        // Process bigrams (2-word phrases)
        for (let i = 0; i < words.length - 1; i++) {
            const bigram = `${words[i]} ${words[i + 1]}`;
            updateSentiment(bigram);
        }
        
        // Process trigrams (3-word phrases)
        for (let i = 0; i < words.length - 2; i++) {
            const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
            updateSentiment(trigram);
        }
    });

    return Array.from(wordData.entries())
        .map(([text, counts]) => {
            const totalValue = counts.positive + counts.negative + counts.neutral;
            // Only include words/phrases that appear more than once to reduce noise
            if (totalValue <= 1) return null; 
            return {
                text,
                value: totalValue,
                ...counts
            };
        })
        .filter((item): item is WordCloudWord => item !== null)
        .sort((a, b) => b.value - a.value)
        .slice(0, 40); // Limit to top 40 words
};


const processAllData = (comments: Comment[], turnoverData: Map<string, TurnoverData>): StoreData[] => {
    const allStoreNames = new Set<string>();
    comments.forEach(c => allStoreNames.add(c.store));
    turnoverData.forEach((_, storeName) => allStoreNames.add(storeName));

    const commentsByStore = new Map<string, Comment[]>();
    comments.forEach(comment => {
        if (!commentsByStore.has(comment.store)) {
            commentsByStore.set(comment.store, []);
        }
        commentsByStore.get(comment.store)!.push(comment);
    });

    return Array.from(allStoreNames).map(storeName => {
        const storeComments = commentsByStore.get(storeName) || [];
        const feedbackCount = storeComments.length;
        const positiveComments = storeComments.filter(c => c.sentiment === 'positive');
        
        const satisfaction = feedbackCount > 0 ? Math.round((positiveComments.length / feedbackCount) * 100) : 0;

        const feedbackByCategoryMap: { [key: string]: number } = {};
        storeComments.forEach(c => {
            feedbackByCategoryMap[c.category] = (feedbackByCategoryMap[c.category] || 0) + 1;
        });
        const feedbackByCategory = Object.entries(feedbackByCategoryMap).map(([name, value]) => ({ name, value }));
        
        const storeTurnoverData = turnoverData.get(storeName);
        const turnoverHistory: TurnoverHistory[] = storeTurnoverData
            ? Object.entries(storeTurnoverData).map(([month, rate]) => ({ month, rate }))
            : [];
        
        const monthOrder = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
        let latestTurnoverRate: number | undefined = undefined;
        if (turnoverHistory.length > 0) {
            let latestMonthIndex = -1;
            turnoverHistory.forEach(item => {
                const currentMonthIndex = monthOrder.indexOf(item.month);
                if (currentMonthIndex > latestMonthIndex) {
                    latestMonthIndex = currentMonthIndex;
                    latestTurnoverRate = item.rate;
                }
            });
        }
        
        // FIX: Generate word cloud data during processing.
        const wordCloudData = extractKeywords(storeComments);

        return {
            id: storeName.toLowerCase().replace(/[^\w-]/g, '-'),
            name: storeName,
            satisfaction,
            feedbackCount,
            feedbackByCategory,
            turnoverHistory,
            latestTurnoverRate,
            wordCloudData,
        };
    });
};

const mapTitleToRole = (title: string): User['role'] => {
    const lowerTitle = title.toLowerCase();
    
    // Check for specific roles that should NOT get full access first.
    if (lowerTitle.includes('bölge müdürü')) return 'Bölge Müdürü';
    if (lowerTitle.includes('satış operasyon müdürü')) return 'Satış Operasyon Müdürü';

    // All other titles get full access (implicitly treated as a high-privilege role).
    // The specific role type ('Direktör', 'İnsan Kaynakları', etc.) is less important
    // than the access level, which is now "full access" for all others.
    // We can assign a generic high-level role or keep the specific ones. Let's keep them for now.
    if (lowerTitle.includes('direktör') || lowerTitle.includes('head of')) return 'Direktör';
    if (lowerTitle.includes('ik') || lowerTitle.includes('insan kaynakları')) return 'İnsan Kaynakları';
    if (lowerTitle.includes('müdür')) return 'Yönetici';
    
    // Default for any other title (like 'İK Uzmanı') is now full access.
    // Assigning a high-level role like 'Yönetici' or 'İnsan Kaynakları'.
    // Let's use 'İnsan Kaynakları' as a catch-all for specialist roles that need full data view.
    return 'İnsan Kaynakları';
};

const CATEGORIES_CONFIG = {
    "Maaş & Yan Haklar": {
        phrases: ['yemek kartı', 'yol parası', 'yan hak', 'maaşlar zamanında', 'sigorta prim'],
        keywords: { 'maaş': 10, 'ücret': 10, 'zam': 10, 'prim': 8, 'sodexo': 8, 'multinet': 8, 'finansal': 7, 'kazanç': 5, 'para': 3, 'hak': 3 }
    },
    "Yönetim & Liderlik": {
        phrases: ['müdür yardımcısı', 'bölge müdürü'],
        keywords: { 'müdür': 10, 'yönetici': 10, 'amir': 9, 'şef': 8, 'lider': 6, 'baskı': 12, 'mobbing': 15, 'iletişim': 5, 'adalet': 7, 'adil': 7, 'tutum': 6, 'davranış': 6, 'saygı': 6, 'yönetim': 8 }
    },
    "İş Yükü & Denge": {
        phrases: ['personel eksik', 'eleman yok', 'fazla mesai', 'çalışma saatleri', 'iş yükü', 'tek kişi'],
        keywords: { 'yoğun': 7, 'yorgun': 6, 'mola': 5, 'izin': 6, 'denge': 5, 'personel': 8, 'eleman': 8, 'mesai': 9 }
    },
    "Kariyer & Gelişim": {
        phrases: ['yükselme fırsatı', 'kariyer yolu'],
        keywords: { 'terfi': 10, 'yükselme': 10, 'eğitim': 8, 'gelişim': 8, 'kariyer': 9, 'fırsat': 6, 'potensiyel': 5 }
    },
    "Ekip İlişkileri & Kültür": {
        phrases: ['ekip ruhu', 'takım çalışması', 'arkadaşlık ortamı'],
        keywords: { 'ekip': 8, 'takım': 8, 'arkadaşlar': 7, 'ortam': 6, 'atmosfer': 6, 'huzur': 7, 'dedikodu': 9, 'saygısızlık': 9, 'iletişimsizlik': 8, 'kültür': 5, 'mutlu': 6 }
    },
    "Operasyon & Fiziksel Şartlar": {
        phrases: ['kasa sorunu', 'teknik arıza', 'fiziksel koşullar'],
        keywords: { 'depo': 7, 'mal': 6, 'sevkiyat': 7, 'ürün': 5, 'kasa': 8, 'sistem': 8, 'teknik': 8, 'fiziksel': 7, 'temizlik': 6, 'koşullar': 7, 'ekipman': 8 }
    }
};
const CATEGORY_PRIORITY = [
    "Maaş & Yan Haklar",
    "Yönetim & Liderlik",
    "İş Yükü & Denge",
    "Kariyer & Gelişim",
    "Ekip İlişkileri & Kültür",
    "Operasyon & Fiziksel Şartlar",
];
const TYPICALLY_NEGATIVE_CATEGORIES = ["Maaş & Yan Haklar", "Yönetim & Liderlik", "İş Yükü & Denge"];

const categorizeCommentV2 = (text: string, sentiment: 'positive' | 'negative' | 'neutral'): string => {
    if (!text) return 'Genel';
    const normalizedText = normalizeTurkish(text);
    
    const scores: { [key: string]: number } = {};
    CATEGORY_PRIORITY.forEach(cat => scores[cat] = 0);

    for (const category of CATEGORY_PRIORITY) {
        const config = CATEGORIES_CONFIG[category as keyof typeof CATEGORIES_CONFIG];
        
        if (config.phrases) {
            for (const phrase of config.phrases) {
                if (normalizedText.includes(normalizeTurkish(phrase))) {
                    scores[category] += 15;
                }
            }
        }

        if (config.keywords) {
            for (const [keyword, weight] of Object.entries(config.keywords)) {
                const normalizedKeyword = normalizeTurkish(keyword);
                const regex = new RegExp(`\\b${normalizedKeyword}\\b`, 'g');
                const matches = normalizedText.match(regex);
                if (matches) {
                    scores[category] += matches.length * weight;
                }
            }
        }
    }

    // Adjust scores based on overall comment sentiment for more accurate categorization
    if (sentiment === 'negative') {
        TYPICALLY_NEGATIVE_CATEGORIES.forEach(cat => {
            if (scores[cat] > 0) scores[cat] *= 1.2; // Give a 20% boost to likely negative topics
        });
    } else if (sentiment === 'positive') {
        TYPICALLY_NEGATIVE_CATEGORIES.forEach(cat => {
            if (scores[cat] > 0) scores[cat] *= 0.7; // Penalize typically negative topics
        });
        // Boost typically positive/neutral topics
        if (scores["Ekip İlişkileri & Kültür"] > 0) scores["Ekip İlişkileri & Kültür"] *= 1.2;
        if (scores["Kariyer & Gelişim"] > 0) scores["Kariyer & Gelişim"] *= 1.2;
    }


    let maxScore = 0;
    let winningCategory = 'Genel';
    for (const category of CATEGORY_PRIORITY) {
        if (scores[category] > maxScore) {
            maxScore = scores[category];
            winningCategory = category;
        }
    }

    if (maxScore < 5) {
        return 'Genel';
    }

    return winningCategory;
};

const determineSentiment = (text: string, rating: number): 'positive' | 'negative' | 'neutral' => {
    const normalizedText = normalizeTurkish(text.trim());

    if (!normalizedText) {
        if (rating > 3) return 'positive';
        if (rating < 3) return 'negative';
        return 'neutral';
    }

    if (/(sikayet|sorun|problem|sikinti|rahatsizlik|olumsuz).{0,25}yok/.test(normalizedText) || /memnuniyetsizlik.*yok/.test(normalizedText)) {
        return 'positive';
    }
    if (normalizedText.includes('kotu degil') || normalizedText.includes('fena degil')) {
        return 'neutral';
    }

    let score = 0;
    const positiveKeywords: { [key: string]: number } = {
        'mükemmel': 3, 'harika': 3, 'çok iyi': 2, 'çok güzel': 2, 'mutluyum': 3, 'teşekkür': 2, 'memnun': 2,
        'başarılı': 2, 'süper': 2, 'güzel': 1, 'iyi': 1, 'sevdim': 2, 'kolay': 1, 'çok memnunum': 3,
    };
    const negativeKeywords: { [key: string]: number } = {
        'berbat': -4, 'rezalet': -4, 'korkunç': -3, 'iğrenç': -3, 'istifa': -3, 'ayrılmak': -3, 'mobbing': -5,
        'baskı': -3, 'şikayetçiyim': -3, 'dayanılmaz': -3, 'çekilmez': -3, 'alamıyoruz': -3, 'alamıyorum': -3, 'kalmıyor': -3,
        'üzücü': -3, 'mutsuz': -2, 'sorun': -2, 'problem': -2, 'kötü': -2, 'yetersiz': -2, 'eksik': -2,
        'zor': -2, 'düşük': -2, 'az': -2, 'maalesef': -2, 'malesef': -2, 'yoğun': -1, 'stres': -2, 'saçma': -2,
        ':(': -4, ';(': -4, ':((': -5
    };
    
    Object.entries(positiveKeywords).forEach(([word, value]) => {
        if (normalizedText.includes(normalizeTurkish(word))) score += value;
    });
    Object.entries(negativeKeywords).forEach(([word, value]) => {
        if (normalizedText.includes(normalizeTurkish(word))) score += value;
    });

    if (score <= -3) return 'negative';
    if (score >= 3) return 'positive';

    const ratingSentiment = rating > 3 ? 'positive' : rating < 3 ? 'negative' : 'neutral';
    
    if (score < 0 && ratingSentiment === 'positive') {
        return 'negative';
    }

    return ratingSentiment;
};

interface DataContextType {
    isAuthenticated: boolean;
    currentUser: User | null;
    storeData: StoreData[];
    comments: Comment[];
    loading: boolean;
    isProcessing: boolean;
    processingMessage: string;
    feedbackFileHistory: UploadedFile[];
    turnoverFileHistory: UploadedFile[];
    managers: string[];
    soms: string[];
    profileImageUrl: string | null;
    weekFilterOptions: WeekFilterOption[];
    monthFilterOptions: MonthFilterOption[];
    aiAnalyses: AIAnalysisState;
    login: (email: string, pass: string) => boolean;
    logout: () => void;
    signUp: (details: Omit<User, 'id' | 'role' | 'status'>) => Promise<void>;
    uploadData: (data: any[][], file: File) => Promise<void>;
    uploadTurnoverData: (data: any[][], file: File) => Promise<void>;
    deleteFeedbackFile: (fileId: string) => void;
    deleteTurnoverFile: (fileId: string) => void;
    getManagerForStore: (storeName: string) => string | undefined;
    getSomForStore: (storeName: string) => string | undefined;
    getManagersForSom: (som: string) => string[];
    updateProfileImage: (url: string | null) => void;
    getUserImageUrlByName: (name: string) => string | null;
    addCommentAction: (commentId: string, actionText: string) => void;
    toggleReactionOnAction: (commentId: string, actionIndex: number, emoji: string) => void;
    deleteCommentAction: (commentId: string, actionIndex: number) => void;
    editCommentAction: (commentId:string, actionIndex: number, newText: string) => void;
    generateSummary: (storeData: StoreData[], comments: Comment[]) => void;
    generateFocus: (storeData: StoreData[], comments: Comment[]) => void;
    generateTurnoverRisk: (storeData: StoreData[], comments: Comment[]) => void;
    generateSuccess: (storeData: StoreData[], comments: Comment[]) => void;
    generateAnomalies: (storeData: StoreData[], comments: Comment[]) => void;
    resetAIAnalyses: () => void;
    getStoreById: (storeId: string) => StoreData | undefined;
    getCommentsForStore: (storeName: string) => Comment[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Master data state
    const [allStoreData, setAllStoreData] = useState<StoreData[]>([]);
    const [allComments, setAllComments] = useState<Comment[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [storeManagerMap, setStoreManagerMap] = useState<Map<string, string>>(new Map());
    const [storeSomMap, setStoreSomMap] = useState<Map<string, string>>(new Map());
    const [somToManagersMap, setSomToManagersMap] = useState<Map<string, Set<string>>>(new Map());
    const [allTurnoverData, setAllTurnoverData] = useState<Map<string, TurnoverData>>(new Map());
    
    // Role-filtered data (visible to components)
    const [storeData, setStoreData] = useState<StoreData[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    
    // Indexed data for performance
    const [storesById, setStoresById] = useState<Map<string, StoreData>>(new Map());
    const [commentsByStoreName, setCommentsByStoreName] = useState<Map<string, Comment[]>>(new Map());

    // Filter options
    const [managers, setManagers] = useState<string[]>([]);
    const [soms, setSoms] = useState<string[]>([]);
    const [weekFilterOptions, setWeekFilterOptions] = useState<WeekFilterOption[]>([]);
    const [monthFilterOptions, setMonthFilterOptions] = useState<MonthFilterOption[]>([]);

    const [feedbackFileHistory, setFeedbackFileHistory] = useState<UploadedFile[]>([]);
    const [turnoverFileHistory, setTurnoverFileHistory] = useState<UploadedFile[]>([]);

    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingMessage, setProcessingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userProfileImages, setUserProfileImages] = useState<Record<string, string>>({});
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const initialAIState: AIAnalysisState = {
        summary: { result: null, loading: false, error: null },
        focus: { result: null, loading: false, error: null },
        turnover: { result: null, loading: false, error: null },
        success: { result: null, loading: false, error: null },
        anomalies: { result: null, loading: false, error: null },
    };
    const [aiAnalyses, setAiAnalyses] = useState<AIAnalysisState>(initialAIState);

    // Initial data loading from localStorage or mocks
    useEffect(() => {
        try {
            const authStatus = sessionStorage.getItem('isAuthenticated');
            const savedCurrentUser = sessionStorage.getItem('currentUser');
            if (authStatus === 'true' && savedCurrentUser) {
                setIsAuthenticated(true);
                setCurrentUser(JSON.parse(savedCurrentUser));
            }

            const savedProfileImages = localStorage.getItem('userProfileImages');
            setUserProfileImages(savedProfileImages ? JSON.parse(savedProfileImages) : {});

            const savedComments = localStorage.getItem('comments');
            const savedStoreData = localStorage.getItem('storeData');
            const savedUsers = localStorage.getItem('users');
            const savedStoreManagerMap = localStorage.getItem('storeManagerMap');
            const savedStoreSomMap = localStorage.getItem('storeSomMap');
            const savedSomToManagersMap = localStorage.getItem('somToManagersMap');
            const savedTurnoverData = localStorage.getItem('turnoverData');
            const savedFeedbackHistory = localStorage.getItem('feedbackFileHistory');
            const savedTurnoverHistory = localStorage.getItem('turnoverFileHistory');

            setAllComments(savedComments ? JSON.parse(savedComments) : mockComments);
            setAllStoreData(savedStoreData ? JSON.parse(savedStoreData) : mockStoreData);
            setAllUsers(savedUsers ? JSON.parse(savedUsers) : initialUsers);

            if (savedStoreManagerMap) setStoreManagerMap(new Map(JSON.parse(savedStoreManagerMap)));
            if (savedStoreSomMap) setStoreSomMap(new Map(JSON.parse(savedStoreSomMap)));
            if (savedSomToManagersMap) {
                const parsed = JSON.parse(savedSomToManagersMap);
                const map = new Map<string, Set<string>>();
                parsed.forEach(([key, value]: [string, string[]]) => {
                    map.set(key, new Set(value));
                });
                setSomToManagersMap(map);
            }
             if (savedTurnoverData) {
                setAllTurnoverData(new Map(JSON.parse(savedTurnoverData)));
            }
            setFeedbackFileHistory(savedFeedbackHistory ? JSON.parse(savedFeedbackHistory) : []);
            setTurnoverFileHistory(savedTurnoverHistory ? JSON.parse(savedTurnoverHistory) : []);

        } catch (err) {
            console.error("Failed to load data from storage", err);
            setAllStoreData(mockStoreData);
            setAllComments(mockComments);
            setAllUsers(initialUsers);
            setError("Kaydedilmiş veriler yüklenemedi.");
        } finally {
            setLoading(false);
        }
    }, []);

    // Effect to filter data and calculate metrics when user or master data changes
    useEffect(() => {
        if (loading) return;

        let filteredStores: StoreData[] = [];
        let filteredComments: Comment[] = [];
        
        const hasRestrictedAccess = currentUser?.role === 'Bölge Müdürü' || currentUser?.role === 'Satış Operasyon Müdürü';

        if (isAuthenticated && currentUser) {
            if (!hasRestrictedAccess) {
                // Full access for all roles other than BM and SOM
                filteredStores = allStoreData;
                filteredComments = allComments;
            } else if (currentUser.role === 'Satış Operasyon Müdürü') {
                let managedManagers: Set<string> | undefined;
                const normalizedCurrentUserName = normalizeTurkish(currentUser.name);

                // Case-insensitive lookup for the SOM
                for (const [somName, managersSet] of somToManagersMap.entries()) {
                    if (normalizeTurkish(somName) === normalizedCurrentUserName) {
                        managedManagers = managersSet;
                        break;
                    }
                }

                if (managedManagers && managedManagers.size > 0) {
                    const managedStores = new Set<string>();
                    // Normalize the names of managers managed by the SOM for comparison
                    const normalizedManagedManagers = new Set(Array.from(managedManagers).map(m => normalizeTurkish(m)));

                    for (const [store, manager] of storeManagerMap.entries()) {
                        // Check if the store's manager (normalized) is in the set of managed managers
                        if (normalizedManagedManagers.has(normalizeTurkish(manager))) {
                            managedStores.add(store);
                        }
                    }
                    if (managedStores.size > 0) {
                        filteredStores = allStoreData.filter(store => managedStores.has(store.name));
                        filteredComments = allComments.filter(comment => managedStores.has(comment.store));
                    }
                }
            } else if (currentUser.role === 'Bölge Müdürü') {
                const managedStores = new Set<string>();
                const normalizedCurrentUserName = normalizeTurkish(currentUser.name);
                for (const [store, manager] of storeManagerMap.entries()) {
                    // Case-insensitive comparison for the BM
                    if (normalizeTurkish(manager) === normalizedCurrentUserName) {
                        managedStores.add(store);
                    }
                }
                if (managedStores.size > 0) {
                    filteredStores = allStoreData.filter(store => managedStores.has(store.name));
                    filteredComments = allComments.filter(comment => managedStores.has(comment.store));
                }
            }
        }
        
        setStoreData(filteredStores);
        setComments(filteredComments);
        
        // Create indexed data from filtered results for performance
        const newStoresById = new Map<string, StoreData>();
        filteredStores.forEach(store => {
            newStoresById.set(store.id, store);
        });
        setStoresById(newStoresById);

        const newCommentsByStoreName = new Map<string, Comment[]>();
        filteredComments.forEach(comment => {
            if (!newCommentsByStoreName.has(comment.store)) {
                newCommentsByStoreName.set(comment.store, []);
            }
            newCommentsByStoreName.get(comment.store)!.push(comment);
        });
        setCommentsByStoreName(newCommentsByStoreName);
        
        const uniqueManagers = ['Tümü', ...new Set(Array.from(storeManagerMap.values()))];
        setManagers(uniqueManagers);
        
        const uniqueSoms = ['Tümü', ...new Set(Array.from(storeSomMap.values()))].sort((a: string, b: string) => a.localeCompare(b));
        setSoms(uniqueSoms);
        
        // Generate dynamic date filter options from all available comments
        const uniqueWeeks = [...new Set(allComments.map(c => c.week).filter(Boolean) as string[])];
        uniqueWeeks.sort((a, b) => {
            const partsA = a.split('-W');
            const yearA = partsA.length > 1 ? parseInt(partsA[0], 10) : 2000;
            const weekA = parseInt(partsA[partsA.length - 1], 10);
            const partsB = b.split('-W');
            const yearB = partsB.length > 1 ? parseInt(partsB[0], 10) : 2000;
            const weekB = parseInt(partsB[partsB.length - 1], 10);
            if (yearB !== yearA) return yearB - yearA;
            return weekB - weekA;
        });
        
        const monthOrder = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
        const validMonthsFromComments = allComments
            .map(c => c.month)
            .filter(m => m && monthOrder.includes(m)) as string[];
        const uniqueMonths = [...new Set(validMonthsFromComments)];
        
        const currentYear = new Date().getFullYear();
        const monthDateMap = new Map<string, Date>();
        uniqueMonths.forEach(month => {
            const monthIndex = monthOrder.indexOf(month);
            monthDateMap.set(month, new Date(currentYear, monthIndex, 1)); 
        });

        uniqueMonths.sort((a, b) => monthDateMap.get(b)!.getTime() - monthDateMap.get(a)!.getTime());


        setWeekFilterOptions([
            { value: 'all', label: 'Tüm Haftalar' },
            ...uniqueWeeks.map(week => {
                const parts = week.split('-W');
                const weekNum = parts.length > 1 ? parts[1] : week;
                const year = parts.length > 1 ? ` (${parts[0]})` : '';
                return { value: week, label: `${parseInt(weekNum, 10)}. Hafta${year}` };
            })
        ]);
        
        setMonthFilterOptions([
            { value: 'all', label: 'Tüm Aylar' },
            ...uniqueMonths.map(month => ({ value: month, label: month }))
        ]);


    }, [currentUser, isAuthenticated, allComments, allStoreData, loading, storeManagerMap, storeSomMap, allTurnoverData, somToManagersMap]);
    
    const login = useCallback((email: string, password: string): boolean => {
        const userToLogin = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (userToLogin && userToLogin.password === password) {
            setCurrentUser(userToLogin);
            setIsAuthenticated(true);
            sessionStorage.setItem('isAuthenticated', 'true');
            sessionStorage.setItem('currentUser', JSON.stringify(userToLogin));
            return true;
        }
        return false;
    }, [allUsers]);

    const signUp = useCallback(async (details: Omit<User, 'id' | 'role' | 'status'>) => {
        const existingUser = allUsers.find(u => u.email.toLowerCase() === details.email.toLowerCase());
        if (existingUser) {
            throw new Error("Bu e-posta adresi zaten kayıtlı.");
        }
        const newUser: User = {
            id: `u${Date.now()}`,
            name: details.name,
            email: details.email,
            password: details.password,
            title: details.title,
            role: mapTitleToRole(details.title),
            status: 'Aktif',
        };
        const updatedUsers = [...allUsers, newUser];
        setAllUsers(updatedUsers);
        localStorage.setItem('users', JSON.stringify(updatedUsers));
        login(newUser.email, newUser.password!);
    }, [allUsers, login]);

    const logout = useCallback(() => {
        setCurrentUser(null);
        setIsAuthenticated(false);
        sessionStorage.removeItem('isAuthenticated');
        sessionStorage.removeItem('currentUser');
    }, []);
    
    const addCommentAction = useCallback((commentId: string, actionText: string) => {
        const updatedComments = allComments.map(comment => {
            if (comment.id === commentId) {
                const newAction: ActionTaken = {
                    text: actionText,
                    author: currentUser?.name || 'Yönetici',
                    timestamp: new Date().toISOString(),
                    reactions: {},
                };
                const existingActions = comment.actions || [];
                return { ...comment, actions: [...existingActions, newAction] };
            }
            return comment;
        });
        setAllComments(updatedComments);
        localStorage.setItem('comments', JSON.stringify(updatedComments));
    }, [allComments, currentUser]);

    const toggleReactionOnAction = useCallback((commentId: string, actionIndex: number, emoji: string) => {
        const currentUserIdentifier = currentUser?.name || 'Mevcut Kullanıcı';
        const updatedComments = allComments.map(comment => {
            if (comment.id === commentId && comment.actions && comment.actions[actionIndex]) {
                const newActions = [...comment.actions];
                const actionToUpdate = { ...newActions[actionIndex] };
                const newReactions = { ...(actionToUpdate.reactions || {}) };
                
                if (!newReactions[emoji]) {
                    newReactions[emoji] = [];
                }
                const userIndex = newReactions[emoji].indexOf(currentUserIdentifier);
                if (userIndex > -1) {
                    newReactions[emoji].splice(userIndex, 1);
                    if (newReactions[emoji].length === 0) {
                        delete newReactions[emoji];
                    }
                } else {
                    newReactions[emoji].push(currentUserIdentifier);
                }
                
                actionToUpdate.reactions = newReactions;
                newActions[actionIndex] = actionToUpdate;

                return {
                    ...comment,
                    actions: newActions,
                };
            }
            return comment;
        });
        setAllComments(updatedComments);
        localStorage.setItem('comments', JSON.stringify(updatedComments));
    }, [allComments, currentUser]);

    const deleteCommentAction = useCallback((commentId: string, actionIndex: number) => {
        const updatedComments = allComments.map(comment => {
            if (comment.id === commentId && comment.actions) {
                const newActions = comment.actions.filter((_, index) => index !== actionIndex);
                return { ...comment, actions: newActions };
            }
            return comment;
        });
        setAllComments(updatedComments);
        localStorage.setItem('comments', JSON.stringify(updatedComments));
    }, [allComments]);

    const editCommentAction = useCallback((commentId: string, actionIndex: number, newText: string) => {
        const updatedComments = allComments.map(comment => {
            if (comment.id === commentId && comment.actions && comment.actions[actionIndex]) {
                const newActions = [...comment.actions];
                newActions[actionIndex] = { 
                    ...newActions[actionIndex], 
                    text: newText, 
                    timestamp: new Date().toISOString()
                };
                return { ...comment, actions: newActions };
            }
            return comment;
        });
        setAllComments(updatedComments);
        localStorage.setItem('comments', JSON.stringify(updatedComments));
    }, [allComments]);

    const profileImageUrl = currentUser ? userProfileImages[currentUser.id] || null : null;

    const updateProfileImage = useCallback((url: string | null) => {
        if (!currentUser) return;
        const updatedImages = { ...userProfileImages };
        if (url) {
            updatedImages[currentUser.id] = url;
        } else {
            delete updatedImages[currentUser.id];
        }
        setUserProfileImages(updatedImages);
        localStorage.setItem('userProfileImages', JSON.stringify(updatedImages));
    }, [currentUser, userProfileImages]);
    
    const usersByName = useMemo(() => {
        const map = new Map<string, User>();
        allUsers.forEach(u => map.set(u.name, u));
        return map;
    }, [allUsers]);

    const getUserImageUrlByName = useCallback((name: string): string | null => {
        const user = usersByName.get(name);
        if (user && userProfileImages[user.id]) {
            return userProfileImages[user.id];
        }
        return null;
    }, [usersByName, userProfileImages]);


    const getManagerForStore = useCallback((storeName: string) => {
        return storeManagerMap.get(storeName);
    }, [storeManagerMap]);

    const getSomForStore = useCallback((storeName: string) => {
        return storeSomMap.get(storeName);
    }, [storeSomMap]);

    const getManagersForSom = useCallback((som: string): string[] => {
        const managersForSom = somToManagersMap.get(som);
        return managersForSom ? Array.from(managersForSom) : [];
    }, [somToManagersMap]);

    const resetAIAnalyses = useCallback(() => {
        setAiAnalyses(initialAIState);
    }, []);

    const getStoreById = useCallback((storeId: string): StoreData | undefined => {
        return storesById.get(storeId);
    }, [storesById]);

    const getCommentsForStore = useCallback((storeName: string): Comment[] => {
        return commentsByStoreName.get(storeName) || [];
    }, [commentsByStoreName]);

    const generateSummary = useCallback(async (storeData: StoreData[], comments: Comment[]) => {
        if (!process.env.API_KEY) {
            const error = "API anahtarı yapılandırılmadığı için içgörü oluşturulamadı.";
            setAiAnalyses(prev => ({ ...prev, summary: { result: error, loading: false, error } }));
            return;
        }
        if (storeData.length < 3) {
            const result = "Genel bir analiz oluşturmak için yeterli sayıda (en az 3) mağaza verisi bulunmuyor.";
            setAiAnalyses(prev => ({ ...prev, summary: { result: result, loading: false, error: null } }));
            return;
        }

        setAiAnalyses(prev => ({ ...prev, summary: { ...prev.summary, loading: true, error: null, result: '' } }));
        
        try {
            const sortedStores = [...storeData].sort((a, b) => b.satisfaction - a.satisfaction);
            const topStores = sortedStores.slice(0, 3).map(s => ({ name: s.name, satisfaction: s.satisfaction }));
            const bottomStores = sortedStores.slice(-3).reverse().map(s => ({ name: s.name, satisfaction: s.satisfaction }));
            const categoryCounts: { [key: string]: number } = {};
            storeData.forEach(store => {
                store.feedbackByCategory.forEach(category => {
                    categoryCounts[category.name] = (categoryCounts[category.name] || 0) + category.value;
                });
            });
            const sortedCategories = Object.entries(categoryCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([name, count]) => ({ name, "geri_bildirim_sayisi": Math.round(count) }));
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Bir İK analisti olarak, aşağıdaki çalışan memnuniyeti verilerini analiz et ve üst yönetim için 3 maddelik, eyleme geçirilebilir bir özet rapor oluştur.

**Analiz için Kilit Veriler:**
*   **En Yüksek Performanslı 3 Mağaza (Memnuniyet %):** ${JSON.stringify(topStores)}
*   **En Düşük Performanslı 3 Mağaza (Memnuniyet %):** ${JSON.stringify(bottomStores)}
*   **En Çok Geri Bildirim Alan 3 Kategori:** ${JSON.stringify(sortedCategories)}
*   **Genel Veri Özeti (tüm mağazalar):** ${JSON.stringify(storeData.map(s => ({name: s.name, satisfaction: s.satisfaction, feedbackCount: s.feedbackCount})))}

**Raporunda aşağıdaki 3 maddeye odaklan:**
1.  **Performans Değerlendirmesi:** En yüksek ve en düşük performanslı mağazalar arasındaki zıtlığı vurgula. Başarılı mağazaların (${topStores.map(s => s.name).join(', ')}) uygulamalarından ne öğrenilebilir? Düşük performanslı mağazalardaki (${bottomStores.map(s => s.name).join(', ')}) en acil riskler nelerdir?
2.  **Öne Çıkan Konular:** En çok geri bildirim alan kategoriler (${sortedCategories.map(c => c.name).join(', ')}), şirket genelindeki ana sorun veya fırsat alanlarını nasıl yansıtıyor? Bu trendi kısaca yorumla.
3.  **Stratejik Eylem Planı:** Bu verilere dayanarak, genel memnuniyeti artırmak ve en büyük riskleri azaltmak için yönetimin atması gereken en önemli 1-2 adımı öner.

Cevabını, her biri '*' ile başlayan 3 maddelik bir liste olarak, başka hiçbir metin veya başlık eklemeden döndür.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            const text = response.text;
            setAiAnalyses(prev => ({ ...prev, summary: { result: text, loading: false, error: null } }));
        } catch (error: any) {
            const errorMessage = getApiErrorMessage(error);
            setAiAnalyses(prev => ({ ...prev, summary: { result: errorMessage, loading: false, error: errorMessage } }));
        }
    }, []);

    const generateFocus = useCallback(async (storeData: StoreData[], comments: Comment[]) => {
        if (!process.env.API_KEY) {
            const error = "API anahtarı yapılandırılmadı.";
            setAiAnalyses(prev => ({ ...prev, focus: { result: null, loading: false, error } }));
            return;
        }
        if (comments.length === 0) {
            const error = "Analiz edilecek yorum verisi bulunmamaktadır.";
            setAiAnalyses(prev => ({ ...prev, focus: { result: null, loading: false, error } }));
            return;
        }

        setAiAnalyses(prev => ({ ...prev, focus: { ...prev.focus, loading: true, error: null, result: null } }));
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Aşağıdaki çalışan geri bildirimlerini içeren JSON verilerini analiz et ve bir yönetici raporu oluştur:
1. **En Sorunlu 3 Mağazayı Belirle**: Olumsuz yorumların yoğunluğuna, ciddiyetine ve "yönetici", "baskı", "stres", "maaş", "istifa", "ayrılmak", "mobbing" gibi anahtar kelimelerin kullanımına göre en sorunlu 3 mağazayı tespit et.
2. **Analiz Detayları**: Belirlediğin her mağaza için aşağıdaki bilgileri sağla:
    - \`storeName\`: Mağazanın adı.
    - \`problemCategory\`: Sorunun ana kategorisini şu listeden seç: 'Yönetici Tutumu', 'İş Yükü & Personel', 'Maaş & Yan Haklar', 'Operasyonel Sorunlar', 'Ekip İçi İlişkiler'.
    - \`rootCause\`: Sorunun kök nedenini, yorumlardaki trendlere (örn: 'personel eksikliği' temalı yorumlarda artış) veya belirli olaylara dayanarak 1-2 cümleyle açıkla.
    - \`evidence\`: Bu kök nedeni destekleyen, yorumlardan anonimleştirilmiş kısa ve çarpıcı bir alıntı.
    - \`problemScore\`: Sorunun ciddiyetini gösteren 0-100 arasında bir skor.
    - \`turnoverRisk\`: Çalışan işten ayrılma riskini 'Yüksek', 'Orta', veya 'Düşük' olarak belirt.
    - \`suggestedAction\`: Bu sorunu çözmek için yönetime sunulacak kısa ve eyleme geçirilebilir bir öneri.
3. **Genel Özet**: Tüm bulguları özetleyen 2-3 cümlelik bir \`summary\` yaz.
4. **Çıktı Formatı**: Cevabını yalnızca belirttiğim JSON formatında, başka hiçbir metin veya açıklama eklemeden döndür.

Çalışan Yorumları Verisi: ${JSON.stringify(comments.map(c => ({ store: c.store, text: c.text, sentiment: c.sentiment, date: c.date })))}`;

            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING },
                    problematicStores: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                storeName: { type: Type.STRING },
                                problemCategory: { type: Type.STRING },
                                rootCause: { type: Type.STRING },
                                evidence: { type: Type.STRING },
                                turnoverRisk: { type: Type.STRING },
                                problemScore: { type: Type.INTEGER },
                                suggestedAction: { type: Type.STRING }
                            },
                            required: ['storeName', 'problemCategory', 'rootCause', 'evidence', 'turnoverRisk', 'problemScore', 'suggestedAction']
                        }
                    }
                },
                required: ['summary', 'problematicStores']
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                },
            });

            const jsonStr = response.text.trim();
            const parsedAnalysis = JSON.parse(jsonStr);
            setAiAnalyses(prev => ({ ...prev, focus: { result: parsedAnalysis, loading: false, error: null } }));
        } catch (err: any) {
            const errorMessage = getApiErrorMessage(err);
            setAiAnalyses(prev => ({ ...prev, focus: { result: null, loading: false, error: errorMessage } }));
        }
    }, []);

    const generateTurnoverRisk = useCallback(async (storeData: StoreData[], comments: Comment[]) => {
        if (!process.env.API_KEY) {
            const error = "API anahtarı yapılandırılmadı.";
            setAiAnalyses(prev => ({ ...prev, turnover: { result: null, loading: false, error } }));
            return;
        }
        if (comments.length < 10) {
            const error = "Turnover risk analizi için yeterli yorum verisi (en az 10) bulunmamaktadır.";
            setAiAnalyses(prev => ({ ...prev, turnover: { result: null, loading: false, error } }));
            return;
        }

        setAiAnalyses(prev => ({ ...prev, turnover: { ...prev.turnover, loading: true, error: null, result: null } }));

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Bir İK risk analisti olarak, aşağıdaki mağaza verilerini ve çalışan yorumlarını analiz et. Amacın, en yüksek çalışan istifa (turnover) riskine sahip olan ilk 3 mağazayı belirlemek ve her biri için risk nedenlerini özetlemektir.

Analizinde şu faktörlere özellikle dikkat et:
1. Düşük memnuniyet puanları.
2. Yüksek veya artan aylık turnover oranları.
3. "Yönetim & Liderlik", "Maaş & Yan Haklar" ve "İş Yükü & Denge" kategorilerindeki olumsuz yorumların yoğunluğu.
4. "istifa", "ayrılmak", "baskı", "tükenmişlik", "mobbing", "mutsuz" gibi anahtar kelimeler içeren yorumlar.
5. Henüz aksiyon alınmamış olumsuz yorumların sayısı.

**Veri Seti:**
* **Mağaza ve Turnover Verileri:** ${JSON.stringify(storeData.map(s => ({ ad: s.name, memnuniyet: s.satisfaction, turnoverGecmisi: s.turnoverHistory })))}
* **Olumsuz Yorumlar:** ${JSON.stringify(comments.filter(c => c.sentiment === 'negative').map(c => ({ magaza: c.store, kategori: c.category, yorum: c.text.substring(0, 200), aksiyonAlindi: (c.actions?.length || 0) > 0 })))}

**İstenen Çıktı:**
Cevabını, aşağıdaki JSON şemasına uygun olarak, başka hiçbir metin veya açıklama eklemeden döndür.
* \`summary\`: Bulgularını özetleyen 2-3 cümlelik bir genel değerlendirme.
* \`highRiskStores\`: En riskli 3 mağazayı içeren bir dizi.
    * \`storeName\`: Mağazanın adı.
    * \`riskLevel\`: Riskin seviyesi ('Çok Yüksek', 'Yüksek', 'Orta').
    * \`primaryReason\`: Riskin ana nedenini açıklayan kısa bir cümle.
    * \`evidence\`: Riski destekleyen kısa bir kanıt (örneğin, yorumlardan bir alıntı veya genel bir gözlem).`;
            
            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING },
                    highRiskStores: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                storeName: { type: Type.STRING },
                                riskLevel: { type: Type.STRING },
                                primaryReason: { type: Type.STRING },
                                evidence: { type: Type.STRING }
                            },
                            required: ['storeName', 'riskLevel', 'primaryReason', 'evidence']
                        }
                    }
                },
                required: ['summary', 'highRiskStores']
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                },
            });

            const jsonStr = response.text.trim();
            const parsedAnalysis = JSON.parse(jsonStr);
            setAiAnalyses(prev => ({ ...prev, turnover: { result: parsedAnalysis, loading: false, error: null } }));
        } catch (err: any) {
            const errorMessage = getApiErrorMessage(err);
            setAiAnalyses(prev => ({ ...prev, turnover: { result: null, loading: false, error: errorMessage } }));
        }
    }, []);
    
    const generateSuccess = useCallback(async (storeData: StoreData[], comments: Comment[]) => {
        if (!process.env.API_KEY) {
            const error = "API anahtarı yapılandırılmadı.";
            setAiAnalyses(prev => ({ ...prev, success: { result: null, loading: false, error } }));
            return;
        }
        const topStores = [...storeData].sort((a, b) => b.satisfaction - a.satisfaction).slice(0, 3);
        if (topStores.length < 3) {
            const error = "Başarı analizi için yeterli sayıda (en az 3) yüksek performanslı mağaza verisi bulunmamaktadır.";
            setAiAnalyses(prev => ({ ...prev, success: { result: null, loading: false, error } }));
            return;
        }

        setAiAnalyses(prev => ({ ...prev, success: { ...prev.success, loading: true, error: null, result: null } }));

        try {
            const topStoreNames = new Set(topStores.map(s => s.name));
            const positiveCommentsFromTopStores = comments.filter(c => c.sentiment === 'positive' && topStoreNames.has(c.store)).map(c => ({ store: c.store, text: c.text.substring(0, 200) }));
            if (positiveCommentsFromTopStores.length < 5) {
                const error = "Başarı analizi için yeterli sayıda (en az 5) olumlu yorum bulunmamaktadır.";
                setAiAnalyses(prev => ({ ...prev, success: { result: null, loading: false, error } }));
                return;
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Bir İK başarı analisti olarak, en yüksek memnuniyete sahip 3 mağazanın verilerini ve bu mağazalardan gelen olumlu yorumları analiz et. Bu mağazaların başarısının arkasındaki ortak temaları ve en iyi uygulamaları belirle.

**Veri Seti:**
* **En Başarılı 3 Mağaza:** ${JSON.stringify(topStores.map(s=>({ad:s.name, memnuniyet:s.satisfaction})))}
* **Bu Mağazalardan Gelen Olumlu Yorumlar:** ${JSON.stringify(positiveCommentsFromTopStores)}

**İstenen Çıktı:**
Cevabını, aşağıdaki JSON şemasına uygun olarak, başka hiçbir metin veya açıklama eklemeden döndür.
* \`summary\`: Başarı faktörlerini özetleyen 2-3 cümlelik bir genel değerlendirme.
* \`successFactors\`: Belirlediğin en önemli 3 başarı faktörünü içeren bir dizi.
    * \`theme\`: Başarı faktörünün ana teması (örn: 'Güçlü Ekip Ruhu', 'Destekleyici Yönetim', 'Kariyer Fırsatları').
    * \`description\`: Bu temanın neden bir başarı faktörü olduğunu ve nasıl bir etki yarattığını açıklayan kısa bir cümle.
    * \`exampleComment\`: Bu temayı en iyi yansıtan, yorumlardan anonimleştirilmiş kısa bir alıntı.`;
    
            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING },
                    successFactors: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                theme: { type: Type.STRING },
                                description: { type: Type.STRING },
                                exampleComment: { type: Type.STRING },
                            },
                            required: ['theme', 'description', 'exampleComment']
                        }
                    }
                },
                required: ['summary', 'successFactors']
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                },
            });

            const jsonStr = response.text.trim();
            const parsedAnalysis = JSON.parse(jsonStr);
            setAiAnalyses(prev => ({ ...prev, success: { result: parsedAnalysis, loading: false, error: null } }));

        } catch (err: any) {
            const errorMessage = getApiErrorMessage(err);
            setAiAnalyses(prev => ({ ...prev, success: { result: null, loading: false, error: errorMessage } }));
        }
    }, []);

    const generateAnomalies = useCallback(async (storeData: StoreData[], comments: Comment[]) => {
        if (!process.env.API_KEY) {
            const error = "API anahtarı yapılandırılmadı.";
            setAiAnalyses(prev => ({ ...prev, anomalies: { result: null, loading: false, error } }));
            return;
        }
        if (comments.length < 20) {
            const error = "Anomali tespiti için yeterli sayıda (en az 20) yorum bulunmamaktadır.";
            setAiAnalyses(prev => ({ ...prev, anomalies: { result: null, loading: false, error } }));
            return;
        }
    
        setAiAnalyses(prev => ({ ...prev, anomalies: { ...prev.anomalies, loading: true, error: null, result: null } }));
    
        try {
            const commentsForAnalysis = comments.map(c => ({ store: c.store, text: c.text, sentiment: c.sentiment, date: c.date, week: c.week }));
            const storeSatisfactionHistory = storeData.map(s => ({ name: s.name, satisfaction: s.satisfaction, turnoverHistory: s.turnoverHistory }));
    
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Bir proaktif İK veri analisti olarak, sana sunulan haftalık/aylık çalışan verilerini analiz et ve acil dikkat gerektiren önemli anomalileri (negatif değişimleri) tespit et.

**Analiz Kriterleri:**
1.  **Ani Memnuniyet Düşüşü**: Bir mağazanın genel memnuniyet oranında son hafta içinde yaşanan %20'den fazla ani düşüşler.
2.  **Kritik Kelime Artışı**: Belirli bir mağazada "istifa", "ayrılmak", "mobbing", "baskı", "tükenmişlik" gibi kritik kelimelerin kullanımında son hafta içinde belirgin bir artış.
3.  **Yüksek Turnover Sinyalleri**: Yüksek turnover oranları ile olumsuz yorumların birleştiği mağazalar.

**Veri Seti:**
* **Yorum Verileri:** ${JSON.stringify(commentsForAnalysis)}
* **Mağaza Metrikleri:** ${JSON.stringify(storeSatisfactionHistory)}

**İstenen Çıktı:**
Cevabını, aşağıdaki JSON şemasına uygun olarak, başka hiçbir metin veya açıklama eklemeden döndür. Eğer tespit edilecek bir anomali yoksa, \`summary\` alanında bunu belirt ve boş bir \`anomalies\` dizisi döndür.
* \`summary\`: Tespit edilen en kritik anomalileri özetleyen 2-3 cümlelik bir genel bakış.
* \`anomalies\`: Tespit ettiğin en önemli 3 anomaliyi içeren bir dizi.
    * \`storeName\`: Anomalinin tespit edildiği mağazanın adı.
    * \`anomalyType\`: Anomalinin türü. Seçenekler: 'Memnuniyet Düşüşü', 'Negatif Kelime Artışı', 'Turnover Artışı'.
    * \`description\`: Anomalinin ne olduğunu ve neden önemli olduğunu açıklayan kısa bir cümle.
    * \`period\`: Anomalinin gözlemlendiği zaman dilimi (örn: 'Son Hafta', 'Son Ay').`;
    
            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING },
                    anomalies: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                storeName: { type: Type.STRING },
                                anomalyType: { type: Type.STRING },
                                description: { type: Type.STRING },
                                period: { type: Type.STRING },
                            },
                            required: ['storeName', 'anomalyType', 'description', 'period']
                        }
                    }
                },
                required: ['summary', 'anomalies']
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                },
            });
            
            const jsonStr = response.text.trim();
            const parsedAnalysis = JSON.parse(jsonStr);
            setAiAnalyses(prev => ({ ...prev, anomalies: { result: parsedAnalysis, loading: false, error: null } }));
    
        } catch (err: any) {
            const errorMessage = getApiErrorMessage(err);
            setAiAnalyses(prev => ({ ...prev, anomalies: { result: null, loading: false, error: errorMessage } }));
        }
    }, []);

    
     const uploadData = useCallback(async (jsonDataFromSheet: any[][], file: File) => {
        setIsProcessing(true);
        setError(null);

        try {
            setProcessingMessage('Veriler doğrulanıyor...');
            await new Promise(res => setTimeout(res, 300));
            const dataAsArray = jsonDataFromSheet;
            
            const nameAliases = ['name', 'magaza adi', 'mağaza adı', 'sube', 'şube', 'dükkan', 'lokasyon', 'magaza'];
            const aciklamaAliases = ['aciklama', 'açıklama', 'yorum', 'feedback', 'geri bildirim', 'yorumlar', 'görüs', 'görüşler'];
            const ortalamaAliases = ['ortalama', 'puan', 'rating', 'degerlendirme', 'değerlendirme', 'score', 'memnuniyet', 'memnuniyet puani'];
            const tarihAliases = ['baslatmatarihi', 'baslatmatarih', 'başlatma tarihi', 'tarih', 'date', 'baslangic tarihi', 'başlangıç tarihi', 'formno basl'];
            const haftaAliases = ['hafta'];
            const ayAliases = ['ay'];
            const kiminleIlgiliAliases = ['kiminleilgili', 'kiminle ilgili'];
            const somAliases = ['som', 'satis operasyon muduru', 'satış operasyon müdürü'];
            const bmAliases = ['bm', 'bolge muduru', 'bölge müdürü'];
            
            let headerRowIndex = -1;
            let indices = { name: -1, aciklama: -1, ortalama: -1, tarih: -1, hafta: -1, ay: -1, kiminleIlgili: -1, som: -1, bm: -1 };

            for (let i = 0; i < dataAsArray.length; i++) {
                const row = dataAsArray[i];
                if (!row || !Array.isArray(row)) continue;
                const normalizedRow = row.map(cell => normalizeHeader(String(cell ?? '')));
                
                const tempIndices = {
                    name: nameAliases.map(a => normalizedRow.indexOf(normalizeHeader(a))).find(idx => idx > -1) ?? -1,
                    aciklama: aciklamaAliases.map(a => normalizedRow.indexOf(normalizeHeader(a))).find(idx => idx > -1) ?? -1,
                    ortalama: ortalamaAliases.map(a => normalizedRow.indexOf(normalizeHeader(a))).find(idx => idx > -1) ?? -1,
                    tarih: tarihAliases.map(a => normalizedRow.indexOf(normalizeHeader(a))).find(idx => idx > -1) ?? -1,
                    hafta: haftaAliases.map(a => normalizedRow.indexOf(normalizeHeader(a))).find(idx => idx > -1) ?? -1,
                    ay: ayAliases.map(a => normalizedRow.indexOf(normalizeHeader(a))).find(idx => idx > -1) ?? -1,
                    kiminleIlgili: kiminleIlgiliAliases.map(a => normalizedRow.indexOf(normalizeHeader(a))).find(idx => idx > -1) ?? -1,
                    som: somAliases.map(a => normalizedRow.indexOf(normalizeHeader(a))).find(idx => idx > -1) ?? -1,
                    bm: bmAliases.map(a => normalizedRow.indexOf(normalizeHeader(a))).find(idx => idx > -1) ?? -1,
                };
                
                if (tempIndices.name !== -1 && tempIndices.aciklama !== -1 && tempIndices.ortalama !== -1 && tempIndices.tarih !== -1) {
                    headerRowIndex = i;
                    indices = tempIndices;
                    break;
                }
            }
            
            if (headerRowIndex === -1) {
                let errorMessage = "Dosyada gerekli sütunlar bulunamadı. Lütfen Excel dosyanızda şu başlıkları içeren sütunlar olduğundan emin olun:\n\n";
                errorMessage += `- Mağaza Adı Sütunu (Örn: ${nameAliases.join(', ')})\n`;
                errorMessage += `- Geri Bildirim Sütunu (Örn: ${aciklamaAliases.join(', ')})\n`;
                errorMessage += `- Puan Sütunu (Örn: ${ortalamaAliases.join(', ')})\n`;
                errorMessage += `- Tarih Sütunu (Örn: ${tarihAliases.join(', ')})\n`;
                throw new Error(errorMessage);
            }

            if (indices.bm === -1) {
                throw new Error("Dosyada Bölge Müdürü (BM) sütunu bulunamadı. Lütfen 'BM' veya benzeri bir başlığa sahip bir sütun ekleyip tekrar deneyin. Bu sütun, mağazaların doğru yöneticilere atanması için zorunudur.");
            }

            const dataRows = dataAsArray.slice(headerRowIndex + 1);
            const validationIssues: string[] = [];
            const validRows: any[][] = [];

            dataRows.forEach((row, index) => {
                const rowNumber = headerRowIndex + 2 + index;
                let storeName = String(row[indices.name] || '').trim();
                storeName = storeName.replace(/^\d+\s*-\s*/, '').trim();
                const text = String(row[indices.aciklama] || '').trim();
                const rating = row[indices.ortalama];
                const dateValue = row[indices.tarih];
                const managerName = String(row[indices.bm] || '').trim();
                
                if (!storeName && (rating === '' || rating === null || rating === undefined)) {
                    return; 
                }
                
                let rowIsValid = true;
                if (!storeName) {
                    validationIssues.push(`- Satır ${rowNumber}: Mağaza adı eksik.`);
                    rowIsValid = false;
                }
                 if (!dateValue) {
                    validationIssues.push(`- Satır ${rowNumber}: Tarih bilgisi eksik.`);
                    rowIsValid = false;
                } else {
                    const parsedDate = parseExcelDate(dateValue);
                    if (!parsedDate) {
                        validationIssues.push(`- Satır ${rowNumber}: '${indices.tarih}' sütununda geçersiz tarih formatı ('${dateValue}').`);
                        rowIsValid = false;
                    }
                }

                if (rating === '' || rating === null || rating === undefined) {
                    validationIssues.push(`- Satır ${rowNumber}: Puan değeri eksik.`);
                    rowIsValid = false;
                } else {
                    const ratingValue = parseFloat(String(rating).replace(',', '.'));
                    if (isNaN(ratingValue)) {
                        validationIssues.push(`- Satır ${rowNumber}: Geçersiz puan değeri ('${rating}'). Sayısal bir değer olmalıdır.`);
                        rowIsValid = false;
                    }
                }

                if (!managerName) {
                    validationIssues.push(`- Satır ${rowNumber}: Bölge Müdürü (BM) bilgisi eksik.`);
                    rowIsValid = false;
                }
                
                if (rowIsValid) {
                    validRows.push(row);
                }
            });

            if (validationIssues.length > 0) {
                const errorMessage = "Veri Yükleme Başarısız Oldu. Lütfen dosyanızdaki aşağıdaki sorunları düzeltip tekrar deneyin:\n\n"
                    + validationIssues.slice(0, 10).join('\n');
                let finalMessage = errorMessage;
                if (validationIssues.length > 10) {
                    finalMessage += `\n... ve ${validationIssues.length - 10} diğer sorun.`;
                }
                throw new Error(finalMessage);
            }
            
            setProcessingMessage('Yorumlar işleniyor ve kategorize ediliyor...');
            await new Promise(res => setTimeout(res, 300));

            const uploadId = `feedback-${Date.now()}`;
            const newStoreManagerMap = new Map(storeManagerMap);
            const newStoreSomMap = new Map(storeSomMap);
            const newSomToManagersMap: Map<string, Set<string>> = new Map(somToManagersMap);
            newSomToManagersMap.forEach((value, key) => {
                newSomToManagersMap.set(key, new Set(value));
            });
            
            const canonicalManagerNames = new Map<string, string>();
            const canonicalSomNames = new Map<string, string>();
            
            for (const manager of new Set(storeManagerMap.values())) {
                canonicalManagerNames.set(normalizeTurkish(manager), manager);
            }
            for (const som of new Set(storeSomMap.values())) {
                canonicalSomNames.set(normalizeTurkish(som), som);
            }

            const newComments = validRows.map((row, index) => {
                let storeName = String(row[indices.name] || '').trim();
                storeName = storeName.replace(/^\d+\s*-\s*/, '').trim();
                const text = String(row[indices.aciklama] || '').trim();
                const rating = row[indices.ortalama];
                const dateValue = row[indices.tarih];
                const parsedDate = parseExcelDate(dateValue);
                const ratingValue = parseFloat(String(rating).replace(',', '.'));

                const rawManager = String(row[indices.bm]).trim();
                const normalizedManager = normalizeTurkish(rawManager);
                if (rawManager && !canonicalManagerNames.has(normalizedManager)) {
                    canonicalManagerNames.set(normalizedManager, rawManager);
                }
                const rowManager = canonicalManagerNames.get(normalizedManager) || rawManager;

                const rawSom = indices.som !== -1 ? String(row[indices.som] || '').trim() : undefined;
                let somName: string | undefined = undefined;
                if (rawSom) {
                    const normalizedSom = normalizeTurkish(rawSom);
                    if (!canonicalSomNames.has(normalizedSom)) {
                        canonicalSomNames.set(normalizedSom, rawSom);
                    }
                    somName = canonicalSomNames.get(normalizedSom) || rawSom;
                }

                if (storeName && rowManager) {
                    newStoreManagerMap.set(storeName, rowManager);
                    if (somName) {
                        newStoreSomMap.set(storeName, somName);
                        if (!newSomToManagersMap.has(somName)) {
                            newSomToManagersMap.set(somName, new Set());
                        }
                        newSomToManagersMap.get(somName)!.add(rowManager);
                    }
                }
                
                const sentiment = determineSentiment(text, ratingValue);
                
                let weekValue: string | undefined = undefined;
                if (indices.hafta !== -1) {
                    const weekFromCell = String(row[indices.hafta] || '').trim();
                    if (weekFromCell) {
                        if (/^\d{1,2}$/.test(weekFromCell) && parsedDate) {
                            weekValue = `${parsedDate.getFullYear()}-W${String(weekFromCell).padStart(2, '0')}`;
                        } else if (weekFromCell.includes('-W')) {
                            weekValue = weekFromCell;
                        }
                    }
                }

                return {
                    id: `comment-${Date.now()}-${index}`,
                    uploadId: uploadId,
                    date: parsedDate ? parsedDate.toISOString().split('T')[0] : '1970-01-01',
                    store: storeName,
                    category: categorizeCommentV2(text, sentiment),
                    text: text,
                    sentiment,
                    rating: ratingValue,
                    week: weekValue,
                    month: indices.ay !== -1 ? String(row[indices.ay]) : undefined,
                    aboutWhom: indices.kiminleIlgili !== -1 ? String(row[indices.kiminleIlgili] || '').trim() : undefined,
                };
            });


            if (newComments.length === 0) {
                throw new Error("Yüklenen dosyada geçerli bir geri bildirim satırı bulunamadı.");
            }
            
            setProcessingMessage('Metrikler hesaplanıyor...');
            await new Promise(res => setTimeout(res, 300));
            
            const combinedComments = [...allComments, ...newComments];
            setAllComments(combinedComments);
            setStoreManagerMap(newStoreManagerMap);
            setStoreSomMap(newStoreSomMap);
            
            const newProcessedStores = processAllData(combinedComments, allTurnoverData);
            setAllStoreData(newProcessedStores);
            
            const newHistoryEntry: UploadedFile = { id: uploadId, name: file.name, size: file.size, uploadDate: new Date().toISOString(), rawData: jsonDataFromSheet };
            const updatedHistory = [newHistoryEntry, ...feedbackFileHistory].slice(0, 5);
            setFeedbackFileHistory(updatedHistory);
            
            localStorage.setItem('comments', JSON.stringify(combinedComments));
            localStorage.setItem('storeData', JSON.stringify(newProcessedStores));
            localStorage.setItem('storeManagerMap', JSON.stringify(Array.from(newStoreManagerMap.entries())));
            localStorage.setItem('storeSomMap', JSON.stringify(Array.from(newStoreSomMap.entries())));
            const somToManagersArray = Array.from(newSomToManagersMap.entries()).map(([key, value]) => [key, Array.from(value)]);
            localStorage.setItem('somToManagersMap', JSON.stringify(somToManagersArray));
            localStorage.setItem('feedbackFileHistory', JSON.stringify(updatedHistory));


        } catch (err: unknown) {
            console.error("Upload processing failed:", err);
            // FIX: The 'err' object in a catch block is of type 'unknown'. We must first verify it is an Error instance before accessing 'err.message' to avoid a type error.
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            throw new Error(message);
        } finally {
            setIsProcessing(false);
            setProcessingMessage('');
        }
    }, [allComments, allTurnoverData, feedbackFileHistory, somToManagersMap, storeManagerMap, storeSomMap]);

    const uploadTurnoverData = useCallback(async (jsonDataFromSheet: any[][], file: File) => {
        setIsProcessing(true);
        setError(null);
        try {
            setProcessingMessage('Aylık turnover verileri işleniyor...');
            const dataAsArray = jsonDataFromSheet;

            const canonicalMonthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
            const normalizedToCanonicalMonthMap = new Map<string, string>();
            canonicalMonthNames.forEach(m => {
                normalizedToCanonicalMonthMap.set(normalizeHeader(m), m);
            });

            const storeHeaderAliases = ['mağazalar', 'magazalar', 'stores'];
            const normalizedStoreHeaderAliases = storeHeaderAliases.map(normalizeHeader);

            let headerRowIndex = -1;
            let storeColIndex = -1;
            const monthColIndices: { [key: string]: number } = {};

            for (let i = 0; i < 10 && i < dataAsArray.length; i++) {
                const row = dataAsArray[i];
                if (!row || !Array.isArray(row)) continue;
                const normalizedRow = row.map(cell => normalizeHeader(String(cell ?? '')));
                const potentialStoreIndex = normalizedRow.findIndex(cell => normalizedStoreHeaderAliases.includes(cell));

                if (potentialStoreIndex !== -1) {
                    const tempMonthIndices: { [key: string]: number } = {};
                    let foundMonthsCount = 0;
                    normalizedRow.forEach((cell, index) => {
                        if (normalizedToCanonicalMonthMap.has(cell)) {
                            const canonicalMonth = normalizedToCanonicalMonthMap.get(cell)!;
                            tempMonthIndices[canonicalMonth] = index;
                            foundMonthsCount++;
                        }
                    });
                    if (foundMonthsCount > 0) {
                        headerRowIndex = i;
                        storeColIndex = potentialStoreIndex;
                        Object.assign(monthColIndices, tempMonthIndices);
                        break;
                    }
                }
            }

            if (headerRowIndex === -1) {
                throw new Error("Turnover dosyasında 'Mağazalar' ve ay isimlerini içeren başlık satırı bulunamadı.");
            }

            const newTurnoverMap = new Map<string, TurnoverData>(allTurnoverData);
            const dataRows = dataAsArray.slice(headerRowIndex + 1);

            dataRows.forEach(row => {
                let storeName = String(row[storeColIndex]).trim();
                if (!storeName) return;

                storeName = storeName.replace(/^\d+\s*-\s*/, '').trim();

                const monthlyRates = newTurnoverMap.get(storeName) || {};
                for (const month in monthColIndices) {
                    const colIndex = monthColIndices[month];
                    const cellValue = row[colIndex];
                    if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
                        const parsedRate = parseFloat(String(cellValue).replace('%', '').replace(',', '.'));
                        if (!isNaN(parsedRate)) {
                            monthlyRates[month] = parsedRate;
                        }
                    }
                }
                newTurnoverMap.set(storeName, monthlyRates);
            });

            setAllTurnoverData(newTurnoverMap);
            
            const updatedStoreData = processAllData(allComments, newTurnoverMap);
            setAllStoreData(updatedStoreData);
            
            const uploadId = `turnover-${Date.now()}`;
            const newHistoryEntry: UploadedFile = { id: uploadId, name: file.name, size: file.size, uploadDate: new Date().toISOString(), rawData: jsonDataFromSheet };
            const updatedHistory = [newHistoryEntry, ...turnoverFileHistory].slice(0, 5);
            setTurnoverFileHistory(updatedHistory);

            localStorage.setItem('turnoverData', JSON.stringify(Array.from(newTurnoverMap.entries())));
            localStorage.setItem('storeData', JSON.stringify(updatedStoreData));
            localStorage.setItem('turnoverFileHistory', JSON.stringify(updatedHistory));


        } catch (err: unknown) {
            console.error("Turnover upload failed:", err);
            // FIX: The 'err' object in a catch block is of type 'unknown'. We must first verify it is an Error instance before accessing 'err.message' to avoid a type error.
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            throw new Error(message);
        } finally {
            setIsProcessing(false);
            setProcessingMessage('');
        }
    }, [allComments, allTurnoverData, turnoverFileHistory]);
    
    const deleteFeedbackFile = useCallback((fileId: string) => {
        if (!window.confirm("Bu dosyayı ve içerdiği tüm yorumları kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
            return;
        }
        setIsProcessing(true);
        setProcessingMessage('Geri bildirim verileri siliniyor...');

        setTimeout(() => {
            try {
                const updatedHistory = feedbackFileHistory.filter(f => f.id !== fileId);
                const updatedComments = allComments.filter(c => c.uploadId !== fileId);
                
                const newProcessedStores = processAllData(updatedComments, allTurnoverData);
                
                setFeedbackFileHistory(updatedHistory);
                setAllComments(updatedComments);
                setAllStoreData(newProcessedStores);
                
                localStorage.setItem('feedbackFileHistory', JSON.stringify(updatedHistory));
                localStorage.setItem('comments', JSON.stringify(updatedComments));
                localStorage.setItem('storeData', JSON.stringify(newProcessedStores));
            } catch(e) {
                console.error("Failed to delete feedback file:", e);
                setError("Geri bildirim dosyası silinirken bir hata oluştu.");
            } finally {
                setIsProcessing(false);
                setProcessingMessage('');
            }
        }, 10);
    }, [allComments, allTurnoverData, feedbackFileHistory]);

    const reprocessTurnoverFiles = useCallback((files: UploadedFile[]): { turnoverMap: Map<string, TurnoverData> } => {
        const newTurnoverMap = new Map<string, TurnoverData>();

        files.forEach(file => {
            if (!file.rawData) return;
            const dataAsArray = file.rawData;
            
            const canonicalMonthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
            const normalizedToCanonicalMonthMap = new Map<string, string>();
            canonicalMonthNames.forEach(m => {
                normalizedToCanonicalMonthMap.set(normalizeHeader(m), m);
            });
            const storeHeaderAliases = ['mağazalar', 'magazalar', 'stores'];
            const normalizedStoreHeaderAliases = storeHeaderAliases.map(normalizeHeader);
            let headerRowIndex = -1;
            let storeColIndex = -1;
            const monthColIndices: { [key: string]: number } = {};

            for (let i = 0; i < 10 && i < dataAsArray.length; i++) {
                const row = dataAsArray[i];
                if (!row || !Array.isArray(row)) continue;
                const normalizedRow = row.map(cell => normalizeHeader(String(cell ?? '')));
                const potentialStoreIndex = normalizedRow.findIndex(cell => normalizedStoreHeaderAliases.includes(cell));
                if (potentialStoreIndex !== -1) {
                    const tempMonthIndices: { [key: string]: number } = {};
                    let foundMonthsCount = 0;
                    normalizedRow.forEach((cell, index) => {
                        if (normalizedToCanonicalMonthMap.has(cell)) {
                            const canonicalMonth = normalizedToCanonicalMonthMap.get(cell)!;
                            tempMonthIndices[canonicalMonth] = index;
                            foundMonthsCount++;
                        }
                    });
                    if (foundMonthsCount > 0) {
                        headerRowIndex = i;
                        storeColIndex = potentialStoreIndex;
                        Object.assign(monthColIndices, tempMonthIndices);
                        break;
                    }
                }
            }

            if (headerRowIndex !== -1) {
                const dataRows = dataAsArray.slice(headerRowIndex + 1);
                dataRows.forEach(row => {
                    let storeName = String(row[storeColIndex]).trim();
                    if (!storeName) return;
                    storeName = storeName.replace(/^\d+\s*-\s*/, '').trim();
                    
                    const monthlyRates = newTurnoverMap.get(storeName) || {};
                    for (const month in monthColIndices) {
                        const colIndex = monthColIndices[month];
                        const cellValue = row[colIndex];
                        if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
                            const parsedRate = parseFloat(String(cellValue).replace('%', '').replace(',', '.'));
                            if (!isNaN(parsedRate)) {
                                monthlyRates[month] = parsedRate;
                            }
                        }
                    }
                    newTurnoverMap.set(storeName, monthlyRates);
                });
            }
        });
        return { turnoverMap: newTurnoverMap };
    }, []);

    const deleteTurnoverFile = useCallback((fileId: string) => {
        if (!window.confirm("Bu dosyayı ve içerdiği turnover verilerini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
            return;
        }
        setIsProcessing(true);
        setProcessingMessage('Turnover verileri yeniden hesaplanıyor...');
        
        setTimeout(() => {
            try {
                const updatedHistory = turnoverFileHistory.filter(f => f.id !== fileId);
                const { turnoverMap: newTurnoverData } = reprocessTurnoverFiles(updatedHistory);
                
                const updatedStoreData = processAllData(allComments, newTurnoverData);

                setTurnoverFileHistory(updatedHistory);
                setAllTurnoverData(newTurnoverData);
                setAllStoreData(updatedStoreData);
                
                localStorage.setItem('turnoverFileHistory', JSON.stringify(updatedHistory));
                localStorage.setItem('turnoverData', JSON.stringify(Array.from(newTurnoverData.entries())));
                localStorage.setItem('storeData', JSON.stringify(updatedStoreData));
            } catch (e) {
                console.error("Failed to delete turnover file:", e);
                setError("Turnover dosyası silinirken bir hata oluştu.");
            } finally {
                setIsProcessing(false);
                setProcessingMessage('');
            }
        }, 10);
    }, [allComments, turnoverFileHistory, reprocessTurnoverFiles]);
    
    const value: DataContextType = {
        isAuthenticated,
        currentUser,
        storeData,
        comments,
        loading,
        isProcessing,
        processingMessage,
        feedbackFileHistory,
        turnoverFileHistory,
        managers,
        soms,
        getManagerForStore,
        getSomForStore,
        getManagersForSom,
        profileImageUrl,
        updateProfileImage,
        getUserImageUrlByName,
        login,
        signUp,
        logout,
        uploadData,
        uploadTurnoverData,
        deleteFeedbackFile,
        deleteTurnoverFile,
        addCommentAction,
        toggleReactionOnAction,
        deleteCommentAction,
        editCommentAction,
        weekFilterOptions,
        monthFilterOptions,
        aiAnalyses,
        generateSummary,
        generateFocus,
        generateTurnoverRisk,
        generateSuccess,
        generateAnomalies,
        resetAIAnalyses,
        getStoreById,
        getCommentsForStore,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
