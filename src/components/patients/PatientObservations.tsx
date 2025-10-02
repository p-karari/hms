'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getPatientObservations, Observation, CodedValue } from '@/lib/patients/getPatientObservations';

interface PatientObservationsProps {
  patientUuid: string;
}

// Helper function to extract and format the observation value based on its specific type fields
const formatObservationValue = (obs: Observation): string => {
  if (obs.valueCoded) {
    // Coded values (like diagnoses, selections)
    return obs.valueCoded.display;
  }
  if (obs.valueNumeric !== undefined && obs.valueNumeric !== null) {
    // Numeric values (like vitals)
    return String(obs.valueNumeric);
  }
  if (obs.valueText) {
    // Text values (like notes)
    return obs.valueText;
  }
  if (obs.valueDatetime) {
    // Date/Time values
    return new Date(obs.valueDatetime).toLocaleDateString();
  }
  if (obs.valueBoolean !== undefined && obs.valueBoolean !== null) {
    // Boolean values
    return obs.valueBoolean ? 'Yes' : 'No';
  }
  
  // Fallback to the generic 'value' property (which can be a string, number, or CodedValue from v=full)
  // This handles cases where the REST API uses the shorthand 'value' field.
  if (obs.value !== undefined && obs.value !== null) {
    if (typeof obs.value === 'object' && 'display' in obs.value) {
        return (obs.value as CodedValue).display;
    }
    return String(obs.value);
  }
  
  return 'N/A';
};

// Helper function to format date and time
const formatDateTime = (datetime: string): string => {
  return new Date(datetime).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};


const PatientObservations: React.FC<PatientObservationsProps> = ({ patientUuid }) => {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchObservations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedObservations = await getPatientObservations(patientUuid);
      // Sort to show newest first
      const sortedObservations = fetchedObservations.sort(
        (a, b) => new Date(b.obsDatetime).getTime() - new Date(a.obsDatetime).getTime()
      );
      setObservations(sortedObservations);
    } catch (err) {
      setError('Could not load patient observations. Please try again.');
      // The error comes from the action's throw, so we show the message
      if (err instanceof Error) {
        console.error('Observation Fetch Error:', err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [patientUuid]);

  useEffect(() => {
    fetchObservations();
  }, [fetchObservations]);


  // Grouping observations for better visual organization
  const groupedObservations = useMemo(() => {
    const groups: { [key: string]: Observation[] } = {};
    observations.forEach(obs => {
      // Use the concept's display name as the group header
      const key = obs.concept.display || 'Uncategorized Observations';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(obs);
    });
    return groups;
  }, [observations]);

  
  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center">
        {/* Placeholder for a loading spinner/indicator */}
        <p>Loading Patient Data (Observations)...</p> 
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 border border-red-300 rounded-lg">
        <p>Error: {error}</p>
        <button onClick={fetchObservations} className="mt-2 text-sm underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-xl p-6">
      <h2 className="text-2xl font-semibold border-b pb-3 mb-4 text-gray-800">
        Clinical Observations ({observations.length})
      </h2>
      
      {observations.length === 0 ? (
        <p className="text-gray-500 italic">No clinical data (observations) found for this patient.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedObservations).map(([conceptName, obsList]) => (
            <div key={conceptName} className="border-l-4 border-indigo-500 pl-4">
              <h3 className="text-xl font-bold text-indigo-700 mb-2">{conceptName}</h3>
              <ul className="space-y-2">
                {obsList.map((obs) => (
                  <li
                    key={obs.uuid}
                    className="p-3 bg-gray-50 rounded-md flex justify-between items-center text-sm"
                  >
                    <div>
                      <span className="font-semibold text-gray-800 mr-2">Value:</span>
                      <span className="text-blue-600 font-medium">
                        {formatObservationValue(obs)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 ml-4">
                      {formatDateTime(obs.obsDatetime)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientObservations;