'use client';

import React, { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { SessionContext } from '../../lib/context/session-context';
import { CodedValue } from '@/lib/patients/getPatientObservations';
import { getVisitTypes } from '@/lib/patients/getVisitTypes';
import { Visit, createVisit, updateVisit } from '@/lib/patients/manageVisits';
import { Plus, X, Activity } from 'lucide-react';

interface PatientActionsProps {
  patientUuid: string;
  activeVisit: Visit | null;
  onActionComplete: () => void;
}

const PatientActions: React.FC<PatientActionsProps> = ({ 
  patientUuid, 
  activeVisit, 
  onActionComplete, 
}) => {
  const { sessionLocation } = useContext(SessionContext);
  
  const [visitTypes, setVisitTypes] = useState<CodedValue[]>([]);
  const [selectedVisitTypeUuid, setSelectedVisitTypeUuid] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isVisitActive = !!activeVisit;

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const types = await getVisitTypes();
        setVisitTypes(types);
        if (types.length > 0) {
          setSelectedVisitTypeUuid(types[0].uuid);
        }
      } catch (err) {
        console.error(err)
        setError("Failed to load visit types");
      }
    };
    fetchTypes();
  }, []);

  const handleStartVisit = async () => {
    if (!sessionLocation.uuid) return;
    setIsProcessing(true);
    setError(null);

    try {
      await createVisit(patientUuid, {
        visitType: { uuid: selectedVisitTypeUuid, display: ''}, 
        location: {uuid: sessionLocation.uuid, display: ''},
      });
      onActionComplete();
    } catch (err) {
      console.error(err)
      setError('Failed to start visit');
    } finally {
      setIsProcessing(false);
    }
  };

const handleEndVisit = async () => {
    // 1. Pre-flight Checks
    if (!activeVisit) return;
    if (!confirm('End current visit?')) return;

    setIsProcessing(true);
    setError(null); // Clear previous errors

    try {
      // 2. Call the Server Action
      // The visitUuid is passed here: activeVisit.uuid
      await updateVisit(activeVisit.uuid, {
        stopDatetime: new Date().toISOString(),
      });
      
      // 3. Success (Action Completion)
      // If updateVisit succeeds (doesn't throw), trigger UI refresh.
      onActionComplete(); 
      
    } catch (err) {
      // 4. Failure (Error Handling)
      // This block catches the explicit Error thrown by updateVisit (API failure, Auth failure, etc.)
      const message = err instanceof Error ? err.message : 'Unknown error during API call.';
      
      // Truncate the error message for cleaner display in the small UI box
      const displayMessage = message.includes('Failed to update visit:') 
          ? message.split(' - ')[0] // Show only the first part of the API error
          : message; 
          
      console.error("End Visit Error:", message);
      setError(displayMessage); 
      
    } finally {
      setIsProcessing(false);
    }
};

  return (
    <div className="text-sm space-y-4 text-black">
      {/* Visit Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium">Visit</span>
          {sessionLocation.uuid && (
            <span className="text-xs text-gray-500">{sessionLocation.display}</span>
          )}
        </div>

        {!sessionLocation.uuid ? (
          <div className="text-xs text-red-500">Set location to start visit</div>
        ) : (
          <>
            <select
              value={selectedVisitTypeUuid}
              onChange={(e) => setSelectedVisitTypeUuid(e.target.value)}
              disabled={isVisitActive || isProcessing}
              className="w-full text-xs p-2 border border-gray-300 rounded"
            >
              {visitTypes.map((type) => (
                <option key={type.uuid} value={type.uuid}>
                  {type.display}
                </option>
              ))}
            </select>
            
            <button
              onClick={isVisitActive ? handleEndVisit : handleStartVisit}
              disabled={isProcessing || (!isVisitActive && !sessionLocation.uuid)}
              className={`w-full text-xs py-2 rounded flex items-center justify-center gap-1 ${
                isVisitActive 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {isProcessing ? (
                'Processing...'
              ) : isVisitActive ? (
                <>
                  <X className="w-3 h-3" />
                  End Visit
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3" />
                  Start Visit
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {/* Clinical Actions */}
      <div className="space-y-2">
        <div className="font-medium text-xs text-gray-600">Clinical</div>
        <Link 
          href={`/dashboard/patients/${patientUuid}/vitals`}
          className="flex items-center gap-2 text-xs p-2 text-blue-600 hover:bg-blue-50 rounded"
        >
          <Activity className="w-3 h-3" />
          Capture Vitals
        </Link>
        {/* <Link 
          href={`/dashboard/patients/${patientUuid}/consultation`}
          className="flex items-center gap-2 text-xs p-2 text-blue-600 hover:bg-blue-50 rounded"
        >
          <Stethoscope className="w-3 h-3" />
          Consultation Note
        </Link> */}
      </div>

      {/* Admin Actions */}
      {/* <div className="space-y-2">
        <div className="font-medium text-xs text-gray-600">Admin</div>
        <Link 
          href={`/dashboard/patients/${patientUuid}/edit`}
          className="flex items-center gap-2 text-xs p-2 text-gray-600 hover:bg-gray-50 rounded"
        >
          <Edit className="w-3 h-3" />
          Edit Demographics
        </Link>
      </div> */}
    </div>
  );
};

export default PatientActions;