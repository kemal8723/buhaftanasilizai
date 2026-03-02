import React, { useMemo } from 'react';
import MainLayout from '../components/MainLayout';
import { useData } from '../DataContext';
import { AreaChartCard, MultiLineChartCard } from '../components/ChartCards';
import StatCard from '../components/StatCard';
import PerformanceKPICard from '../components/PerformanceKPICard';
import AIInsightsCard from '../components/AIInsightsCard';
import { WordCloudCard } from '../components/WordCloudCard';
import { Link } from 'react-router-dom';

// Preview Components for Guide
const DashboardPreview: React.FC = () => {
    const { comments } = useData();
    const satisfactionHistory = useMemo(() => {
        const history: { [key: string]: { total: number, count: number } } = {};
        const monthOrder = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
        comments.forEach(c => {
            if (c.month && c.rating) {
                if (!history[c.month]) history[c.month] = { total: 0, count: 0 };
                history[c.month].total += c.rating;
                history[c.month].count++;
            }
        });
        return monthOrder.filter(m => history[m]).map(month => ({
            name: month.substring(0,3),
            value: history[month].total / history[month].count
        }));
    }, [comments]);

    return (
        <div className="dashboard-grid-2col" style={{ gap: '1rem' }}>
            <AreaChartCard 
                title="Genel Memnuniyet Trendi"
                value="4.12 / 5"
                change="+0.15"
                changeType="positive"
                data={satisfactionHistory.slice(-6)}
            />
            <PerformanceKPICard />
        </div>
    );
};

const StoreDetailPreview: React.FC = () => {
    const { storeData, comments } = useData();
    const sampleStore = useMemo(() => storeData.find(s => s.feedbackCount > 10) || storeData[0], [storeData]);
    const storeComments = useMemo(() => comments.filter(c => c.store === sampleStore?.name), [comments, sampleStore]);

    if (!sampleStore) return <p>Örnek mağaza verisi bulunamadı.</p>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="dashboard-grid-3col" style={{ gap: '1rem' }}>
                <StatCard icon="sentiment_satisfied" title="Memnuniyet" value={`${sampleStore.satisfaction.toFixed(2)} / 5`} />
                <StatCard icon="rate_review" title="Geri Bildirim" value={sampleStore.feedbackCount.toString()} />
                <StatCard icon="checklist" title="Aksiyon Bekleyen" value={"3"} />
            </div>
            <WordCloudCard comments={storeComments} setKeywordFilter={() => {}} activeKeyword="" />
        </div>
    );
};

const AnalyticsPreview: React.FC = () => {
    const { comments } = useData();
    const categoryTrends = useMemo(() => {
        const trendsByMonth: { [key: string]: { [key: string]: number } } = {};
        const monthOrder = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
        const categories = new Set<string>();
        comments.forEach(c => {
            if (c.month && c.category) {
                if (!trendsByMonth[c.month]) trendsByMonth[c.month] = {};
                trendsByMonth[c.month][c.category] = (trendsByMonth[c.month][c.category] || 0) + 1;
                categories.add(c.category);
            }
        });

        const topCategories = Array.from(categories).slice(0, 4);
        const trendData = monthOrder.filter(m => trendsByMonth[m]).map(month => {
            const row: any = { name: month.substring(0,3) };
            topCategories.forEach(cat => {
                row[cat] = trendsByMonth[month]?.[cat] || 0;
            });
            return row;
        });

        return { data: trendData, keys: topCategories };
    }, [comments]);
    
    return (
        <MultiLineChartCard 
            title="Aylık Geri Bildirim Kategori Trendleri"
            data={categoryTrends.data}
            xAxisKey="name"
            dataKeys={categoryTrends.keys}
        />
    );
};

const guideSections = [
    {
        id: 'dashboard',
        title: 'Ana Sayfa: Şirketin Nabzı',
        icon: 'dashboard',
        description: 'Ana Sayfa, şirketinizin genel çalışan memnuniyeti sağlığını tek bir ekranda görmenizi sağlar. Buradaki grafikler ve metrikler sayesinde <strong>önemli trendleri anında yakalayabilir</strong> ve proaktif kararlar alabilirsiniz. Sağ üstteki filtre ile verileri bölge bazında daraltabilirsiniz.',
        link: { to: '/dashboard', text: 'Ana Sayfaya Git' },
        ContentComponent: DashboardPreview
    },
    {
        id: 'stores',
        title: 'Mağaza Detay Sayfası',
        icon: 'storefront',
        description: 'Her mağazanın kendi özel sayfasına giderek detaylı bir analiz yapabilirsiniz. Bu sayfada, mağazanın memnuniyet karnesini, <strong>aksiyon bekleyen yorumları</strong>, aylık turnover geçmişini ve o mağazaya özel <strong>öne çıkan anahtar kelimeleri</strong> bulabilirsiniz. Yorumlara aksiyon alabilir ve reaksiyon verebilirsiniz.',
        link: { to: '/stores', text: 'Mağaza Listesine Git' },
        ContentComponent: StoreDetailPreview
    },
    {
        id: 'analytics',
        title: 'Stratejik Analizler',
        icon: 'monitoring',
        description: 'Analizler sayfası, verileri daha geniş bir perspektiften incelemenizi sağlar. <strong>Duygu ve kategori trendlerini</strong> zaman içinde izleyerek dönemsel etkileri ölçebilir, anahtar kelime analizi ile belirli konuların (örn: "maaş") aylar içindeki duygu değişimini görebilirsiniz.',
        link: { to: '/analytics', text: 'Analiz Sayfasına Git' },
        ContentComponent: AnalyticsPreview
    },
    {
        id: 'ai',
        title: 'Yapay Zeka Analizi',
        icon: 'auto_awesome',
        description: "Platformun en güçlü özelliklerinden biri olan Yapay Zeka Analizi, verilerinizi yorumlayarak size doğrudan eyleme geçirilebilir içgörüler sunar. <strong>Odaklanılması gereken sorunlu mağazaları</strong>, kök nedenlerini, <strong>turnover riski taşıyan noktaları</strong> ve başarılı mağazaların sırlarını otomatik olarak tespit eder.",
        link: { to: '/dashboard', text: 'Ana Sayfaya Git' },
        ContentComponent: () => <AIInsightsCard defaultTab="focus" storeData={useData().storeData} comments={useData().comments} />
    },
    {
        id: 'reports',
        title: 'Raporlama ve Dışa Aktarım',
        icon: 'assessment',
        description: 'Raporlar sayfası, sunuma hazır çıktılar oluşturmak için tasarlanmıştır. Belirlediğiniz filtrelere (yönetici, hafta, anahtar kelime vb.) göre anında <strong>profesyonel PDF raporları</strong> oluşturabilir veya aksiyon takibi için yorum listelerini <strong>detaylı Excel dosyaları</strong> olarak dışa aktarabilirsiniz.',
        link: { to: '/reports', text: 'Raporlar Sayfasına Git' },
        ContentComponent: null
    },
    {
        id: 'upload',
        title: 'Veri Yükleme',
        icon: 'upload_file',
        description: 'Bu bölümden, elinizdeki Excel formatındaki geri bildirim ve aylık turnover verilerini sisteme kolayca yükleyebilirsiniz. Platform, yüklediğiniz dosyaları otomatik olarak işler, analiz eder ve görsel panellere yansıtır. Yalnızca yetkili kullanıcılar veri yükleyebilir.',
        link: { to: '/upload', text: 'Veri Yükleme Sayfasına Git' },
        ContentComponent: null
    }
];


const GuidePage: React.FC = () => {
    return (
        <MainLayout>
            <div className="content-container guide-container">
                <div className="page-header" style={{flexDirection: 'column', alignItems: 'center', textAlign: 'center'}}>
                    <p className="page-title">Uygulama Kullanım Kılavuzu</p>
                    <p className="page-subtitle">Platformun özelliklerini ve yeteneklerini keşfedin.</p>
                </div>

                {guideSections.map(section => (
                    <div key={section.id} className="guide-section-card">
                        <div className="guide-section-header">
                            <span className="material-symbols-outlined">{section.icon}</span>
                            <h2>{section.title}</h2>
                        </div>
                        <div className="guide-section-body">
                            <div className="guide-section-description">
                                <p dangerouslySetInnerHTML={{ __html: section.description }} />
                                {section.link && (
                                    <Link to={section.link.to} className="btn btn-secondary" style={{marginTop: '1rem'}}>
                                        {section.link.text}
                                        <span className="material-symbols-outlined">arrow_forward</span>
                                    </Link>
                                )}
                            </div>
                            <div className="guide-section-content">
                                {section.ContentComponent ? <section.ContentComponent /> : (
                                    <div className="placeholder-card" style={{minHeight: '200px', background: 'var(--app-bg-color)'}}>
                                        <span className="material-symbols-outlined placeholder-icon" style={{fontSize: '3rem'}}>
                                            {section.icon}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </MainLayout>
    );
};

export default GuidePage;
