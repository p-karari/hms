'use client';

import React from 'react';

import VisitHistoryTable from '@/components/visits/VisitHistoryTable';
import AllergyAlertBanner from '../medications/AllergyAlertBanner';

interface VisitsDashboardProps {
    patientUuid: string;
    patientName: string;
    hasKnownAllergies: boolean;
}


export default function VisitsDashboard({ 
    patientUuid, 
    hasKnownAllergies 
}: VisitsDashboardProps) {
    


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-extrabold text-gray-900 border-b pb-2">
                Patient Visits History
            </h1>
            
            {hasKnownAllergies && (
                <AllergyAlertBanner patientUuid={patientUuid} />
            )}
            
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-700">Chronology of Care Encounters</h2>

            </div>

            <VisitHistoryTable 
                patientUuid={patientUuid} 
            />

            {/* 4. Placeholder for New Visit Modal */}
            {/* {isNewVisitModalOpen && (
                <NewVisitModal 
                    patientUuid={patientUuid} 
                    onClose={() => setIsNewVisitModalOpen(false)}
                    onVisitStart={() => { 
                        // logic to refresh the table here 
                    }}
                />
            )} */}
        </div>
    );
}