import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface DistributionData {
    name: string;
    value: number;
}

interface SatisfactionDistributionCardProps {
    title: string;
    data: DistributionData[];
    tooltipValueSuffix?: string;
}

const COLORS = ['#00A99D', '#E5007E', '#FFC72C', '#3498DB', '#9B59B6', '#F1C40F', '#E74C3C', '#2ECC71'];

const SatisfactionDistributionCard: React.FC<SatisfactionDistributionCardProps> = ({ title, data, tooltipValueSuffix }) => {
    return (
        <div className="card chart-card">
            <div className="card-header">
                <h3 className="card-title">{title}</h3>
            </div>
            <div className="chart-container" style={{ minHeight: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={90}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                            nameKey="name"
                            labelLine={false}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            formatter={(value) => `${value} ${tooltipValueSuffix || ''}`.trim()}
                            contentStyle={{
                                backgroundColor: 'var(--card-bg-color)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--border-radius)',
                            }}
                        />
                        <Legend iconType="circle" verticalAlign="bottom" height={50} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default SatisfactionDistributionCard;
