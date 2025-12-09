// components/billing/EditDepartmentForm.tsx
'use client';

import React, { useState } from 'react';

interface Department {
  department_id: number;
  name: string;
  description?: string;
}

interface EditDepartmentData {
  department_id: number;
  name?: string;
  description?: string | null;
}

interface EditDepartmentFormProps {
  department: Department;
  updateAction: (data: EditDepartmentData) => Promise<void>;
}

export default function EditDepartmentForm({ 
  department, 
  updateAction 
}: EditDepartmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  
  const [formData, setFormData] = useState({
    name: department.name,
    description: department.description || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    if (!formData.name) {
      setMessage('Error: Department Name is required.');
      setIsSubmitting(false);
      return;
    }

    const updatePayload: EditDepartmentData = {
      department_id: department.department_id,
    };

    // Only include changed fields
    if (formData.name !== department.name) {
      updatePayload.name = formData.name;
    }
    
    if (formData.description !== department.description) {
      updatePayload.description = formData.description || null;
    }

    // If nothing changed
    if (Object.keys(updatePayload).length === 1) {
      setMessage('No changes detected.');
      setIsSubmitting(false);
      return;
    }

    try {
      await updateAction(updatePayload);
      setMessage('Success! Department has been updated.');
    } catch (error) {
      console.error('Update error:', error);
      setMessage('An unexpected error occurred during update.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-xl font-bold text-gray-900">Edit Department</h3>
          <p className="text-sm text-gray-600 mt-2">Update department information</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Department Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Radiology, Pharmacy, Laboratory"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="A brief explanation of the department's function..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors resize-none"
            />
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${message.includes('Error') ? 'bg-red-500' : 'bg-green-500'}`}></div>
              <span className="text-sm font-medium">{message}</span>
            </div>
          </div>
        )}

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
            {isSubmitting ? 'Updating...' : 'Update Department'}
          </button>
        </div>
      </form>
    </div>
  );
}