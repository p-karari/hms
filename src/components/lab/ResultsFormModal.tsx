// components/laboratory/ResultsFormModal.tsx
'use client';

import { getTestFormFields } from '@/lib/lab/getConceptDetails';
import { LabResultSubmission } from '@/lib/lab/lab-order';
import { submitLabResults } from '@/lib/lab/submitLabResults';
import { useState, useEffect } from 'react';


interface ResultsFormModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ResultsFormModal({ order, isOpen, onClose }: ResultsFormModalProps) {
  const [formFields, setFormFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isOpen && order?.concept?.uuid) {
      loadFormFields();
    }
  }, [isOpen, order]);

  const loadFormFields = async () => {
    setLoading(true);
    try {
      const result = await getTestFormFields(order.concept.uuid);
      if (result.fields) {
        setFormFields(result.fields);
        
        // Initialize form data
        const initialData: Record<string, any> = {};
        result.fields.forEach((field: any) => {
          initialData[field.conceptUuid] = '';
        });
        setFormData(initialData);
      }
    } catch (error) {
      console.error('Failed to load form fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (fieldUuid: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldUuid]: value
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const submissionData: LabResultSubmission = {
        orderUuid: order.uuid,
        encounterUuid: order.encounter?.uuid,
        panelConceptUuid: formFields.length > 1 ? order.concept.uuid : undefined,
        results: formFields.map(field => ({
          conceptUuid: field.conceptUuid,
          display: field.display,
          datatype: field.datatype,
          value: formData[field.conceptUuid],
          units: field.units,
          answers: field.answers
        })),
        comment: 'Test Results Entered'
      };

      const result = await submitLabResults(submissionData);
      
      if (result.success) {
        alert('Results submitted successfully!');
        window.location.reload();
      } else {
        alert(`Failed to submit results: ${result.message}`);
      }
    } catch (error) {
      console.error('Error submitting results:', error);
      alert('Failed to submit results');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">{order.concept.display}</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          {loading ? (
            <div className="text-center py-8">Loading form...</div>
          ) : (
            <div className="space-y-4">
              {formFields.map((field) => (
                <div key={field.conceptUuid} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {field.display}
                    {field.units && ` (${field.units})`}
                    {field.lowAbsolute !== null && ` (>= ${field.lowAbsolute} ${field.units || ''})`}
                  </label>
                  
                  {field.datatype === 'Numeric' ? (
                    <input
                      type="number"
                      step={field.allowDecimal ? "0.1" : "1"}
                      value={formData[field.conceptUuid] || ''}
                      onChange={(e) => handleInputChange(field.conceptUuid, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder={`Enter ${field.display}`}
                    />
                  ) : field.datatype === 'Coded' && field.answers?.length > 0 ? (
                    <select
                      value={formData[field.conceptUuid] || ''}
                      onChange={(e) => handleInputChange(field.conceptUuid, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Choose an option</option>
                      {field.answers.map((answer: any) => (
                        <option key={answer.uuid} value={answer.uuid}>
                          {answer.display}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData[field.conceptUuid] || ''}
                      onChange={(e) => handleInputChange(field.conceptUuid, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder={`Enter ${field.display}`}
                    />
                  )}
                </div>
              ))}
              
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={submitting}
                >
                  Discard
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save and close'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}