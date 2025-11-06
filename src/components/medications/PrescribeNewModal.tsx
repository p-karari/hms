'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { SessionContextType, SessionContext } from '@/lib/context/session-context';
import { DrugFormulation, getFormularyDrugs } from '@/lib/medications/getFormularyDrugs';
import { NewOrderFormData, submitNewDrugOrder } from '@/lib/medications/submitNewDrugOrder';
import { DosingConceptOption, getDosingConceptLists } from '@/lib/medications/getDosingConceptLists';

interface PrescribeNewModalProps {
    patientUuid: string;
    isOpen: boolean;
    onClose: () => void;
    onOrderSuccess: () => void;
}

export default function PrescribeNewModal({ patientUuid, isOpen, onClose, onOrderSuccess }: PrescribeNewModalProps) {
    const sessionData = React.useContext<SessionContextType>(SessionContext);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [drugQuery, setDrugQuery] = useState('');
    const [searchResults, setSearchResults] = useState<DrugFormulation[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const [dosingConcepts, setDosingConcepts] = useState<{
        doseUnits: DosingConceptOption[];
        routes: DosingConceptOption[];
        frequencies: DosingConceptOption[];
        quantityUnits: DosingConceptOption[];
    }>({ doseUnits: [], routes: [], frequencies: [], quantityUnits: [] });
    
    const [isConceptsLoading, setIsConceptsLoading] = useState(true);

    const [selectedDrug, setSelectedDrug] = useState<{ drugUuid: string; conceptUuid: string; display: string } | null>(null);

    const [formData, setFormData] = useState({
        dose: 0,
        duration: 7,
        quantity: 7,
        instructions: '',
        doseUnitsUuid: '',
        routeUuid: '',
        frequencyUuid: '',
        quantityUnitsUuid: '',
    });
    
    const isFormValid = selectedDrug && formData.doseUnitsUuid && formData.routeUuid && formData.frequencyUuid && formData.quantityUnitsUuid && formData.dose > 0;

    useEffect(() => {
        async function loadAllDosingConcepts() {
            setIsConceptsLoading(true);
            try {
                const lists = await getDosingConceptLists(); 
                setDosingConcepts({
                    doseUnits: lists.doseUnits,
                    routes: lists.routes,
                    frequencies: lists.frequencies,
                    quantityUnits: lists.quantityUnits,
                });
            } catch (error) {
                console.error("Critical error loading dosing concepts:", error);
                alert("Critical error: Cannot load dosing options.");
            } finally {
                setIsConceptsLoading(false);
            }
        }
        loadAllDosingConcepts();
    }, []);

    const performSearch = useCallback(async (query: string) => {
        setIsSearching(true);
        try {
            const results = await getFormularyDrugs(query);
            setSearchResults(results);
        } catch (error) {
            console.error('Drug search failed:', error);
            alert('Drug search failed. See console.');
        } finally {
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        const delaySearch = setTimeout(() => {
            if (drugQuery.length > 2) {
                performSearch(drugQuery);
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(delaySearch);
    }, [drugQuery, performSearch]);

    const handleSelectDrug = (drug: DrugFormulation) => {
        if (!drug.concept) {
            alert("Error: Selected drug is missing a primary concept UUID. Cannot prescribe.");
            return;
        }
        setSelectedDrug({
            drugUuid: drug.uuid,
            conceptUuid: drug.concept.uuid,
            display: drug.display,
        });
        setDrugQuery(drug.display); 
        setSearchResults([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) {
            alert('Please complete all required fields and select a valid drug.');
            return;
        }

        setIsSubmitting(true);

        const payload: NewOrderFormData = {
            patientUuid: patientUuid,
            drugUuid: selectedDrug!.drugUuid,
            conceptUuid: selectedDrug!.conceptUuid,
            dose: formData.dose,
            doseUnitsConceptUuid: formData.doseUnitsUuid,
            routeConceptUuid: formData.routeUuid,
            frequencyConceptUuid: formData.frequencyUuid,
            duration: formData.duration,
            quantity: formData.quantity,
            quantityUnitsConceptUuid: formData.quantityUnitsUuid,
            instructions: formData.instructions,
        };

        try {
            await submitNewDrugOrder(payload, sessionData);
            alert(`New order for ${selectedDrug!.display} submitted successfully.`);
            onOrderSuccess();
            handleClose();
        } catch (error: any) {
            console.error('Order submission failed:', error);
            alert(`Failed to submit order: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setSelectedDrug(null);
        setFormData({
            dose: 0, duration: 7, quantity: 7, instructions: '',
            doseUnitsUuid: '', routeUuid: '', frequencyUuid: '', quantityUnitsUuid: '',
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded border border-gray-200 w-full max-w-2xl p-4 relative">
                
                <h2 className="text-lg font-semibold border-b pb-2 mb-3">Prescribe New Medication</h2>
                
                <button 
                    onClick={handleClose} 
                    className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl"
                    disabled={isSubmitting}
                >
                    &times;
                </button>

                {isConceptsLoading ? (
                    <div className="text-center p-4 text-blue-600">
                        <Loader2 className="w-5 h-5 mx-auto animate-spin mb-1" />
                        Loading configuration options...
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-3">
                        
                        <div className="relative">
                            <label className="block text-sm text-gray-700 mb-1">Drug Name</label>
                            <div className="flex items-center border border-gray-300 rounded p-2 bg-white">
                                <Search className="w-4 h-4 text-gray-400 mr-2" />
                                <input
                                    type="text"
                                    placeholder="Search for drug formulation..."
                                    value={drugQuery}
                                    onChange={(e) => {
                                        setDrugQuery(e.target.value);
                                        setSelectedDrug(null);
                                    }}
                                    className="w-full focus:outline-none text-sm"
                                    required
                                    disabled={isSubmitting}
                                />
                                {isSearching && <Loader2 className="w-4 h-4 text-blue-500 animate-spin ml-2" />}
                            </div>

                            {searchResults.length > 0 && !selectedDrug && (
                                <ul className="absolute z-10 w-full bg-white border border-gray-300 mt-1 rounded shadow max-h-40 overflow-y-auto">
                                    {searchResults.map((drug) => (
                                        <li 
                                            key={drug.uuid} 
                                            className="p-2 hover:bg-blue-50 cursor-pointer text-sm"
                                            onClick={() => handleSelectDrug(drug)}
                                        >
                                            {drug.display}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            
                            {selectedDrug && (
                                <div className="mt-1 text-sm p-2 bg-green-50 border border-green-300 rounded">
                                    Selected: {selectedDrug.display}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-sm text-gray-700 mb-1">Dose Amount</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={formData.dose}
                                    onChange={(e) => setFormData({ ...formData, dose: parseFloat(e.target.value) || 0 })}
                                    className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-700 mb-1">Dose Units</label>
                                <select
                                    value={formData.doseUnitsUuid}
                                    onChange={(e) => setFormData({ ...formData, doseUnitsUuid: e.target.value })}
                                    className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                                    required
                                    disabled={isSubmitting}
                                >
                                    <option value="">Select Unit</option>
                                    {dosingConcepts.doseUnits.map(opt => (
                                        <option key={opt.uuid} value={opt.uuid}>{opt.display}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-700 mb-1">Frequency</label>
                                <select
                                    value={formData.frequencyUuid}
                                    onChange={(e) => setFormData({ ...formData, frequencyUuid: e.target.value })}
                                    className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                                    required
                                    disabled={isSubmitting}
                                >
                                    <option value="">Select Frequency</option>
                                    {dosingConcepts.frequencies.map(opt => (
                                        <option key={opt.uuid} value={opt.uuid}>{opt.display}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-sm text-gray-700 mb-1">Duration (Days)</label>
                                <input
                                    type="number"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                                    className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-700 mb-1">Route</label>
                                <select
                                    value={formData.routeUuid}
                                    onChange={(e) => setFormData({ ...formData, routeUuid: e.target.value })}
                                    className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                                    required
                                    disabled={isSubmitting}
                                >
                                    <option value="">Select Route</option>
                                    {dosingConcepts.routes.map(opt => (
                                        <option key={opt.uuid} value={opt.uuid}>{opt.display}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-sm text-gray-700 mb-1">Quantity</label>
                                <input
                                    type="number"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                    className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-700 mb-1">Quantity Units</label>
                                <select
                                    value={formData.quantityUnitsUuid}
                                    onChange={(e) => setFormData({ ...formData, quantityUnitsUuid: e.target.value })}
                                    className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                                    required
                                    disabled={isSubmitting}
                                >
                                    <option value="">Select Unit</option>
                                    {dosingConcepts.quantityUnits.map(opt => (
                                        <option key={opt.uuid} value={opt.uuid}>{opt.display}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Special Instructions</label>
                            <textarea
                                value={formData.instructions}
                                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                                rows={2}
                                className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="flex justify-end pt-3 border-t mt-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="mr-2 px-3 py-1.5 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-1.5 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-blue-300 flex items-center text-sm"
                                disabled={isSubmitting || !isFormValid}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit Prescription'
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}