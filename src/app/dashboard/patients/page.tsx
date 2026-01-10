// src/pages/dashboard/patients/PatientsListPage.tsx
'use client';

import ActiveVisitDashboard from '@/components/patients/PatientList';
import Link from 'next/link';
import React, { useState } from 'react';

const PatientsListPage: React.FC = () => {
  const [currentQuery] = useState<string>('');

  
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