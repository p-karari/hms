'use client';

import { useState, useEffect } from 'react';
import { X, Package, Calendar, User, Pill } from 'lucide-react';
import type { DispenseModalProps, DispenseFormData, DispenseOptions } from '@/lib/pharmacy/pharmacy';
import { fetchDispenseOptions } from '@/lib/pharmacy/fetch-dispense-options';

export default function DispenseModal({
  isOpen,
  onClose,
  prescription,
  patientInfo,
  onSubmit,
}: DispenseModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<DispenseOptions | null>(null);
  const [selectedPractitionerId, setSelectedPractitionerId] = useState<string>('');
  const [formData, setFormData] = useState<Partial<DispenseFormData>>({
    quantityDispensed: prescription.quantity?.value || 0,
    unit: prescription.quantity?.unit || '',
    dose: prescription.dosage?.doseAndRate?.[0]?.doseQuantity?.value || 0,
    doseUnit: prescription.dosage?.doseAndRate?.[0]?.doseQuantity?.unit || '',
    route: prescription.dosage?.route?.text || '',
    frequency: prescription.dosage?.timing?.code?.text || '',
    instructions: prescription.instructions,
    dispenseDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (isOpen) {
      loadOptions();
    }
  }, [isOpen]);

  const loadOptions = async () => {
    try {
      const data = await fetchDispenseOptions();
      setOptions(data);
      
      // Find current user (check for various possible labels)
      if (data.practitioners && data.practitioners.length > 0) {
        const possibleCurrentUserLabels = ['Current User', 'CurrentUser', 'current user', 'current_user'];
        const currentUser = data.practitioners.find(p => 
          possibleCurrentUserLabels.some(label => 
            p.label.toLowerCase().includes(label.toLowerCase())
          )
        );
        
        // If current user found, select it
        if (currentUser) {
          setSelectedPractitionerId(currentUser.value);
        } else {
          // Otherwise use first practitioner
          setSelectedPractitionerId(data.practitioners[0].value);
        }
      }
    } catch (error) {
      console.error('Failed to load options:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Get the selected practitioner
      const selectedPractitioner = options?.practitioners.find(p => p.value === selectedPractitionerId);
      
      // Find codes for the selected options
      const unitOption = options?.units.find(u => u.label === formData.unit);
      const doseUnitOption = options?.doseUnits.find(u => u.label === formData.doseUnit);
      const routeOption = options?.routes.find(r => r.label === formData.route);
      const frequencyOption = options?.frequencies.find(f => f.label === formData.frequency);

      // Create a full ISO timestamp with current time instead of date-only
      const now = new Date();
      const selectedDate = formData.dispenseDate ? new Date(formData.dispenseDate) : now;
      
      // Combine selected date with current time
      selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      const dispenseDateTime = selectedDate.toISOString();

      const fullData: DispenseFormData = {
        prescriptionId: prescription.id,
        medicationId: prescription.drugUuid || '',
        medicationDisplay: prescription.drugs || `Medication ${prescription.drugUuid}`,
        patientId: prescription.patientUuid,
        encounterId: prescription.encounterId,
        quantityPrescribed: prescription.quantity?.value || 0,
        quantityDispensed: formData.quantityDispensed || 0,
        unit: formData.unit || '',
        unitCode: unitOption?.code || formData.unit || '',
        dose: formData.dose || 0,
        doseUnit: formData.doseUnit || '',
        doseUnitCode: doseUnitOption?.code || formData.doseUnit || '',
        route: formData.route || '',
        routeCode: routeOption?.code || formData.route || '',
        frequency: formData.frequency || '',
        frequencyCode: frequencyOption?.code || formData.frequency || '',
        instructions: formData.instructions || '',
        dispensedBy: selectedPractitioner?.label || 'Current User',
        dispensedByPractitionerId: selectedPractitionerId || 'user-uuid',
        locationId: patientInfo?.locationId || '',
        dispenseDate: dispenseDateTime,
        duration: prescription.dosage?.timing?.repeat?.duration,
        durationUnit: prescription.dosage?.timing?.repeat?.durationUnit,
      };
      
      console.log('Dispense form data being submitted:', fullData);
      
      await onSubmit(fullData);
      onClose();
    } catch (error) {
      console.error('Failed to dispense:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Dispense Medication</h3>
                <p className="text-sm text-gray-600 mt-1">
                  You may edit the formulation and quantity dispensed here
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Patient and Medication Info Card */}
          <div className="bg-gray-50 rounded-xl p-5 mb-6 border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg border border-gray-200">
                  <Pill className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900 mb-1">{prescription.drugs}</div>
                  <div className="text-sm text-gray-600">
                    {prescription.dosage?.doseAndRate?.[0]?.doseQuantity?.value || 'N/A'} {prescription.dosage?.doseAndRate?.[0]?.doseQuantity?.unit || ''} • 
                    {prescription.dosage?.route?.text ? ` ${prescription.dosage.route.text} •` : ''}
                    {prescription.dosage?.timing?.code?.text ? ` ${prescription.dosage.timing.code.text}` : ''}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-700">Quantity Prescribed</div>
                <div className="text-2xl font-bold text-blue-600">{prescription.quantity?.value}</div>
              </div>
            </div>
            
            {patientInfo && (
              <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{patientInfo.name}</span>
                  <span className="text-gray-500">• ID: {patientInfo.identifier}</span>
                </div>
                <div className="text-sm text-gray-500">
                  Location: <span className="font-medium">{patientInfo.location}</span>
                </div>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Quantity Dispensed */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Quantity to Dispense
                    </span>
                  </label>
                  <input
                    type="number"
                    value={formData.quantityDispensed}
                    onChange={(e) => setFormData({...formData, quantityDispensed: parseFloat(e.target.value)})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg"
                    min="0"
                    max={prescription.quantity?.value}
                    required
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Maximum: {prescription.quantity?.value} {prescription.quantity?.unit}
                  </div>
                </div>

                {/* Dispensing Unit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dispensing Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  >
                    <option value="">Select dispensing unit</option>
                    {options?.units.map((unit) => (
                      <option key={unit.value} value={unit.label}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dose - Fixed non-overlapping layout */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dose
                  </label>
                  <div className="flex items-center gap-3">
                    {/* Dose value input - smaller width */}
                    <div className="w-24">
                      <input
                        type="number"
                        value={formData.dose}
                        onChange={(e) => setFormData({...formData, dose: parseFloat(e.target.value)})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        step="0.1"
                        required
                      />
                    </div>
                    
                    {/* Dose unit select - takes remaining space */}
                    <div className="flex-1">
                      <select
                        value={formData.doseUnit}
                        onChange={(e) => setFormData({...formData, doseUnit: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        required
                      >
                        <option value="">Select dose unit</option>
                        {options?.doseUnits.map((unit) => (
                          <option key={unit.value} value={unit.label}>
                            {unit.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Enter dose value and select unit
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Route */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Route of Administration
                  </label>
                  <select
                    value={formData.route}
                    onChange={(e) => setFormData({...formData, route: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  >
                    <option value="">Select route</option>
                    {options?.routes.map((route) => (
                      <option key={route.value} value={route.label}>
                        {route.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  >
                    <option value="">Select frequency</option>
                    {options?.frequencies.map((freq) => (
                      <option key={freq.value} value={freq.label}>
                        {freq.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date and Time of Dispense */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date and Time of Dispense
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={formData.dispenseDate}
                      onChange={(e) => setFormData({...formData, dispenseDate: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      required
                    />
                    <input
                      type="time"
                      defaultValue={new Date().toTimeString().slice(0,5)}
                      onChange={(e) => {
                        const time = e.target.value;
                        if (time && formData.dispenseDate) {
                          const [hours, minutes] = time.split(':');
                          const date = new Date(formData.dispenseDate);
                          date.setHours(parseInt(hours), parseInt(minutes));
                          setFormData({
                            ...formData, 
                            dispenseDate: date.toISOString().split('T')[0]
                          });
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Current time will be used if time not specified
                  </div>
                </div>

                {/* Dispensed By - Auto-selected to current user */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dispensed By
                  </label>
                  <select
                    value={selectedPractitionerId}
                    onChange={(e) => setSelectedPractitionerId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50"
                    required
                  >
                    {options?.practitioners.map((practitioner) => (
                      <option key={practitioner.value} value={practitioner.value}>
                        {practitioner.label}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-gray-500 mt-1">
                    Please select only your user.
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions - Full Width */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient Instructions
              </label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                rows={3}
                placeholder="Enter any special instructions for the patient..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Dispensing...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4" />
                    Dispense Prescription
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}