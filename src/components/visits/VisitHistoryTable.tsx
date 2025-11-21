'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Loader2, AlertTriangle, Calendar, Clock, ChevronDown, ChevronUp,
    Stethoscope, Package, FileText, Pill, TestTube
} from 'lucide-react';
import { formatDate } from '@/lib/utils/utils'; 
import { Encounter, getPatientVisitsWithEncounters, VisitWithEncounters, Diagnosis, Observation, Order } from '@/lib/visits/getVisitEncounters';

interface VisitHistoryTableProps {
    patientUuid: string;
}

export default function VisitHistoryTable({ patientUuid }: VisitHistoryTableProps) {
    const [visits, setVisits] = useState<VisitWithEncounters[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedVisitUuid, setExpandedVisitUuid] = useState<string | null>(null);

    const fetchVisitHistory = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getPatientVisitsWithEncounters(patientUuid);
            setVisits(data);
            // Auto-expand the most recent visit
            if (data.length > 0) {
                setExpandedVisitUuid(data[0].uuid);
            }
        } catch (e) {
            console.error("Error fetching visit history:", e);
            setError("Failed to load patient visit history.");
            setVisits([]);
        } finally {
            setIsLoading(false);
        }
    }, [patientUuid]);

    useEffect(() => {
        fetchVisitHistory();
    }, [fetchVisitHistory]);

    const handleVisitToggle = useCallback((visitUuid: string) => {
        setExpandedVisitUuid(expandedVisitUuid === visitUuid ? null : visitUuid);
    }, [expandedVisitUuid]);

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatVisitDate = (startDate: string, endDate: string | null) => {
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : null;
        
        const isToday = start.toDateString() === new Date().toDateString();
        const isSameDay = end && start.toDateString() === end.toDateString();
        
        if (isToday && isSameDay) {
            return `Today, ${formatTime(startDate)}`;
        } else if (isToday) {
            return `Today, ${formatTime(startDate)} - ${formatTime(endDate!)}`;
        } else if (end && isSameDay) {
            return `${formatDate(startDate)} - ${formatTime(endDate!)}`;
        } else if (end) {
            return `${formatDate(startDate)} - ${formatDate(endDate!)}`;
        } else {
            return `${formatDate(startDate)} - Present`;
        }
    };

    // Get all diagnoses for a visit
    const getVisitDiagnoses = (visit: VisitWithEncounters): Diagnosis[] => {
        const diagnoses: Diagnosis[] = [];
        visit.encounters.forEach(encounter => {
            encounter.diagnoses.forEach(diagnosis => {
                diagnoses.push(diagnosis);
            });
        });
        return diagnoses;
    };

    if (error) {
        return (
            <div className="text-center p-8 border border-red-300 bg-red-50 text-red-700 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 mr-3" />
                {error}
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="text-center p-12 text-indigo-600">
                <Loader2 className="w-8 h-8 mx-auto animate-spin mb-3" />
                Loading patient visit history...
            </div>
        );
    }
    
    if (visits.length === 0) {
        return (
            <div className="text-center p-12 text-gray-500 border border-dashed rounded-xl">
                No patient visit history found.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold">Visits</h2>
                </div>
                
                <div className="divide-y">
                    {visits.map((visit) => {
                        const diagnoses = getVisitDiagnoses(visit);
                        const isExpanded = visit.uuid === expandedVisitUuid;
                        
                        return (
                            <div key={visit.uuid} className="p-4 hover:bg-gray-50 transition-colors">
                                {/* Visit Header */}
                                <div 
                                    className="flex items-center justify-between cursor-pointer"
                                    onClick={() => handleVisitToggle(visit.uuid)}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {formatVisitDate(visit.startDatetime, visit.stopDatetime)}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                {visit.visitType.display}
                                            </div>
                                        </div>
                                        
                                        {/* Diagnoses */}
                                        {diagnoses.length > 0 && (
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {diagnoses.map((diagnosis, index) => (
                                                    <span 
                                                        key={index}
                                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                                    >
                                                        {diagnosis.diagnosis.coded.display}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <button className="text-gray-400 hover:text-gray-600">
                                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </button>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="mt-4 pl-4 border-l-2 border-indigo-200">
                                        <VisitDetails visit={visit} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// Visit Details Component with Tabs
interface VisitDetailsProps {
    visit: VisitWithEncounters;
}

function VisitDetails({ visit }: VisitDetailsProps) {
    const [activeTab, setActiveTab] = useState<'diagnoses' | 'notes' | 'tests' | 'medications' | 'encounters'>('diagnoses');

    // Get data for each tab
    const diagnoses = visit.encounters.flatMap(enc => enc.diagnoses);
    const notes = visit.encounters.flatMap(enc => 
        enc.obs.filter(obs => obs.concept.display.toLowerCase().includes('note')).map(obs => ({ obs, encounter: enc }))
    );
    const tests = visit.encounters.flatMap(enc => 
        enc.orders.filter(order => order.orderType.display.toLowerCase().includes('test'))
    );
    const medications = visit.encounters.flatMap(enc => 
        enc.orders.filter(order => order.orderType.display.toLowerCase().includes('drug'))
    );

    const tabs = [
        { id: 'diagnoses' as const, label: 'Diagnoses', count: diagnoses.length, icon: Stethoscope },
        { id: 'notes' as const, label: 'Notes', count: notes.length, icon: FileText },
        { id: 'tests' as const, label: 'Tests', count: tests.length, icon: TestTube },
        { id: 'medications' as const, label: 'Medications', count: medications.length, icon: Pill },
        { id: 'encounters' as const, label: 'Encounters', count: visit.encounters.length, icon: Calendar },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'diagnoses':
                return (
                    <div className="space-y-2">
                        {diagnoses.length === 0 ? (
                            <p className="text-gray-500 text-sm">No diagnoses recorded</p>
                        ) : (
                            diagnoses.map((diagnosis, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                                    <span className="text-sm">{diagnosis.diagnosis.coded.display}</span>
                                    <span className="text-xs text-gray-500 capitalize">{diagnosis.certainty.toLowerCase()}</span>
                                </div>
                            ))
                        )}
                    </div>
                );

            case 'notes':
                return (
                    <div className="space-y-3">
                        {notes.length === 0 ? (
                            <p className="text-gray-500 text-sm">No notes recorded</p>
                        ) : (
                            notes.map(({ obs, encounter }) => (
                                <div key={obs.uuid} className="bg-white rounded border p-3">
                                    <p className="text-sm whitespace-pre-wrap">{obs.display}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {formatDate(obs.obsDatetime)} • {encounter?.provider?.display || 'Unknown'} • Clinician
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                );

            case 'tests':
                return (
                    <div className="space-y-2">
                        {tests.length === 0 ? (
                            <p className="text-gray-500 text-sm">No tests ordered</p>
                        ) : (
                            tests.map((test) => (
                                <div key={test.uuid} className="p-2 bg-white rounded border">
                                    <span className="text-sm">{test.concept.display}</span>
                                </div>
                            ))
                        )}
                    </div>
                );

            case 'medications':
                return (
                    <div className="space-y-2">
                        {medications.length === 0 ? (
                            <p className="text-gray-500 text-sm">No medications prescribed</p>
                        ) : (
                            medications.map((med) => (
                                <div key={med.uuid} className="p-2 bg-white rounded border">
                                    <span className="text-sm">{med.concept.display}</span>
                                </div>
                            ))
                        )}
                    </div>
                );

            case 'encounters':
                return (
                    <div className="space-y-3">
                        {visit.encounters.map((encounter) => (
                            <div key={encounter.uuid} className="bg-white rounded border p-3">
                                <div className="flex justify-between items-start">
                                    <p className="text-sm font-medium">{encounter.encounterType.display}</p>
                                    <span className="text-xs text-gray-500">
                                        {formatDate(encounter.encounterDatetime)}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {encounter.provider?.display || 'Unknown'} • {encounter.location?.display || 'Unknown Location'}
                                </p>
                                {encounter.obs.some(obs => obs.concept.display.toLowerCase().includes('note')) && (
                                    <p className="text-sm mt-2 text-gray-700">
                                        {encounter.obs.find(obs => obs.concept.display.toLowerCase().includes('note'))?.value}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                );
        }
    };

    return (
        <div>
            {/* Tabs */}
            <div className="flex border-b">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === tab.id
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        {tab.count > 0 && (
                            <span className="bg-gray-200 text-gray-700 text-xs px-1.5 py-0.5 rounded-full">
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="mt-4">
                {renderContent()}
            </div>
        </div>
    );
}