'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, ChevronDown, ChevronUp, Search } from 'lucide-react';

import { getPatientLabResults, LabResult } from '@/lib/results/getPatientLabResults';
import { getLabTestConcepts, LabTestConceptOption } from '@/lib/results/getLabTestConcepts';
import { formatDate } from '@/lib/utils/utils';

interface LabResultsTableProps {
    patientUuid: string;
}


export default function LabResultsTable({ patientUuid }: LabResultsTableProps) {
    const [results, setResults] = useState<LabResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedConceptUuid, setSelectedConceptUuid] = useState<string>('');
    const [testConcepts, setTestConcepts] = useState<LabTestConceptOption[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [sortConfig, setSortConfig] = useState<{ key: keyof LabResult; direction: 'ascending' | 'descending' } | null>({
        key: 'obsDatetime',
        direction: 'descending',
    });

    const fetchResults = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getPatientLabResults(patientUuid);
            setResults(data);
        } catch (e) {
            console.error("Error fetching lab results:", e);
            setError("Failed to load patient lab history. Check server logs.");
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [patientUuid]);

    const fetchConcepts = useCallback(async () => {
        try {
            const concepts = await getLabTestConcepts();
            setTestConcepts(concepts);
        } catch (e) {
            console.error("Error fetching lab test concepts:", e);
        }
    }, []);

    useEffect(() => {
        fetchResults();
        fetchConcepts();
    }, [fetchResults, fetchConcepts]);

    const filteredResults = results
        .filter(result => 
            !selectedConceptUuid || result.concept.uuid === selectedConceptUuid
        )
        .filter(result => 
            result.display.toLowerCase().includes(searchTerm.toLowerCase())
        );

    const sortedResults = [...filteredResults].sort((a, b) => {
        if (!sortConfig) return 0;
        
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (sortConfig.key === 'obsDatetime') {
            const dateA = new Date(aValue as string).getTime();
            const dateB = new Date(bValue as string).getTime();
            
            if (sortConfig.direction === 'ascending') {
                return dateA - dateB;
            }
            return dateB - dateA;
        }

        if (aValue && bValue) {
        
        if (aValue < bValue) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
        }

        }
        
        return 0;
    });

    const requestSort = (key: keyof LabResult) => {
        let direction: 'ascending' | 'descending' = 'descending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'ascending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: keyof LabResult) => {
        if (sortConfig?.key !== key) return null;
        return sortConfig.direction === 'ascending' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />;
    };

    const getInterpretationClass = (interpretation: LabResult['interpretation']) => {
        if (!interpretation) return 'text-gray-500 bg-gray-100';
        switch (interpretation) {
            case 'CRITICAL':
                return 'text-red-700 bg-red-100 font-bold';
            case 'ABNORMAL':
                return 'text-orange-700 bg-orange-100 font-medium';
            case 'NORMAL':
                return 'text-green-700 bg-green-100';
            default:
                return 'text-gray-500 bg-gray-100';
        }
    };

    if (error) {
        return (
            <div className="text-center p-8 border border-red-300 bg-red-50 text-red-700 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 mr-3" />
                {error}
            </div>
        );
    }

    return (
        <div className="bg-white shadow-xl rounded-xl p-6">
            
            <div className="mb-4 flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4">
                
                <div className="flex-1">
                    <label htmlFor="concept-filter" className="block text-sm font-medium text-gray-700 mb-1">Filter by Test</label>
                    <select
                        id="concept-filter"
                        value={selectedConceptUuid}
                        onChange={(e) => setSelectedConceptUuid(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
                        disabled={isLoading}
                    >
                        <option value="">— All Lab Tests —</option>
                        {testConcepts.map(concept => (
                            <option key={concept.uuid} value={concept.uuid}>
                                {concept.display}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex-1">
                    <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-1">Search Results</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            id="search-input"
                            placeholder="Search result name or value..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2.5 pl-10 focus:ring-blue-500 focus:border-blue-500"
                            disabled={isLoading}
                        />
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center p-12 text-blue-600">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin mb-3" />
                    Loading patient lab results...
                </div>
            ) : (
                <>
                    {sortedResults.length === 0 && !selectedConceptUuid && searchTerm.length === 0 ? (
                        <div className="text-center p-12 text-gray-500 border border-dashed rounded-lg">
                            No lab results found for this patient.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th
                                            onClick={() => requestSort('obsDatetime')}
                                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer flex items-center whitespace-nowrap"
                                        >
                                            Date {getSortIndicator('obsDatetime')}
                                        </th>
                                        <th
                                            onClick={() => requestSort('concept')}
                                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        >
                                            Test Name {getSortIndicator('concept')}
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Result Value
                                        </th>
                                        <th
                                            onClick={() => requestSort('interpretation')}
                                            className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        >
                                            Interpretation {getSortIndicator('interpretation')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {sortedResults.map((result) => (
                                        <tr key={result.uuid} className="hover:bg-gray-50">
                                            
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatDate(result.obsDatetime)}
                                            </td>
                                            
                                            <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                                                {result.concept.display}
                                            </td>
                                            
                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                {result.display.split(': ')[1] || (result.valueNumeric !== null ? result.valueNumeric : result.valueText)}
                                            </td>
                                            
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span 
                                                    className={`inline-flex px-3 py-1 text-xs leading-5 rounded-full ${getInterpretationClass(result.interpretation)}`}
                                                >
                                                    {result.interpretation || 'N/A'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="mt-4 text-sm text-gray-600">
                                Displaying {sortedResults.length} of {results.length} results.
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}