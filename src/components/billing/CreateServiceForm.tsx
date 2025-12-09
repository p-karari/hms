// components/billing/CreateServiceForm.tsx
'use client';

import React, { useState } from 'react';

interface CashierDepartment {
  department_id: number;
  name: string;
}

interface ServiceType {
  concept_id: number;
  name: string;
}

interface PaymentMode {
  payment_mode_id: number;
  name: string;
  description?: string;
}

interface FullServiceFormData {
  serviceName: string;
  departmentId: number;
  initialPrice: number;
  shortName: string;
  itemDescription: string | null;
  serviceTypeId: number | null;
  paymentModeId: number | null;
}

interface CreateServiceFormProps {
  departments: CashierDepartment[];
  serviceTypes: ServiceType[];
  paymentModes: PaymentMode[];
  createAction: (data: FullServiceFormData) => Promise<void>;
}

export default function CreateServiceForm({ 
  departments, 
  serviceTypes, 
  paymentModes,
  createAction 
}: CreateServiceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    const formData = new FormData(event.currentTarget);
    
    // Extract and type form data
    const serviceName = formData.get('serviceName') as string;
    const departmentId = Number(formData.get('departmentId'));
    const initialPrice = parseFloat(formData.get('price') as string);
    const shortName = formData.get('shortName') as string;
    const itemDescription = (formData.get('description') as string) || null;
    const serviceTypeIdStr = formData.get('serviceTypeId') as string;
    const paymentModeIdStr = formData.get('paymentModeId') as string;
    
    const serviceTypeId = serviceTypeIdStr ? Number(serviceTypeIdStr) : null;
    const paymentModeId = paymentModeIdStr ? Number(paymentModeIdStr) : null;

    // Client-side Validation
    if (!serviceName || !shortName || isNaN(departmentId) || departmentId <= 0 || isNaN(initialPrice) || initialPrice <= 0) {
      setMessage('Error: Service Name, Short Name, Department, and a positive Price are required.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Call the Server Action
      await createAction({
        serviceName,
        departmentId,
        initialPrice,
        shortName,
        itemDescription,
        serviceTypeId,
        paymentModeId,
      });
      setMessage('Success! Full Billable Service (Concept, Item, Price) created and saved.');
      event.currentTarget.reset();
    } catch (error) {
      console.error('Submission error:', error);
      setMessage('An unexpected error occurred during service creation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Header */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-xl font-bold text-gray-900">Create Comprehensive Service</h3>
          <p className="text-sm text-gray-600 mt-2">
            Define a complete billable service including OpenMRS Concept, Service Definition, Item, and Default Price.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Service Name */}
          <div className="space-y-2">
            <label htmlFor="serviceName" className="block text-sm font-medium text-gray-700">
              Full Service Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="serviceName"
              required
              placeholder="e.g., Complete Blood Count (CBC)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            <p className="text-xs text-gray-500">The complete name as it will appear in medical records</p>
          </div>

          {/* Short Name */}
          <div className="space-y-2">
            <label htmlFor="shortName" className="block text-sm font-medium text-gray-700">
              Short Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="shortName"
              required
              maxLength={50}
              placeholder="e.g., CBC"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            <p className="text-xs text-gray-500">Max 50 characters for quick reference</p>
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
              {departments.map((dept) => (
                <option key={dept.department_id} value={dept.department_id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Service Type */}
          <div className="space-y-2">
            <label htmlFor="serviceTypeId" className="block text-sm font-medium text-gray-700">
              Service Type <span className="text-sm text-gray-500 font-normal">(Optional)</span>
            </label>
            <select
              name="serviceTypeId"
              defaultValue=""
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
            >
              <option value="" className="text-gray-400">Select Service Type (Optional)</option>
              {serviceTypes.map((type) => (
                <option key={type.concept_id} value={type.concept_id}>
                  {type.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">Category for organizing services</p>
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
                min="0.01"
                required
                placeholder="0.00"
                className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <p className="text-xs text-gray-500">Set the base price for this service</p>
          </div>

          {/* Payment Mode */}
          <div className="space-y-2">
            <label htmlFor="paymentModeId" className="block text-sm font-medium text-gray-700">
              Payment Mode <span className="text-sm text-gray-500 font-normal">(Optional)</span>
            </label>
            <select
              name="paymentModeId"
              defaultValue=""
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
            >
              <option value="" className="text-gray-400">Select Payment Mode (Optional)</option>
              {paymentModes.map((mode) => (
                <option key={mode.payment_mode_id} value={mode.payment_mode_id}>
                  {mode.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">Default payment method for this price</p>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Service Description <span className="text-sm text-gray-500 font-normal">(Optional)</span>
          </label>
          <textarea
            name="description"
            rows={3}
            placeholder="Provide detailed information about this service including procedure, requirements, and billing notes..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
          />
          <p className="text-xs text-gray-500">This description will be used for billing and reference purposes</p>
        </div>

        {/* Service Components Preview */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">This action will create:</h4>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span>OpenMRS Concept with specified name and short name</span>
            </li>
            {serviceTypes.length > 0 && (
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <span>Billable Service with selected service type</span>
              </li>
            )}
            <li className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span>Billable Item assigned to the selected department</span>
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span>Default price with selected payment mode</span>
            </li>
          </ul>
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
                Creating All Components...
              </span>
            ) : (
              'Create Complete Billable Service'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}