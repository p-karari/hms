'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, X, AlertTriangle } from 'lucide-react';

// --- Import Necessary Actions and Types ---
import { 
    getAllergyConceptOptions, 
    AllergenConceptLists, 
    AllergenConceptOption 
} from '@/lib/allergies/getAllergyConceptOptions';
import { 
    submitPatientAllergy, 
    NewAllergySubmissionData 
} from '@/lib/allergies/submitPatientAllergy';

interface NewAllergyModalProps {
    patientUuid: string;
    isOpen: boolean;
    onClose: () => void;
    onAllergySuccess: () => void; // Callback to refresh the list
}

type ClientAllergyType = 'DRUG' | 'FOOD' | 'ENVIRONMENTAL' | 'OTHER';

// Placeholder for a list of common reaction concepts (UUIDs)
// In a real system, this would be fetched via a dedicated action like getAllergyReactionConcepts.
const MOCK_REACTION_CONCEPTS: AllergenConceptOption[] = [
    { uuid: 'react-rash', display: 'Rash / Hives' },
    { uuid: 'react-anaphylaxis', display: 'Anaphylaxis / Severe Reaction' },
    { uuid: 'react-vomiting', display: 'Nausea / Vomiting' },
    { uuid: 'react-wheezing', display: 'Wheezing / Dyspnea' },
];


/**
 * Modal containing the form for documenting a new patient allergy or ADR.
 */
export default function NewAllergyModal({ patientUuid, isOpen, onClose, onAllergySuccess }: NewAllergyModalProps) {
    
    // --- State Management ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingConcepts, setIsLoadingConcepts] = useState(true);
    const [conceptLists, setConceptLists] = useState<AllergenConceptLists>({
        drugs: [], foods: [], environmental: []
    });
    
    // Form Data State
    const [formData, setFormData] = useState({
        allergyType: 'DRUG' as ClientAllergyType,
        allergenUuid: '',
        severity: 'MODERATE' as 'LOW' | 'MODERATE' | 'HIGH',
        reactionUuids: [] as string[],
        onsetDate: '',
        comment: '',
    });

    // --- Concept Initialization ---
    const fetchConcepts = useCallback(async () => {
        setIsLoadingConcepts(true);
        try {
            const lists = await getAllergyConceptOptions();
            setConceptLists(lists);
        } catch (error) {
            console.error("Failed to load allergen concepts:", error);
            alert("Critical error loading allergy options. Check concept sets.");
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
    const currentAllergenOptions: AllergenConceptOption[] = useMemo(() => {
        switch (formData.allergyType) {
            case 'DRUG': return conceptLists.drugs;
            case 'FOOD': return conceptLists.foods;
            case 'ENVIRONMENTAL': return conceptLists.environmental;
            case 'OTHER': return []; // For 'OTHER', the user might manually enter text (not supported by this basic form structure)
            default: return [];
        }
    }, [formData.allergyType, conceptLists]);

    // Validation
    const isFormValid = formData.allergenUuid && formData.reactionUuids.length > 0;

    const handleClose = () => {
        // Reset state upon closing
        setFormData({
            allergyType: 'DRUG',
            allergenUuid: '',
            severity: 'MODERATE',
            reactionUuids: [],
            onsetDate: '',
            comment: '',
        });
        onClose();
    };

    const handleReactionToggle = (uuid: string) => {
        setFormData(prev => ({
            ...prev,
            reactionUuids: prev.reactionUuids.includes(uuid)
                ? prev.reactionUuids.filter(id => id !== uuid)
                : [...prev.reactionUuids, uuid],
        }));
    };

    // --- Form Submission ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) {
            alert('Please select an allergen and at least one reaction.');
            return;
        }

        setIsSubmitting(true);

        const payload: NewAllergySubmissionData = {
            patientUuid: patientUuid,
            allergenUuid: formData.allergenUuid,
            allergyType: formData.allergyType,
            severity: formData.severity,
            reactionUuids: formData.reactionUuids,
            onsetDate: formData.onsetDate || undefined,
            comment: formData.comment || undefined,
        };

        try {
            await submitPatientAllergy(payload);
            alert(`New ${formData.allergyType} allergy documented successfully.`);
            onAllergySuccess(); // Refresh the history table
            handleClose();
        } catch (error: any) {
            console.error('Allergy documentation failed:', error);
            alert(`Failed to document allergy: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // --- Component JSX ---
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 relative">
                
                {/* Modal Header */}
                <h2 className="text-2xl font-bold border-b pb-3 mb-4 text-red-700 flex items-center">
                    <AlertTriangle className="w-6 h-6 mr-2" /> Document New Allergy / ADR
                </h2>
                
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
                        **Loading allergen concepts...**
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* 1. Allergy Type and Allergen Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Allergy Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Allergy Category</label>
                                <select
                                    value={formData.allergyType}
                                    onChange={(e) => setFormData({ ...formData, allergyType: e.target.value as ClientAllergyType, allergenUuid: '' })}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-red-500 focus:border-red-500"
                                    disabled={isSubmitting}
                                >
                                    {(['DRUG', 'FOOD', 'ENVIRONMENTAL', 'OTHER'] as ClientAllergyType[]).map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Allergen Concept */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Allergen / Substance
                                </label>
                                <select
                                    value={formData.allergenUuid}
                                    onChange={(e) => setFormData({ ...formData, allergenUuid: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-red-500 focus:border-red-500"
                                    required
                                    disabled={isSubmitting || currentAllergenOptions.length === 0}
                                >
                                    <option value="">Select Allergen</option>
                                    {currentAllergenOptions.map(opt => (
                                        <option key={opt.uuid} value={opt.uuid}>{opt.display}</option>
                                    ))}
                                </select>
                                {currentAllergenOptions.length === 0 && formData.allergyType !== 'OTHER' && (
                                    <p className="mt-1 text-xs text-red-500">
                                        No concepts found. Check API or select &apos;OTHER&apos;.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* 2. Severity and Onset Date */}
                        <div className="grid grid-cols-2 gap-6">
                            {/* Severity */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                                <select
                                    value={formData.severity}
                                    onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-red-500 focus:border-red-500"
                                    disabled={isSubmitting}
                                >
                                    <option value="LOW">Low (Mild)</option>
                                    <option value="MODERATE">Moderate</option>
                                    <option value="HIGH">High (Life-Threatening)</option>
                                </select>
                            </div>
                            
                            {/* Onset Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Approximate Onset Date (Optional)</label>
                                <input
                                    type="date"
                                    value={formData.onsetDate}
                                    onChange={(e) => setFormData({ ...formData, onsetDate: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-red-500 focus:border-red-500"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                        
                        {/* 3. Reaction Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 required">
                                Documented Reactions (Select one or more)
                            </label>
                            <div className="flex flex-wrap gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                {MOCK_REACTION_CONCEPTS.map(reaction => (
                                    <button
                                        key={reaction.uuid}
                                        type="button"
                                        onClick={() => handleReactionToggle(reaction.uuid)}
                                        className={`px-3 py-1 text-sm font-medium rounded-full transition ${
                                            formData.reactionUuids.includes(reaction.uuid) 
                                                ? 'bg-red-600 text-white shadow-md' 
                                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-red-100'
                                        }`}
                                        disabled={isSubmitting}
                                    >
                                        {reaction.display}
                                    </button>
                                ))}
                            </div>
                            {formData.reactionUuids.length === 0 && (
                                <p className="mt-1 text-xs text-red-500">
                                    At least one reaction must be selected.
                                </p>
                            )}
                        </div>

                        {/* 4. Comment/Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Clinician Comment / Notes</label>
                            <textarea
                                value={formData.comment}
                                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                                rows={3}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-red-500 focus:border-red-500"
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
                                className="px-6 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-300 flex items-center"
                                disabled={isSubmitting || !isFormValid}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    `Document Allergy`
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}