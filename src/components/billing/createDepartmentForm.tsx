// components/billing/createDepartmentForm.tsx
'use client';

import React, { useState } from 'react';

interface DepartmentFormProps {
  createAction: (formData: FormData) => Promise<void>;
}

export default function DepartmentForm({ createAction }: DepartmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    const formData = new FormData(event.currentTarget);
    
    // Client-side validation
    if (!formData.get('name')) {
      setMessage('Error: Department Name is required.');
      setIsSubmitting(false);
      return;
    }

    try {
      await createAction(formData);
      setMessage('Success! Department has been created.');
      event.currentTarget.reset();
    } catch (error) {
      console.error(error);
      setMessage('An unexpected error occurred during department creation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Form Header */}
        <div className="border-b border-gray-200 pb-3">
          <h3 className="text-lg font-semibold text-gray-900">Create New Department</h3>
          <p className="text-sm text-gray-600 mt-1">Define a new billing department for organizing services</p>
        </div>

        {/* Department Name */}
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Department Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            required
            placeholder="e.g., Radiology, Pharmacy, Laboratory"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
          />
          <p className="text-xs text-gray-500">Enter a clear, descriptive name for the department</p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description <span className="text-sm text-gray-500 font-normal">(Optional)</span>
          </label>
          <textarea
            name="description"
            rows={3}
            placeholder="Describe the department's function, scope, and responsibilities..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors resize-none"
          />
          <p className="text-xs text-gray-500">This helps team members understand the department's purpose</p>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-3 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${message.includes('Error') ? 'bg-red-500' : 'bg-green-500'}`}></div>
              <span className="text-sm font-medium">{message}</span>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
              isSubmitting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Department...
              </span>
            ) : (
              'Create Department'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}