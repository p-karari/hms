// src/lib/context/patient-dashboard-context.tsx
'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { Visit } from '@/lib/patients/manageVisits'; // Ensure this uses the unified type

interface PatientDashboardContextType {
  activeVisit: Visit | null;
  onActionComplete: () => void;
}

const PatientDashboardContext = createContext<PatientDashboardContextType | undefined>(undefined);

export const usePatientDashboard = () => {
  const context = useContext(PatientDashboardContext);
  if (context === undefined) {
    throw new Error('usePatientDashboard must be used within a PatientDashboardProvider');
  }
  return context;
};

interface PatientDashboardProviderProps extends PatientDashboardContextType {
  children: ReactNode;
}

// This provider component will wrap the entire page content.
export const PatientDashboardProvider: React.FC<PatientDashboardProviderProps> = ({ 
  children, 
  activeVisit, 
  onActionComplete 
}) => {
  const value = { activeVisit, onActionComplete };
  return (
    <PatientDashboardContext.Provider value={value}>
      {children}
    </PatientDashboardContext.Provider>
  );
};