// components/billing/EditServiceForm.tsx - UPDATED VERSION
'use client';

import React, { useState, useEffect } from 'react';
import { ServiceType } from '@/lib/billing/getServiceTypes';
import { PaymentMode } from '@/lib/billing/getPaymentModes';

interface CashierService {
  service_id: number;
  service_name: string;
  short_name: string;
  service_type?: string;
  service_status: 'ENABLED' | 'DISABLED';
  prices?: string;
}

interface ServicePrice {
  item_price_id?: number;
  price: number;
  payment_mode?: number | null;
  price_name?: string;
  is_new?: boolean;
}

interface EditServiceData {
  service_id: number;
  name?: string;
  short_name?: string;
  service_type?: number | null;
  service_status?: string;
  prices?: ServicePrice[];
}

interface EditServiceFormProps {
  service: CashierService;
  serviceTypes: ServiceType[];
  paymentModes: PaymentMode[];
  updateAction: (data: EditServiceData) => Promise<void>;
}

export default function EditServiceForm({ 
  service, 
  serviceTypes,
  paymentModes,
  updateAction 
}: EditServiceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [prices, setPrices] = useState<ServicePrice[]>([
    { price: 0, payment_mode: null, price_name: 'Default Price', is_new: true }
  ]);
  
  // Find the current service type concept_id
  const findServiceTypeId = () => {
    if (!service.service_type) return '';
    const foundType = serviceTypes.find(type => 
      type.name === service.service_type
    );
    return foundType ? String(foundType.concept_id) : '';
  };

  const [formData, setFormData] = useState({
    name: service.service_name,
    short_name: service.short_name,
    service_type: findServiceTypeId(),
    service_status: service.service_status,
  });

  // Parse existing prices from service.prices string
  useEffect(() => {
    if (service.prices && service.prices !== 'No prices') {
      // Parse prices string like "Cash (300), Bank Transfer (300)"
      const priceStrings = service.prices.split(', ');
      const parsedPrices = priceStrings.map(priceStr => {
        const match = priceStr.match(/(.+?)\s*\((\d+)\)/);
        if (match) {
          const [, name, amount] = match;
          return {
            price: parseFloat(amount),
            price_name: name.trim(),
            is_new: false
          };
        }
        return { price: 0, price_name: 'Default Price', is_new: false };
      });
      setPrices(parsedPrices.length > 0 ? parsedPrices : [{ price: 0, payment_mode: null, price_name: 'Default Price', is_new: true }]);
    }
  }, [service.prices]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePriceChange = (index: number, field: keyof ServicePrice, value: any) => {
    const updatedPrices = [...prices];
    updatedPrices[index] = { ...updatedPrices[index], [field]: value };
    setPrices(updatedPrices);
  };

  const addPrice = () => {
    setPrices([...prices, { price: 0, payment_mode: null, price_name: 'Default Price', is_new: true }]);
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
    if (!formData.name || !formData.short_name) {
      setMessage('Error: Service Name and Short Name are required.');
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

    const updatePayload: EditServiceData = {
      service_id: service.service_id,
    };

    // Include changed fields
    if (formData.name !== service.service_name) {
      updatePayload.name = formData.name;
    }
    
    if (formData.short_name !== service.short_name) {
      updatePayload.short_name = formData.short_name;
    }
    
    if (formData.service_type !== findServiceTypeId()) {
      updatePayload.service_type = formData.service_type ? Number(formData.service_type) : null;
    }
    
    if (formData.service_status !== service.service_status) {
      updatePayload.service_status = formData.service_status;
    }

    // Always include prices if they exist
    if (validPrices.length > 0) {
      updatePayload.prices = validPrices;
    }

    try {
      await updateAction(updatePayload);
      setMessage('Success! Service has been updated.');
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
          <h3 className="text-xl font-bold text-gray-900">Edit Service</h3>
          <p className="text-sm text-gray-600 mt-2">
            Update service details and pricing in one sweep.
          </p>
        </div>

        <div className="space-y-5">
          {/* Service Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Service Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              id="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Short Name */}
          <div className="space-y-2">
            <label htmlFor="short_name" className="block text-sm font-medium text-gray-700">
              Short Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="short_name"
              id="short_name"
              required
              maxLength={50}
              value={formData.short_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Service Type */}
          <div className="space-y-2">
            <label htmlFor="service_type" className="block text-sm font-medium text-gray-700">
              Service Type
            </label>
            <select
              name="service_type"
              id="service_type"
              value={formData.service_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
            >
              <option value="">No service type selected</option>
              {serviceTypes.map((type) => (
                <option key={type.concept_id} value={type.concept_id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Service Status */}
          <div className="space-y-2">
            <label htmlFor="service_status" className="block text-sm font-medium text-gray-700">
              Service Status
            </label>
            <select
              name="service_status"
              id="service_status"
              value={formData.service_status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
            >
              <option value="ENABLED">ENABLED</option>
              <option value="DISABLED">DISABLED</option>
            </select>
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
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price.price}
                    onChange={(e) => handlePriceChange(index, 'price', parseFloat(e.target.value))}
                    placeholder="Amount"
                    className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={price.price_name || ''}
                    onChange={(e) => handlePriceChange(index, 'price_name', e.target.value)}
                    placeholder="Price Name"
                    className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div className="flex-1">
                  <select
                    value={price.payment_mode || ''}
                    onChange={(e) => handlePriceChange(index, 'payment_mode', e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm bg-white"
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
                Updating Service...
              </span>
            ) : (
              'Update Service & Prices'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}