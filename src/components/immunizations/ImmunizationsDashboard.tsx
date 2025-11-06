'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Syringe, Loader2, AlertCircle } from 'lucide-react';

// --- Import all built components and actions ---
import ImmunizationHistoryTable from '@/components/immunizations/ImmunizationHistoryTable';
import { 
    getVaccineConceptOptions, 
    VaccineConceptOption 
} from '@/lib/immunizations/getVaccineConceptOptions';
import { 
    submitPatientImmunization, 
    NewImmunizationSubmissionData 
} from '@/lib/immunizations/submitPatientImmunization';
// import { getProviderUuid } from '@/lib/config/provider';
import { getPatientLocations } from '@/lib/location/getPatientLocations';


interface ImmunizationsDashboardProps {
    patientUuid: string;
    patientName: string;
}

/**
 * The main container component for the patient's Immunizations History.
 * It manages the display of the history table and the documentation form.
 */
export default function ImmunizationsDashboard({ patientUuid }: ImmunizationsDashboardProps) {
    
    // State to force refresh the table
    const [refreshKey, setRefreshKey] = useState(0); 
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingConcepts, setIsLoadingConcepts] = useState(false);
    
    // Data states for the form
    const [vaccineConcepts, setVaccineConcepts] = useState<VaccineConceptOption[]>([]);
    const [providerUuid, setProviderUuid] = useState<string | null>(null);
    const [locationOptions, setLocationOptions] = useState<Array<{ uuid: string; display: string }>>([]);

    // Form Data State
    const [formData, setFormData] = useState({
        vaccineConceptUuid: '',
        administrationDate: new Date().toISOString().split('T')[0], // Default to today
        locationUuid: '',
    });

    // --- Initial Data Fetching ---
    // const providerId = process.env.NEXT_PUBLIC_PROVIDER_UUID!;

    const fetchInitialData = useCallback(async () => {
        setIsLoadingConcepts(true);
        try {
            // Fetch necessary reference data concurrently
            const [concepts, locations] = await Promise.all([
                getVaccineConceptOptions(),
                getPatientLocations(patientUuid), // Available locations for administration
            ]);
            
            setVaccineConcepts(concepts);
            setProviderUuid(process.env.NEXT_PUBLIC_PROVIDER_UUID || null);
            setLocationOptions(locations.map(loc => ({ uuid: loc.uuid, display: loc.display })));
            
            // Set default location if available
            if (locations.length > 0) {
                setFormData(prev => ({ ...prev, locationUuid: locations[0].uuid }));
            }
            
        } catch (error) {
            console.error("Failed to load initial data for immunizations form:", error);
            // Optionally set an error state here
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
        
        if (!formData.vaccineConceptUuid || !formData.locationUuid || !providerUuid) {
            alert('Missing critical information: Vaccine, Location, or Provider ID.');
            return;
        }

        setIsSubmitting(true);

        const payload: NewImmunizationSubmissionData = {
            patientUuid: patientUuid,
            vaccineConceptUuid: formData.vaccineConceptUuid,
            administrationDate: formData.administrationDate,
            locationUuid: formData.locationUuid,
            providerUuid: providerUuid,
        };

        try {
            await submitPatientImmunization(payload);
            alert(`Vaccine documented successfully.`);
            setRefreshKey(prevKey => prevKey + 1); // Refresh the list
            setIsFormVisible(false); // Hide the form
            // Reset form data (except location, which might remain the default)
            setFormData(prev => ({ 
                ...prev, 
                vaccineConceptUuid: '',
                administrationDate: new Date().toISOString().split('T')[0],
            }));
        } catch (error: any) {
            console.error('Immunization documentation failed:', error);
            alert(`Failed to document immunization: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // --- New Immunization Form JSX (Inline Component) ---
    const NewImmunizationForm = () => (
        <div className="bg-white border border-green-200 rounded-lg p-6 shadow-md mb-8">
            <h3 className="text-xl font-semibold text-green-700 mb-4 flex items-center">
                <Syringe className="w-5 h-5 mr-2" /> Document New Administration
            </h3>
            
            {isLoadingConcepts ? (
                <div className="text-center p-4 text-green-600">
                    <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                    Loading vaccine concepts...
                </div>
            ) : (
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    
                    {/* Provider ID Warning */}
                    {!providerUuid && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Error: Current user&apos;s provider UUID is missing. Cannot document immunization.
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Vaccine Concept */}
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vaccine Administered</label>
                            <select
                                value={formData.vaccineConceptUuid}
                                onChange={(e) => setFormData({ ...formData, vaccineConceptUuid: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-green-500 focus:border-green-500"
                                required
                                disabled={isSubmitting || !providerUuid}
                            >
                                <option value="">Select Vaccine Type</option>
                                {vaccineConcepts.map(opt => (
                                    <option key={opt.uuid} value={opt.uuid}>{opt.display}</option>
                                ))}
                            </select>
                            {vaccineConcepts.length === 0 && (
                                <p className="mt-1 text-xs text-red-500">No vaccine concepts available.</p>
                            )}
                        </div>

                        {/* Administration Date */}
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date Administered</label>
                            <input
                                type="date"
                                value={formData.administrationDate}
                                onChange={(e) => setFormData({ ...formData, administrationDate: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-green-500 focus:border-green-500"
                                required
                                max={new Date().toISOString().split('T')[0]} // Cannot be a future date
                                disabled={isSubmitting || !providerUuid}
                            />
                        </div>

                        {/* Location */}
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Administration Location</label>
                            <select
                                value={formData.locationUuid}
                                onChange={(e) => setFormData({ ...formData, locationUuid: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-green-500 focus:border-green-500"
                                required
                                disabled={isSubmitting || !providerUuid}
                            >
                                <option value="">Select Location</option>
                                {locationOptions.map(loc => (
                                    <option key={loc.uuid} value={loc.uuid}>{loc.display}</option>
                                ))}
                            </select>
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
                            className="px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-green-300 flex items-center"
                            disabled={isSubmitting || !formData.vaccineConceptUuid || !providerUuid}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                `Record Immunization`
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
                Immunizations
            </h1>
            
            {/* Action Bar */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                    <Syringe className="w-6 h-6 mr-2" /> Vaccination History
                </h2>
                <button
                    onClick={() => setIsFormVisible(prev => !prev)}
                    className="flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg shadow-md hover:bg-green-700 transition duration-150"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    {isFormVisible ? 'Hide Form' : 'Document New Vaccine'}
                </button>
            </div>

            {/* 2. New Immunization Form */}
            {isFormVisible && <NewImmunizationForm />}

            {/* 3. Immunization History Table */}
            <ImmunizationHistoryTable 
                patientUuid={patientUuid} 
                refreshKey={refreshKey}
            />
        </div>
    );
}