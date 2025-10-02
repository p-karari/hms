'use client';

import { Encounter, getEncounters } from '@/lib/patients/manageEncounters';
import React, { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, User } from 'lucide-react'; 

interface PatientEncountersProps {
  patientUuid: string;
}

// --- TYPE DEFINITIONS TO ELIMINATE 'any' CASTS ---
// These interfaces reflect the expected full structure of a provider entry
// when returned by OpenMRS v=full encounter representation.

interface EncounterSubResource {
    uuid: string;
    display: string;
}

interface ProviderDetails {
    // The provider field itself might be a nested object
    provider?: EncounterSubResource;
    // The main display is often the person's name
    display: string; 
    // The encounterRole field is a nested object
    encounterRole: EncounterSubResource; 
    // The top-level object might also have a UUID
    uuid: string;
}
// ----------------------------------------------------

const PatientEncounters: React.FC<PatientEncountersProps> = ({ patientUuid }) => {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEncounters = async () => {
    setLoading(true);
    setError(null);
    try {
      // Ensure getEncounters is robust and returns a predictable format
      const fetchedEncounters = await getEncounters(patientUuid);
      
      // Sort to show newest first
      const sortedEncounters = fetchedEncounters.sort(
        (a, b) => new Date(b.encounterDatetime).getTime() - new Date(a.encounterDatetime).getTime()
      );
      setEncounters(sortedEncounters);
    } catch (err: unknown) { // Replace catch (err) with catch (err: unknown)
      setError('Could not load patient encounters. Please check the console for details.');
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEncounters();
  }, [patientUuid, fetchEncounters]);

  // Helper to format date and time
  const formatDateTime = (datetime: string): string => {
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
        <Loader2 className="w-6 h-6 mr-2 animate-spin text-indigo-500" />
        <p className="text-gray-500">Loading Encounters...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 border border-red-300 rounded-lg bg-red-50 flex items-center">
        <AlertTriangle className="w-5 h-5 mr-2" />
        <p>Error: {error}</p>
        <button onClick={fetchEncounters} className="ml-4 text-sm underline hover:text-red-800">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-xl p-6">
      <h2 className="text-2xl font-semibold border-b pb-3 mb-4 text-gray-800">
        Patient Encounters History ({encounters.length})
      </h2>

      {encounters.length === 0 ? (
        <p className="text-gray-500 italic">No encounters found for this patient.</p>
      ) : (
        <ul className="space-y-4">
          {encounters.map((encounter) => {
            // Assert the type of firstProvider to allow safe nested access
            const firstProvider = encounter.providers?.[0] as ProviderDetails | undefined;
            
            // 🎯 CRITICAL FIX: Ensure ALL complex properties are defensively accessed using .display
            
            // 1. Encounter Type (Type assertion to access display safely)
            const encounterTypeDisplay = typeof encounter.encounterType === 'object' && encounter.encounterType !== null 
                                         ? (encounter.encounterType as { display?: string }).display
                                         : (encounter.encounterType || 'Unknown Encounter Type');


            // 2. Provider Name (Safely access using the asserted ProviderDetails type)
            const providerName = firstProvider?.provider?.display 
                               || firstProvider?.display // Fallback if provider object is flattened
                               || 'N/A';

            // 3. Encounter Role (Safely access using the asserted ProviderDetails type)
            const roleName = firstProvider?.encounterRole?.display || 'Unknown Role';
            
            // 4. Location Display (Safely accessing the display property)
            const locationDisplay = encounter.location 
                                    ? (encounter.location as { display?: string }).display 
                                    : 'N/A';
            
            return (
              <li
                key={encounter.uuid}
                className="p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition duration-150"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {/* Use the safely extracted encounterTypeDisplay */}
                    <p className="text-lg font-bold text-gray-800">
                      {encounterTypeDisplay}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      **Date & Time:** {formatDateTime(encounter.encounterDatetime)}
                    </p>
                    {locationDisplay !== 'N/A' && (
                      <p className="text-sm text-gray-600">
                        **Location:** {locationDisplay}
                      </p>
                    )}
                    
                    {/* Displaying the primary provider */}
                    {firstProvider && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center">
                        <User className="w-3 h-3 mr-1" />
                        **Provider:** {providerName} ({roleName}) 
                      </p>
                    )}
                  </div>
                  {/* Action area for viewing the form/data associated with this encounter */}
                  <button
                    onClick={() => console.log('View Encounter Details:', encounter.uuid)}
                    className="ml-4 px-3 py-1 text-sm bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition duration-150"
                  >
                    View Data
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

export default PatientEncounters;