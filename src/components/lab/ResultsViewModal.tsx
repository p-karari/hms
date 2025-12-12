// components/laboratory/ResultsViewModal.tsx
'use client';

import { getOrderResults } from '@/lib/lab/getOrderResults';
import { useState, useEffect } from 'react';

interface ResultsViewModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ResultsViewModal({ order, isOpen, onClose }: ResultsViewModalProps) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && order?.uuid) {
      loadResults();
    }
  }, [isOpen, order]);

  const loadResults = async () => {
    setLoading(true);
    try {
      const result = await getOrderResults(order.uuid);
      setResults(result.results || []);
    } catch (error) {
      console.error('Failed to load results:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">
              Test Results - {order.concept.display}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          {loading ? (
            <div className="text-center py-8">Loading results...</div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No results found for this order.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Order Number:</div>
                    <div className="text-sm text-gray-900">{order.orderNumber}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Patient:</div>
                    <div className="text-sm text-gray-900">{order.patient.person.display}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Status:</div>
                    <div className="text-sm text-gray-900">{order.fulfillerStatus}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Completed:</div>
                    <div className="text-sm text-gray-900">
                      {order.dateStopped ? new Date(order.dateStopped).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Results Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Test
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Result
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Units
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Reference Range
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {results.flatMap((obs: any) => {
                      if (obs.groupMembers && obs.groupMembers.length > 0) {
                        return obs.groupMembers.map((member: any) => (
                          <tr key={member.uuid}>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {member.concept.display}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {member.value}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {/* Would need additional API call for units */}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {/* Would need additional API call for ranges */}
                            </td>
                          </tr>
                        ));
                      }
                      return (
                        <tr key={obs.uuid}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {obs.concept.display}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {obs.value}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {/* Units */}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {/* Reference range */}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}