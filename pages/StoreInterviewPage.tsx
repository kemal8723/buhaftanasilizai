import React, { useState, useMemo } from 'react';
import MainLayout from '../components/MainLayout';
import { useData } from '../DataContext';
import StatCard from '../components/StatCard';
import { 
    Plus, 
    FileText, 
    Download, 
    ChevronRight, 
    Calendar, 
    User, 
    MapPin, 
    Clock, 
    Users, 
    MessageSquare,
    BarChart3,
    LayoutDashboard,
    ListFilter,
    TrendingUp,
    AlertCircle,
    X,
    Check,
    ArrowLeft,
    ArrowRight,
    CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    Cell,
    PieChart,
    Pie,
    Legend
} from 'recharts';

const StoreInterviewPage: React.FC = () => {
    const { currentUser, storeInterviews, addStoreInterview } = useData();
    const [view, setView] = useState<'dashboard' | 'list' | 'form'>('dashboard');
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedInterview, setSelectedInterview] = useState<any>(null);
    const [showDetail, setShowDetail] = useState(false);

    // Filter State
    const [filters, setFilters] = useState({
        som: 'Tümü',
        bm: 'Tümü',
        year: '2024',
        month: 'Tümü'
    });

    const isHR = currentUser?.role === 'İnsan Kaynakları' || currentUser?.role === 'Direktör';

    // Form State
    const [formData, setFormData] = useState({
        startTime: '',
        endTime: '',
        hrResponsible: currentUser?.name || '',
        interviewType: 'Yüz yüze' as 'Online' | 'Yüz yüze',
        visitDate: new Date().toISOString().split('T')[0],
        opsManager: '',
        regionalManager: '',
        storeCode: '',
        storeName: '',
        storeOfficial: '',
        visitReason: '',
        employeeMotivation: 'Orta',
        managerCommunication: 'İyi',
        workloadLevel: 'Normal',
        fairShiftPlan: 'Evet',
        mainDifficulties: '',
        seriousSituation: 'Hayır',
        hrFeedback: '',
        hrAwarenessLevel: 'Orta',
        visualsPresent: 'Evet',
        otherDeptIssues: '',
        intervieweeCount: 1,
        competencyEvaluation: '',
        generalComment: ''
    });

    // Filtered Interviews
    const filteredInterviews = useMemo(() => {
        return storeInterviews.filter(interview => {
            const date = new Date(interview.visitDate);
            const year = date.getFullYear().toString();
            const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
            const month = monthNames[date.getMonth()];

            const matchesSom = filters.som === 'Tümü' || interview.opsManager === filters.som;
            const matchesBm = filters.bm === 'Tümü' || interview.regionalManager === filters.bm;
            const matchesYear = filters.year === 'Tümü' || year === filters.year;
            const matchesMonth = filters.month === 'Tümü' || month === filters.month;

            return matchesSom && matchesBm && matchesYear && matchesMonth;
        });
    }, [storeInterviews, filters]);

    // Dashboard Calculations
    const stats = useMemo(() => {
        if (filteredInterviews.length === 0) return null;

        const total = filteredInterviews.length;
        const faceToFace = filteredInterviews.filter(i => i.interviewType === 'Yüz yüze').length;
        const avgInterviewees = filteredInterviews.reduce((acc, curr) => acc + (curr.intervieweeCount || 0), 0) / total;
        
        const motivationData = [
            { name: 'Düşük', value: filteredInterviews.filter(i => i.employeeMotivation === 'Düşük').length, color: '#ef4444' },
            { name: 'Orta', value: filteredInterviews.filter(i => i.employeeMotivation === 'Orta').length, color: '#f59e0b' },
            { name: 'Yüksek', value: filteredInterviews.filter(i => i.employeeMotivation === 'Yüksek').length, color: '#10b981' }
        ];

        const workloadData = [
            { name: 'Düşük', value: filteredInterviews.filter(i => i.workloadLevel === 'Düşük').length, color: '#3b82f6' },
            { name: 'Normal', value: filteredInterviews.filter(i => i.workloadLevel === 'Normal').length, color: '#10b981' },
            { name: 'Yoğun', value: filteredInterviews.filter(i => i.workloadLevel === 'Yoğun').length, color: '#ef4444' }
        ];

        const typeData = [
            { name: 'Yüz yüze', value: faceToFace },
            { name: 'Online', value: total - faceToFace }
        ];

        const commData = [
            { name: 'Zayıf', value: filteredInterviews.filter(i => i.managerCommunication === 'Zayıf').length },
            { name: 'Gelişmeli', value: filteredInterviews.filter(i => i.managerCommunication === 'Gelişmeli').length },
            { name: 'İyi', value: filteredInterviews.filter(i => i.managerCommunication === 'İyi').length }
        ];

        return {
            total,
            faceToFaceRate: (faceToFace / total) * 100,
            avgInterviewees: avgInterviewees.toFixed(1),
            motivationData,
            workloadData,
            typeData,
            commData
        };
    }, [filteredInterviews]);

    if (!isHR) {
        return (
            <MainLayout>
                <div className="p-12 text-center">
                    <div className="inline-flex p-4 bg-red-50 text-red-600 rounded-full mb-4">
                        <AlertCircle size={48} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Yetkisiz Erişim</h2>
                    <p className="text-slate-500 mt-2">Bu sayfayı görüntülemek için İnsan Kaynakları yetkisine sahip olmanız gerekmektedir.</p>
                </div>
            </MainLayout>
        );
    }

    const handleExportExcel = () => {
        if (filteredInterviews.length === 0) return;
        
        const exportData = filteredInterviews.map(interview => ({
            'Ziyaret Tarihi': interview.visitDate,
            'Başlangıç Saati': interview.startTime,
            'Bitiş Saati': interview.endTime,
            'İK Sorumlusu': interview.hrResponsible,
            'Görüşme Tipi': interview.interviewType,
            'Ziyaret Nedeni': interview.visitReason,
            'SOM': interview.opsManager,
            'BM': interview.regionalManager,
            'Mağaza Kodu': interview.storeCode,
            'Mağaza Adı': interview.storeName,
            'Mağaza Yetkilisi': interview.storeOfficial,
            'Görüşülen Kişi Sayısı': interview.intervieweeCount,
            'Çalışan Motivasyonu': interview.employeeMotivation,
            'Yönetici İletişimi': interview.managerCommunication,
            'İş Yükü Seviyesi': interview.workloadLevel,
            'Adil Vardiya Planı': interview.fairShiftPlan,
            'Görsel Standartlar': interview.visualsPresent,
            'İK Farkındalık Seviyesi': interview.hrAwarenessLevel,
            'Temel Zorluklar': interview.mainDifficulties,
            'Diğer Departman Sorunları': interview.otherDeptIssues,
            'Yetkinlik Değerlendirmesi': interview.competencyEvaluation,
            'Ciddi Durum Var mı?': interview.seriousSituation,
            'İK Aksiyon Planı / Geri Bildirim': interview.hrFeedback,
            'Genel Yorum': interview.generalComment
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Mağaza Görüşmeleri");
        XLSX.writeFile(workbook, `Magaza_Gorusme_Raporu_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const steps = [
        { id: 1, title: 'Genel Bilgiler', icon: <Calendar size={18} /> },
        { id: 2, title: 'Mağaza & Yönetim', icon: <MapPin size={18} /> },
        { id: 3, title: 'Değerlendirme', icon: <TrendingUp size={18} /> },
        { id: 4, title: 'Detaylar & Aksiyon', icon: <CheckCircle size={18} /> }
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addStoreInterview(formData);
        setView('dashboard');
        setCurrentStep(1);
        setFormData({
            startTime: '',
            endTime: '',
            hrResponsible: currentUser?.name || '',
            interviewType: 'Yüz yüze',
            visitDate: new Date().toISOString().split('T')[0],
            opsManager: '',
            regionalManager: '',
            storeCode: '',
            storeName: '',
            storeOfficial: '',
            visitReason: '',
            employeeMotivation: 'Orta',
            managerCommunication: 'İyi',
            workloadLevel: 'Normal',
            fairShiftPlan: 'Evet',
            mainDifficulties: '',
            seriousSituation: 'Hayır',
            hrFeedback: '',
            hrAwarenessLevel: 'Orta',
            visualsPresent: 'Evet',
            otherDeptIssues: '',
            intervieweeCount: 1,
            competencyEvaluation: '',
            generalComment: ''
        });
    };

    const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

    return (
        <MainLayout>
            <div className="content-container">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Mağaza Görüşme Formu</h1>
                        <p className="page-subtitle">İK saha ziyaretleri ve mağaza mülakatları yönetim paneli.</p>
                    </div>
                    <div className="page-header-actions">
                        <button 
                            onClick={handleExportExcel}
                            className="btn btn-secondary"
                        >
                            <Download size={18} />
                            <span>Excel İndir</span>
                        </button>
                        <button 
                            onClick={() => setView('form')}
                            className="btn btn-primary"
                        >
                            <Plus size={18} />
                            <span>Yeni Form Ekle</span>
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="chart-filter-tabs" style={{ width: 'fit-content' }}>
                        <button 
                            onClick={() => setView('dashboard')}
                            className={`chart-filter-btn ${view === 'dashboard' ? 'active' : ''}`}
                        >
                            <LayoutDashboard size={16} />
                            Dashboard
                        </button>
                        <button 
                            onClick={() => setView('list')}
                            className={`chart-filter-btn ${view === 'list' ? 'active' : ''}`}
                        >
                            <ListFilter size={16} />
                            Görüşme Listesi
                        </button>
                    </div>

                    {view !== 'form' && (
                        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-500 uppercase px-2">Filtreler:</span>
                                <select 
                                    className="text-xs border-none bg-slate-50 rounded-lg py-1.5 px-3 focus:ring-0 cursor-pointer font-medium"
                                    value={filters.som}
                                    onChange={e => setFilters({...filters, som: e.target.value})}
                                >
                                    <option value="Tümü">Tüm SOM'lar</option>
                                    <option value="Ayşe Kaya">Ayşe Kaya</option>
                                </select>
                                <select 
                                    className="text-xs border-none bg-slate-50 rounded-lg py-1.5 px-3 focus:ring-0 cursor-pointer font-medium"
                                    value={filters.bm}
                                    onChange={e => setFilters({...filters, bm: e.target.value})}
                                >
                                    <option value="Tümü">Tüm BM'ler</option>
                                    <option value="KEMAL GÜLCAN">KEMAL GÜLCAN</option>
                                    <option value="Elif Aydın">Elif Aydın</option>
                                    <option value="Caner Öztürk">Caner Öztürk</option>
                                    <option value="Zeynep Aslan">Zeynep Aslan</option>
                                </select>
                                <select 
                                    className="text-xs border-none bg-slate-50 rounded-lg py-1.5 px-3 focus:ring-0 cursor-pointer font-medium"
                                    value={filters.year}
                                    onChange={e => setFilters({...filters, year: e.target.value})}
                                >
                                    <option value="Tümü">Tüm Yıllar</option>
                                    <option value="2024">2024</option>
                                    <option value="2023">2023</option>
                                </select>
                                <select 
                                    className="text-xs border-none bg-slate-50 rounded-lg py-1.5 px-3 focus:ring-0 cursor-pointer font-medium"
                                    value={filters.month}
                                    onChange={e => setFilters({...filters, month: e.target.value})}
                                >
                                    <option value="Tümü">Tüm Aylar</option>
                                    {["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"].map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {view === 'dashboard' && (
                        <motion.div 
                            key="dashboard"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            <div className="dashboard-grid-3col">
                                <StatCard 
                                    icon="description"
                                    title="Toplam Görüşme"
                                    value={(stats?.total || 0).toString()}
                                    subtitle="Kayıtlı saha ziyareti"
                                    tooltipText="Sistemde kayıtlı olan toplam mağaza görüşmesi ve saha ziyareti sayısı."
                                />
                                <StatCard 
                                    icon="groups"
                                    title="Ort. Katılımcı"
                                    value={stats?.avgInterviewees || "0"}
                                    subtitle="Görüşme başına çalışan"
                                    tooltipText="Görüşmelerde mülakat yapılan ortalama çalışan sayısı."
                                />
                                <StatCard 
                                    icon="location_on"
                                    title="Yüz Yüze Oranı"
                                    value={`%${stats?.faceToFaceRate.toFixed(0) || 0}`}
                                    subtitle="Saha ziyareti performansı"
                                    tooltipText="Toplam görüşmeler içinde fiziksel olarak mağazada yapılanların oranı."
                                />
                            </div>

                            <div className="dashboard-grid-2col">
                                <div className="card chart-card">
                                    <div className="card-header">
                                        <h3 className="card-title flex items-center gap-2">
                                            <TrendingUp size={20} className="text-indigo-500" />
                                            Çalışan Motivasyon Dağılımı
                                        </h3>
                                    </div>
                                    <div className="chart-container">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats?.motivationData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                                <Tooltip 
                                                    cursor={{fill: '#f8fafc'}}
                                                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                                                />
                                                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                                                    {stats?.motivationData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="card chart-card">
                                    <div className="card-header">
                                        <h3 className="card-title flex items-center gap-2">
                                            <Clock size={20} className="text-indigo-500" />
                                            Görüşme Tipleri
                                        </h3>
                                    </div>
                                    <div className="chart-container">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={stats?.typeData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {stats?.typeData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                                                />
                                                <Legend verticalAlign="bottom" height={36}/>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="card" style={{ padding: 0 }}>
                                <div className="section-header" style={{ padding: '1.5rem', marginBottom: 0 }}>
                                    <h3 className="section-title">Son Görüşmeler</h3>
                                    <button onClick={() => setView('list')} className="btn-link">Tümünü Gör &rarr;</button>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {filteredInterviews.slice(-5).reverse().map((interview) => (
                                        <div key={interview.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                    <MapPin size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{interview.storeName}</p>
                                                    <p className="text-xs text-slate-500">{interview.visitDate} • {interview.hrResponsible}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                                                    interview.employeeMotivation === 'Yüksek' ? 'bg-emerald-50 text-emerald-700' :
                                                    interview.employeeMotivation === 'Düşük' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                                                }`}>
                                                    {interview.employeeMotivation} Motivasyon
                                                </span>
                                                <button 
                                                    onClick={() => {
                                                        setSelectedInterview(interview);
                                                        setShowDetail(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                >
                                                    <ChevronRight size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredInterviews.length === 0 && (
                                        <div className="p-12 text-center text-slate-400">
                                            Filtreye uygun görüşme kaydı bulunmuyor.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {view === 'list' && (
                        <motion.div 
                            key="list"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="table-container"
                        >
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Tarih</th>
                                        <th>Mağaza</th>
                                        <th>İK Sorumlusu</th>
                                        <th>Tip</th>
                                        <th>Motivasyon</th>
                                        <th>Aksiyon</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInterviews.map((interview) => (
                                        <tr key={interview.id}>
                                            <td>{interview.visitDate}</td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{interview.storeName}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-color-light)' }}>{interview.storeCode}</div>
                                            </td>
                                            <td>{interview.hrResponsible}</td>
                                            <td>
                                                <span className={`status-badge ${interview.interviewType === 'Yüz yüze' ? 'success' : 'neutral'}`}>
                                                    {interview.interviewType}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${
                                                    interview.employeeMotivation === 'Yüksek' ? 'success' :
                                                    interview.employeeMotivation === 'Düşük' ? 'error' : 'warning'
                                                }`}>
                                                    {interview.employeeMotivation}
                                                </span>
                                            </td>
                                            <td>
                                                <button 
                                                    onClick={() => {
                                                        setSelectedInterview(interview);
                                                        setShowDetail(true);
                                                    }}
                                                    className="btn-icon"
                                                >
                                                    <span className="material-symbols-outlined">visibility</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredInterviews.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-12 text-slate-400">
                                                Filtreye uygun görüşme kaydı bulunmuyor.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </motion.div>
                    )}

                    {view === 'form' && (
                        <motion.div 
                            key="form"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full max-w-5xl mx-auto"
                        >
                            <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100">
                                {/* Stepper Header */}
                                <div className="bg-slate-50/50 border-b border-slate-100 p-8 md:p-12">
                                    <div className="flex items-center justify-between mb-10">
                                        <div>
                                            <h2 className="text-3xl font-bold text-slate-900">Yeni Mağaza Görüşme Formu</h2>
                                            <p className="text-slate-500 text-lg mt-2">Lütfen formdaki tüm alanları eksiksiz doldurunuz.</p>
                                        </div>
                                        <button onClick={() => setView('dashboard')} className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm group">
                                            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                                        </button>
                                    </div>

                                    <div className="relative flex justify-between max-w-4xl mx-auto">
                                        {/* Progress Line */}
                                        <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-200 -z-0">
                                            <motion.div 
                                                className="h-full bg-indigo-600"
                                                initial={{ width: '0%' }}
                                                animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                                            />
                                        </div>

                                        {steps.map((step) => (
                                            <div key={step.id} className="relative z-10 flex flex-col items-center">
                                                <motion.div 
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                                        currentStep >= step.id 
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                                                        : 'bg-white border-slate-200 text-slate-400'
                                                    }`}
                                                    animate={{ 
                                                        scale: currentStep === step.id ? 1.1 : 1,
                                                    }}
                                                >
                                                    {currentStep > step.id ? <Check size={18} /> : step.icon}
                                                </motion.div>
                                                <span className={`text-[10px] font-bold uppercase tracking-wider mt-3 transition-colors duration-300 ${
                                                    currentStep >= step.id ? 'text-indigo-600' : 'text-slate-400'
                                                }`}>
                                                    {step.title}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <form onSubmit={handleSubmit} className="p-8 md:p-12">
                                    <AnimatePresence mode="wait">
                                        {currentStep === 1 && (
                                            <motion.div 
                                                key="step1"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="space-y-10"
                                            >
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Ziyaret Tarihi</label>
                                                        <input 
                                                            type="date" 
                                                            required
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.visitDate}
                                                            onChange={e => setFormData({...formData, visitDate: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Görüşme Tipi</label>
                                                        <select 
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.interviewType}
                                                            onChange={e => setFormData({...formData, interviewType: e.target.value as any})}
                                                        >
                                                            <option value="Yüz yüze">Yüz yüze</option>
                                                            <option value="Online">Online</option>
                                                        </select>
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">İK Sorumlusu</label>
                                                        <input 
                                                            type="text" 
                                                            required
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.hrResponsible}
                                                            onChange={e => setFormData({...formData, hrResponsible: e.target.value})}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Başlangıç Saati</label>
                                                        <input 
                                                            type="time" 
                                                            required
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.startTime}
                                                            onChange={e => setFormData({...formData, startTime: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Bitiş Saati</label>
                                                        <input 
                                                            type="time" 
                                                            required
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.endTime}
                                                            onChange={e => setFormData({...formData, endTime: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Ziyaret Nedeni</label>
                                                        <input 
                                                            type="text" 
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            placeholder="Örn: Rutin Kontrol, Şikayet Değerlendirmesi"
                                                            value={formData.visitReason}
                                                            onChange={e => setFormData({...formData, visitReason: e.target.value})}
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        {currentStep === 2 && (
                                            <motion.div 
                                                key="step2"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="space-y-10"
                                            >
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Mağaza Kodu</label>
                                                        <input 
                                                            type="text" 
                                                            required
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.storeCode}
                                                            onChange={e => setFormData({...formData, storeCode: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Mağaza Adı</label>
                                                        <input 
                                                            type="text" 
                                                            required
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.storeName}
                                                            onChange={e => setFormData({...formData, storeName: e.target.value})}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">SOM (Operasyon Müdürü)</label>
                                                        <select 
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.opsManager}
                                                            onChange={e => setFormData({...formData, opsManager: e.target.value})}
                                                        >
                                                            <option value="">Seçiniz</option>
                                                            <option value="Ayşe Kaya">Ayşe Kaya</option>
                                                            <option value="Mehmet Demir">Mehmet Demir</option>
                                                        </select>
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">BM (Bölge Müdürü)</label>
                                                        <select 
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.regionalManager}
                                                            onChange={e => setFormData({...formData, regionalManager: e.target.value})}
                                                        >
                                                            <option value="">Seçiniz</option>
                                                            <option value="KEMAL GÜLCAN">KEMAL GÜLCAN</option>
                                                            <option value="Elif Aydın">Elif Aydın</option>
                                                            <option value="Caner Öztürk">Caner Öztürk</option>
                                                            <option value="Zeynep Aslan">Zeynep Aslan</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Görüşülen Mağaza Yetkilisi</label>
                                                        <input 
                                                            type="text" 
                                                            required
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.storeOfficial}
                                                            onChange={e => setFormData({...formData, storeOfficial: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Mülakat Yapılan Çalışan Sayısı</label>
                                                        <input 
                                                            type="number" 
                                                            min="1"
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.intervieweeCount}
                                                            onChange={e => setFormData({...formData, intervieweeCount: parseInt(e.target.value) || 0})}
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        {currentStep === 3 && (
                                            <motion.div 
                                                key="step3"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="space-y-10"
                                            >
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Çalışan Motivasyonu</label>
                                                        <select 
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.employeeMotivation}
                                                            onChange={e => setFormData({...formData, employeeMotivation: e.target.value})}
                                                        >
                                                            <option value="Düşük">Düşük</option>
                                                            <option value="Orta">Orta</option>
                                                            <option value="Yüksek">Yüksek</option>
                                                        </select>
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Yönetici İletişimi</label>
                                                        <select 
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.managerCommunication}
                                                            onChange={e => setFormData({...formData, managerCommunication: e.target.value})}
                                                        >
                                                            <option value="Zayıf">Zayıf</option>
                                                            <option value="Gelişmeli">Gelişmeli</option>
                                                            <option value="İyi">İyi</option>
                                                        </select>
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">İş Yükü Seviyesi</label>
                                                        <select 
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.workloadLevel}
                                                            onChange={e => setFormData({...formData, workloadLevel: e.target.value})}
                                                        >
                                                            <option value="Düşük">Düşük</option>
                                                            <option value="Normal">Normal</option>
                                                            <option value="Yoğun">Yoğun</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Adil Vardiya Planı Var mı?</label>
                                                        <select 
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.fairShiftPlan}
                                                            onChange={e => setFormData({...formData, fairShiftPlan: e.target.value})}
                                                        >
                                                            <option value="Evet">Evet</option>
                                                            <option value="Hayır">Hayır</option>
                                                        </select>
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Görsel Standartlar Uygun mu?</label>
                                                        <select 
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.visualsPresent}
                                                            onChange={e => setFormData({...formData, visualsPresent: e.target.value})}
                                                        >
                                                            <option value="Evet">Evet</option>
                                                            <option value="Hayır">Hayır</option>
                                                        </select>
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">İK Farkındalık Seviyesi</label>
                                                        <select 
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.hrAwarenessLevel}
                                                            onChange={e => setFormData({...formData, hrAwarenessLevel: e.target.value})}
                                                        >
                                                            <option value="Düşük">Düşük</option>
                                                            <option value="Orta">Orta</option>
                                                            <option value="Yüksek">Yüksek</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        {currentStep === 4 && (
                                            <motion.div 
                                                key="step4"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="space-y-10"
                                            >
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Temel Zorluklar / Sıkıntılar</label>
                                                        <textarea 
                                                            rows={4}
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            placeholder="Çalışanların belirttiği temel zorluklar..."
                                                            value={formData.mainDifficulties}
                                                            onChange={e => setFormData({...formData, mainDifficulties: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Diğer Departman Sorunları</label>
                                                        <textarea 
                                                            rows={4}
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            placeholder="Lojistik, IT, Satınalma vb. sorunlar..."
                                                            value={formData.otherDeptIssues}
                                                            onChange={e => setFormData({...formData, otherDeptIssues: e.target.value})}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Yetkinlik Değerlendirmesi</label>
                                                        <textarea 
                                                            rows={4}
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.competencyEvaluation}
                                                            onChange={e => setFormData({...formData, competencyEvaluation: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">İK Geri Bildirimi / Aksiyon Planı</label>
                                                        <textarea 
                                                            rows={4}
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.hrFeedback}
                                                            onChange={e => setFormData({...formData, hrFeedback: e.target.value})}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Ciddi Bir Durum Var mı?</label>
                                                        <select 
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.seriousSituation}
                                                            onChange={e => setFormData({...formData, seriousSituation: e.target.value})}
                                                        >
                                                            <option value="Hayır">Hayır</option>
                                                            <option value="Evet">Evet</option>
                                                        </select>
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Genel Yorum ve Notlar</label>
                                                        <textarea 
                                                            rows={4}
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.generalComment}
                                                            onChange={e => setFormData({...formData, generalComment: e.target.value})}
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Navigation Buttons */}
                                    <div className="pt-12 flex items-center justify-between border-t border-slate-100 mt-16">
                                        <button 
                                            type="button"
                                            onClick={currentStep === 1 ? () => setView('dashboard') : prevStep}
                                            className="px-10 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all flex items-center gap-3 text-lg"
                                        >
                                            <ArrowLeft size={22} />
                                            {currentStep === 1 ? 'Vazgeç' : 'Geri Dön'}
                                        </button>
                                        
                                        {currentStep < 4 ? (
                                            <button 
                                                type="button"
                                                onClick={nextStep}
                                                className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 text-lg"
                                            >
                                                Sonraki Adım
                                                <ArrowRight size={22} />
                                            </button>
                                        ) : (
                                            <button 
                                                type="submit"
                                                className="px-12 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-xl shadow-emerald-100 hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 text-lg"
                                            >
                                                Formu Tamamla
                                                <CheckCircle size={22} />
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showDetail && selectedInterview && (
                        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="modal-content"
                                onClick={e => e.stopPropagation()}
                                style={{ maxWidth: '700px' }}
                            >
                                <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--primary-color)', color: 'white' }}>
                                    <div>
                                        <h2 className="card-title" style={{ color: 'white' }}>{selectedInterview.storeName}</h2>
                                        <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>{selectedInterview.visitDate} • Görüşme Detayı</p>
                                    </div>
                                    <button onClick={() => setShowDetail(false)} className="btn-icon" style={{ color: 'white' }}>
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                                <div className="p-8 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ziyaret Bilgileri</h4>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">İK Sorumlusu:</span>
                                                    <span className="font-medium text-slate-900">{selectedInterview.hrResponsible}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">Görüşme Tipi:</span>
                                                    <span className="font-medium text-slate-900">{selectedInterview.interviewType}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">Ziyaret Nedeni:</span>
                                                    <span className="font-medium text-slate-900">{selectedInterview.visitReason || '-'}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">Süre:</span>
                                                    <span className="font-medium text-slate-900">{selectedInterview.startTime} - {selectedInterview.endTime}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mağaza ve Yönetim</h4>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">Mağaza Kodu:</span>
                                                    <span className="font-medium text-slate-900">{selectedInterview.storeCode}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">Yetkili:</span>
                                                    <span className="font-medium text-slate-900">{selectedInterview.storeOfficial}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">SOM:</span>
                                                    <span className="font-medium text-slate-900">{selectedInterview.opsManager || '-'}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">BM:</span>
                                                    <span className="font-medium text-slate-900">{selectedInterview.regionalManager || '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Değerlendirme Puanları</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="p-3 bg-slate-50 rounded-xl text-center">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Motivasyon</p>
                                                <p className="text-sm font-bold text-indigo-600">{selectedInterview.employeeMotivation}</p>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-xl text-center">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">İletişim</p>
                                                <p className="text-sm font-bold text-indigo-600">{selectedInterview.managerCommunication}</p>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-xl text-center">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">İş Yükü</p>
                                                <p className="text-sm font-bold text-indigo-600">{selectedInterview.workloadLevel}</p>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-xl text-center">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">İK Farkındalık</p>
                                                <p className="text-sm font-bold text-indigo-600">{selectedInterview.hrAwarenessLevel || 'Orta'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Vardiya Planı</p>
                                            <p className="font-semibold text-slate-900">{selectedInterview.fairShiftPlan || 'Belirtilmemiş'}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Görsel Standart</p>
                                            <p className="font-semibold text-slate-900">{selectedInterview.visualsPresent || 'Belirtilmemiş'}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Ciddi Durum</p>
                                            <p className={`font-semibold ${selectedInterview.seriousSituation === 'Evet' ? 'text-red-600' : 'text-slate-900'}`}>
                                                {selectedInterview.seriousSituation || 'Hayır'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Temel Zorluklar</h4>
                                            <div className="p-4 border border-slate-100 rounded-2xl bg-white">
                                                <p className="text-sm text-slate-700">{selectedInterview.mainDifficulties || 'Belirtilmemiş.'}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Yetkinlik Değerlendirmesi</h4>
                                            <div className="p-4 border border-slate-100 rounded-2xl bg-white">
                                                <p className="text-sm text-slate-700">{selectedInterview.competencyEvaluation || 'Belirtilmemiş.'}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">İK Aksiyon Planı</h4>
                                            <div className="p-4 border border-indigo-100 rounded-2xl bg-indigo-50/30">
                                                <p className="text-sm text-slate-700">{selectedInterview.hrFeedback || 'Belirtilmemiş.'}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Genel Yorum</h4>
                                            <div className="p-4 border border-slate-100 rounded-2xl bg-white">
                                                <p className="text-sm text-slate-700">{selectedInterview.generalComment || 'Not belirtilmemiş.'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                                        <button onClick={() => setShowDetail(false)} className="btn btn-primary px-8">Kapat</button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </MainLayout>
    );
};

export default StoreInterviewPage;
