'use client';

import React, { useState, useEffect, useCallback } from 'react';
// Note: You may need to add useCallback import if not present
import { getVisits, Visit } from '@/lib/patients/manageVisits'; 

interface PatientVisitsProps {
  patientUuid: string;
  // --- FIX APPLIED HERE: The callback now expects Visit | null ---
  onActiveVisitChange?: (activeVisit: Visit | null) => void;
}

const PatientVisits: React.FC<PatientVisitsProps> = ({ patientUuid, onActiveVisitChange }) => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVisits = useCallback(async () => { // Added useCallback for dependency array stability
    setLoading(true);
    setError(null);
    try {
      const fetchedVisits = await getVisits(patientUuid);
      
      // Sort to show newest first, and active visits (stopDatetime is null) at the top
      const sortedVisits = fetchedVisits.sort((a, b) => {
        // Active visits first (stopDatetime is undefined/null)
        if (!a.stopDatetime && b.stopDatetime) return -1;
        if (a.stopDatetime && !b.stopDatetime) return 1;

        // Otherwise, sort by start datetime descending
        return new Date(b.startDatetime).getTime() - new Date(a.startDatetime).getTime();
      });
      setVisits(sortedVisits);
      
      // --- FIX APPLIED HERE: Find and pass the active visit object ---
      const activeVisit = sortedVisits.find(v => !v.stopDatetime) || null;
      if (onActiveVisitChange) {
        // Pass the actual Visit object or null to the parent
        onActiveVisitChange(activeVisit);
      }

    } catch (err) {
      setError('Could not load patient visits. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [patientUuid, onActiveVisitChange]); // Added onActiveVisitChange to dependencies

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]); // Dependency updated to fetchVisits

  // Helper to format date and time (rest of the component logic remains the same)
  // ... (formatDateTime, loading/error states, and return JSX are unchanged) ...
  
  const formatDateTime = (datetime: string | undefined): string => {
    if (!datetime) return 'N/A';
    return new Date(datetime).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center">
        <p>Loading Visits...</p> 
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 border border-red-300 rounded-lg">
        <p>Error: {error}</p>
        <button onClick={fetchVisits} className="mt-2 text-sm underline">
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow-lg rounded-xl p-6">
      <h2 className="text-2xl font-semibold border-b pb-3 mb-4 text-gray-800">
        Patient Visits History ({visits.length})
      </h2>
      
      {visits.length === 0 ? (
        <p className="text-gray-500 italic">No visits found for this patient.</p>
      ) : (
        <ul className="space-y-4">
          {visits.map((visit) => {
            const isActive = !visit.stopDatetime;
            return (
              <li
                key={visit.uuid}
                className={`p-4 border rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-50 border-blue-400 shadow-md ring-2 ring-blue-300'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-lg font-bold text-blue-700">
                      {visit.visitType.display}
                      {isActive && (
                        <span className="ml-3 px-2 py-0.5 text-xs font-semibold bg-green-200 text-green-800 rounded-full">
                          ACTIVE
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      **Started:** {formatDateTime(visit.startDatetime)}
                    </p>
                    <p className="text-sm text-gray-600">
                      **Ended:** {isActive ? 'N/A' : formatDateTime(visit.stopDatetime)}
                    </p>
                    {visit.location && (
                      <p className="text-xs text-gray-500 mt-1">
                        **Location:** {visit.location.display}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => console.log('View/Edit Visit:', visit.uuid)}
                    className="ml-4 px-3 py-1 text-sm bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition duration-150"
                  >
                    View Details
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default PatientVisits;