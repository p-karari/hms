'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getPatientDetails, PatientDetailsType, Identifier } from '@/lib/patients/getPatientDetails';
import { User, MapPin, IdCard, Menu, X } from 'lucide-react'; // Added Menu icon
// 💡 NOTE: You must ensure PatientActions is imported correctly
import PatientActions from './PatientActions'; // Assuming the path is correct
import { Visit } from '@/lib/patients/manageVisits'; // Assuming Visit interface path

// --- INTERFACE EXTENSION ---
interface PatientDetailsProps {
  patientUuid: string;
  // 💡 NEW: Props required for the embedded PatientActions component
  activeVisit: Visit | null;
  onActionComplete: () => void;
}
// --- UTILITY FUNCTIONS (Unchanged) ---
const getPrimaryIdentifier = (identifiers: Identifier[]): Identifier | undefined => {
  return identifiers.find(id => id.preferred) || identifiers[0];
};

const getPreferredName = (person: PatientDetailsType['person']): string => {
    const preferred = person.names.find(name => name.preferred);
    if (preferred) {
        return `${preferred.givenName} ${preferred.familyName}`;
    }
    return `${person.names[0]?.givenName || ''} ${person.names[0]?.familyName || ''}`.trim();
};

const PatientDetails: React.FC<PatientDetailsProps> = ({ 
  patientUuid,
  activeVisit, // Passed down
  onActionComplete, // Passed down
}) => {
  const [patient, setPatient] = useState<PatientDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // 💡 NEW: State for menu dropdown

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const details = await getPatientDetails(patientUuid);
      setPatient(details);
    } catch (err) {
      setError('Failed to load details');
      console.error(err)
    } finally {
      setLoading(false);
    }
  }, [patientUuid]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // --- Render Handlers (Unchanged) ---
  if (loading) return <div className="text-sm text-gray-500 py-1">Loading...</div>;
  if (error) return (
    <div className="text-sm text-red-500 py-1">
      {error}
      <button onClick={fetchDetails} className="ml-2 underline">Retry</button>
    </div>
  );
  if (!patient) return <div className="text-sm text-gray-500 py-1">No data</div>;
  
  const primaryId = getPrimaryIdentifier(patient.identifiers);
  const preferredName = getPreferredName(patient.person);
  const addresses = patient.addresses || [];
  const primaryAddress = addresses.find(addr => addr.preferred) || addresses[0];

  return (
    <div className="text-sm space-y-3 text-black relative"> {/* 💡 Added relative for absolute dropdown */}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-600" />
          <span className="font-medium">{preferredName}</span>
        </div>
        
        {/* Actions Button / Dropdown Toggle */}
        <div className="flex items-center gap-2">
          {patient.isDead && (
            <span className="text-xs text-red-600 px-1.5 py-0.5 bg-red-50 rounded">Deceased</span>
          )}
          
          <button 
            onClick={() => setIsMenuOpen(prev => !prev)}
            className="p-1 rounded-full text-gray-600 hover:bg-gray-100"
            aria-expanded={isMenuOpen}
            aria-label="Patient Actions Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* 💡 Dropdown Menu Content */}
      {isMenuOpen && (
        <div 
          className="absolute right-0 top-full mt-2 z-10 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4"
          // You might add an external click handler here to close the menu
        >
          <div className="flex justify-end mb-2">
             <button 
                onClick={() => setIsMenuOpen(false)}
                className="text-gray-500 hover:text-gray-800"
                aria-label="Close Menu"
              >
                <X className="w-4 h-4" />
              </button>
          </div>

          <PatientActions 
            patientUuid={patientUuid} 
            activeVisit={activeVisit}
            // Add a callback wrapper to close the menu on completion
            onActionComplete={() => {
              onActionComplete();
              setIsMenuOpen(false); 
            }}
          />
        </div>
      )}

      {/* Details Grid (Unchanged) */}
      <div className="grid grid-cols-3 gap-4 text-xs">
        {/* Demographics */}
        <div className="space-y-1">
          <div className="text-gray-900">{patient.gender} • {patient.age || 'N/A'}</div>
          <div className="text-gray-600">
            {new Date(patient.birthdate).toLocaleDateString()}
            {patient.birthdateEstimated && ' (est.)'}
          </div>
        </div>

        {/* Identifiers */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-gray-700">
            <IdCard className="w-3 h-3" />
            IDs
          </div>
          {primaryId && (
            <div className="text-gray-900 font-medium">{primaryId.identifier}</div>
          )}
        </div>

        {/* Address */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-gray-700">
            <MapPin className="w-3 h-3" />
            Address
          </div>
          {primaryAddress ? (
            <div className="text-gray-900">
              {primaryAddress.address1}
              {primaryAddress.cityVillage && `, ${primaryAddress.cityVillage}`}
            </div>
          ) : (
            <div className="text-gray-500">No address</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientDetails;