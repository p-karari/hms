'use client';

import { PatientReportRow } from '@/lib/reports/types';
import React from 'react';
import { FileText, User, MapPin, Pill, CreditCard } from 'lucide-react';

interface ReportTableProps {
    data: PatientReportRow[];
}

export default function ReportTable({ data }: ReportTableProps) {

    if (data.length === 0) {
        return (
            <div className="text-center p-8 bg-white rounded-lg border border-gray-200">
                <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-900 mb-1">No patient visits found</p>
                    <p className="text-sm text-gray-600">Try adjusting the date range or filters.</p>
                </div>
            </div>
        );
    }

    const formatDate = (date: Date | string) => {
        if (!date) return 'N/A';
        try {
            const dateObj = typeof date === 'string' ? new Date(date) : date;
            return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return 'Invalid Date';
        }
    }
    
    const formatCurrency = (amount: number | string) => {
        if (amount === undefined || amount === null) return 'N/A';
        const num = Number(amount);
        if (isNaN(num)) return 'Invalid Amount';
        return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Patient
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Age / Gender
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Visit Details
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Diagnosis
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Medications
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Payment
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.map((row, index) => (
                            <tr 
                                key={index} 
                                className="hover:bg-gray-50 transition-colors duration-150 ease-in-out"
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">
                                        {formatDate(row.visitDate)}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                            <User className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-gray-900">
                                                {row.fullName}
                                            </div>
                                            {row.contact && (
                                                <div className="text-xs text-gray-500">
                                                    {row.contact}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-700">
                                        {row.age} / {row.gender}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900 font-medium">
                                        {row.visitType}
                                    </div>
                                    <div className="flex items-center text-xs text-gray-500 mt-1">
                                        <MapPin className="h-3 w-3 mr-1" />
                                        {row.location}
                                    </div>
                                </td>
                                <td className="px-6 py-4 max-w-xs">
                                    <div className="text-sm text-gray-700">
                                        {row.diagnosis || (
                                            <span className="text-gray-400 italic">None recorded</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 max-w-xs">
                                    <div className="flex items-start">
                                        <Pill className="h-4 w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <div className="text-sm text-gray-700">
                                            {row.prescriptions || (
                                                <span className="text-gray-400 italic">None recorded</span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <div className="text-sm font-semibold text-gray-900">
                                        {formatCurrency(row.billAmount)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                                        <span className="text-sm text-gray-700">
                                            {row.paymentMethod || 'N/A'}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {data.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Showing <span className="font-medium">1-{data.length}</span> of{' '}
                            <span className="font-medium">{data.length}</span> visits
                        </div>
                        <div className="flex items-center gap-2">
                            <select className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
                                <option>10</option>
                                <option>25</option>
                                <option>50</option>
                                <option>100</option>
                            </select>
                            <div className="flex items-center gap-1">
                                <button className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed">
                                    ←
                                </button>
                                <span className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium">1</span>
                                <button className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed">
                                    →
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}