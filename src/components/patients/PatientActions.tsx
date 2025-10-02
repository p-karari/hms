'use client';

import React, { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

// Import necessary actions and types
// import { createVisit, updateVisit, Visit } from '@/actions/manageVisits'; 
// import { getVisitTypes, CodedValue } from '@/actions/getVisitTypes'; // New action
import { SessionContext } from '../../lib/context/session-context'; // Your provided context
import { CodedValue } from '@/lib/patients/getPatientObservations';
import { getVisitTypes } from '@/lib/patients/getVisitTypes';
import { Visit, createVisit, updateVisit } from '@/lib/patients/manageVisits';

interface PatientActionsProps {
  patientUuid: string;
  activeVisit: Visit | null; // Null if no active visit, otherwise the active Visit object
  onActionComplete: () => void; // Callback to refresh data (like PatientVisits)
}

const PatientActions: React.FC<PatientActionsProps> = ({ 
  patientUuid, 
  activeVisit, 
  onActionComplete, 
}) => {
  const { sessionLocation, isLoading: isSessionLoading } = useContext(SessionContext);
  
  // State for dynamic visit type selection
  const [visitTypes, setVisitTypes] = useState<CodedValue[]>([]);
  const [selectedVisitTypeUuid, setSelectedVisitTypeUuid] = useState<string>('');
  
  // Component operational states
  const [isProcessing, setIsProcessing] = useState(false);
  const [visitTypeLoading, setVisitTypeLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isVisitActive = !!activeVisit;
  
  // Check if a visit can be started (requires non-active visit, valid location, and selected visit type)
  const canStartVisit = 
    !isVisitActive && 
    !isProcessing && 
    !!selectedVisitTypeUuid && 
    !!sessionLocation.uuid;

  // --- Data Fetching: Visit Types ---
  useEffect(() => {
    const fetchTypes = async () => {
      setVisitTypeLoading(true);
      try {
        const types = await getVisitTypes();
        setVisitTypes(types);
        
        // Set a default selection if types are available (e.g., the first one)
        if (types.length > 0) {
          setSelectedVisitTypeUuid(types[0].uuid);
        }
      } catch (err) {
        setError("Failed to load visit types. Cannot start a new visit.");
        console.error(err);
      } finally {
        setVisitTypeLoading(false);
      }
    };
    fetchTypes();
  }, []); // Run once on mount

  // --- Core Visit Logic ---

  const handleStartVisit = async () => {
    if (!canStartVisit) return;
    setIsProcessing(true);
    setError(null);

    const locationUuid = sessionLocation.uuid;
    
    try {
      // The createVisit action now expects simple UUID strings based on our debugging fix
      const newVisit = await createVisit(patientUuid, {
        visitType: { uuid: selectedVisitTypeUuid, display: ''}, 
        location: {uuid: locationUuid, display: ''},
      });

      if (newVisit) {
        alert('Visit started successfully!');
        onActionComplete(); // Refresh parent data
      } else {
        // This catch block handles non-200 responses caught by the action
        setError('Failed to start visit. Check server logs for details.');
      }
    } catch (err) {
      console.error('Error starting visit:', err);
      setError('An unexpected error occurred while starting the visit.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEndVisit = async () => {
    if (isProcessing || !activeVisit) return;

    if (!confirm('Are you sure you want to end the current visit?')) {
      return;
    }

    setIsProcessing(true);
    try {
      // Set the stopDatetime to the current time to end the visit
      const endedVisit = await updateVisit(activeVisit.uuid, {
        stopDatetime: new Date().toISOString(),
      });

      if (endedVisit) {
        alert('Visit ended successfully!');
        onActionComplete(); // Refresh parent data
      } else {
        setError('Failed to end visit.');
      }
    } catch (err) {
      console.error('Error ending visit:', err);
      setError('An unexpected error occurred while ending the visit.');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Render Helpers ---

  const NavigationButton: React.FC<{ href: string; label: string; disabled: boolean }> = ({ href, label, disabled }) => (
    <Link 
      href={href}
      className={`block w-full text-center py-2.5 rounded-lg font-medium transition duration-200 border shadow-sm ${
        disabled 
          ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
          : 'bg-white text-indigo-600 border-indigo-600 hover:bg-indigo-50'
      }`}
      aria-disabled={disabled}
      onClick={(e) => disabled && e.preventDefault()}
    >
      {label}
    </Link>
  );

  return (
    <div className="bg-white shadow-xl rounded-lg p-6 space-y-4">
      <h3 className="text-xl font-bold text-gray-800 border-b pb-3">Patient Actions</h3>
      
      {/* Location Status */}
      <div className="text-sm border-b pb-3">
        <p className="font-semibold text-gray-700">Location:</p>
        <p className={`font-medium ${sessionLocation.uuid ? 'text-green-600' : 'text-red-600'}`}>
          {sessionLocation.display}
        </p>
        {!sessionLocation.uuid && (
            <p className="text-red-500 text-xs mt-1">
                A location must be set in the session to start a visit.
            </p>
        )}
      </div>

      {/* 1. Visit Start/End */}
      <div className='space-y-3 text-black'>
        <div className='flex flex-col space-y-2'>
            <label htmlFor="visit-type" className="text-sm font-semibold text-gray-700">
                Visit Type:
            </label>
            {visitTypeLoading || isSessionLoading ? (
                <div className="flex items-center text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...
                </div>
            ) : (
                <select
                    id="visit-type"
                    value={selectedVisitTypeUuid}
                    onChange={(e) => setSelectedVisitTypeUuid(e.target.value)}
                    disabled={isVisitActive || isProcessing}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                >
                    {visitTypes.map((type) => (
                        <option key={type.uuid} value={type.uuid}>
                            {type.display}
                        </option>
                    ))}
                </select>
            )}
        </div>
        
        <button
          onClick={isVisitActive ? handleEndVisit : handleStartVisit}
          disabled={isProcessing || (!isVisitActive && !canStartVisit) || visitTypeLoading || isSessionLoading}
          className={`w-full py-3 rounded-lg font-bold text-white transition duration-200 shadow-md ${
            isProcessing 
              ? 'bg-gray-400 cursor-not-allowed' 
              : isVisitActive 
                ? 'bg-red-600 hover:bg-red-700' 
                : canStartVisit ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : isVisitActive ? 'End Visit' : 'Start Visit'}
        </button>
      </div>


      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-200">
          Error: {error}
        </p>
      )}

      {/* Conditional Warning/Status */}
      {!isVisitActive && !error && (
        <p className="text-sm text-red-500 bg-red-50 p-2 rounded-md border border-red-200">
          ⚠️ Start a visit to enable clinical data entry.
        </p>
      )}

      {/* 2. Primary Data Entry Actions (Requires Active Visit) */}
      <div className="space-y-3 pt-2">
        <h4 className="text-sm font-semibold text-gray-600">Clinical Data Entry</h4>
        <NavigationButton
          href={`/dashboard/patients/${patientUuid}/vitals`}
          label="Capture Vitals"
          disabled={!isVisitActive}
        />
        <NavigationButton
          href={`/dashboard/patients/${patientUuid}/consultation`}
          label="Enter Consultation Note"
          disabled={!isVisitActive}
        />
      </div>

      {/* 3. Administrative/Demographic Actions (Always available) */}
      <div className="border-t pt-4 space-y-3">
        <h4 className="text-sm font-semibold text-gray-600">Admin Actions</h4>
        <NavigationButton
          href={`/dashboard/patients/${patientUuid}/edit`}
          label="Edit Demographics"
          disabled={false}
        />
      </div>
    </div>
  );
};

export default PatientActions;