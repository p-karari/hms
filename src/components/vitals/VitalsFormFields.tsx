'use client';
import React, { useState, useTransition, useMemo } from 'react';
import { Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Import the required types (assuming SubmitEncounterData and ObsPayload are exported from encounter.ts)
import { ObsPayload, submitEncounter } from '../../lib/encounters/encounter'; 
import { SubmitEncounterData } from '../../lib/encounters/encounter'; // Need to import this for correct casting

// --- Interface Definitions ---
interface ConceptUuids {
    WEIGHT: string;
    HEIGHT: string;
    TEMP: string;
    SYSTOLIC_BP: string;
    DIASTOLIC_BP: string;
    PULSE: string;
    RESP_RATE: string;
}

// 🎯 FIX 1: Updated props interface to include visit and encounter role UUIDs
interface VitalsFormProps {
    patientUuid: string;
    providerUuid: string;
    locationUuid: string;
    encounterTypeUuid: string;
    conceptUuids: ConceptUuids;
    activeVisitUuid: string; // Must be passed by LocationDependentFormWrapper
    encounterRoleUuid: string; // CRITICAL: Must be fetched by VitalsPage.tsx and passed down
}

// Interface for the form state (No Change)
interface VitalsFormState {
    weight: string;
    height: string;
    temp: string;
    systolic: string;
    diastolic: string;
    pulse: string;
    respRate: string;
}

const VitalsFormFields: React.FC<VitalsFormProps> = ({
    patientUuid,
    providerUuid,
    locationUuid,
    encounterTypeUuid,
    conceptUuids,
    // 🎯 FIX 2: Destructure the new required props
    activeVisitUuid,
    encounterRoleUuid,
}) => {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    console.log(status, message)

    const [formState, setFormState] = useState<VitalsFormState>({
        weight: '', height: '', temp: '', systolic: '', diastolic: '', pulse: '', respRate: '',
    });

    const hasData = useMemo(() => {
        return Object.values(formState).some(val => val.trim() !== '' && !isNaN(parseFloat(val)));
    }, [formState]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // Basic input validation: ensure it's a number if not empty
        setFormState(prev => ({ ...prev, [name]: value }));
    };


    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setStatus('idle');
        setMessage('');

        if (!hasData) {
            setStatus('error');
            setMessage('Please enter at least one valid vital sign value.');
            return;
        }

        // 1. Construct the complete Observation Payload (No Change)
        const observations: ObsPayload[] = []; // Explicitly typed for safety
        const submissionTime = new Date().toISOString();

        const formKeyToConceptMap: { [key in keyof VitalsFormState]: keyof ConceptUuids } = {
            weight: 'WEIGHT', height: 'HEIGHT', temp: 'TEMP', 
            systolic: 'SYSTOLIC_BP', diastolic: 'DIASTOLIC_BP', 
            pulse: 'PULSE', respRate: 'RESP_RATE',
        };

        (Object.keys(formState) as Array<keyof VitalsFormState>).forEach(key => {
            const value = formState[key].trim();
            const numberValue = parseFloat(value);
            const conceptKey = formKeyToConceptMap[key];
            const conceptUuid = conceptUuids[conceptKey];

            if (!isNaN(numberValue) && numberValue > 0 && conceptUuid) {
                observations.push({
                    concept: conceptUuid, 
                    value: numberValue, 
                });
            }
        });
        
        if (observations.length === 0) {
            setStatus('error');
            setMessage('No valid vital signs were entered or the values are too low.');
            return;
        }

        // 2. Construct the full Encounter Data Payload
        // 🎯 FIX 3: Use the correct SubmitEncounterData structure
        const payload: SubmitEncounterData = {
            patient: patientUuid,
            encounterDatetime: submissionTime, 
            encounterType: encounterTypeUuid,
            location: locationUuid, 
            visit: activeVisitUuid, // Added visit UUID
            
            // 🎯 FIX 4: Use encounterProviders array instead of the single 'provider' string
            encounterProviders: [{ 
                provider: providerUuid, 
                encounterRole: encounterRoleUuid, // Uses the new required role UUID
            }], 
            obs: observations,
        };
        
        // 3. Use useTransition to call the server action
        startTransition(async () => {
            try {
                const result = await submitEncounter(payload); 
                
                setStatus('success');
                setMessage(`Vitals submitted successfully! Encounter UUID: ${result.uuid.substring(0, 8)}...`);
                setTimeout(() => router.push(`/dashboard/patients/${patientUuid}`), 1500);

            } catch (error: unknown) {

                let errorMessage: string;
    
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    } else {
        errorMessage = "An unrecoverable error of unknown type occurred.";
    }
                setStatus('error');
                setMessage(errorMessage || 'An unknown error occurred during submission.');
            }
        });
    };
    
    // --- UI Helpers --- (No change, omitted for brevity)
    const StatusDisplay = () => { /* ... */ return null; };
    const InputField = ({ id, label, placeholder, value, name, step = "1" }: { id: string, label: string, placeholder: string, value: string, name: keyof VitalsFormState, step?: string }) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <input
                id={id}
                name={name}
                type="number"
                step={step}
                value={value}
                onChange={handleChange}
                disabled={isPending}
                placeholder={placeholder}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
            />
        </div>
    );

    return (
        <div className="w-full max-w-3xl bg-white p-8 rounded-2xl shadow-2xl border border-gray-100">
            {/* ... Header and Form structure remain the same ... */}
            <header className="mb-6 border-b pb-4">
                <h1 className="text-2xl font-bold text-gray-900">Vitals Entry</h1>
                <p className="text-sm text-gray-500 mt-1">Submit essential vital signs for this patient.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {/* Input fields... */}
                    <InputField id="weight" label="Weight (kg)" placeholder="e.g., 75.5" value={formState.weight} name="weight" step="0.1" />
                    <InputField id="height" label="Height (cm)" placeholder="e.g., 170" value={formState.height} name="height" step="0.1" />
                    <InputField id="temp" label="Temperature (°C)" placeholder="e.g., 37.0" value={formState.temp} name="temp" step="0.1" />
                    <InputField id="pulse" label="Pulse (bpm)" placeholder="e.g., 75" value={formState.pulse} name="pulse" />
                    <InputField id="systolic" label="Systolic BP (mmHg)" placeholder="e.g., 120" value={formState.systolic} name="systolic" />
                    <InputField id="diastolic" label="Diastolic BP (mmHg)" placeholder="e.g., 80" value={formState.diastolic} name="diastolic" />
                    <InputField id="respRate" label="Resp Rate (breaths/min)" placeholder="e.g., 16" value={formState.respRate} name="respRate" />
                    <div className="hidden md:block"></div> 
                </div>

                {/* Configuration Summary (Updated for new fields) */}
                <div className="p-4 bg-indigo-50 border-l-4 border-indigo-400 text-indigo-800 rounded-lg text-xs space-y-1">
                    <p className="font-semibold">Current Encounter Context (UUIDs):</p>
                    <p><strong>Patient:</strong> <code className="break-all">{patientUuid}</code></p>
                    <p><strong>Provider:</strong> <code className="break-all">{providerUuid}</code></p>
                    <p>**Provider Role:** <code className="break-all">{encounterRoleUuid}</code></p>
                    <p>**Visit:** <code className="break-all">{activeVisitUuid}</code></p>
                    <p><strong>Location:</strong> <code className="break-all">{locationUuid}</code></p>
                    <p><strong>Encounter Type:</strong> <code className="break-all">{encounterTypeUuid}</code></p>
                </div>

                {/* Submit Button (No change) */}
                <button
                    type="submit"
                    disabled={isPending || !hasData} 
                    className={`w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-semibold rounded-lg shadow-md transition duration-300 
                        ${(isPending || !hasData) ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg'}
                    `}
                >
                    {isPending ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Submitting Encounter...
                        </>
                    ) : (
                        <>
                            <Save className="w-5 h-5 mr-2" />
                            Save Vitals Encounter
                        </>
                    )}
                </button>
            </form>

            <StatusDisplay />
        </div>
    );
};

export default VitalsFormFields;