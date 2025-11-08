'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, Pill, Apple, Leaf, AlertCircle, XCircle } from 'lucide-react';
import { getPatientAllergies, Allergy } from '@/lib/allergies/getPatientAllergies';

interface AllergyListTableProps {
  patientUuid: string;
  onRemoveAllergy?: (allergyUuid: string) => void;
}

export default function AllergyListTable({ patientUuid, onRemoveAllergy }: AllergyListTableProps) {
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'DRUG' | 'FOOD' | 'ENVIRONMENTAL'>('ALL');

  const fetchAllergies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPatientAllergies(patientUuid);
      setAllergies(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error fetching allergies:', e);
      setError('Failed to load patient allergy history.');
      setAllergies([]);
    } finally {
      setIsLoading(false);
    }
  }, [patientUuid]);

  useEffect(() => {
    fetchAllergies();
  }, [fetchAllergies]);

  const filteredAllergies = allergies.filter(allergy =>
    filterType === 'ALL' ? true : allergy.allergyType === filterType
  );

  const getSeverityClass = (severity: string | undefined) => {
    const s = severity?.toUpperCase();
    switch (s) {
      case 'HIGH':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'MODERATE':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'LOW':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  const getTypeIcon = (type: string | undefined) => {
    switch (type) {
      case 'DRUG':
        return <Pill className="w-3.5 h-3.5 mr-1.5" />;
      case 'FOOD':
        return <Apple className="w-3.5 h-3.5 mr-1.5" />;
      case 'ENVIRONMENTAL':
        return <Leaf className="w-3.5 h-3.5 mr-1.5" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5 mr-1.5" />;
    }
  };

  const safeDisplay = (value: any): string => {
    if (!value) return 'Unknown';
    if (typeof value === 'string') return value;
    if (value.display) return value.display;
    if (value.name) return value.name;
    return 'Unknown';
  };

  if (error) {
    return (
      <div className="text-center p-4 border border-red-200 bg-red-50 text-red-600 rounded-lg flex items-center justify-center text-sm">
        <AlertTriangle className="w-4 h-4 mr-2" />
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
        <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
        Documented Allergies / ADRs
      </h3>

      <div className="mb-4 flex items-center space-x-2">
        <span className="text-xs font-medium text-gray-600">Filter:</span>
        {(['ALL', 'DRUG', 'FOOD', 'ENVIRONMENTAL'] as const).map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
              filterType === type
                ? 'bg-red-100 text-red-700 border border-red-200'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
            disabled={isLoading}
          >
            {type.charAt(0) + type.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center p-8 text-gray-600">
          <Loader2 className="w-5 h-5 mx-auto animate-spin mb-2" />
          <div className="text-sm">Loading allergy records...</div>
        </div>
      ) : allergies.length === 0 ? (
        <div className="text-center p-6 text-gray-600 border border-dashed border-gray-300 rounded-lg bg-gray-50 text-sm">
          ✅ No known allergies documented
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Allergen
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Type
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Severity
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Reactions
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAllergies.map(allergy => (
                <tr key={allergy.uuid} className="hover:bg-gray-50">
                  <td className="px-3 py-3 text-sm text-gray-900 font-medium max-w-xs break-words">
                    {safeDisplay(allergy.display || allergy.allergen)}
                  </td>

                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 flex items-center">
                    {getTypeIcon(allergy.allergyType)}
                    {allergy.allergyType || 'Unknown'}
                  </td>

                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${getSeverityClass(
                        safeDisplay(allergy.severity || allergy.severity)
                      )}`}
                    >
                      {safeDisplay(allergy.severity || allergy.severity)}
                    </span>
                  </td>

                  <td className="px-3 py-3 text-sm text-gray-600">
                    {Array.isArray(allergy.reactions) && allergy.reactions.length > 0
                      ? allergy.reactions.map(r => safeDisplay(r.display || r)).join(', ')
                      : 'None'}
                  </td>

                  <td className="px-3 py-3 whitespace-nowrap text-right">
                    <button
                      onClick={() => onRemoveAllergy && onRemoveAllergy(allergy.uuid)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove Allergy"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}