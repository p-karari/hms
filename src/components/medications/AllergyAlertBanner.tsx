'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, XCircle } from 'lucide-react'; 
import { AllergyAlert, getAllergyAndInteractionAlerts } from '@/lib/medications/getAllergyAndInteractionAlerts';

interface AllergyAlertBannerProps {
    patientUuid: string;
}

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
                
                if (alerts.length > 0) {
                    console.warn(`CRITICAL SAFETY ALERT: Patient ${patientUuid} has ${alerts.length} known allergies.`);
                }

            } catch (err: any) {
                console.error("Failed to load allergies:", err);
                setError("Could not load allergy information. Please check service status.");
                alert("ERROR: Failed to load allergies. See console for details.");
            } finally {
                setIsLoading(false);
            }
        }
        loadAllergies();
    }, [patientUuid]);

    if (isLoading) {
        return (
            <div className="p-2 bg-blue-50 border border-blue-200 text-blue-700 rounded flex items-center text-sm">
                <AlertTriangle className="w-4 h-4 mr-2 text-blue-500" />
                Checking for patient allergies...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-2 bg-red-50 text-red-700 rounded flex items-center border border-red-200 text-sm">
                <XCircle className="w-4 h-4 mr-2 text-red-500" />
                Error: {error}
            </div>
        );
    }

    if (allergies.length === 0) {
        return null;
    }

    return (
        <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded mb-3" role="alert">
            <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 mr-2 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                    <h3 className="text-sm font-bold">Allergy Alert ({allergies.length})</h3>
                    <p className="text-xs mt-1">Review allergies before prescribing.</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                        {allergies.map((allergy) => (
                            <li key={allergy.uuid} className="font-medium">
                                <span className="text-red-700">{allergy.allergen?.coded?.display || 'Unknown Allergen'}</span>
                                {allergy.reaction && allergy.reaction.length > 0 && (
                                    <span className="text-red-600 font-normal ml-1">
                                        — {allergy.reaction.map(r => r.concept.display).join(', ')}
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