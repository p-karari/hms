'use client';

import ConsumptionReport from '@/components/stockManagement/ConsumptionReport';
import ExpiryReport from '@/components/stockManagement/ExpiryReport';
import ReconciliationReport from '@/components/stockManagement/ReconciliationReport';
import {
  AlertTriangle,
  Calendar,
  Download,
  TrendingUp
} from 'lucide-react';
import { useState } from 'react';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'expiry' | 'consumption' | 'reconciliation'>('expiry');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  // const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'expiry', label: 'Expiry Report', icon: Calendar, component: ExpiryReport },
    { id: 'consumption', label: 'Consumption Analytics', icon: TrendingUp, component: ConsumptionReport },
    { id: 'reconciliation', label: 'Reconciliation', icon: AlertTriangle, component: ReconciliationReport },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  const handleExport = () => {
    // Export logic based on active tab
    console.log(`Exporting ${activeTab} report`);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Reports</h1>
          <p className="text-gray-600 mt-1">Analytics and insights for inventory management</p>
        </div>
        
        <div className="flex space-x-3">
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}