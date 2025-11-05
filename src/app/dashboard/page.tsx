// src/pages/dashboard/patients/PatientsListPage.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PatientSearchInput } from '@/components/patients/PatietnsSearch'; 
import ActiveVisitDashboard from '@/components/patients/PatientList'; 

const PatientsListPage: React.FC = () => {
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false); 

  const handleSearchSubmit = (query: string) => {
    setIsSearching(true);
    setCurrentQuery(query);
    setTimeout(() => setIsSearching(false), 500);
  };
  
  const getDisplayMessage = () => {
      if (currentQuery.trim() === '') {
          return 'Active Patients';
      }
      return `Search: "${currentQuery}"`;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      
      {/* Page Header and Registration Link */}
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold text-gray-900">Patients</h1>
        <Link 
          href="/dashboard/patients/register"
          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
        >
          + Register Patient
        </Link>
      </div>

      {/* Search Input Area */}
      <PatientSearchInput onSearch={handleSearchSubmit} isSearching={isSearching} />

      {/* Status Message */}
      <div className="text-sm text-gray-600">
        {getDisplayMessage()}
      </div>

      {/* Patient List Component */}
      <ActiveVisitDashboard searchTerm={currentQuery} />
      
    </div>
  );
};

export default PatientsListPage;