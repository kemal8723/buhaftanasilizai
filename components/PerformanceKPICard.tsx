import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LabelList, PieChart, Pie, Cell } from 'recharts';
import { useData } from '../DataContext';
import { Comment, StoreData } from '../types';

const DONUT_COLORS = ['#A0AEC0', '#718096', '#4A5568'];

const CustomDonutLegend: React.FC<{ data: { name: string; value: number }[] }> = ({ data }) => {
    return (
        <ul className="kpi-donut-legend">
            {data.map((entry, index) => (
                <li key={`item-${index}`} className="kpi-donut-legend-item">
                    <span className="kpi-donut-legend-color" style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }} />
                    <span>{entry.name}: {entry.value.toLocaleString('tr-TR')}</span>
                </li>
            ))}
        </ul>
    );
};


const PerformanceKPICard: React.FC = () => {
    const { currentUser, comments, storeData, getManagerForStore, getSomForStore, soms, managers, getManagersForSom } = useData();

    const performanceData = useMemo(() => {
        if (!currentUser) return null;

        let chartData: { name: string; fullName: string; score: number }[] = [];
        let surveyCounts: { name: string; count: number }[] = [];
        let donutData: { name: string; value: number }[] = [];
        let title = "";
        let yAxisWidth = 80;

        const calculateDonutData = (relevantComments: Comment[]) => {
            const categoryCounts: { [key: string]: number } = {};
            relevantComments.forEach(c => {
                const { category } = c;
                let mappedCategory: string;
                if (category === "Maaş & Yan Haklar") mappedCategory = "Finansal konular";
                else if (category === "Operasyon & Fiziksel Şartlar") mappedCategory = "Mağazam ile ilgili";
                else if (["Yönetim & Liderlik", "İş Yükü & Denge", "Ekip İlişkileri & Kültür", "Kariyer & Gelişim", "Genel"].includes(category)) {
                    mappedCategory = "Kişisel konular";
                } else {
                    mappedCategory = "Diğer";
                }
                categoryCounts[mappedCategory] = (categoryCounts[mappedCategory] || 0) + 1;
            });
            return Object.entries(categoryCounts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 3);
        };
        
        if (['Direktör', 'İnsan Kaynakları', 'Yönetici'].includes(currentUser.role)) {
            title = "SOM Aylık Ortalama Puan";
            const relevantSoms = soms.filter(s => s !== 'Tümü');
            
            const storesBySom = new Map<string, StoreData[]>();
            storeData.forEach(s => {
                const som = getSomForStore(s.name);
                if (som) {
                    if (!storesBySom.has(som)) storesBySom.set(som, []);
                    storesBySom.get(som)!.push(s);
                }
            });

            chartData = relevantSoms.map(som => {
                const somStores = storesBySom.get(som) || [];
                const totalScore = somStores.reduce((acc, s) => acc + s.satisfaction, 0);
                const avgScore = somStores.length > 0 ? totalScore / somStores.length : 0;
                return { name: som.split(' ').slice(0,-1).join(' '), fullName: som, score: avgScore };
            }).sort((a,b) => b.score - a.score);

            const commentsBySom = new Map<string, number>();
            comments.forEach(c => {
                const som = getSomForStore(c.store);
                if (som) {
                    commentsBySom.set(som, (commentsBySom.get(som) || 0) + 1);
                }
            });
            surveyCounts = chartData.map(cd => ({ name: cd.fullName, count: commentsBySom.get(cd.fullName) || 0 }));
            donutData = calculateDonutData(comments);

        } else if (currentUser.role === 'Satış Operasyon Müdürü') {
            title = "Bölge Müdürü Aylık Ortalama Puan";
            const myManagers = getManagersForSom(currentUser.name);

            const storesByManager = new Map<string, StoreData[]>();
            storeData.forEach(s => {
                const manager = getManagerForStore(s.name);
                if (manager && myManagers.includes(manager)) {
                    if (!storesByManager.has(manager)) storesByManager.set(manager, []);
                    storesByManager.get(manager)!.push(s);
                }
            });
            
            chartData = myManagers.map(manager => {
                const managerStores = storesByManager.get(manager) || [];
                const totalScore = managerStores.reduce((acc, s) => acc + s.satisfaction, 0);
                const avgScore = managerStores.length > 0 ? totalScore / managerStores.length : 0;
                return { name: manager.split(' ').slice(0,-1).join(' '), fullName: manager, score: avgScore };
            }).sort((a,b) => b.score - a.score);
            
            const myStoreNames = new Set(storeData.filter(s => myManagers.includes(getManagerForStore(s.name) || '')).map(s => s.name));
            const myComments = comments.filter(c => myStoreNames.has(c.store));

            const commentsByManager = new Map<string, number>();
            myComments.forEach(c => {
                const manager = getManagerForStore(c.store);
                if (manager) {
                    commentsByManager.set(manager, (commentsByManager.get(manager) || 0) + 1);
                }
            });
            surveyCounts = chartData.map(cd => ({ name: cd.fullName, count: commentsByManager.get(cd.fullName) || 0 }));
            donutData = calculateDonutData(myComments);

        } else if (currentUser.role === 'Bölge Müdürü') {
            title = "Mağaza Aylık Ortalama Puan";
            yAxisWidth = 120;
            // The storeData from context is already filtered for the BM. No need to filter again.
            const myStores = storeData;

            chartData = myStores.map(store => ({
                name: store.name,
                fullName: store.name,
                score: store.satisfaction,
            })).sort((a,b) => b.score - a.score);

            // Comments are also pre-filtered in the context.
            const myComments = comments;
            const commentsByStore = new Map<string, number>();
            myComments.forEach(c => {
                commentsByStore.set(c.store, (commentsByStore.get(c.store) || 0) + 1);
            });
            surveyCounts = chartData.map(cd => ({ name: cd.fullName, count: commentsByStore.get(cd.fullName) || 0 }));
            donutData = calculateDonutData(myComments);
        }

        if (chartData.length === 0 && surveyCounts.length === 0 && donutData.length === 0) {
            return null;
        }

        return { chartData, surveyCounts, donutData, title, yAxisWidth };
    }, [currentUser, comments, storeData, getManagerForStore, getSomForStore, soms, managers, getManagersForSom]);

    if (!performanceData) {
        return (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p className="placeholder-text">Bu görünüm için KPI verisi bulunmuyor.</p>
            </div>
        );
    }

    const { chartData, surveyCounts, donutData, title, yAxisWidth } = performanceData;

    return (
        <div className="card performance-kpi-card">
            <div>
                <h3 className="kpi-title-main">{title}</h3>
                <div className="kpi-bar-chart-wrapper">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                            <XAxis type="number" hide domain={[0, 5]} />
                            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={yAxisWidth} interval={0} />
                            <Bar dataKey="score" fill="#2DD4BF" barSize={25} radius={[0, 10, 10, 0]}>
                                <LabelList 
                                    dataKey="score" 
                                    position="right" 
                                    formatter={(value: number) => value > 0 ? value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="kpi-bottom-section">
                <div>
                    <h4 className="kpi-title-sub">
                        <span className="material-symbols-outlined">attach_file</span>
                        En Çok Anket Alan Kategori
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', height: 'calc(100% - 2rem)' }}>
                        <ResponsiveContainer width="40%" height="100%">
                            <PieChart>
                                <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={5}>
                                    {donutData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ width: '60%' }}>
                            <CustomDonutLegend data={donutData} />
                        </div>
                    </div>
                </div>
                <div>
                    <h4 className="kpi-title-sub">
                        <span className="material-symbols-outlined">attach_file</span>
                        Anket Adetleri
                    </h4>
                    <ul className="kpi-list">
                        {surveyCounts.map(item => (
                            <li key={item.name} className="kpi-list-item">
                                <span className="name">{item.name}:</span>
                                <span className="count">{item.count.toLocaleString('tr-TR')}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default PerformanceKPICard;