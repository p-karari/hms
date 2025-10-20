'use client';

import React, { useContext, useState, useEffect } from 'react';
import { SessionContext } from '../../lib/context/session-context'; 
import { AlertTriangle, MapPin, Loader2, Hospital } from 'lucide-react'; // 🎯 Added Hospital icon
import VitalsFormFields from '../vitals/VitalsFormFields';
import { getPatientActiveVisit } from '@/lib/visits/getActiveVisit';

// 🎯 CRITICAL: Assuming this utility exists and performs the necessary API call
// import { getActiveVisit } from '../../lib/visits/visit'; 

// --- Interface Definitions ---
// Define the structure of the ConceptUuids object now passed from the server
interface ConceptUuids {
    WEIGHT: string;
    HEIGHT: string;
    TEMP: string;
    SYSTOLIC_BP: string;
    DIASTOLIC_BP: string;
    PULSE: string;
    RESP_RATE: string;
}

// 🎯 FIX: Updated interface to match ALL props from VitalsPage.tsx
interface LocationWrapperProps {
    patientUuid: string;
    providerUuid: string;
    encounterTypeUuid: string;
    conceptUuids: ConceptUuids; // Accepts the consolidated object
    encounterRoleUuid: string; // NEW: Required for the encounterProviders payload
}

/**
 * Client Component that retrieves the session location and active visit from context/API
 * and passes all collected UUIDs to the Vitals form.
 */
export default function LocationDependentFormWrapper({
    patientUuid,
    providerUuid,
    encounterTypeUuid,
    conceptUuids,
    encounterRoleUuid, // 🎯 NEW: Destructure the Encounter Role UUID
}: LocationWrapperProps) {
    
    // 1. Context and State
    const { sessionLocation, isAuthenticated } = useContext(SessionContext);
    
    // 🎯 CRITICAL: State for the active visit fetching
    const [activeVisitUuid, setActiveVisitUuid] = useState<string | null>(null);
    const [isLoadingVisit, setIsLoadingVisit] = useState(true);
    const [visitError, setVisitError] = useState<string | null>(null);

    const locationUuid = sessionLocation?.uuid;
    const isSessionReady = isAuthenticated !== undefined;

    // 🎯 CRITICAL: Fetch the active visit UUID on mount or dependency change
    useEffect(() => {
        if (patientUuid && isAuthenticated && isSessionReady) {
            const fetchVisit = async () => {
                setIsLoadingVisit(true);
                setVisitError(null);
                try {
                    // Assuming getActiveVisit(patientUuid) is an async function
                    const visit = await getPatientActiveVisit(patientUuid);
                    setActiveVisitUuid(visit?.uuid || null);
                } catch (error: unknown) {
                    let errorMessage: string;
    
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    } else {
        errorMessage = "An unrecoverable error of unknown type occurred.";
    }
                    setVisitError(errorMessage || "Failed to determine patient's active visit.");
                } finally {
                    setIsLoadingVisit(false);
                }
            };
            fetchVisit();
        }
    }, [patientUuid, isAuthenticated, isSessionReady]);

    // --- Loading and Error Handling ---

    if (!isSessionReady || isLoadingVisit) {
        return (
            <div className="p-6 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-xl flex items-center shadow-md">
                <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                <p className="font-semibold">{!isSessionReady ? 'Loading session data...' : 'Checking for active visit...'}</p>
            </div>
        );
    }
    
    if (!isAuthenticated) {
        return (
             <div className="p-6 bg-red-100 border border-red-400 text-red-800 rounded-xl">
                 <p>Authentication check failed. Please log in.</p>
             </div>
        )
    }

    if (!locationUuid) {
        return (
            <div className="p-8 max-w-lg mx-auto bg-red-100 border-l-4 border-red-500 text-red-800 rounded-xl shadow-lg mt-10">
                <h2 className="text-2xl font-bold mb-3 flex items-center">
                    <AlertTriangle className="w-6 h-6 mr-2" />
                    Location Required
                </h2>
                <p className="mb-4">The current user session does not have a clinic location set.</p>
                <p className="font-semibold flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Current Status: {sessionLocation?.display || 'Not Set'}
                </p>
            </div>
        );
    }
    
    if (visitError) {
         return (
             <div className="p-8 max-w-lg mx-auto bg-red-100 border-l-4 border-red-500 text-red-800 rounded-xl shadow-lg mt-10">
                 <h2 className="text-2xl font-bold mb-3 flex items-center">
                     <AlertTriangle className="w-6 h-6 mr-2" />
                     Visit Lookup Error
                 </h2>
                 <p className="mb-4">
                     Could not check for an active patient visit: {visitError}.
                 </p>
             </div>
         );
    }

    // Block submission if no active visit is found (best practice for encounters)
    if (!activeVisitUuid) {
         return (
             <div className="p-8 max-w-lg mx-auto bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-xl shadow-lg mt-10">
                 <h2 className="text-2xl font-bold mb-3 flex items-center">
                     <Hospital className="w-6 h-6 mr-2" />
                     No Active Visit Found
                 </h2>
                 <p className="mb-4">
                     Vitals must be recorded as part of an active visit. Please ensure the patient is checked in.
                 </p>
             </div>
         );
    }


    // 2. Success: Pass all collected UUIDs to the VitalsFormFields
    return (
        <VitalsFormFields
            patientUuid={patientUuid}
            providerUuid={providerUuid}
            locationUuid={locationUuid} // From Context
            encounterTypeUuid={encounterTypeUuid}
            conceptUuids={conceptUuids}
            activeVisitUuid={activeVisitUuid} // 🎯 From API call
            encounterRoleUuid={encounterRoleUuid} // 🎯 From Server Page
        />
    );
}