// components/billing/EditBillableItemForm.tsx
'use client';

import React, { useState, useEffect } from 'react';

interface CashierDepartment {
  department_id: number;
  name: string;
}

interface CashierItem {
  item_id: number;
  name: string;
  description: string;
  department_id: number;
  default_price_id: number | null;
  uuid: string;
  price?: number;
  department_name?: string;
}

interface ItemPrice {
  price: number;
  price_name?: string;
  payment_mode?: number | null;
  is_new?: boolean;
}

interface EditItemData {
  item_id: number;
  name?: string;
  description?: string | null;
  department_id?: number;
  prices?: ItemPrice[];
}

interface EditBillableItemFormProps {
  item: CashierItem;
  departments: CashierDepartment[];
  paymentModes: Array<{ payment_mode_id: number; name: string }>;
  updateAction: (data: EditItemData) => Promise<void>;
}

export default function EditBillableItemForm({ 
  item, 
  departments,
  paymentModes,
  updateAction 
}: EditBillableItemFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [prices, setPrices] = useState<ItemPrice[]>([
    { price: item.price || 0, price_name: 'Default Price', payment_mode: null, is_new: false }
  ]);

  const [formData, setFormData] = useState({
    name: item.name,
    description: item.description || '',
    department_id: String(item.department_id),
  });

  useEffect(() => {
    // If we have an existing price, use it
    if (item.price && item.price > 0) {
      setPrices([{ 
        price: item.price, 
        price_name: 'Default Price', 
        payment_mode: null, 
        is_new: false 
      }]);
    }
  }, [item.price]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePriceChange = (index: number, field: keyof ItemPrice, value: any) => {
    const updatedPrices = [...prices];
    updatedPrices[index] = { ...updatedPrices[index], [field]: value, is_new: true };
    setPrices(updatedPrices);
  };

  const addPrice = () => {
    setPrices([...prices, { price: 0, price_name: 'Default Price', payment_mode: null, is_new: true }]);
  };

  const removePrice = (index: number) => {
    if (prices.length > 1) {
      const updatedPrices = [...prices];
      updatedPrices.splice(index, 1);
      setPrices(updatedPrices);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    // Validation
    if (!formData.name || !formData.department_id) {
      setMessage('Error: Item Name and Department are required.');
      setIsSubmitting(false);
      return;
    }

    const departmentId = Number(formData.department_id);
    if (isNaN(departmentId) || departmentId <= 0) {
      setMessage('Error: Please select a valid department.');
      setIsSubmitting(false);
      return;
    }

    // Validate prices
    const validPrices = prices.filter(p => p.price > 0);
    if (validPrices.length === 0) {
      setMessage('Error: At least one valid price (greater than 0) is required.');
      setIsSubmitting(false);
      return;
    }

    const updatePayload: EditItemData = {
      item_id: item.item_id,
    };

    // Only include changed fields
    if (formData.name !== item.name) {
      updatePayload.name = formData.name;
    }
    
    if (formData.description !== item.description) {
      updatePayload.description = formData.description || null;
    }
    
    if (departmentId !== item.department_id) {
      updatePayload.department_id = departmentId;
    }

    // Always include prices if they exist and are valid
    if (validPrices.length > 0) {
      updatePayload.prices = validPrices;
    }

    // Check if anything actually changed
    const hasChanges = Object.keys(updatePayload).length > 1; // More than just item_id
    if (!hasChanges) {
      setMessage('No changes detected.');
      setIsSubmitting(false);
      return;
    }

    try {
      await updateAction(updatePayload);
      setMessage('Success! Billable item has been updated.');
    } catch (error) {
      console.error('Update error:', error);
      setMessage('An unexpected error occurred during update.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Header */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-xl font-bold text-gray-900">Edit Billable Item</h3>
          <p className="text-sm text-gray-600 mt-2">
            Update billable item details and pricing.
          </p>
        </div>

        <div className="space-y-5">
          {/* Item Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              id="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., X-Ray Scan"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Department */}
          <div className="space-y-2">
            <label htmlFor="department_id" className="block text-sm font-medium text-gray-700">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              name="department_id"
              id="department_id"
              required
              value={formData.department_id}
              onChange={handleChange}
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

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description <span className="text-sm text-gray-500 font-normal">(Optional)</span>
            </label>
            <textarea
              name="description"
              id="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide details about this service item..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          {/* Prices Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">
                Prices <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addPrice}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Price
              </button>
            </div>
            
            {prices.map((price, index) => (
              <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                <div className="flex-1">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={price.price}
                      onChange={(e) => handlePriceChange(index, 'price', parseFloat(e.target.value))}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={price.price_name || ''}
                    onChange={(e) => handlePriceChange(index, 'price_name', e.target.value)}
                    placeholder="Price Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div className="flex-1">
                  <select
                    value={price.payment_mode || ''}
                    onChange={(e) => handlePriceChange(index, 'payment_mode', e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                  >
                    <option value="">No Payment Mode</option>
                    {paymentModes.map((mode) => (
                      <option key={mode.payment_mode_id} value={mode.payment_mode_id}>
                        {mode.name}
                      </option>
                    ))}
                  </select>
                </div>
                {prices.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePrice(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Read-only reference info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Reference Information</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Item ID:</span>
              <span className="ml-2 font-medium text-gray-900">{item.item_id}</span>
            </div>
            <div>
              <span className="text-gray-500">Current Department:</span>
              <span className="ml-2 font-medium text-gray-900">
                {departments.find(d => d.department_id === item.department_id)?.name || item.department_id}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Current Price:</span>
              <span className="ml-2 font-medium text-gray-900">${item.price || 'Not set'}</span>
            </div>
            {item.default_price_id && (
              <div>
                <span className="text-gray-500">Default Price ID:</span>
                <span className="ml-2 font-medium text-gray-900">{item.default_price_id}</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-3 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700' : message.includes('No changes') ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                message.includes('Error') ? 'bg-red-500' : 
                message.includes('No changes') ? 'bg-yellow-500' : 
                'bg-green-500'
              }`}></div>
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
                Updating Item...
              </span>
            ) : (
              'Update Billable Item'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}