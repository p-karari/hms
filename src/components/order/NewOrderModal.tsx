'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, X } from 'lucide-react';

// --- Import Necessary Actions and Types ---
import { 
    getOrderConceptOptions, 
    OrderableConceptLists, 
    OrderableConceptOption 
} from '@/lib/order/getOrderConceptOptions';
import { submitNewClinicalOrder, NewOrderSubmissionData } from '@/lib/order/submitNewClinicalOrder';

// Assuming an existing context or prop to provide the current encounter UUID
interface NewOrderModalProps {
    patientUuid: string;
    currentEncounterUuid: string; // Crucial for submitting orders
    isOpen: boolean;
    onClose: () => void;
    onOrderSuccess: () => void;
}

// Map the client-side order selection to the API type
type ClientOrderType = 'LAB' | 'RADIOLOGY' | 'PROCEDURE';

/**
 * Modal containing the form for submitting a new non-medication clinical order.
 */
export default function NewOrderModal({ patientUuid, currentEncounterUuid, isOpen, onClose, onOrderSuccess }: NewOrderModalProps) {
    
    // --- State Management ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingConcepts, setIsLoadingConcepts] = useState(true);
    const [conceptLists, setConceptLists] = useState<OrderableConceptLists>({
        labTests: [], radiologyProcedures: [], generalProcedures: []
    });
    
    // Form Data State
    const [formData, setFormData] = useState({
        orderType: 'LAB' as ClientOrderType,
        conceptUuid: '',
        instructions: '',
        urgency: 'ROUTINE' as 'ROUTINE' | 'STAT' | 'ASAP',
        // Example: Specimen source could be dynamic, but fixed here for simplicity
        specimenSourceUuid: '', 
    });

    // --- Concept Initialization (Runs only once on mount) ---
    const fetchConcepts = useCallback(async () => {
        setIsLoadingConcepts(true);
        try {
            const lists = await getOrderConceptOptions();
            setConceptLists(lists);
        } catch (error) {
            console.error("Failed to load order concepts:", error);
            alert("Critical error loading order options. Check configurations.");
        } finally {
            setIsLoadingConcepts(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchConcepts();
        }
    }, [isOpen, fetchConcepts]);

    // --- Dynamic Content Selection ---
    const currentConceptOptions: OrderableConceptOption[] = useMemo(() => {
        switch (formData.orderType) {
            case 'LAB': return conceptLists.labTests;
            case 'RADIOLOGY': return conceptLists.radiologyProcedures;
            case 'PROCEDURE': return conceptLists.generalProcedures;
            default: return [];
        }
    }, [formData.orderType, conceptLists]);

    // Validation
    const isFormValid = formData.conceptUuid && currentEncounterUuid;

    const handleClose = () => {
        // Reset state upon closing
        setFormData({
            orderType: 'LAB',
            conceptUuid: '',
            instructions: '',
            urgency: 'ROUTINE',
            specimenSourceUuid: '',
        });
        onClose();
    };


    // --- Form Submission ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) {
            alert('Please select a test/procedure and ensure an active encounter is set.');
            return;
        }

        setIsSubmitting(true);

        // Map client type to API type
        const apiOrderType = formData.orderType.toLowerCase() + 'order' as NewOrderSubmissionData['orderType'];

        const payload: NewOrderSubmissionData = {
            patientUuid: patientUuid,
            conceptUuid: formData.conceptUuid,
            orderType: apiOrderType,
            encounterUuid: currentEncounterUuid,
            instructions: formData.instructions,
            urgency: formData.urgency,
            // Only include specimen source if it's a lab order
            ...(formData.orderType === 'LAB' && { specimenSourceUuid: formData.specimenSourceUuid }), 
        };

        try {
            await submitNewClinicalOrder(payload);
            alert(`New ${formData.orderType} order submitted successfully.`);
            onOrderSuccess(); // Refresh the history table
            handleClose();
        } catch (error: any) {
            console.error('Order submission failed:', error);
            alert(`Failed to submit order: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // --- Component JSX ---
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 relative">
                
                {/* Modal Header */}
                <h2 className="text-xl font-bold border-b pb-3 mb-4">Create New Clinical Order</h2>
                
                {/* Close Button */}
                <button 
                    onClick={handleClose} 
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl"
                    disabled={isSubmitting}
                >
                    <X className="w-5 h-5" />
                </button>

                {isLoadingConcepts ? (
                    <div className="text-center p-8 text-blue-600">
                        <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
                        **Loading orderable concepts...**
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        
                        {/* 1. Order Type Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Order Type</label>
                            <div className="flex space-x-4">
                                {(['LAB', 'RADIOLOGY', 'PROCEDURE'] as ClientOrderType[]).map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        className={`px-4 py-2 text-sm rounded-lg transition ${
                                            formData.orderType === type 
                                                ? 'bg-blue-600 text-white shadow-md' 
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                        onClick={() => setFormData({ ...formData, orderType: type, conceptUuid: '' })}
                                        disabled={isSubmitting}
                                    >
                                        {type} Order
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Concept Selection (Dynamically filtered) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {formData.orderType} Concept/Item
                            </label>
                            <select
                                value={formData.conceptUuid}
                                onChange={(e) => setFormData({ ...formData, conceptUuid: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                                disabled={isSubmitting || currentConceptOptions.length === 0}
                            >
                                <option value="">Select {formData.orderType} Item</option>
                                {currentConceptOptions.map(opt => (
                                    <option key={opt.uuid} value={opt.uuid}>{opt.display}</option>
                                ))}
                            </select>
                            {currentConceptOptions.length === 0 && (
                                <p className="mt-1 text-sm text-red-500">
                                    No orderable concepts found for this type. Check concept configurations.
                                </p>
                            )}
                        </div>

                        {/* 3. Urgency and Instructions */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Urgency */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                                <select
                                    value={formData.urgency}
                                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                                    disabled={isSubmitting}
                                >
                                    <option value="ROUTINE">Routine</option>
                                    <option value="ASAP">ASAP</option>
                                    <option value="STAT">STAT (Immediate)</option>
                                </select>
                            </div>
                            
                            {/* Specimen Source (Optional for LAB) */}
                            {formData.orderType === 'LAB' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Specimen Source (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.specimenSourceUuid} // Should ideally be a UUID lookup
                                        onChange={(e) => setFormData({ ...formData, specimenSourceUuid: e.target.value })}
                                        placeholder="e.g. Blood, Urine, Swab..."
                                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            )}
                        </div>
                        
                        {/* 4. Instructions */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Instructions/Notes</label>
                            <textarea
                                value={formData.instructions}
                                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                                rows={3}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isSubmitting}
                            />
                        </div>
                        
                        {/* 5. Submission Button */}
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
                                    `Submit ${formData.orderType} Order`
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}