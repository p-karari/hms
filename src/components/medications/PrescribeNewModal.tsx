'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';

// --- Import ALL necessary actions and types ---
import { SessionContextType, SessionContext } from '@/lib/context/session-context';
import { DrugFormulation, getFormularyDrugs } from '@/lib/medications/getFormularyDrugs';
import { NewOrderFormData, submitNewDrugOrder } from '@/lib/medications/submitNewDrugOrder';
import { DosingConceptOption, getDosingConceptLists } from '@/lib/medications/getDosingConceptLists';
// import { getDosingConceptLists, DosingConceptOption } from '@/actions/medications/getDosingConceptLists'; // 🎯 The new action!


interface PrescribeNewModalProps {
    patientUuid: string;
    isOpen: boolean;
    onClose: () => void;
    onOrderSuccess: () => void;
}

/**
 * Modal containing the final form for submitting a new drug order.
 * This component now uses the dedicated Server Action for loading all dropdown data.
 */
export default function PrescribeNewModal({ patientUuid, isOpen, onClose, onOrderSuccess }: PrescribeNewModalProps) {
    const sessionData = React.useContext<SessionContextType>(SessionContext);
    
    // --- State Management ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [drugQuery, setDrugQuery] = useState('');
    const [searchResults, setSearchResults] = useState<DrugFormulation[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    // Dosing Concept Options (Loaded once on mount)
    const [dosingConcepts, setDosingConcepts] = useState<{
        doseUnits: DosingConceptOption[];
        routes: DosingConceptOption[];
        frequencies: DosingConceptOption[];
        quantityUnits: DosingConceptOption[];
    }>({ doseUnits: [], routes: [], frequencies: [], quantityUnits: [] });
    
    const [isConceptsLoading, setIsConceptsLoading] = useState(true); // Loading state for initial concepts

    // Final state for the selected drug/concept UUIDs
    const [selectedDrug, setSelectedDrug] = useState<{ drugUuid: string; conceptUuid: string; display: string } | null>(null);

    // Form data state
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

    // --- Concept Initialization (Runs only once on mount) ---
    useEffect(() => {
        async function loadAllDosingConcepts() {
            setIsConceptsLoading(true);
            try {
                // 🎯 DIRECTLY CALLING THE NEW, DYNAMIC SERVER ACTION
                const lists = await getDosingConceptLists(); 
                
                setDosingConcepts({
                    doseUnits: lists.doseUnits,
                    routes: lists.routes,
                    frequencies: lists.frequencies,
                    quantityUnits: lists.quantityUnits,
                });
            } catch (error) {
                console.error("Critical error loading dosing concepts:", error);
                alert("Critical error: Cannot load dosing options. Please check the concept list fetching action.");
            } finally {
                setIsConceptsLoading(false);
            }
        }
        loadAllDosingConcepts();
    }, []);


    // --- Drug Search Logic ---


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


    // --- Form Submission ---
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
            onOrderSuccess(); // Refresh the history table
            handleClose();
        } catch (error: any) {
            console.error('Order submission failed:', error);
            alert(`Failed to submit order: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        // Reset state upon closing
        setSelectedDrug(null);
        setFormData({
            dose: 0, duration: 7, quantity: 7, instructions: '',
            doseUnitsUuid: '', routeUuid: '', frequencyUuid: '', quantityUnitsUuid: '',
        });
        onClose();
    };

    if (!isOpen) return null;

    // --- Component JSX ---
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 relative">
                
                {/* Modal Header */}
                <h2 className="text-xl font-bold border-b pb-3 mb-4">Prescribe New Medication</h2>
                
                {/* Close Button */}
                <button 
                    onClick={handleClose} 
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl"
                    disabled={isSubmitting}
                >
                    &times;
                </button>

                {isConceptsLoading ? (
                    <div className="text-center p-8 text-blue-600">
                        <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
                        **Loading configuration options...**
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        
                        {/* 1. Drug Search and Selection */}
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Drug Name</label>
                            <div className="flex items-center border border-gray-300 rounded-lg p-2 bg-white">
                                <Search className="w-4 h-4 text-gray-400 mr-2" />
                                <input
                                    type="text"
                                    placeholder="Search for drug formulation..."
                                    value={drugQuery}
                                    onChange={(e) => {
                                        setDrugQuery(e.target.value);
                                        setSelectedDrug(null);
                                    }}
                                    className="w-full focus:outline-none"
                                    required
                                    disabled={isSubmitting}
                                />
                                {isSearching && <Loader2 className="w-4 h-4 text-blue-500 animate-spin ml-2" />}
                            </div>

                            {/* Search Results Dropdown */}
                            {searchResults.length > 0 && !selectedDrug && (
                                <ul className="absolute z-10 w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-lg max-h-40 overflow-y-auto">
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
                            
                            {/* Selected Drug Display */}
                            {selectedDrug && (
                                <div className="mt-2 text-sm p-2 bg-green-50 border border-green-300 rounded-md">
                                    Selected: **{selectedDrug.display}**
                                </div>
                            )}
                        </div>

                        {/* 2. Dosing Details */}
                        <div className="grid grid-cols-3 gap-4">
                            {/* Dose Amount */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dose Amount</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={formData.dose}
                                    onChange={(e) => setFormData({ ...formData, dose: parseFloat(e.target.value) || 0 })}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                            {/* Dose Units */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dose Units</label>
                                <select
                                    value={formData.doseUnitsUuid}
                                    onChange={(e) => setFormData({ ...formData, doseUnitsUuid: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                    disabled={isSubmitting}
                                >
                                    <option value="">Select Unit</option>
                                    {dosingConcepts.doseUnits.map(opt => (
                                        <option key={opt.uuid} value={opt.uuid}>{opt.display}</option>
                                    ))}
                                </select>
                            </div>
                            {/* Frequency */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                                <select
                                    value={formData.frequencyUuid}
                                    onChange={(e) => setFormData({ ...formData, frequencyUuid: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
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

                        {/* 3. Duration and Route */}
                        <div className="grid grid-cols-3 gap-4">
                            {/* Duration (Days) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Days)</label>
                                <input
                                    type="number"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                            {/* Route */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
                                <select
                                    value={formData.routeUuid}
                                    onChange={(e) => setFormData({ ...formData, routeUuid: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
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
                        
                        {/* 4. Quantity and Instructions */}
                        <div className="grid grid-cols-3 gap-4">
                            {/* Quantity */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                <input
                                    type="number"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                            {/* Quantity Units */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Units</label>
                                <select
                                    value={formData.quantityUnitsUuid}
                                    onChange={(e) => setFormData({ ...formData, quantityUnitsUuid: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
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

                        {/* 5. Instructions */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                            <textarea
                                value={formData.instructions}
                                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                                rows={3}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* 6. Submission Button */}
                        <div className="flex justify-end pt-4 border-t mt-4">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="mr-2 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center"
                                disabled={isSubmitting || !isFormValid}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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