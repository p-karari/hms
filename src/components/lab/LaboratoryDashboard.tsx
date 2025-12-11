// components/laboratory/LaboratoryDashboard.tsx
'use client';

import { useState } from 'react';
import DateRangeFilter from './DateRangeFilter';
import LabStatsCards from './LabStatsCards';
import LabTabs from './LabTabs';
import OrdersTable from './OrdersTable';
import SearchBar from './SearchBar';


interface LaboratoryDashboardProps {
  initialCounts: {
    ordered: number;
    inProgress: number;
    completed: number;
    declined: number;
  };
  initialDateRange: {
    start: Date;
    end: Date;
  };
}

type OrderStatus = 'IN_PROGRESS' | 'COMPLETED' | 'DECLINED' | null;

export default function LaboratoryDashboard({ 
  initialCounts, 
  initialDateRange 
}: LaboratoryDashboardProps) {
  const [activeTab, setActiveTab] = useState<OrderStatus>(null);
  const [dateRange, setDateRange] = useState(initialDateRange);
  const [searchQuery, setSearchQuery] = useState('');
  const [counts, setCounts] = useState(initialCounts);
  
  const currentCount = activeTab === null ? counts.ordered :
                     activeTab === 'IN_PROGRESS' ? counts.inProgress :
                     activeTab === 'COMPLETED' ? counts.completed :
                     counts.declined;
  
  const tabLabels = {
    null: 'Tests ordered',
    'IN_PROGRESS': 'Worklist',
    'COMPLETED': 'Completed',
    'DECLINED': 'Declined tests'
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Clinic Laboratory</h1>
      </div>
      
      {/* Stats Cards */}
      <LabStatsCards 
        counts={counts}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      {/* Tabs */}
      <LabTabs 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <DateRangeFilter 
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <SearchBar 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
      </div>
      
      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <OrdersTable 
          status={activeTab}
          dateRange={dateRange}
          searchQuery={searchQuery}
          onCountsUpdate={setCounts}
        />
      </div>
    </div>
  );
}