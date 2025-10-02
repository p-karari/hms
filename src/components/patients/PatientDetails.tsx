'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getPatientDetails, PatientDetailsType, Identifier } from '@/lib/patients/getPatientDetails';

interface PatientDetailsProps {
  patientUuid: string;
}

// Helper function to find the preferred identifier
const getPrimaryIdentifier = (identifiers: Identifier[]): Identifier | undefined => {
  return identifiers.find(id => id.preferred) || identifiers[0];
};

// Helper function to find the preferred name
const getPreferredName = (person: PatientDetailsType['person']): string => {
    const preferred = person.names.find(name => name.preferred);
    if (preferred) {
        return `${preferred.givenName} ${preferred.familyName}`;
    }
    return `${person.names[0]?.givenName || ''} ${person.names[0]?.familyName || ''}`.trim();
};

const PatientDetails: React.FC<PatientDetailsProps> = ({ patientUuid }) => {
  const [patient, setPatient] = useState<PatientDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const details = await getPatientDetails(patientUuid);
      setPatient(details);
      if (!details) {
        setError('Patient record not found.');
      }
    } catch (err) {
      setError('Failed to load patient details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [patientUuid]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  if (loading) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg flex justify-center items-center">
        <p className="text-gray-600">Loading Patient Details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-100 border border-red-300 rounded-lg">
        <p>{error}</p>
        <button onClick={fetchDetails} className="mt-2 text-sm underline">
          Retry
        </button>
      </div>
    );
  }

  if (!patient) {
    return <p className="p-4 text-gray-700">No patient data available.</p>;
  }
  
  const primaryId = getPrimaryIdentifier(patient.identifiers);
  const preferredName = getPreferredName(patient.person);
  if (patient.addresses) {
    
  }
  const addresses = patient.addresses || [];
  const primaryAddress = addresses.find(addr => addr.preferred) || addresses[0];

  return (
    <div className="bg-white shadow-xl rounded-lg p-6 mb-6 border-t-4 border-indigo-600">
      <div className="flex justify-between items-center mb-4 border-b pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900">{preferredName}</h1>
        {patient.isDead && (
          <span className="px-3 py-1 text-sm font-bold text-white bg-red-600 rounded-full uppercase">
            Deceased
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
        {/* Column 1: Core Demographics */}
        <div className="space-y-2">
          <p className="font-semibold text-gray-700">Gender: <span className="font-normal text-gray-900">{patient.gender}</span></p>
          <p className="font-semibold text-gray-700">Age: <span className="font-normal text-gray-900">{patient.age || 'N/A'}</span></p>
          <p className="font-semibold text-gray-700">Birthdate: <span className="font-normal text-gray-900">{new Date(patient.birthdate).toLocaleDateString()}</span></p>
          {patient.birthdateEstimated && (
            <p className="text-xs text-orange-600 italic"> (Estimated)</p>
          )}
        </div>

        {/* Column 2: Identifiers */}
        <div className="space-y-2 border-l pl-6">
          <p className="text-lg font-semibold text-indigo-700 mb-2">Identifiers</p>
          {primaryId && (
            <p className="font-semibold text-gray-700">Primary ID: <span className="font-bold text-indigo-600">{primaryId.identifier}</span></p>
          )}
          {patient.identifiers.filter(id => id.uuid !== primaryId?.uuid).slice(0, 2).map(id => (
            <p key={id.uuid} className="text-gray-600">
              {id.identifierType.display}: <span className="font-normal">{id.identifier}</span>
            </p>
          ))}
        </div>

        {/* Column 3: Contact/Address */}
        <div className="space-y-2 border-l pl-6">
          <p className="text-lg font-semibold text-indigo-700 mb-2">Address</p>
          {primaryAddress ? (
            <>
              <p className="text-gray-700">{primaryAddress.address1}</p>
              {primaryAddress.address2 && <p className="text-gray-700">{primaryAddress.address2}</p>}
              <p className="text-gray-700">{primaryAddress.cityVillage}, {primaryAddress.stateProvince}</p>
              <p className="text-gray-700">{primaryAddress.country}</p>
            </>
          ) : (
            <p className="text-gray-500 italic">No address on file.</p>
          )}
        </div>
      </div>
      
      {/* Edit button placeholder - links to /patients/[uuid]/edit */}
      <div className="mt-6 pt-4 border-t flex justify-end">
        <button 
          onClick={() => console.log('Navigate to Edit Page for:', patientUuid)}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition duration-150"
        >
          Edit Patient Details
        </button>
      </div>
    </div>
  );
};

export default PatientDetails;