'use client';

import { useState } from 'react';
import { X, AlertTriangle, Pause, XCircle, Play } from 'lucide-react';
import { StatusUpdateModalProps } from '@/lib/pharmacy/pharmacy';
// import type { StatusUpdateModalProps } from '@/types/pharmacy';

export default function StatusUpdateModal({
  isOpen,
  onClose,
  prescription,
  action,
  onSubmit,
}: StatusUpdateModalProps) {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const actionConfig = {
    pause: {
      icon: Pause,
      title: 'Pause Prescription',
      description: 'Temporarily pause this prescription.',
      buttonText: 'Pause',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
    },
    close: {
      icon: XCircle,
      title: 'Close Prescription',
      description: 'Permanently close this prescription.',
      buttonText: 'Close',
      buttonColor: 'bg-red-600 hover:bg-red-700',
    },
    reactivate: {
      icon: Play,
      title: 'Reactivate Prescription',
      description: 'Reactivate this prescription.',
      buttonText: 'Reactivate',
      buttonColor: 'bg-green-600 hover:bg-green-700',
    },
  };

  const config = actionConfig[action];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await onSubmit(reason || undefined);
      onClose();
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                action === 'pause' ? 'bg-yellow-100' :
                action === 'close' ? 'bg-red-100' :
                'bg-green-100'
              }`}>
                <config.icon className={`h-5 w-5 ${
                  action === 'pause' ? 'text-yellow-600' :
                  action === 'close' ? 'text-red-600' :
                  'text-green-600'
                }`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{config.description}</p>
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
          {/* Prescription Info */}
          <div className="mb-6">
            <div className="font-medium text-gray-900">{prescription.drugs}</div>
            <div className="text-sm text-gray-600 mt-1">
              Patient: {prescription.patientName} • Prescriber: {prescription.prescriber}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {action === 'close' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for closing (optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Enter reason for closing this prescription..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>
            )}

            {/* Warning for close action */}
            {action === 'close' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <div className="font-medium">Warning: This action cannot be undone</div>
                    <p className="mt-1">Closing a prescription will permanently mark it as completed and cannot be reversed.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`flex-1 px-6 py-2.5 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${config.buttonColor}`}
              >
                {isLoading ? 'Processing...' : config.buttonText}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}