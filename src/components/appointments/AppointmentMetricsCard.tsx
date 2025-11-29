// AppointmentMetricsCard.tsx

import React from 'react';

interface MetricCardProps {
    title: string;
    value: string | number;
    footerText: string;
}

const AppointmentMetricsCard: React.FC<MetricCardProps> = ({ title, value, footerText }) => {
    return (
        <div className="bg-white p-4 rounded-lg shadow-md border-t-4 border-indigo-500">
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
            <p className="text-xs text-gray-400 mt-2">{footerText}</p>
        </div>
    );
};

export default AppointmentMetricsCard;