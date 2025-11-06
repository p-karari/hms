'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getPatientDetails, PatientDetailsType, Identifier } from '@/lib/patients/getPatientDetails';
import { User, MapPin, IdCard, Menu, X } from 'lucide-react';
import PatientActions from './PatientActions';
import { Visit } from '@/lib/patients/manageVisits';

interface PatientDetailsProps {
  patientUuid: string;
  activeVisit: Visit | null;
  onActionComplete: () => void;
}

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
  activeVisit,
  onActionComplete,
}) => {
  const [patient, setPatient] = useState<PatientDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const details = await getPatientDetails(patientUuid);
      setPatient(details);
    } catch (err) {
      setError('Failed to load details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [patientUuid]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) return <div className="text-sm text-gray-500 py-1">Loading...</div>;
  if (error)
    return (
      <div className="text-sm text-red-500 py-1">
        {error}
        <button onClick={fetchDetails} className="ml-2 underline">
          Retry
        </button>
      </div>
    );
  if (!patient) return <div className="text-sm text-gray-500 py-1">No data</div>;

  const primaryId = getPrimaryIdentifier(patient.identifiers);
  const preferredName = getPreferredName(patient.person);
  const addresses = patient.addresses || [];
  const primaryAddress = addresses.find(addr => addr.preferred) || addresses[0];

  return (
    <div className="text-sm space-y-3 text-black relative">
      {/* Header */}
      <div className="flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-600" />
          <span className="font-medium">{preferredName}</span>
        </div>

        <div className="relative" ref={menuRef}>
          {/* Button */}
          <button
            onClick={() => setIsMenuOpen(prev => !prev)}
            className="p-1.5 rounded-full text-gray-600 hover:bg-gray-100 transition"
            aria-expanded={isMenuOpen}
            aria-label="Patient Actions Menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Dropdown */}
          {isMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20 animate-in fade-in slide-in-from-top-1"
            >
              <div className="flex justify-end px-2 py-1 border-b border-gray-100">
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="text-gray-500 hover:text-gray-800 transition"
                  aria-label="Close Menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3">
                <PatientActions
                  patientUuid={patientUuid}
                  activeVisit={activeVisit}
                  onActionComplete={() => {
                    onActionComplete();
                    setIsMenuOpen(false);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Demographics */}
      <div className="grid grid-cols-3 gap-4 text-xs">
        <div className="space-y-1">
          <div className="text-gray-900">
            {patient.gender} • {patient.age || 'N/A'}
          </div>
          <div className="text-gray-600">
            {new Date(patient.birthdate).toLocaleDateString()}
            {patient.birthdateEstimated && ' (est.)'}
          </div>
        </div>

        {/* IDs */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-gray-700">
            <IdCard className="w-3 h-3" />
            IDs
          </div>
          {primaryId && <div className="text-gray-900 font-medium">{primaryId.identifier}</div>}
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
