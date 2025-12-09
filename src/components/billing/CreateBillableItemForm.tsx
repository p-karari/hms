// components/billing/CreateBillableItemForm.tsx
'use client';

import React, { useState } from 'react';

interface CashierDepartment {
  department_id: number;
  name: string;
}

interface CreateItemFormProps {
  departments: CashierDepartment[];
  createAction: (formData: FormData) => Promise<void>;
}

export default function CreateItemForm({ departments, createAction }: CreateItemFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    const formData = new FormData(event.currentTarget);
    
    // Basic validation
    if (!formData.get('name') || !formData.get('departmentId') || !formData.get('price')) {
      setMessage('Error: All required fields must be filled.');
      setIsSubmitting(false);
      return;
    }

    try {
      await createAction(formData);
      setMessage('Success! New service item has been created.');
      event.currentTarget.reset();
    } catch (error) {
      console.error(error);
      setMessage('An unexpected error occurred during creation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Form Header */}
        <div className="border-b border-gray-200 pb-3">
          <h3 className="text-lg font-semibold text-gray-900">Create Simple Billable Item</h3>
          <p className="text-sm text-gray-600 mt-1">Define a basic service item with department and pricing</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Service Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Service Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g., X-Ray Scan"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Department */}
          <div className="space-y-2">
            <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              name="departmentId"
              required
              defaultValue=""
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
            >
              <option value="" disabled className="text-gray-400">Select a Department</option>
              {departments && departments.length > 0 ? (
                departments.map((dept) => (
                  <option key={dept.department_id} value={String(dept.department_id)}>
                    {dept.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>No departments available</option>
              )}
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description <span className="text-sm text-gray-500 font-normal">(Optional)</span>
          </label>
          <textarea
            name="description"
            rows={3}
            placeholder="Provide details about this service item..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
          />
        </div>

        {/* Initial Price */}
        <div className="space-y-2">
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">
            Default Price <span className="text-red-500">*</span>
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              name="price"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
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
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Service Item...
              </span>
            ) : (
              'Define Service Item'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}