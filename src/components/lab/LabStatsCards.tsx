// components/laboratory/LabStatsCards.tsx
'use client';

import { OrderStatus } from "@/lib/lab/lab-order";


interface LabStatsCardsProps {
  counts: {
    ordered: number;
    inProgress: number;
    completed: number;
    declined: number;
  };
  activeTab: OrderStatus;
  onTabChange: (status: OrderStatus) => void;
}

export default function LabStatsCards({ 
  counts, 
  activeTab, 
  onTabChange 
}: LabStatsCardsProps) {
  const stats = [
    { 
      label: 'Tests ordered', 
      value: counts.ordered, 
      status: null as OrderStatus,
      description: 'Orders'
    },
    { 
      label: 'Worklist', 
      value: counts.inProgress, 
      status: 'IN_PROGRESS' as OrderStatus,
      description: 'In progress'
    },
    { 
      label: 'Results', 
      value: counts.completed, 
      status: 'COMPLETED' as OrderStatus,
      description: 'Completed'
    },
    { 
      label: 'Declined tests', 
      value: counts.declined, 
      status: 'DECLINED' as OrderStatus,
      description: 'Declined'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <button
          key={stat.label}
          onClick={() => onTabChange(stat.status)}
          className={`bg-white p-4 rounded-lg shadow-sm border-2 transition-all ${
            activeTab === stat.status 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-800">{stat.label}</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}