// FIX: Removed self-import of ChartData which caused a conflict with local declaration.
// FIX: Defined ChartData interface locally to resolve a circular dependency and export error.
export interface ChartData {
    name: string;
    value: number;
}

// FIX: Added WordCloudWord interface to define the structure for word cloud data.
// FIX: Extended WordCloudWord to include sentiment counts for advanced analysis and coloring.
export interface WordCloudWord {
    text: string;
    value: number; // Total frequency
    positive: number;
    negative: number;
    neutral: number;
}

export interface FeedbackByCategory {
    name: string;
    value: number;
}

export interface TurnoverHistory {
    month: string;
    rate: number;
}

// FIX: Added TurnoverData type definition to resolve import errors in DataContext.
export type TurnoverData = { [month: string]: number };

// FIX: Added filter option types for date range selectors to resolve import errors in DataContext.
export interface WeekFilterOption {
    value: string;
    label: string;
}
export interface MonthFilterOption {
    value: string;
    label: string;
}


export interface StoreData {
    id: string;
    name: string;
    satisfaction: number;
    feedbackCount: number;
    feedbackByCategory: FeedbackByCategory[];
    turnoverHistory: TurnoverHistory[];
    latestTurnoverRate?: number;
    // FIX: Added wordCloudData property to store pre-calculated keywords for each store.
    wordCloudData: WordCloudWord[];
}

// FIX: Added ActionTaken interface to provide a structured type for comment actions.
export interface ActionTaken {
    text: string;
    author: string;
    timestamp: string;
    reactions: { [emoji: string]: string[] };
}

export interface Comment {
    id: string;
    store: string;
    text: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    category: string;
    date: string; // ISO date string
    rating?: number;
    // FIX: Changed actionTaken to an array of actions to support multiple comments and reactions.
    actions?: ActionTaken[];
    week?: string;
    month?: string;
    uploadId?: string;
    aboutWhom?: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    title: string;
    password?: string; // for signup
    // FIX: Added 'Çalışan' to the role union type to support the default role assignment.
    role: 'Direktör' | 'Bölge Müdürü' | 'Yönetici' | 'İnsan Kaynakları' | 'Çalışan' | 'Satış Operasyon Müdürü';
    status: 'Aktif' | 'Pasif';
}

export interface AIAnalysisResponse {
    summary: string;
    problematicStores: {
        storeName: string;
        problemCategory: string;
        rootCause: string;
        evidence: string;
        turnoverRisk: 'Yüksek' | 'Orta' | 'Düşük';
        problemScore: number;
        suggestedAction: string;
    }[];
}

export interface TurnoverRiskAnalysis {
    summary: string;
    highRiskStores: {
        storeName: string;
        riskLevel: 'Çok Yüksek' | 'Yüksek' | 'Orta';
        primaryReason: string;
        evidence: string;
    }[];
}

export interface SuccessAnalysisResponse {
    summary: string;
    successFactors: {
        theme: string;
        description: string;
        exampleComment: string;
    }[];
}

export interface Anomaly {
    storeName: string;
    anomalyType: 'Memnuniyet Düşüşü' | 'Negatif Kelime Artışı' | 'Turnover Artışı';
    description: string;
    period: string;
}

export interface AnomalyDetectionResponse {
    summary: string;
    anomalies: Anomaly[];
}

export interface AIAnalysisState {
  summary: { result: string | null; loading: boolean; error: string | null; fingerprint?: string | null; };
  focus: { result: AIAnalysisResponse | null; loading: boolean; error: string | null; fingerprint?: string | null; };
  turnover: { result: TurnoverRiskAnalysis | null; loading: boolean; error: string | null; fingerprint?: string | null; };
  success: { result: SuccessAnalysisResponse | null; loading: boolean; error: string | null; fingerprint?: string | null; };
  anomalies: { result: AnomalyDetectionResponse | null; loading: boolean; error: string | null; fingerprint?: string | null; };
}

export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

export interface UploadedFile {
    id: string;
    name: string;
    size: number;
    uploadDate: string;
    rawData?: any[][];
}