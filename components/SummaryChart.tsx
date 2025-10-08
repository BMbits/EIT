
import React from 'react';
import { SummaryData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ChartIcon, StarIcon } from './icons';

interface SummaryChartProps {
  data: SummaryData[];
  topSymbols: string[];
}

const CustomTooltip = ({ active, payload, label, topSymbols }: any) => {
  if (active && payload && payload.length) {
    const isTopSymbol = topSymbols.includes(label);
    return (
      <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-lg">
        <p className="font-bold text-white flex items-center gap-1.5">
          {isTopSymbol && <StarIcon className="w-4 h-4 text-yellow-400" />}
          {label}
        </p>
        <p className={`${isTopSymbol ? 'text-yellow-400' : 'text-blue-400'}`}>{`Total Value: ₹${payload[0].value.toLocaleString('en-IN')}`}</p>
      </div>
    );
  }
  return null;
};

const SummaryChart: React.FC<SummaryChartProps> = ({ data, topSymbols }) => {
  const highlightColor = '#facc15'; // Tailwind 'warning' color
  const defaultColor = '#3b82f6'; // Tailwind 'accent' color

  return (
    <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-gray-700 h-full">
      <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
        <ChartIcon className="w-6 h-6" />
        Top 15 Symbols by Transaction Value
      </h2>
      <p className="text-sm text-gray-400 mb-6">Aggregated value of all transactions per stock symbol. AI-highlighted symbols are in yellow.</p>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
            <XAxis dataKey="symbol" tick={{ fill: '#a0aec0', fontSize: 12 }} />
            <YAxis 
              tick={{ fill: '#a0aec0', fontSize: 12 }} 
              tickFormatter={(value) => new Intl.NumberFormat('en-IN', { notation: 'compact', compactDisplay: 'short' }).format(Number(value))}
              width={100}
            />
            <Tooltip content={<CustomTooltip topSymbols={topSymbols} />} cursor={{ fill: 'rgba(250, 204, 21, 0.1)' }} />
            <Legend wrapperStyle={{fontSize: "14px"}} />
            <Bar dataKey="totalValue" name="Total Value (INR)">
              {data.map((entry) => (
                <Cell key={`cell-${entry.symbol}`} fill={topSymbols.includes(entry.symbol) ? highlightColor : defaultColor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SummaryChart;
