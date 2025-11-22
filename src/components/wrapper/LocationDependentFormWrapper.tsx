'use client';

import React, { useContext } from 'react';
import { SessionContext } from '../../lib/context/session-context';
import { AlertTriangle, MapPin, Hospital } from 'lucide-react';
import VitalsFormFields from '../vitals/VitalsFormFields';

interface ConceptUuids {
  WEIGHT: string;
  HEIGHT: string;
  TEMP: string;
  SYSTOLIC_BP: string;
  DIASTOLIC_BP: string;
  PULSE: string;
  RESP_RATE: string;
}

interface LocationWrapperProps {
  patientUuid: string;
  providerUuid: string;
  encounterTypeUuid: string;
  conceptUuids: ConceptUuids;
  encounterRoleUuid: string;

  activeVisitUuid: string | null; 
}



export default function LocationDependentFormWrapper({
  patientUuid,
  providerUuid,
  encounterTypeUuid,
  conceptUuids,
  encounterRoleUuid,

  activeVisitUuid,
}: LocationWrapperProps) {
  const { sessionLocation, isAuthenticated } = useContext(SessionContext);
  


  const locationUuid = sessionLocation?.uuid;
  const isSessionReady = isAuthenticated !== undefined;
  const isVisitActive = !!activeVisitUuid;


  if (!isSessionReady) {
    return (
      <div className="p-6 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-xl flex items-center shadow-md">
        <p className="font-semibold">Loading session data...</p>
      </div>
    );
  }

  if (!isAuthenticated) {

    return (
      <div className="p-6 bg-red-100 border border-red-400 text-red-800 rounded-xl">
        <p>Authentication check failed. Please log in.</p>
      </div>
    );
  }

  if (!locationUuid) {

    return (
      <div className="p-8 max-w-lg mx-auto bg-red-100 border-l-4 border-red-500 text-red-800 rounded-xl shadow-lg mt-10">
        <h2 className="text-2xl font-bold mb-3 flex items-center">
          <AlertTriangle className="w-6 h-6 mr-2" />
          Location Required
        </h2>
        <p className="mb-4">
          The current user session does not have a clinic location set.
        </p>
        <p className="font-semibold flex items-center">
          <MapPin className="w-5 h-5 mr-2" />
          Current Status: {sessionLocation?.display || 'Not Set'}
        </p>
      </div>
    );
  }

  if (!isVisitActive) {
    return (
      <div className="p-8 max-w-lg mx-auto bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-xl shadow-lg mt-10">
        <h2 className="text-2xl font-bold mb-3 flex items-center">
          <Hospital className="w-6 h-6 mr-2" />
          No Active Visit
        </h2>
        <p className="mb-4">
          This patient currently has no active visit. Please start one before
          recording vitals.
        </p>
      </div>
    );
  }


  return (
    <VitalsFormFields
      patientUuid={patientUuid}
      providerUuid={providerUuid}
      locationUuid={locationUuid}
      encounterTypeUuid={encounterTypeUuid}
      conceptUuids={conceptUuids}
      activeVisitUuid={activeVisitUuid} 
      encounterRoleUuid={encounterRoleUuid}
    />
  );
}