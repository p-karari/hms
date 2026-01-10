// src/pages/dashboard/patients/PatientsListPage.tsx
'use client';

import ActiveVisitDashboard from '@/components/patients/PatientList';
import React, { useState } from 'react';

const PatientsListPage: React.FC = () => {
  const [currentQuery] = useState<string>('');

  

  return (
    <div className="max-w-8xl mx-auto p-4 space-y-4">
      {/* Patient List Component */}
      <ActiveVisitDashboard searchTerm={currentQuery} />
      
    </div>
  );
};

export default PatientsListPage;