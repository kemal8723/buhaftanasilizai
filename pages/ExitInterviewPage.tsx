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
    CheckCircle,
    Phone,
    Briefcase,
    LogOut
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

const ExitInterviewPage: React.FC = () => {
    const { currentUser, exitInterviews, addExitInterview } = useData();
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
        employeeId: '',
        storeCode: '',
        storeName: '',
        fullName: '',
        position: '',
        startDate: '',
        exitDate: '',
        phone: '',
        exitReasonCategory: '',
        subExitReason: '',
        detailedReason: '',
        explanation: '',
        regionalManager: '',
        opsManager: ''
    });

    // Filtered Interviews
    const filteredInterviews = useMemo(() => {
        return exitInterviews.filter(interview => {
            const date = new Date(interview.exitDate);
            const year = date.getFullYear().toString();
            const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
            const month = monthNames[date.getMonth()];

            const matchesSom = filters.som === 'Tümü' || interview.opsManager === filters.som;
            const matchesBm = filters.bm === 'Tümü' || interview.regionalManager === filters.bm;
            const matchesYear = filters.year === 'Tümü' || year === filters.year;
            const matchesMonth = filters.month === 'Tümü' || month === filters.month;

            return matchesSom && matchesBm && matchesYear && matchesMonth;
        });
    }, [exitInterviews, filters]);

    // Dashboard Calculations
    const stats = useMemo(() => {
        if (filteredInterviews.length === 0) return null;

        const total = filteredInterviews.length;
        
        // Reason distribution
        const reasonCounts: { [key: string]: number } = {};
        filteredInterviews.forEach(i => {
            reasonCounts[i.exitReasonCategory] = (reasonCounts[i.exitReasonCategory] || 0) + 1;
        });
        
        const reasonData = Object.entries(reasonCounts).map(([name, value]) => ({
            name,
            value,
            color: '#6366f1'
        })).sort((a, b) => b.value - a.value);

        // Position distribution
        const positionCounts: { [key: string]: number } = {};
        filteredInterviews.forEach(i => {
            positionCounts[i.position] = (positionCounts[i.position] || 0) + 1;
        });
        
        const positionData = Object.entries(positionCounts).map(([name, value]) => ({
            name,
            value
        }));

        return {
            total,
            reasonData,
            positionData
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
            'Sicil': interview.employeeId,
            'Mağaza Kodu': interview.storeCode,
            'Mağaza Adı': interview.storeName,
            'Ad Soyad': interview.fullName,
            'Görev': interview.position,
            'Giriş Tarihi': interview.startDate,
            'Çıkış Tarihi': interview.exitDate,
            'Telefon': interview.phone,
            'Çıkış Sebebi Açıklama': interview.exitReasonCategory,
            'Alt Çıkış Nedeni': interview.subExitReason,
            'Ayrılma Sebebi - TR': interview.detailedReason,
            'Açıklama': interview.explanation,
            'BM': interview.regionalManager,
            'SOM': interview.opsManager
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Çıkış Mülakatları");
        XLSX.writeFile(workbook, `Cikis_Mulakat_Raporu_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const steps = [
        { id: 1, title: 'Çalışan Bilgileri', icon: <User size={18} /> },
        { id: 2, title: 'Mağaza & Tarih', icon: <MapPin size={18} /> },
        { id: 3, title: 'Çıkış Nedeni', icon: <LogOut size={18} /> },
        { id: 4, title: 'Detaylar & Onay', icon: <CheckCircle size={18} /> }
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addExitInterview(formData);
        setView('dashboard');
        setCurrentStep(1);
        setFormData({
            employeeId: '',
            storeCode: '',
            storeName: '',
            fullName: '',
            position: '',
            startDate: '',
            exitDate: '',
            phone: '',
            exitReasonCategory: '',
            subExitReason: '',
            detailedReason: '',
            explanation: '',
            regionalManager: '',
            opsManager: ''
        });
    };

    const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

    return (
        <MainLayout>
            <div className="content-container">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Çıkış Mülakatı Formu</h1>
                        <p className="page-subtitle">İşten ayrılan çalışanlar için mülakat ve analiz yönetim paneli.</p>
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
                            Mülakat Listesi
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
                                    <option value="Mehmet Demir">Mehmet Demir</option>
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
                                    <option value="2025">2025</option>
                                    <option value="2024">2024</option>
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
                            className="space-y-10"
                        >
                            <div className="dashboard-grid-3col">
                                <StatCard 
                                    icon="person_off"
                                    title="Toplam Çıkış"
                                    value={(stats?.total || 0).toString()}
                                    subtitle="Kayıtlı çıkış mülakatı"
                                    tooltipText="Sistemde kayıtlı olan toplam çıkış mülakatı sayısı."
                                />
                                <StatCard 
                                    icon="trending_down"
                                    title="En Sık Neden"
                                    value={stats?.reasonData[0]?.name || "-"}
                                    subtitle="Ayrılma sebebi lideri"
                                    tooltipText="Çalışanların en çok belirttiği ayrılma nedeni."
                                />
                                <StatCard 
                                    icon="work"
                                    title="Kritik Pozisyon"
                                    value={stats?.positionData[0]?.name || "-"}
                                    subtitle="En çok çıkış olan görev"
                                    tooltipText="En fazla işten ayrılma görülen çalışan pozisyonu."
                                />
                            </div>

                            <div className="dashboard-grid-2col">
                                <div className="card chart-card">
                                    <div className="card-header">
                                        <h3 className="card-title flex items-center gap-2">
                                            <TrendingUp size={20} className="text-indigo-500" />
                                            Çıkış Sebebi Dağılımı
                                        </h3>
                                    </div>
                                    <div className="chart-container">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats?.reasonData} layout="vertical" margin={{ left: 40 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} width={100} />
                                                <Tooltip 
                                                    cursor={{fill: '#f8fafc'}}
                                                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                                                />
                                                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20} fill="#6366f1" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="card chart-card">
                                    <div className="card-header">
                                        <h3 className="card-title flex items-center gap-2">
                                            <Users size={20} className="text-indigo-500" />
                                            Pozisyon Bazlı Dağılım
                                        </h3>
                                    </div>
                                    <div className="chart-container">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={stats?.positionData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    nameKey="name"
                                                >
                                                    {stats?.positionData.map((entry, index) => (
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
                                    <h3 className="section-title">Son Çıkışlar</h3>
                                    <button onClick={() => setView('list')} className="btn-link">Tümünü Gör &rarr;</button>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {filteredInterviews.slice(-5).reverse().map((interview) => (
                                        <div key={interview.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                    <User size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{interview.fullName}</p>
                                                    <p className="text-xs text-slate-500">{interview.position} • {interview.storeName}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                                                    {interview.exitReasonCategory}
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
                                            Filtreye uygun mülakat kaydı bulunmuyor.
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
                                        <th>Çıkış Tarihi</th>
                                        <th>Ad Soyad</th>
                                        <th>Mağaza</th>
                                        <th>Pozisyon</th>
                                        <th>Neden</th>
                                        <th>Aksiyon</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInterviews.map((interview) => (
                                        <tr key={interview.id}>
                                            <td>{interview.exitDate}</td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{interview.fullName}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-color-light)' }}>{interview.employeeId}</div>
                                            </td>
                                            <td>{interview.storeName}</td>
                                            <td>{interview.position}</td>
                                            <td>
                                                <span className="status-badge neutral">
                                                    {interview.exitReasonCategory}
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
                                                Filtreye uygun mülakat kaydı bulunmuyor.
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
                            className="w-full"
                        >
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                                {/* Stepper Header */}
                                <div className="bg-slate-50/50 border-b border-slate-200 p-8 md:p-12">
                                    <div className="flex items-center justify-between mb-10">
                                        <div>
                                            <h2 className="text-3xl font-bold text-slate-900">Yeni Çıkış Mülakatı</h2>
                                            <p className="text-slate-500 text-base mt-2">Lütfen ayrılan çalışan bilgilerini eksiksiz doldurunuz.</p>
                                        </div>
                                        <button onClick={() => setView('dashboard')} className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm group">
                                            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                                        </button>
                                    </div>

                                    <div className="relative flex justify-between max-w-5xl mx-auto mt-8">
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
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Sicil No</label>
                                                        <input 
                                                            type="text" 
                                                            required
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.employeeId}
                                                            onChange={e => setFormData({...formData, employeeId: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Ad Soyad</label>
                                                        <input 
                                                            type="text" 
                                                            required
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.fullName}
                                                            onChange={e => setFormData({...formData, fullName: e.target.value})}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Görev</label>
                                                        <input 
                                                            type="text" 
                                                            required
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.position}
                                                            onChange={e => setFormData({...formData, position: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Telefon</label>
                                                        <input 
                                                            type="tel" 
                                                            required
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.phone}
                                                            onChange={e => setFormData({...formData, phone: e.target.value})}
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
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">İşe Giriş Tarihi</label>
                                                        <input 
                                                            type="date" 
                                                            required
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.startDate}
                                                            onChange={e => setFormData({...formData, startDate: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">İşten Çıkış Tarihi</label>
                                                        <input 
                                                            type="date" 
                                                            required
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.exitDate}
                                                            onChange={e => setFormData({...formData, exitDate: e.target.value})}
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
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Çıkış Sebebi Kategorisi</label>
                                                        <select 
                                                            required
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.exitReasonCategory}
                                                            onChange={e => setFormData({...formData, exitReasonCategory: e.target.value})}
                                                        >
                                                            <option value="">Seçiniz</option>
                                                            <option value="AİLEVİ">AİLEVİ</option>
                                                            <option value="ÇALIŞMA SAATLERİ">ÇALIŞMA SAATLERİ</option>
                                                            <option value="EĞİTİM">EĞİTİM</option>
                                                            <option value="EVLİLİK">EVLİLİK</option>
                                                            <option value="İŞ ARKADAŞLARI İLE ANLAŞMAZLIK">İŞ ARKADAŞLARI İLE ANLAŞMAZLIK</option>
                                                            <option value="İŞ YÜKÜ">İŞ YÜKÜ</option>
                                                            <option value="TAŞINMA">TAŞINMA</option>
                                                            <option value="ULAŞILAMADI">ULAŞILAMADI</option>
                                                            <option value="ULAŞIM">ULAŞIM</option>
                                                            <option value="YÖNETİCİ İLE ANLAŞMAZLIK">YÖNETİCİ İLE ANLAŞMAZLIK</option>
                                                        </select>
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">Alt Çıkış Nedeni</label>
                                                        <input 
                                                            type="text" 
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            placeholder="Örn: Family Reasons, Education..."
                                                            value={formData.subExitReason}
                                                            onChange={e => setFormData({...formData, subExitReason: e.target.value})}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label text-slate-600 font-semibold mb-3 block">Ayrılma Sebebi (Detaylı - TR)</label>
                                                    <textarea 
                                                        rows={4}
                                                        className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                        value={formData.detailedReason}
                                                        onChange={e => setFormData({...formData, detailedReason: e.target.value})}
                                                    />
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
                                                        <label className="form-label text-slate-600 font-semibold mb-3 block">SOM (Operasyon Müdürü)</label>
                                                        <select 
                                                            className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                            value={formData.opsManager}
                                                            onChange={e => setFormData({...formData, opsManager: e.target.value})}
                                                        >
                                                            <option value="">Seçiniz</option>
                                                            <option value="Ayşe Kaya">Ayşe Kaya</option>
                                                            <option value="Mehmet Demir">Mehmet Demir</option>
                                                            <option value="ERKIN BORA KALE">ERKIN BORA KALE</option>
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
                                                <div className="form-group">
                                                    <label className="form-label text-slate-600 font-semibold mb-3 block">Açıklama ve Notlar</label>
                                                    <textarea 
                                                        rows={5}
                                                        className="form-input w-full px-5 py-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
                                                        value={formData.explanation}
                                                        onChange={e => setFormData({...formData, explanation: e.target.value})}
                                                    />
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
                                className="modal-content bg-white rounded-[2rem] shadow-2xl overflow-hidden w-full m-4 relative z-50"
                                onClick={e => e.stopPropagation()}
                                style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}
                            >
                                <div className="card-header bg-slate-900 text-white p-8 md:p-10 rounded-t-[2rem] border-b-0 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
                                    <div className="relative z-10 flex justify-between items-start">
                                        <div>
                                            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">{selectedInterview.fullName}</h2>
                                            <div className="flex items-center gap-3 text-slate-300 font-medium">
                                                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                                                    <Calendar size={14} />
                                                    {selectedInterview.exitDate}
                                                </span>
                                                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                                                    <FileText size={14} />
                                                    Çıkış Mülakat Detayı
                                                </span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setShowDetail(false)} 
                                            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all hover:rotate-90 backdrop-blur-sm"
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-6 md:p-10 space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-5">
                                            <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                                <span className="w-8 h-[2px] bg-indigo-200 rounded-full"></span>
                                                Çalışan Bilgileri
                                            </h4>
                                            <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                                <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                                                    <span className="text-slate-500 font-medium">Sicil No</span>
                                                    <span className="font-bold text-slate-900">{selectedInterview.employeeId}</span>
                                                </div>
                                                <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                                                    <span className="text-slate-500 font-medium">Görev</span>
                                                    <span className="font-bold text-slate-900">{selectedInterview.position}</span>
                                                </div>
                                                <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                                                    <span className="text-slate-500 font-medium">Telefon</span>
                                                    <span className="font-bold text-slate-900">{selectedInterview.phone}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-500 font-medium">Giriş Tarihi</span>
                                                    <span className="font-bold text-slate-900">{selectedInterview.startDate}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-5">
                                            <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                                <span className="w-8 h-[2px] bg-indigo-200 rounded-full"></span>
                                                Mağaza ve Yönetim
                                            </h4>
                                            <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                                <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                                                    <span className="text-slate-500 font-medium">Mağaza</span>
                                                    <span className="font-bold text-slate-900">{selectedInterview.storeName} ({selectedInterview.storeCode})</span>
                                                </div>
                                                <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                                                    <span className="text-slate-500 font-medium">SOM</span>
                                                    <span className="font-bold text-slate-900">{selectedInterview.opsManager || '-'}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-500 font-medium">BM</span>
                                                    <span className="font-bold text-slate-900">{selectedInterview.regionalManager || '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-5">
                                        <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-8 h-[2px] bg-indigo-200 rounded-full"></span>
                                            Çıkış Nedeni
                                        </h4>
                                        <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-4">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                                                <div className="flex items-center justify-between md:justify-start w-full md:w-auto gap-4">
                                                    <span className="text-sm font-bold text-slate-400 uppercase">Kategori</span>
                                                    <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold border border-indigo-100">{selectedInterview.exitReasonCategory}</span>
                                                </div>
                                                <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4">
                                                    <span className="text-sm font-bold text-slate-400 uppercase">Alt Neden</span>
                                                    <span className="text-base font-bold text-slate-900">{selectedInterview.subExitReason || '-'}</span>
                                                </div>
                                            </div>
                                            <div className="pt-2">
                                                <p className="text-sm font-bold text-slate-400 uppercase mb-3">Detaylı Ayrılma Sebebi</p>
                                                <p className="text-base text-slate-700 leading-relaxed bg-slate-50 p-5 rounded-xl border border-slate-100">{selectedInterview.detailedReason || '-'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-5">
                                        <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-8 h-[2px] bg-indigo-200 rounded-full"></span>
                                            Açıklama ve Notlar
                                        </h4>
                                        <div className="p-6 border border-slate-100 rounded-2xl bg-white shadow-sm">
                                            <p className="text-base text-slate-700 leading-relaxed">{selectedInterview.explanation || 'Not belirtilmemiş.'}</p>
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t border-slate-100 flex justify-end">
                                        <button 
                                            onClick={() => setShowDetail(false)} 
                                            className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-200 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all text-lg"
                                        >
                                            Kapat
                                        </button>
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

export default ExitInterviewPage;
