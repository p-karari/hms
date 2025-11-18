'use client';
import React, { useState, useTransition } from 'react';

import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'; 
import { submitEncounter } from '@/lib/encounters/encounter';


const MOCK_UUIDS = {
    PATIENT: 'mock-patient-uuid-123',
    PROVIDER: 'mock-provider-uuid-456',
    LOCATION: 'mock-location-uuid-789',
    ENCOUNTER_TYPE: 'mock-enc-type-vitals-abc',
    CONCEPT_WEIGHT: 'mock-concept-weight-xyz', 
};

const EncounterSubmissionForm = ({ patientUuid = MOCK_UUIDS.PATIENT }) => {
    const [isPending, startTransition] = useTransition();
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const [weight, setWeight] = useState('');


    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setStatus('idle');
        setMessage('');

        const observations = [{
            concept: MOCK_UUIDS.CONCEPT_WEIGHT,
            value: parseFloat(weight), 
        }];

        const payload = {
            patient: patientUuid,
            encounterDatetime: new Date().toISOString(),
            encounterType: MOCK_UUIDS.ENCOUNTER_TYPE,
            location: MOCK_UUIDS.LOCATION,
            provider: MOCK_UUIDS.PROVIDER,
            obs: observations,
        };

        startTransition(async () => {
            try {
                const result = await submitEncounter(payload);
                
                setStatus('success');
                setMessage(`Encounter submitted successfully! UUID: ${result.uuid.substring(0, 8)}...`);
                setWeight(''); 
                console.log('API Response:', result);

            } catch (error) {
                setStatus('error');
                setMessage( 'An unknown error occurred during submission.');
                console.error('Submission Failed:', error);
            }
        });
    };
    

    const StatusDisplay = () => {
        if (status === 'idle') return null;

        const baseClasses = "mt-6 p-4 rounded-xl flex items-center shadow-lg";
        
        if (status === 'success') {
            return (
                <div className={`${baseClasses} bg-green-100 border-l-4 border-green-500 text-green-800`}>
                    <CheckCircle className="w-5 h-5 mr-3" />
                    <p className="font-medium text-sm">{message}</p>
                </div>
            );
        }

        if (status === 'error') {
            return (
                <div className={`${baseClasses} bg-red-100 border-l-4 border-red-500 text-red-800`}>
                    <AlertTriangle className="w-5 h-5 mr-3" />
                    <p className="font-medium text-sm">{message}</p>
                </div>
            );
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-2xl border border-gray-100">
                <header className="mb-8 border-b pb-4">
                    <h1 className="text-3xl font-extrabold text-gray-900">Clinical Encounter Form</h1>
                    <p className="text-sm text-gray-500 mt-1">Submit Vitals for Patient: <code className="bg-gray-100 p-1 rounded text-xs">{patientUuid}</code></p>
                </header>

                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    <div>
                        <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-2">
                            Patient Weight (kg)
                        </label>
                        <input
                            id="weight"
                            type="number"
                            step="0.1"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            required
                            disabled={isPending}
                            placeholder="e.g., 75.5"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                        />
                    </div>
                    
                    <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded-lg text-xs space-y-1">
                        <p className="font-semibold">Current Submission Context (MOCK DATA):</p>
                        <p><strong>Encounter Type:</strong> {MOCK_UUIDS.ENCOUNTER_TYPE}</p>
                        <p><strong>Provider:</strong> {MOCK_UUIDS.PROVIDER}</p>
                        <p><strong>Concept Used (Weight):</strong> {MOCK_UUIDS.CONCEPT_WEIGHT}</p>
                    </div>

                    <button
                        type="submit"
                        disabled={isPending || !weight}
                        className={`w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-semibold rounded-lg shadow-md transition duration-300 
                            ${isPending ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'}
                        `}
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            'Save Clinical Encounter'
                        )}
                    </button>
                </form>

                <StatusDisplay />
            </div>
        </div>
    );
};

export default EncounterSubmissionForm;
