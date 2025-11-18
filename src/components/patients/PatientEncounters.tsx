'use client';

import { Encounter, getEncounters } from '@/lib/patients/manageEncounters';
import React, { useState, useEffect, useCallback } from 'react';

interface PatientEncountersProps {
  patientUuid: string;
}

interface EncounterSubResource {
    uuid: string;
    display: string;
}

interface ProviderDetails {
    provider?: EncounterSubResource;
    display: string;
    encounterRole: EncounterSubResource;
    uuid: string;
}

const PatientEncounters: React.FC<PatientEncountersProps> = ({ patientUuid }) => {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

const fetchEncounters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedEncounters = await getEncounters(patientUuid);
      const sortedEncounters = fetchedEncounters.sort(
        (a, b) => new Date(b.encounterDatetime).getTime() - new Date(a.encounterDatetime).getTime()
      );
      setEncounters(sortedEncounters);
    } catch (err: unknown) {
      setError('Could not load encounters.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [patientUuid, setEncounters, setLoading, setError]);

  useEffect(() => {
    fetchEncounters();
  }, [patientUuid, fetchEncounters]);

  const formatDateTime = (datetime: string): string => {
    return new Date(datetime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) return <div className="text-sm text-gray-500 py-2">Loading encounters...</div>;
  
  if (error) return (
    <div className="text-sm text-red-500 py-2">
      {error}
      <button onClick={fetchEncounters} className="ml-2 underline">Retry</button>
    </div>
  );

  return (
    <div className="text-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium">Encounters ({encounters.length})</span>
      </div>

      {encounters.length === 0 ? (
        <p className="text-gray-500 text-sm">No encounters found.</p>
      ) : (
        <div className="space-y-2">
          {encounters.map((encounter) => {
            const firstProvider = encounter.providers?.[0] as ProviderDetails | undefined;
            const encounterTypeDisplay = typeof encounter.encounterType === 'object' && encounter.encounterType !== null 
                                         ? (encounter.encounterType as { display?: string }).display
                                         : (encounter.encounterType || 'Unknown');
            const providerName = firstProvider?.provider?.display || firstProvider?.display || 'N/A';
            const locationDisplay = encounter.location 
                                    ? (encounter.location as { display?: string }).display 
                                    : 'N/A';
            
            return (
              <div key={encounter.uuid} className="flex justify-between items-start py-1 border-b border-gray-100">
                <div className="flex-1">
                  <div className="font-medium">{encounterTypeDisplay}</div>
                  <div className="text-gray-600 text-xs">
                    {formatDateTime(encounter.encounterDatetime)}
                    {locationDisplay !== 'N/A' && ` • ${locationDisplay}`}
                    {firstProvider && ` • ${providerName}`}
                  </div>
                </div>
                <button
                  onClick={() => console.log('View:', encounter.uuid)}
                  className="text-xs text-blue-600 underline hover:text-blue-800 ml-2"
                >
                  View
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PatientEncounters;