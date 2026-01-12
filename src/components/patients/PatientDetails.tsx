'use client';

import { getPatientDetails, Identifier, PatientDetailsType } from '@/lib/patients/getPatientDetails';
import { Visit } from '@/lib/patients/manageVisits';
import { Calendar, ChevronDown, CreditCard, Hash, IdCard, MapPin, Menu, Pencil, User, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import NewBillModal from '../billing/patientBilling/NewBillModal';
import EditPatientForm from './EditPatientForm'; // Ensure this path is correct
import PatientActions from './PatientActions';

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) return <div className="text-sm text-muted-foreground py-2 px-3">Loading...</div>;
  if (error || !patient) return <div className="p-3 text-sm text-destructive">{error || 'No data'}</div>;

  const primaryId = getPrimaryIdentifier(patient.identifiers);
  const preferredName = getPreferredName(patient.person);
  const preferredAddress = patient.person.preferredAddress;
  
  const formattedBirthdate = patient.person.birthdate 
    ? new Date(patient.person.birthdate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      }) : 'N/A';
  
  const briefAddress = preferredAddress ? [
    preferredAddress.address1, preferredAddress.cityVillage
  ].filter(p => p).join(', ') : 'No address';

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header Section */}
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
                  <span className="font-medium text-gray-700">{patient.person.gender}</span> • 
                  <span className="font-medium text-gray-700">{patient.person.age} years</span>
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

          <div className="flex items-center gap-2">
            {/* Edit Button - Triggers Popup */}
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50 transition-colors border border-gray-200 shadow-sm"
            >
              <Pencil className="w-3.5 h-3.5 text-gray-500" />
              Edit Details
            </button>

            <button
              onClick={() => setShowBillModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors border border-green-700 shadow-sm"
            >
              <CreditCard className="w-3.5 h-3.5" />
              New Transaction
            </button>

            {/* Actions Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(prev => !prev)}
                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 border border-gray-200"
              >
                <Menu className="w-4 h-4" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-20 animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 bg-gray-50 rounded-t-md">
                    <span className="text-sm font-medium text-gray-900">Actions</span>
                    <button onClick={() => setIsMenuOpen(false)}><X className="w-3 h-3" /></button>
                  </div>
                  <div className="p-1.5">
                    <PatientActions
                      patientUuid={patientUuid}
                      activeVisit={activeVisit}
                      onActionComplete={() => { onActionComplete(); setIsMenuOpen(false); }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="p-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md border border-blue-100">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <div className="min-w-0">
              <p className="text-[10px] text-blue-700 font-medium uppercase">Birth Date</p>
              <p className="text-sm font-semibold text-gray-900">{formattedBirthdate}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md border border-green-100">
            <MapPin className="w-3.5 h-3.5 text-green-600" />
            <div className="min-w-0">
              <p className="text-[10px] text-green-700 font-medium uppercase">Location</p>
              <p className="text-sm font-semibold text-gray-900 truncate">{briefAddress}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-md border border-purple-100">
            <Hash className="w-3.5 h-3.5 text-purple-600" />
            <div className="min-w-0">
              <p className="text-[10px] text-purple-700 font-medium uppercase">UUID</p>
              <p className="text-xs font-mono text-gray-900 truncate">{patient.uuid}</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(prev => !prev)}
          className="flex items-center gap-1.5 text-blue-600 text-xs font-medium"
        >
          {isExpanded ? 'Hide Details' : 'Show Full Details'}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        {isExpanded && (
          <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200 animate-in fade-in slide-in-from-top-1">
             <p className="text-xs text-gray-600">Full Address: {preferredAddress?.address1}, {preferredAddress?.cityVillage}, {preferredAddress?.country}</p>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* Edit Patient Popup */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <EditPatientForm 
              patient={patient} 
              onClose={() => setShowEditModal(false)}
              onSuccess={() => {
                setShowEditModal(false);
                fetchDetails(); // Reload data
              }}
            />
          </div>
        </div>
      )}

      {showBillModal && (
        <NewBillModal
          patientUuid={patientUuid}
          patientName={preferredName}
          isOpen={showBillModal}
          onClose={() => setShowBillModal(false)}
          onBillCreated={() => console.log('Bill Created')}
          patientId={patientUuid}
        />
      )}
    </div>
  );
};

export default PatientDetails;