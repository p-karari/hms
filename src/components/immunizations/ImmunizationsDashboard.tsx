'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Syringe, Loader2, AlertCircle, Calendar, Package, Factory, Hash } from 'lucide-react';


import ImmunizationHistoryTable from '@/components/immunizations/ImmunizationHistoryTable';

import { getPatientLocations } from '@/lib/location/getPatientLocations';
import { getVaccineConceptOptions, ConceptReference as VaccineConceptOption } from '@/lib/immunizations/getVaccineConceptOptions';
import { usePatientDashboard } from '../context/patient-dashboard-context';
import { NewImmunizationSubmissionData, submitPatientImmunization } from '@/lib/immunizations/submitPatientImmunization';


interface ImmunizationsDashboardProps {
    patientUuid: string;
    patientName: string;
}

export default function ImmunizationsDashboard({ patientUuid }: ImmunizationsDashboardProps) {
    
    const { activeVisit, onActionComplete } = usePatientDashboard();

    const [refreshKey, setRefreshKey] = useState(0); 
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingInitialData, setIsLoadingInitialData] = useState(false);
    
    const [vaccineConcepts, setVaccineConcepts] = useState<VaccineConceptOption[]>([]);
    const [locationOptions, setLocationOptions] = useState<Array<{ uuid: string; display: string }>>([]);
    
    const [providerUuid] = useState<string | null>(process.env.NEXT_PUBLIC_DEFAULT_PROVIDER_UUID || null); 

    const [formData, setFormData] = useState({
        vaccineConceptUuid: '',
        vaccineDisplay: '', 
        occurrenceDateTime: new Date().toISOString().substring(0, 16), 
        locationUuid: '',
        lotNumber: '', 
        expirationDate: '', 
        manufacturer: '', 
        doseNumber: 1, 
    });

    const fetchInitialData = useCallback(async () => {
        setIsLoadingInitialData(true);
        try {
            const [concepts, locations] = await Promise.all([
                getVaccineConceptOptions(),
                getPatientLocations(patientUuid), 
            ]);
            
            setVaccineConcepts(concepts);
            setLocationOptions(locations.map(loc => ({ uuid: loc.uuid, display: loc.display })));
            
            const defaultLocationUuid = activeVisit?.location?.uuid || locations[0]?.uuid || '';
            if (defaultLocationUuid) {
                 setFormData(prev => ({ ...prev, locationUuid: defaultLocationUuid }));
            }
            
        } catch (error) {
            console.error("Failed to load initial data for immunizations form:", error);
        } finally {
            setIsLoadingInitialData(false);
        }
    }, [patientUuid, activeVisit?.location?.uuid]); 

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);
    
    const handleVaccineChange = (uuid: string) => {
        const selectedConcept = vaccineConcepts.find(c => c.uuid === uuid);
        setFormData(prev => ({ 
            ...prev, 
            vaccineConceptUuid: uuid, 
            vaccineDisplay: selectedConcept ? selectedConcept.display : '' 
        }));
    };


    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.vaccineConceptUuid || !formData.locationUuid || !providerUuid || !activeVisit) {
            alert('Missing critical context: Vaccine, Location, Provider ID, or Active Visit is missing. Cannot proceed.');
            return;
        }

        setIsSubmitting(true);

        const administrationDateTime = new Date(formData.occurrenceDateTime).toISOString();

        const payload: NewImmunizationSubmissionData = {
            patientUuid: patientUuid,
            vaccineConceptUuid: formData.vaccineConceptUuid,
            vaccineDisplay: formData.vaccineDisplay,
            occurrenceDateTime: administrationDateTime, 
            lotNumber: formData.lotNumber,
            expirationDate: formData.expirationDate, 
            manufacturer: formData.manufacturer,
            doseNumber: formData.doseNumber,
            visitUuid: activeVisit.uuid, 
            locationUuid: formData.locationUuid, 
            practitionerUuid: providerUuid,
        };

        try {
            await submitPatientImmunization(payload);
            alert(`Vaccine documented successfully.`);
            setRefreshKey(prevKey => prevKey + 1); 
            setIsFormVisible(false); 
            
            onActionComplete(); 
            
            setFormData(prev => ({ 
                ...prev, 
                vaccineConceptUuid: '',
                vaccineDisplay: '',
                occurrenceDateTime: new Date().toISOString().substring(0, 16),
                lotNumber: '',
                expirationDate: '',
                manufacturer: '',
                doseNumber: 1,
            }));
        } catch (error: any) {
            console.error('Immunization documentation failed:', error);
            alert(`Failed to document immunization: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const canSubmit = activeVisit && formData.vaccineConceptUuid && providerUuid;
    const activeVisitFound = !!activeVisit;


    const NewImmunizationForm = () => (
        <div className="bg-white border border-green-200 rounded-lg p-6 shadow-md mb-8">
            <h3 className="text-xl font-semibold text-green-700 mb-4 flex items-center">
                <Syringe className="w-5 h-5 mr-2" /> Document New Administration
            </h3>
            
            {isLoadingInitialData ? (
                <div className="text-center p-4 text-green-600">
                    <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                    Loading required form data...
                </div>
            ) : (
                <>
                    {!providerUuid && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded flex items-center mb-4">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Error: Current user&apos;s **Provider UUID** is missing. Cannot record immunization.
                        </div>
                    )}
                    {!activeVisitFound && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded flex items-center mb-4">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            **Error: No Active Visit found.** You must start a visit before recording a structured clinical event like an immunization.
                        </div>
                    )}

                    <form onSubmit={handleFormSubmit} className="space-y-4">
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vaccine Administered *</label>
                                <select
                                    value={formData.vaccineConceptUuid}
                                    onChange={(e) => handleVaccineChange(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-green-500 focus:border-green-500"
                                    required
                                    disabled={isSubmitting || !activeVisitFound || !providerUuid}
                                >
                                    <option value="">Select Vaccine Type</option>
                                    {vaccineConcepts.map(opt => (
                                        <option key={opt.uuid} value={opt.uuid}>{opt.display}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time Administered *</label>
                                <input
                                    type="datetime-local"
                                    value={formData.occurrenceDateTime}
                                    onChange={(e) => setFormData({ ...formData, occurrenceDateTime: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-green-500 focus:border-green-500"
                                    required
                                    max={new Date().toISOString().substring(0, 16)} 
                                    disabled={isSubmitting || !activeVisitFound || !providerUuid}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Administration Location *</label>
                                <select
                                    value={formData.locationUuid}
                                    onChange={(e) => setFormData({ ...formData, locationUuid: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-green-500 focus:border-green-500"
                                    required
                                    disabled={isSubmitting || !activeVisitFound || !providerUuid}
                                >
                                    <option value="">Select Location</option>
                                    {locationOptions.map(loc => (
                                        <option key={loc.uuid} value={loc.uuid}>{loc.display}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t pt-4">
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><Package className="w-4 h-4 mr-1 text-gray-500"/> Lot Number</label>
                                <input
                                    type="text"
                                    placeholder="Batch/Lot ID"
                                    value={formData.lotNumber}
                                    onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-green-500 focus:border-green-500"
                                    disabled={isSubmitting || !activeVisitFound || !providerUuid}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><Calendar className="w-4 h-4 mr-1 text-gray-500"/> Expiry Date</label>
                                <input
                                    type="date"
                                    value={formData.expirationDate}
                                    onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-green-500 focus:border-green-500"
                                    disabled={isSubmitting || !activeVisitFound || !providerUuid}
                                />
                            </div>

                            {/* Manufacturer */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><Factory className="w-4 h-4 mr-1 text-gray-500"/> Manufacturer</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Pfizer, Moderna"
                                    value={formData.manufacturer}
                                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-green-500 focus:border-green-500"
                                    disabled={isSubmitting || !activeVisitFound || !providerUuid}
                                />
                            </div>
                            
                            {/* Dose Number */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><Hash className="w-4 h-4 mr-1 text-gray-500"/> Dose #</label>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="1, 2, 3..."
                                    value={formData.doseNumber}
                                    onChange={(e) => setFormData({ ...formData, doseNumber: parseInt(e.target.value) || 1 })}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-green-500 focus:border-green-500"
                                    disabled={isSubmitting || !activeVisitFound || !providerUuid}
                                />
                            </div>
                        </div>

                        {/* Submission Button */}
                        <div className="flex justify-end space-x-3 pt-4">
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
                                // Disabled if 'canSubmit' is false
                                disabled={isSubmitting || !canSubmit}
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
                </>
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
                    disabled={isLoadingInitialData} 
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