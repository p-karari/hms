// src/components/patients/PatientCardSummaryView.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePatientDashboard } from '@/components/context/patient-dashboard-context'; 
import { X, ArrowRight } from 'lucide-react'; // Added ArrowRight for the link icon
import { getConceptUuid } from '@/lib/config/concept'; 

// Import the components you have shared
import ConditionListTable from '@/components/conditions/ConditionListTable'; 
import ImmunizationHistoryTable from '@/components/immunizations/ImmunizationHistoryTable'; 
import OrderHistoryTable from '@/components/order/OrderHistoryTable'; 
import ProgramEnrollmentList from '@/components/programs/ProgramEnrollmentList'; 
import LabResultsTable from '@/components/results/LabResultsTable';
import MedicationHistoryTable from '@/components/medications/MedicationHistoryTable';
import VitalsHistoryCard from '@/components/vitals/VitalsHistoryCard';
import VitalsForm from '@/components/vitals/VitalsForm'; 
import AllergyListTable from '../allergies/AllergyListTable';

// Define types needed for Vitals integration
interface ConceptUuids {
    WEIGHT: string;
    HEIGHT: string;
    TEMP: string;
    SYSTOLIC_BP: string;
    DIASTOLIC_BP: string;
    PULSE: string;
    RESP_RATE: string;
}

interface PatientContentProps {
  patientUuid: string;
  clinicalKey: string;
  onActionComplete: () => void; 
}

// Helper function to render a common card header with a link
const CardLinkHeader: React.FC<{ title: string; route: string; patientUuid: string }> = ({ title, route, patientUuid }) => (
    <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h2 className="text-xl font-bold text-gray-700">{title}</h2>
        {/* In a real Next.js app, replace <a> with <Link href={...}> */}
        <a 
            href={`/dashboard/patients/${patientUuid}/${route}`}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center transition duration-150"
        >
            View All <ArrowRight className="w-4 h-4 ml-1" />
        </a>
    </div>
);


// 💡 MAIN COMPONENT: This holds all the components you will share
const PatientCardSummaryView: React.FC<PatientContentProps> = ({ patientUuid, clinicalKey, onActionComplete }) => {
    
    // --- Vitals Form State ---
    const [showVitalsForm, setShowVitalsForm] = useState(false);
    const [vitalsConceptMap, setVitalsConceptMap] = useState<Record<string, string> | null>(null);
    const [isConceptLoading, setIsConceptLoading] = useState(true);
    console.log(isConceptLoading)
    // --- End Vitals Form State ---

    // Access context for OrderHistoryTable requirement
    const { activeVisit } = usePatientDashboard();
    
    // Extract the data refresh key from the clinicalKey
    const refreshKey = parseInt(clinicalKey.split('-').pop() || '0');
    
    // Determine the current Encounter UUID for the OrderHistoryTable's actions. 
    const currentEncounterUuid = activeVisit?.encounters?.[0]?.uuid || patientUuid; 
    
    // --- Fetch Vitals Concepts for Form Modal (omitted for brevity, assume function exists) ---
    const fetchVitalsConcepts = useCallback(async () => {
        setIsConceptLoading(true);
        try {
             const conceptUuids = await Promise.all([
                getConceptUuid('Weight (kg)'),
                getConceptUuid('Height (cm)'),
                getConceptUuid('Temparature (c)'),
                getConceptUuid('Systolic blood pressure'),
                getConceptUuid('Diastolic blood pressure'),
                getConceptUuid('Pulse'),
                getConceptUuid('Respiratory rate'),
            ]);

            setVitalsConceptMap({
                WEIGHT: conceptUuids[0],
                HEIGHT: conceptUuids[1],
                TEMP: conceptUuids[2],
                SYSTOLIC_BP: conceptUuids[3],
                DIASTOLIC_BP: conceptUuids[4],
                PULSE: conceptUuids[5],
                RESP_RATE: conceptUuids[6],
            });
        } catch(e) {
            console.error("Failed to load vitals concepts for form:", e);
        } finally {
            setIsConceptLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVitalsConcepts();
    }, [fetchVitalsConcepts]);
    // --- End Fetch Vitals Concepts ---
    
    const handleVitalsActionComplete = useCallback(() => {
        setShowVitalsForm(false);
        onActionComplete(); // Trigger dashboard-wide refresh, including VitalsHistoryCard
    }, [onActionComplete]);


    return (
        // ❌ CHANGED: Removed grid-cols, gap, lg:grid-cols-2. Using simple space-y for stacking.
        <div className="space-y-6"> 
            
            {/* 1. Vitals Component (Now full width by default) */}
            <div className="w-full">
                <VitalsHistoryCard
                    patientUuid={patientUuid} 
                    refreshKey={refreshKey}
                    onRecordVitals={() => setShowVitalsForm(true)}
                />
            </div>

            {/* 2. Conditions Component (Now full width by default) */}
            <div className="w-full p-4 bg-white shadow-xl rounded-xl">
                <CardLinkHeader title="Active Conditions" route="conditions" patientUuid={patientUuid} />
                <ConditionListTable 
                    patientUuid={patientUuid} 
                    refreshKey={refreshKey}
                    onStatusChange={onActionComplete} 
                />
            </div>
            
            {/* 3. Immunizations Component (Now full width by default) */}
            <div className="w-full p-4 bg-white shadow-xl rounded-xl">
                <CardLinkHeader title="Vaccine History" route="immunizations" patientUuid={patientUuid} />
                <ImmunizationHistoryTable 
                    patientUuid={patientUuid} 
                    refreshKey={refreshKey}
                />
            </div>
            
            {/* 4. Allergies Component (Now full width by default) */}
            <div className="w-full">
                <div className="p-4 bg-white shadow-xl rounded-xl">
                    <CardLinkHeader title="Allergies / ADRs" route="allergies" patientUuid={patientUuid} />
                    <AllergyListTable
                        patientUuid={patientUuid}
                        onRemoveAllergy={onActionComplete} 
                    />
                </div>
            </div>

            {/* 5. Program Enrollments Component (Now full width by default) */}
            <div className="w-full p-4 bg-white shadow-xl rounded-xl">
                <CardLinkHeader title="Program Enrollments" route="programs" patientUuid={patientUuid} />
                <ProgramEnrollmentList
                    patientUuid={patientUuid}
                    refreshKey={refreshKey}
                    onExitProgram={onActionComplete} 
                    onChangeState={() => onActionComplete()} 
                />
            </div>
            
            {/* 6. Orders Component (Now full width by default) */}
            <div className="w-full p-4 bg-white shadow-xl rounded-xl">
                <CardLinkHeader title="Clinical Orders" route="orders" patientUuid={patientUuid} />
                <OrderHistoryTable 
                    patientUuid={patientUuid}
                    currentEncounterUuid={currentEncounterUuid} 
                    onOrderDiscontinued={onActionComplete} 
                />
            </div>

            <div className="w-full p-4 bg-white shadow-xl rounded-xl">
                <CardLinkHeader title="Medication History" route="medications" patientUuid={patientUuid} />
                <MedicationHistoryTable
                    patientUuid={patientUuid}
                />
            </div>
            
            {/* 7. Lab Results Component (Now full width by default) */}
            <div className="w-full p-4 bg-white shadow-xl rounded-xl">
                <CardLinkHeader title="Lab Results History" route="results" patientUuid={patientUuid} />
                <LabResultsTable
                    patientUuid={patientUuid}
                />
            </div>

            {/* 8. Medication History Component (Now full width by default) */}

            
            {/* ✅ Vitals Form Modal (Remains unchanged) */}
            {showVitalsForm && vitalsConceptMap && (
                <div className="fixed inset-0 backdrop-blur-sm backdrop-blur-sm bg-opacity-40 flex items-center justify-center z-50">
                    <div className="relative bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl">
                        <button
                            onClick={() => setShowVitalsForm(false)}
                            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <VitalsForm
                            patientUuid={patientUuid}
                            conceptUuids={vitalsConceptMap as unknown as ConceptUuids}
                            onSuccess={handleVitalsActionComplete}
                        />
                    </div>
                </div>
            )}
            
        </div>
    );
}

export default PatientCardSummaryView;