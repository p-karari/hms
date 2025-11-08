'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getPatientDetails, PatientDetailsType, Identifier } from '@/lib/patients/getPatientDetails';
import { User, MapPin, IdCard, Menu, X, ChevronDown, Calendar, Hash } from 'lucide-react';
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

// Helper to format an address into a multi-line display string
// const formatAddress = (address: PatientDetailsType['person']['preferredAddress']): string => {
//   if (!address) return 'No address details';
  
//   const parts = [
//     address.address1, 
//     address.address2, 
//     address.cityVillage, 
//     address.stateProvince, 
//     address.country
//   ].filter(p => p); // Filter out null/empty strings

//   // Join the parts, excluding duplicates and keeping the most relevant ones.
//   // For the display, a simple comma separation is often best.
//   return parts.join(', ');
// };

const PatientDetails: React.FC<PatientDetailsProps> = ({
  patientUuid,
  activeVisit,
  onActionComplete,
}) => {
  const [patient, setPatient] = useState<PatientDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // NEW STATE: For handling the collapsible section
  const [isExpanded, setIsExpanded] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const details = await getPatientDetails(patientUuid);
      // NOTE: Using the 'person' object's properties as suggested in the data structure
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

  if (loading) return <div className="text-sm text-muted-foreground py-2 px-3">Loading patient details...</div>;
  if (error)
    return (
      <div className="text-sm text-destructive py-2 px-3 bg-destructive/10 rounded border border-destructive/20">
        {error}
        <button onClick={fetchDetails} className="ml-2 underline text-blue-600 hover:text-blue-800">
          Retry
        </button>
      </div>
    );
  if (!patient) return <div className="text-sm text-muted-foreground py-2 px-3">No patient data available</div>;

  const primaryId = getPrimaryIdentifier(patient.identifiers);
  const preferredName = getPreferredName(patient.person);
  const preferredAddress = patient.person.preferredAddress;
  
  // Format the birthdate for display
  const formattedBirthdate = patient.person.birthdate 
    ? new Date(patient.person.birthdate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'N/A';
  
  // Display only address1 and cityVillage for the collapsed view
  const briefAddress = preferredAddress ? [
    preferredAddress.address1, 
    preferredAddress.cityVillage
  ].filter(p => p).join(', ') : 'No address';

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header Section - Slimmed down */}
    <div className="px-3 py-2 border-b border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-50 p-1.5 rounded-md border border-blue-100">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 leading-tight">{preferredName}</h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1">
                <span className="font-medium text-gray-700">{patient.person.gender || 'N/A'}</span>
                • 
                <span className="font-medium text-gray-700">{patient.person.age || '0'} years</span>
              </span>
              {primaryId && (
                <span className="flex items-center gap-1">
                  <IdCard className="w-3 h-3 text-blue-500" />
                  <span className="font-medium text-gray-700">{primaryId.identifier}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* **Added Start Visit Guide** */}
        <div className='flex items-center gap-3'>
       
        <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
          <span>Start Visit</span>
          {/* Right arrow pointing towards the menu */}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
          </svg>
        </div>
        {/* End of Added Start Visit Guide */}

        {/* Actions Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(prev => !prev)}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors border border-gray-200"
            aria-expanded={isMenuOpen}
            aria-label="Patient Actions Menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-20 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 bg-gray-50 rounded-t-md">
                <span className="text-sm font-medium text-gray-900">Actions</span>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                  aria-label="Close Menu"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="p-1.5">
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
      </div>
    </div>

      {/* Details Section - Slimmed down */}
      <div className="p-3">
        {/* Quick Info Grid - Tighter spacing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md border border-blue-100">
            <div className="bg-blue-100 p-1.5 rounded">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-blue-700 font-medium mb-0.5">Birth Date</p>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {formattedBirthdate}
                {patient.person.birthdateEstimated && (
                  <span className="text-xs text-orange-600 ml-1">(est.)</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md border border-green-100">
            <div className="bg-green-100 p-1.5 rounded">
              <MapPin className="w-3.5 h-3.5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-green-700 font-medium mb-0.5">Location</p>
              <p className="text-sm font-semibold text-gray-900 truncate" title={briefAddress}>
                {briefAddress}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-md border border-purple-100">
            <div className="bg-purple-100 p-1.5 rounded">
              <Hash className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-purple-700 font-medium mb-0.5">Patient UUID</p>
              <p className="text-sm font-mono text-gray-900 truncate text-xs" title={patient.uuid}>
                {patient.uuid}
              </p>
            </div>
          </div>
        </div>

        {/* Expandable Details - Slimmer */}
        <div className="border-t border-gray-100 pt-2">
          <button
            onClick={() => setIsExpanded(prev => !prev)}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition-colors text-xs font-medium"
            aria-expanded={isExpanded}
            aria-controls="patient-more-details"
          >
            {isExpanded ? 'Hide Details' : 'Show Full Details'}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>

          <div
            id="patient-more-details"
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isExpanded ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Complete Address Details</h3>
              {preferredAddress ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1 text-xs">Address Line 1</p>
                    <p className="font-medium text-gray-900 text-sm">{preferredAddress.address1 || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1 text-xs">Address Line 2</p>
                    <p className="font-medium text-gray-900 text-sm">{preferredAddress.address2 || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1 text-xs">City/Village</p>
                    <p className="font-medium text-gray-900 text-sm">{preferredAddress.cityVillage || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1 text-xs">State/Province</p>
                    <p className="font-medium text-gray-900 text-sm">{preferredAddress.stateProvince || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1 text-xs">Country</p>
                    <p className="font-medium text-gray-900 text-sm">{preferredAddress.country || 'Not specified'}</p>
                  </div>
                  {preferredAddress.postalCode && (
                    <div>
                      <p className="text-gray-600 mb-1 text-xs">Postal Code</p>
                      <p className="font-medium text-gray-900 text-sm">{preferredAddress.postalCode}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No address information available.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDetails;