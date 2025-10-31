'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import MedicationDashboard from '@/components/medications/MedicationDashboard';
import PatientDetails from '@/components/patients/PatientDetails';
import { getPatientDetails } from '@/lib/patients/getPatientDetails';
import { getPatientActiveVisit } from '@/lib/visits/getActiveVisit';
import { Visit } from '@/lib/patients/manageVisits';
import { PatientDashboardProvider } from '@/components/context/patient-dashboard-context';

const MedicationPage: React.FC = () => {
  const params = useParams();
  const patientUuid = params.uuid as string;

  const [patientDetails, setPatientDetails] = useState<any>(null);
  const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [isLoadingVisit, setIsLoadingVisit] = useState(true);

  // --- Fetch patient details ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const details = await getPatientDetails(patientUuid);
        setPatientDetails(details);
      } catch (error) {
        console.error('Failed to fetch patient details:', error);
      }
    };
    if (patientUuid) fetchData();
  }, [patientUuid]);

  // --- Fetch active visit ---
  useEffect(() => {
    const fetchActiveVisitStatus = async () => {
      setIsLoadingVisit(true);
      try {
        const visit = await getPatientActiveVisit(patientUuid);
        setActiveVisit(visit);
      } catch (error) {
        console.error('Failed to fetch active visit status:', error);
      } finally {
        setIsLoadingVisit(false);
      }
    };
    if (patientUuid) fetchActiveVisitStatus();
  }, [patientUuid, dataVersion]);

  const handleActionComplete = useCallback(() => {
    setDataVersion(prev => prev + 1);
  }, []);

  // const handleActiveVisitChange = useCallback((visit: Visit | null) => {
  //   setActiveVisit(visit);
  // }, []);

  // const patientName = patientDetails?.display || 'Patient Records';
  const hasKnownAllergies = patientDetails?.hasAllergies || false;

  return (
    <PatientDashboardProvider
      activeVisit={activeVisit}
      onActionComplete={handleActionComplete}
    >
      <div className="space-y-6 container mx-auto p-4 md:p-8">


        {/* 2. Patient Details Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <PatientDetails
            patientUuid={patientUuid}
            activeVisit={activeVisit}
            onActionComplete={handleActionComplete}
          />
        </div>

        {/* 3. Active Visit Banner */}
        {isLoadingVisit ? (
          <div className="p-3 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 animate-pulse">
            Checking active visit status...
          </div>
        ) : activeVisit ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <div className="text-sm">
              <span className="font-medium text-green-900">Active Visit: </span>
              <span className="text-green-700">
                {activeVisit.visitType.display} •{' '}
                {new Date(activeVisit.startDatetime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            No active visit. Start a new one to begin clinical actions.
          </div>
        )}

        {/* 4. Medication Dashboard */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <MedicationDashboard
            patientUuid={patientUuid}
            hasKnownAllergies={hasKnownAllergies}
          />
        </div>
      </div>
    </PatientDashboardProvider>
  );
};

export default MedicationPage;
