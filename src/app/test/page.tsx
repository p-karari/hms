'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';

// --- DASHBOARD CORE IMPORTS ---
import PatientDetails from '@/components/patients/PatientDetails'; 
import { PatientDashboardProvider } from '@/components/context/patient-dashboard-context';
import { getPatientActiveVisit } from '@/lib/visits/getActiveVisit';
import { getPatientDetails } from '@/lib/patients/getPatientDetails'; // Needed to confirm patient context
import { Visit } from '@/lib/patients/manageVisits'; // Type for Visit

// Placeholder for basic patient details structure
interface BasicPatientDetails {
    uuid: string;
    display: string;
}

interface TestPageProps {
    params: {
        uuid: string;
    };
}

export default function TestPage({ params }: TestPageProps) {
    const patientUuid = params.uuid;

    if (!patientUuid) {
        redirect('/dashboard/patients');
    }

    // --- 1. STATE MANAGEMENT ---
    const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
    const [dataVersion, setDataVersion] = useState(0); 
    const [isLoadingVisit, setIsLoadingVisit] = useState(true);
    const [patientDetails, setPatientDetails] = useState<BasicPatientDetails | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Handler to trigger data refresh (e.g., after an 'End Visit' action)
    const handleActionComplete = useCallback(() => {
        setDataVersion(prev => prev + 1);
    }, []);

    // --- 2. DATA FETCHING LOGIC ---
    const fetchData = useCallback(async () => {
        setError(null);
        
        // Fetch Patient Details first for context
        try {
            const details = await getPatientDetails(patientUuid);
            setPatientDetails(details);
            if (!details) throw new Error("Patient details not found.");
        } catch (e: any) {
             setError(`Failed to load patient details: ${e.message}`);
             setIsLoadingVisit(false); 
             return;
        }

        // Fetch Active Visit Status
        setIsLoadingVisit(true);
        try {
            const visit = await getPatientActiveVisit(patientUuid);
            setActiveVisit(visit);
        } catch (error) {
            console.error("Failed to fetch active visit status:", error);
        } finally {
            setIsLoadingVisit(false);
        }
    }, [patientUuid, dataVersion]); 

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    // --- 3. LOADING / ERROR STATES ---
    if (!patientDetails && !error) {
        return (
            <div className="text-center p-20 text-gray-600">
                <Clock className="w-6 h-6 mx-auto animate-spin mb-3" />
                Loading Patient Details...
            </div>
        );
    }
    
    if (error) {
        return (
             <div className="p-8 max-w-lg mx-auto bg-red-50 border border-red-200 rounded-xl mt-12">
                <h2 className="text-xl font-semibold text-red-700 mb-3">System Error</h2>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
        );
    }

    // --- 4. RENDER WITH DASHBOARD STRUCTURE ---
    return (
        // 💡 Required: Wrap all interactive elements in the Provider
        <PatientDashboardProvider 
          activeVisit={activeVisit} 
          onActionComplete={handleActionComplete}
        >
            <div className="bg-gray-50 min-h-screen">
                <div className="p-8 space-y-6">
                    
                    {/* Back Link */}
                    <Link 
                        href={`/dashboard/patients/${patientUuid}`}
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm mb-6 font-medium"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to Patient Summary
                    </Link>

                    {/* --- PATIENT DETAILS CARD (The Barner) --- */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <PatientDetails 
                            patientUuid={patientUuid}
                            activeVisit={activeVisit}
                            onActionComplete={handleActionComplete}
                        />
                    </div>

                    {/* --- ACTIVE VISIT STATUS --- */}
                    {isLoadingVisit ? (
                        <div className="p-3 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 animate-pulse">
                            <Clock className="w-4 h-4 mr-2 inline-block" /> Checking active visit status...
                        </div>
                    ) : activeVisit ? (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <div className="text-sm">
                                <span className="font-medium text-green-900">Active Visit: </span>
                                <span className="text-green-700">
                                    {activeVisit.visitType.display} • {new Date(activeVisit.startDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                            No active visit. Start a new one to begin clinical actions.
                        </div>
                    )}

                    {/* --- YOUR REQUIRED PAGE CONTENT --- */}
                    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 min-h-[300px] flex items-center justify-center">
                        <h1 className="text-4xl font-bold text-gray-800">Test page</h1>
                    </div>
                </div>
            </div>
        </PatientDashboardProvider>
    );
}