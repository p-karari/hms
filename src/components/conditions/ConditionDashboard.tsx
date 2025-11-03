'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ListChecks, AlertCircle, TrendingUp, Loader2 } from 'lucide-react';

// --- Import all built components and actions ---
import ConditionListTable from '@/components/conditions/ConditionListTable';
import { 
    getDiagnosisConceptOptions, 
    DiagnosisConceptOption 
} from '@/lib/conditions/getDiagnosisConceptOptions';
import { 
    createPatientCondition, 
    NewConditionSubmissionData 
} from '@/lib/conditions/submitPatientCondition';
import { getActiveEncounterUuid } from '@/lib/encounters/getActiveEncounterUuid';

interface ConditionsDashboardProps {
    patientUuid: string;
    patientName: string;
}

/**
 * The main container component for the patient's Conditions (Problem List).
 * It manages the display of the list, the new condition form, and triggers refreshes.
 */
export default function ConditionsDashboard({ patientUuid }: ConditionsDashboardProps) {
    
    // State to force refresh the ConditionListTable after an update
    const [refreshKey, setRefreshKey] = useState(0); 
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingConcepts, setIsLoadingConcepts] = useState(false);
    
    // Data states for the form
    const [diagnosisConcepts, setDiagnosisConcepts] = useState<DiagnosisConceptOption[]>([]);
    const [activeEncounterUuid, setActiveEncounterUuid] = useState<string | null>(null);

    // Form Data State
    const [formData, setFormData] = useState({
        conditionConceptUuid: '',
        onsetDate: new Date().toISOString().split('T')[0], // Default to today
        verificationStatus: 'CONFIRMED' as 'CONFIRMED' | 'UNCONFIRMED' | 'PROVISIONAL',
        comment: '',
    });

    // --- Initial Data Fetching ---
    const fetchInitialData = useCallback(async () => {
        setIsLoadingConcepts(true);
        try {
            // Fetch diagnosis concept options
            const concepts = await getDiagnosisConceptOptions();
            setDiagnosisConcepts(concepts);
            
            // Fetch the current active encounter UUID for context linking
            const encounterId = await getActiveEncounterUuid(patientUuid);
            setActiveEncounterUuid(encounterId);
            
        } catch (error) {
            console.error("Failed to load initial data for conditions form:", error);
        } finally {
            setIsLoadingConcepts(false);
        }
    }, [patientUuid]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    // --- Form Submission ---
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.conditionConceptUuid || !formData.onsetDate) {
            alert('Please select a diagnosis and specify an onset date.');
            return;
        }

        setIsSubmitting(true);

        const payload: NewConditionSubmissionData = {
            patientUuid: patientUuid,
            conditionConceptUuid: formData.conditionConceptUuid,
            clinicalStatus: 'ACTIVE', // All new conditions start as active
            verificationStatus: formData.verificationStatus,
            onsetDate: formData.onsetDate,
            encounterUuid: activeEncounterUuid,
            comment: formData.comment || undefined,
        };

        try {
            await createPatientCondition(payload);
            alert(`New condition documented successfully.`);
            setRefreshKey(prevKey => prevKey + 1); // Refresh the list
            setIsFormVisible(false); // Hide the form
            // Reset form data
            setFormData({
                conditionConceptUuid: '',
                onsetDate: new Date().toISOString().split('T')[0],
                verificationStatus: 'CONFIRMED',
                comment: '',
            });
        } catch (error: any) {
            console.error('Condition documentation failed:', error);
            alert(`Failed to document condition: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleStatusChange = () => {
        // Callback used when a condition is resolved from the table
        setRefreshKey(prevKey => prevKey + 1);
    };

    // --- New Condition Form JSX (Inline Component) ---
    const NewConditionForm = () => (
        <div className="bg-white border border-blue-200 rounded-lg p-6 shadow-md mb-8">
            <h3 className="text-xl font-semibold text-blue-700 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" /> Document New Condition
            </h3>
            
            {isLoadingConcepts ? (
                <div className="text-center p-4 text-blue-600">
                    <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                    Loading diagnosis concepts...
                </div>
            ) : (
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    
                    {/* Active Encounter Alert */}
                    {!activeEncounterUuid && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            **Warning**: No active encounter found. This condition will not be linked to a specific visit.
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Diagnosis Concept */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis / Problem</label>
                            <select
                                value={formData.conditionConceptUuid}
                                onChange={(e) => setFormData({ ...formData, conditionConceptUuid: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                                disabled={isSubmitting}
                            >
                                <option value="">Select Diagnosis Concept (ICD/SNOMED)</option>
                                {diagnosisConcepts.map(opt => (
                                    <option key={opt.uuid} value={opt.uuid}>{opt.display}</option>
                                ))}
                            </select>
                            {diagnosisConcepts.length === 0 && (
                                <p className="mt-1 text-xs text-red-500">
                                    No diagnosis concepts available. Check configuration.
                                </p>
                            )}
                        </div>

                        {/* Onset Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Onset Date</label>
                            <input
                                type="date"
                                value={formData.onsetDate}
                                onChange={(e) => setFormData({ ...formData, onsetDate: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                    
                    {/* Verification Status and Comment */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {/* Verification Status */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Verification Status</label>
                            <select
                                value={formData.verificationStatus}
                                onChange={(e) => setFormData({ ...formData, verificationStatus: e.target.value as any })}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isSubmitting}
                            >
                                <option value="CONFIRMED">Confirmed</option>
                                <option value="PROVISIONAL">Provisional</option>
                                <option value="UNCONFIRMED">Unconfirmed / Suspected</option>
                            </select>
                        </div>
                        
                        {/* Comment */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Comment (Optional)</label>
                            <input
                                type="text"
                                value={formData.comment}
                                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    {/* Submission Button */}
                    <div className="flex justify-end space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsFormVisible(false)}
                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center"
                            disabled={isSubmitting || !formData.conditionConceptUuid}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                `Save Condition`
                            )}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-extrabold text-gray-900 border-b pb-2">
                Conditions (Problem List)
            </h1>
            
            {/* Action Bar */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                    <ListChecks className="w-6 h-6 mr-2" /> Patient Problem List
                </h2>
                <button
                    onClick={() => setIsFormVisible(prev => !prev)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow-md hover:bg-blue-700 transition duration-150"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    {isFormVisible ? 'Hide Form' : 'Add New Condition'}
                </button>
            </div>

            {/* 2. New Condition Form */}
            {isFormVisible && <NewConditionForm />}

            {/* 3. Condition List Table */}
            <ConditionListTable 
                patientUuid={patientUuid} 
                refreshKey={refreshKey}
                onStatusChange={handleStatusChange} // Passes the handler to refresh the list
            />
        </div>
    );
}