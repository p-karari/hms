// src/pages/dashboard/patients/PatientsListPage.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
// Assuming the path to your search input component
import { PatientSearchInput } from '@/components/patients/PatietnsSearch'; 
// Renaming import to match the actual component name we generated previously
import ActiveVisitDashboard from '@/components/patients/PatientList'; 

const PatientsListPage: React.FC = () => {
  // State to hold the current query passed to the PatientList. 
  // Default is an empty string, which ActiveVisitDashboard will treat as 'no search'.
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false); 

  // Handler passed to the input component to update the search term
  const handleSearchSubmit = (query: string) => {
    setIsSearching(true);
    // The ActiveVisitDashboard component handles the actual fetching with a debounce built-in.
    setCurrentQuery(query);
    setTimeout(() => setIsSearching(false), 500); // Simulate brief search delay
  };
  
  // Determine the display message based on the current query
  const getDisplayMessage = () => {
      // If the query is empty or just whitespace, we are in the default view
      if (currentQuery.trim() === '') {
          return 'Currently displaying: Active Patients (Default Dashboard)';
      }
      return `Displaying search results for: "${currentQuery}"`;
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      
      {/* Page Header and Registration Link */}
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Patient Management</h1>
        <Link 
          href="/dashboard/patients/register"
          className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg shadow-md hover:bg-green-700 transition duration-150 flex items-center"
        >
          <span className="text-xl mr-2">+</span> Register New Patient
        </Link>
      </div>

      {/* Search Input Area */}
      <PatientSearchInput onSearch={handleSearchSubmit} isSearching={isSearching} />

      {/* Status Message */}
      <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded-md border border-gray-200">
        {getDisplayMessage()}
      </div>

      {/* Patient List Component - Now ActiveVisitDashboard */}
      <div className="mt-6">
        <ActiveVisitDashboard 
          // The component expects only 'searchTerm'
          searchTerm={currentQuery} 
        />
      </div>
      
    </div>
  );
};

export default PatientsListPage;