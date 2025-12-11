// components/laboratory/LabTabs.tsx
'use client';

import { OrderStatus } from "@/lib/lab/lab-order";


interface LabTabsProps {
  activeTab: OrderStatus;
  onTabChange: (status: OrderStatus) => void;
}

export default function LabTabs({ activeTab, onTabChange }: LabTabsProps) {
  const tabs = [
    { id: null as OrderStatus, label: 'Tests ordered' },
    { id: 'IN_PROGRESS' as OrderStatus, label: 'In progress' },
    { id: 'COMPLETED' as OrderStatus, label: 'Completed' },
    { id: 'DECLINED' as OrderStatus, label: 'Declined tests' },
  ];

  return (
    <div className="flex space-x-1 border-b border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.label}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}