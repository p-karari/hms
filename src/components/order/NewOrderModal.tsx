'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, X } from 'lucide-react';

import { getOrderConceptOptions, OrderableConceptOption } from '@/lib/order/getOrderConceptOptions';
import { submitNewClinicalOrder, NewOrderSubmissionData } from '@/lib/order/submitNewClinicalOrder';

interface NewOrderModalProps {
  patientUuid: string;
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: () => void;
}

export default function NewOrderModal({ patientUuid, isOpen, onClose, onOrderSuccess }: NewOrderModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingConcepts, setIsLoadingConcepts] = useState(true);
  const [labConcepts, setLabConcepts] = useState<OrderableConceptOption[]>([]);

  const [formData, setFormData] = useState({
    conceptUuid: '',
    instructions: '',
    urgency: 'ROUTINE' as 'ROUTINE' | 'STAT',
    specimenSourceUuid: '',
  });

  // --- Fetch lab concepts on open ---
  const fetchConcepts = useCallback(async () => {
    setIsLoadingConcepts(true);
    try {
      const lists = await getOrderConceptOptions();
      setLabConcepts(lists.labTests);
    } catch (error) {
      console.error('Failed to load lab order concepts:', error);
      alert('Error loading lab order options.');
    } finally {
      setIsLoadingConcepts(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchConcepts();
  }, [isOpen, fetchConcepts]);

  const handleClose = () => {
    setFormData({
      conceptUuid: '',
      instructions: '',
      urgency: 'ROUTINE',
      specimenSourceUuid: '',
    });
    onClose();
  };

  const isFormValid = !!formData.conceptUuid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      alert('Please select a lab test to order.');
      return;
    }

    setIsSubmitting(true);

    const payload: NewOrderSubmissionData = {
      patientUuid,
      conceptUuid: formData.conceptUuid,
      orderType: 'testorder',
      instructions: formData.instructions,
      urgency: formData.urgency,
      specimenSourceUuid: formData.specimenSourceUuid || undefined,
    };

    try {
      await submitNewClinicalOrder(payload);
      alert('Lab order submitted successfully.');
      onOrderSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Order submission failed:', error);
      alert(`Failed to submit lab order: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 relative">
        <h2 className="text-xl font-bold border-b pb-3 mb-4">Create New Lab Order</h2>

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
          disabled={isSubmitting}
        >
          <X className="w-5 h-5" />
        </button>

        {isLoadingConcepts ? (
          <div className="text-center p-8 text-blue-600">
            <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
            Loading lab test options...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Lab Concept Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lab Test</label>
              <select
                value={formData.conceptUuid}
                onChange={(e) => setFormData({ ...formData, conceptUuid: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isSubmitting || labConcepts.length === 0}
              >
                <option value="">Select Lab Test</option>
                {labConcepts.map((opt) => (
                  <option key={opt.uuid} value={opt.uuid}>
                    {opt.display}
                  </option>
                ))}
              </select>
            </div>

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
                <option value="STAT">STAT (Immediate)</option>
              </select>
            </div>

            {/* Specimen Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specimen Source (Optional)</label>
              <input
                type="text"
                value={formData.specimenSourceUuid}
                onChange={(e) => setFormData({ ...formData, specimenSourceUuid: e.target.value })}
                placeholder="e.g. Blood, Urine, Swab..."
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSubmitting}
              />
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructions / Notes</label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSubmitting}
              />
            </div>

            {/* Submit / Cancel */}
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
                  'Submit Lab Order'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
