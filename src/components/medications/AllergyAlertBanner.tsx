'use client';

import React, { useEffect, useState } from 'react';
// import { getAllergyAndInteractionAlerts, AllergyAlert } from '@/actions/medications/getAllergyAndInteractionAlerts'; // Your Server Action
import { AlertTriangle, XCircle } from 'lucide-react'; 
import { AllergyAlert, getAllergyAndInteractionAlerts } from '@/lib/medications/getAllergyAndInteractionAlerts';

interface AllergyAlertBannerProps {
    patientUuid: string; // Patient UUID passed as a prop
}

/**
 * Fetches and displays a banner containing all recorded patient allergies.
 * Uses only native browser alerts or console logging for error feedback.
 */
export default function AllergyAlertBanner({ patientUuid }: AllergyAlertBannerProps) {
    const [allergies, setAllergies] = useState<AllergyAlert[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!patientUuid) {
            setError("Patient ID is missing. Cannot load allergy information.");
            setIsLoading(false);
            return;
        }

        async function loadAllergies() {
            setIsLoading(true);
            setError(null);
            try {
                const alerts = await getAllergyAndInteractionAlerts(patientUuid);
                setAllergies(alerts);
                
                // Optionally use native browser alert for critical safety notification
                if (alerts.length > 0) {
                    console.warn(`CRITICAL SAFETY ALERT: Patient ${patientUuid} has ${alerts.length} known allergies.`);
                }

            } catch (err: any) {
                console.error("Failed to load allergies:", err);
                // Set user-friendly error message
                setError("Could not load allergy information. Please check service status.");
                // Use a standard browser alert for critical failure feedback
                alert("ERROR: Failed to load allergies. See console for details.");
            } finally {
                setIsLoading(false);
            }
        }
        loadAllergies();
    }, [patientUuid]);

    if (isLoading) {
        return (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg flex items-center shadow-sm mb-4">
                <AlertTriangle className="w-5 h-5 mr-2 text-blue-500 animate-pulse" />
                **Checking for patient allergies...**
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg flex items-center border border-red-300 shadow-sm mb-4">
                <XCircle className="w-5 h-5 mr-2 text-red-500" />
                **Error:** {error}
            </div>
        );
    }

    if (allergies.length === 0) {
        return null;
    }

    // Main alert display for one or more allergies
    return (
        <div className="bg-red-50 border border-red-400 text-red-800 p-4 rounded-xl shadow-lg mb-4" role="alert">
            <div className="flex items-start">
                <AlertTriangle className="w-6 h-6 mr-3 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                    <h3 className="text-lg font-bold">⚠️ Critical Allergy Alert ({allergies.length})</h3>
                    <p className="text-sm mt-1">Review all recorded allergies before prescribing new medication.</p>
                    <ul className="list-disc list-inside mt-3 space-y-2 text-sm">
                        {allergies.map((allergy) => (
                            <li key={allergy.uuid} className="font-semibold">
                                <span className="text-red-700">{allergy.allergen?.coded?.display || 'Unknown Allergen'}</span>
                                {allergy.reaction && allergy.reaction.length > 0 && (
                                    <span className="text-red-600 font-normal ml-2">
                                        — Reactions: {allergy.reaction.map(r => r.concept.display).join(', ')}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}