'use client';

import LabResultsTable from '@/components/results/LabResultsTable';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import AllergyAlertBanner from '../medications/AllergyAlertBanner';


interface LabResultsDashboardProps {
    patientUuid: string;
    hasKnownAllergies: boolean; 
}


export default function LabResultsDashboard({ patientUuid, hasKnownAllergies }: LabResultsDashboardProps) {

    const hasCriticalResults = false;

    return (
        <div className="space-y-6">

            
            {hasKnownAllergies && (
                <AllergyAlertBanner patientUuid={patientUuid} />
            )}

            {hasCriticalResults && (
                 <div className="flex items-center p-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                    <AlertTriangle className="w-5 h-5 mr-3" />
                    <span className="font-bold">CRITICAL ALERT:</span> Review recent Hemoglobin results (7.2 g/dL).
                </div>
            )}


            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-700">All Diagnostic Observations</h2>
                
                <button
                    className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition duration-150 disabled:opacity-50"
                    disabled={true} 
                >
                    <TrendingUp className="w-5 h-5 mr-2" />
                    View Trend Charts
                </button>
            </div>

            <LabResultsTable 
                patientUuid={patientUuid} 
            />

        </div>
    );
}