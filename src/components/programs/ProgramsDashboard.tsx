'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, FolderOpen, Loader2, X, TrendingUp, Clock } from 'lucide-react';

// --- Import built components and actions ---
import ProgramEnrollmentList from '@/components/programs/ProgramEnrollmentList';
import { 
    getAvailableProgramOptions, 
    ProgramOption 
} from '@/lib/programs/getAvailableProgramOptions';
import { 
    createProgramEnrollment,
    exitProgramEnrollment,
    changeProgramState,
    NewEnrollmentData,
    ExitProgramData,
    ChangeProgramStateData
} from '@/lib/programs/updateProgramEnrollment';
import { getPatientLocations } from '@/lib/location/getPatientLocations';

interface ProgramsDashboardProps {
    patientUuid: string;
    patientName: string;
}

// Minimal type for Program Workflow States (needed for state change)
interface ProgramWorkflowStateOption {
    uuid: string;
    display: string;
    programUuid: string;
}

/**
 * The main container component for the patient's Program Enrollments.
 * It manages the display of the list, enrollment forms, and status updates.
 */
export default function ProgramsDashboard({ patientUuid }: ProgramsDashboardProps) {
    
    // Core States
    const [refreshKey, setRefreshKey] = useState(0); 
    const [isFormVisible, setIsFormVisible] = useState(false); // New Enrollment Form visibility
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingContext, setIsLoadingContext] = useState(false);

    // Context Data
    const [availablePrograms, setAvailablePrograms] = useState<ProgramOption[]>([]);
    const [locationOptions, setLocationOptions] = useState<Array<{ uuid: string; display: string }>>([]);
    // In a real app, program states would be fetched dynamically based on selected program.
    const [programStates, setProgramStates] = useState<ProgramWorkflowStateOption[]>([]); 

    // Form Data States
    const [newEnrollmentData, setNewEnrollmentData] = useState<NewEnrollmentData>({
        patientUuid,
        programUuid: '',
        dateEnrolled: new Date().toISOString().split('T')[0],
        locationUuid: '',
    });
    const [exitData, setExitData] = useState<Omit<ExitProgramData, 'enrollmentUuid'> & { enrollmentUuid: string | null }>({
        enrollmentUuid: null,
        dateCompleted: new Date().toISOString().split('T')[0],
        outcomeConceptUuid: undefined,
    });
    const [stateChangeData, setStateChangeData] = useState<Omit<ChangeProgramStateData, 'enrollmentUuid'> & { enrollmentUuid: string | null }>({
        enrollmentUuid: null,
        stateUuid: '',
        stateStartDate: new Date().toISOString().split('T')[0],
    });
    
    // Modal Management
    const [isExitModalOpen, setIsExitModalOpen] = useState(false);
    const [isStateModalOpen, setIsStateModalOpen] = useState(false);


    // --- Initial Data Fetching ---
    const fetchInitialData = useCallback(async () => {
        setIsLoadingContext(true);
        try {
            // Fetch available programs and locations
            const [programs, locations] = await Promise.all([
                getAvailableProgramOptions(),
                getPatientLocations(patientUuid), 
            ]);
            
            setAvailablePrograms(programs);
            setLocationOptions(locations.map(loc => ({ uuid: loc.uuid, display: loc.display })));
            
            // Set default location if available
            if (locations.length > 0) {
                setNewEnrollmentData(prev => ({ ...prev, locationUuid: locations[0].uuid }));
            }
            
            // --- SIMPLIFIED MOCK FOR PROGRAM STATES ---
            // In a real application, you'd fetch the specific workflows/states for each available program.
            setProgramStates([
                { uuid: 'state-uuid-1', display: 'Active on ARVs', programUuid: programs[0]?.uuid || 'mock-program-1' },
                { uuid: 'state-uuid-2', display: 'Lost to Follow-up', programUuid: programs[0]?.uuid || 'mock-program-1' },
                { uuid: 'state-uuid-3', display: 'Transferred Out', programUuid: programs[0]?.uuid || 'mock-program-1' },
            ]);
            
        } catch (error) {
            console.error("Failed to load initial data for programs:", error);
            // Optionally set an error state here
        } finally {
            setIsLoadingContext(false);
        }
    }, [patientUuid]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);


    // --- Enrollment Handlers ---

    // 1. New Enrollment Submission
    const handleNewEnrollmentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!newEnrollmentData.programUuid || !newEnrollmentData.locationUuid) {
            alert('Please select a program and location.');
            return;
        }

        setIsSubmitting(true);

        try {
            await createProgramEnrollment(newEnrollmentData);
            alert(`Enrolled patient in program successfully.`);
            setRefreshKey(prevKey => prevKey + 1); 
            setIsFormVisible(false);
            // Reset form
            setNewEnrollmentData(prev => ({ 
                ...prev, 
                programUuid: '',
                dateEnrolled: new Date().toISOString().split('T')[0],
            }));
        } catch (error: any) {
            console.error('Enrollment failed:', error);
            alert(`Enrollment failed: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // 2. Program Exit Modal Trigger
    const triggerExitProgram = (enrollmentUuid: string) => {
        setExitData(prev => ({ 
            ...prev, 
            enrollmentUuid, 
            dateCompleted: new Date().toISOString().split('T')[0],
        }));
        setIsExitModalOpen(true);
    };

    // 3. Program Exit Submission
    const handleExitProgramSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!exitData.enrollmentUuid || !exitData.dateCompleted) return;

        setIsSubmitting(true);
        const { enrollmentUuid, ...payload } = exitData;

        try {
            await exitProgramEnrollment({ enrollmentUuid, ...payload } as ExitProgramData);
            alert('Program exit recorded successfully.');
            setRefreshKey(prevKey => prevKey + 1);
            setIsExitModalOpen(false);
        } catch (error: any) {
            console.error('Program exit failed:', error);
            alert(`Program exit failed: ${error.message}`);
        } finally {
            setIsSubmitting(false);
            setExitData(prev => ({ ...prev, enrollmentUuid: null }));
        }
    };
    
    // 4. Program State Change Modal Trigger
    const triggerChangeState = (enrollmentUuid: string) => {
        setStateChangeData(prev => ({ 
            ...prev, 
            enrollmentUuid,
            stateStartDate: new Date().toISOString().split('T')[0],
        }));
        setIsStateModalOpen(true);
    };

    // 5. Program State Change Submission
    const handleChangeStateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stateChangeData.enrollmentUuid || !stateChangeData.stateUuid) return;

        setIsSubmitting(true);
        const { enrollmentUuid, ...payload } = stateChangeData;

        try {
            await changeProgramState({ enrollmentUuid, ...payload } as ChangeProgramStateData);
            alert('Program state updated successfully.');
            setRefreshKey(prevKey => prevKey + 1);
            setIsStateModalOpen(false);
        } catch (error: any) {
            console.error('State change failed:', error);
            alert(`State change failed: ${error.message}`);
        } finally {
            setIsSubmitting(false);
            setStateChangeData(prev => ({ ...prev, enrollmentUuid: null }));
        }
    };

    // --- Enrollment Form (Inline) ---
    const NewEnrollmentForm = () => (
        <div className="bg-white border border-purple-200 rounded-lg p-6 shadow-md mb-8">
            <h3 className="text-xl font-semibold text-purple-700 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" /> Enroll Patient in Program
            </h3>
            
            <form onSubmit={handleNewEnrollmentSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Program Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Program</label>
                        <select
                            value={newEnrollmentData.programUuid}
                            onChange={(e) => setNewEnrollmentData({ ...newEnrollmentData, programUuid: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-purple-500 focus:border-purple-500"
                            required
                            disabled={isSubmitting || isLoadingContext}
                        >
                            <option value="">Choose Program</option>
                            {availablePrograms.map(opt => (
                                <option key={opt.uuid} value={opt.uuid}>{opt.display}</option>
                            ))}
                        </select>
                    </div>

                    {/* Enrollment Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment Date</label>
                        <input
                            type="date"
                            value={newEnrollmentData.dateEnrolled}
                            onChange={(e) => setNewEnrollmentData({ ...newEnrollmentData, dateEnrolled: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-purple-500 focus:border-purple-500"
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Location */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment Location</label>
                        <select
                            value={newEnrollmentData.locationUuid}
                            onChange={(e) => setNewEnrollmentData({ ...newEnrollmentData, locationUuid: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-purple-500 focus:border-purple-500"
                            required
                            disabled={isSubmitting || isLoadingContext}
                        >
                            <option value="">Select Location</option>
                            {locationOptions.map(loc => (
                                <option key={loc.uuid} value={loc.uuid}>{loc.display}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Submission Button */}
                <div className="flex justify-end space-x-3 pt-2">
                    <button
                        type="button"
                        onClick={() => setIsFormVisible(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-purple-300 flex items-center"
                        disabled={isSubmitting || !newEnrollmentData.programUuid || !newEnrollmentData.locationUuid}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            `Confirm Enrollment`
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
    
    // --- Program Exit Modal (Simplified) ---
    const ExitProgramModal = () => (
        // Render a basic overlay/modal here
        isExitModalOpen && (
            <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
                    <h3 className="text-xl font-bold text-red-700 mb-4 flex items-center border-b pb-2">
                        <X className="w-5 h-5 mr-2" /> Exit Program
                    </h3>
                    <form onSubmit={handleExitProgramSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Exit</label>
                            <input
                                type="date"
                                value={exitData.dateCompleted}
                                onChange={(e) => setExitData({ ...exitData, dateCompleted: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2"
                                required
                            />
                        </div>
                        {/* Outcome/Reason for Exit: Requires fetching a specific concept set */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Exit Outcome (Optional)</label>
                            <input
                                type="text" // Placeholder for concept selection
                                placeholder="e.g., Cured, Transferred, Lost to Follow-up"
                                className="w-full border border-gray-300 rounded-lg p-2"
                                onChange={(e) => setExitData({ ...exitData, outcomeConceptUuid: e.target.value })}
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsExitModalOpen(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-300 flex items-center"
                                disabled={isSubmitting || !exitData.enrollmentUuid}
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Confirm Exit'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )
    );

    // --- Program State Change Modal (Simplified) ---
    const StateChangeModal = () => (
        // Render a basic overlay/modal here
        isStateModalOpen && (
            <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
                    <h3 className="text-xl font-bold text-blue-700 mb-4 flex items-center border-b pb-2">
                        <Clock className="w-5 h-5 mr-2" /> Change Program State
                    </h3>
                    <form onSubmit={handleChangeStateSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New State</label>
                            <select
                                value={stateChangeData.stateUuid}
                                onChange={(e) => setStateChangeData({ ...stateChangeData, stateUuid: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2"
                                required
                                disabled={isSubmitting}
                            >
                                <option value="">Select New State</option>
                                {/* SIMPLIFIED: Filter states based on the program being updated */}
                                {programStates.map(state => (
                                    <option key={state.uuid} value={state.uuid}>{state.display}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">State Start Date</label>
                            <input
                                type="date"
                                value={stateChangeData.stateStartDate}
                                onChange={(e) => setStateChangeData({ ...stateChangeData, stateStartDate: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2"
                                required
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsStateModalOpen(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center"
                                disabled={isSubmitting || !stateChangeData.stateUuid}
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Update State'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )
    );


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-extrabold text-gray-900 border-b pb-2">
                Program Management
            </h1>
            
            {/* Action Bar */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                    <FolderOpen className="w-6 h-6 mr-2 text-purple-600" /> Program Enrollments
                </h2>
                <button
                    onClick={() => setIsFormVisible(prev => !prev)}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white font-medium rounded-lg shadow-md hover:bg-purple-700 transition duration-150"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    {isFormVisible ? 'Hide Enrollment Form' : 'Enroll Patient'}
                </button>
            </div>

            {/* 2. New Enrollment Form */}
            {isFormVisible && <NewEnrollmentForm />}

            {/* 3. Program Enrollment List */}
            <ProgramEnrollmentList 
                patientUuid={patientUuid} 
                refreshKey={refreshKey}
                onExitProgram={triggerExitProgram}
                onChangeState={triggerChangeState}
            />

            {/* Modals for State Updates */}
            <ExitProgramModal />
            <StateChangeModal />
        </div>
    );
}