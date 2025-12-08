'use client';

import { useState } from 'react';
import { FileText, CreditCard, Package, Shield, AlertTriangle } from 'lucide-react';
import BillsHistoryTab from '@/components/billing/patientBilling/BillsHistoryTab';
import InsuranceTab from '@/components/billing/patientBilling/InsuranceTab';
import PaymentHistoryTab from '@/components/billing/patientBilling/PaymentHistoryTab';
import ServiceCatalogTab from '@/components/billing/patientBilling/ServiceCatalogTab';

interface PatientBillingPageProps {
  patientUuid: string;
  patientId: number | null; 
  patientName: string;
}

const tabs = [
  { id: 'bills', label: 'Bills History', icon: FileText },
  { id: 'payments', label: 'Payment History', icon: CreditCard },
  { id: 'services', label: 'Service Catalog', icon: Package },
  { id: 'insurance', label: 'Insurance', icon: Shield },
];

export default function PatientBillingPage({
  patientUuid,
  patientId,
  patientName
}: PatientBillingPageProps) {
  const [activeTab, setActiveTab] = useState('bills');

  // Guard clause to handle missing numeric ID (failure from Server Component)
  if (patientId === null) {
    return (
      <div className="flex items-center justify-center h-48 bg-red-50 border border-red-200 rounded-lg p-6 my-6">
        <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
        <p className="text-red-800 font-medium">
          Error: Patient data is missing. Cannot load billing history. (UUID: {patientUuid})
        </p>
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'bills':
        return <BillsHistoryTab patientUuid={patientUuid} />;
      case 'payments':
        return <PaymentHistoryTab patientUuid={patientUuid} />; // Updated to use patientUuid
      case 'services':
        return <ServiceCatalogTab />;
      case 'insurance':
        return <InsuranceTab patientId={patientId} />; // Insurance still uses numeric ID
      default:
        return <BillsHistoryTab patientUuid={patientUuid} />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Billing & Financial History</h1>
        <p className="text-gray-600 mt-1">
          {patientName} • ID: {patientUuid}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors
                  ${isActive 
                    ? 'bg-white border-t border-l border-r border-gray-200 text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {renderTab()}
      </div>
    </div>
  );
}