'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AppointmentMetricsCard from './AppointmentMetricsCard';
import CreateAppointmentForm from './CreateAppointmentForm'; 
import { AppointmentSummary, getAppointmentSummary } from '@/lib/appointments/getAppointmentSummary';
import { SingleAppointmentResponse } from '@/lib/appointments/scheduleSingleAppointment';
import { AppointmentStatus, AppointmentSearchPayload, searchAppointments } from '@/lib/appointments/searchAppointments';
import { updateAppointmentStatus } from '@/lib/appointments/updateAppointmentStatus';

const ITEMS_PER_PAGE = 10;
type AppointmentViewMode = 'today' | 'allFuture';

const getTodayKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getTodayPayload = (currentStatusFilter: AppointmentStatus): AppointmentSearchPayload => {
    const now = new Date();
    const todayISO = now.toISOString().slice(0, 10);
    
    return {
        startDate: `${todayISO}T00:00:00.000Z`, 
        endDate: `${todayISO}T23:59:59.999Z`,  
        status: currentStatusFilter,
    };
};

const getAllFuturePayload = (currentStatusFilter: AppointmentStatus): AppointmentSearchPayload => {
    const now = new Date();
    const todayISO = now.toISOString().slice(0, 10);
    
    return {
        startDate: `${todayISO}T00:00:00.000Z`,
        status: currentStatusFilter,
        endDate: ''
    };
};

const Modal = ({ children, onClose }: { children: React.ReactNode, onClose: () => void }) => (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
        <div className="relative bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl">
                &times;
            </button>
            {children}
        </div>
    </div>
);

const StatusBadge = ({ status }: { status: string }) => {
    const statusStyles = {
        Scheduled: 'bg-blue-100 text-blue-800 border border-blue-200',
        CheckedIn: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
        Completed: 'bg-green-100 text-green-800 border border-green-200',
        Cancelled: 'bg-red-100 text-red-800 border border-red-200',
        Missed: 'bg-gray-100 text-gray-800 border border-gray-200'
    };

    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100'}`}>
            {status}
        </span>
    );
};

export default function AppointmentDashboard() {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Core View States
    const [viewMode, setViewMode] = useState<AppointmentViewMode>('today'); 
    const [currentStatusFilter, setCurrentStatusFilter] = useState<AppointmentStatus>('Scheduled');
    
    // Search and Pagination States
    const [patientSearchQuery, setPatientSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    
    // Data States
    const [summaryData, setSummaryData] = useState<AppointmentSummary[] | null>(null);
    const [isLoadingSummary, setIsLoadingSummary] = useState(true);
    const [appointments, setAppointments] = useState<SingleAppointmentResponse[] | null>(null);
    const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
    const [updatingAppointment, setUpdatingAppointment] = useState<string | null>(null);

    const now = new Date();
    const todayKey = getTodayKey(now); 

    // --- Check-in handler ---
    const handleCheckIn = async (appointmentUuid: string, patientUuid: string) => {
        setUpdatingAppointment(appointmentUuid);
        try {
            const updatedAppointment = await updateAppointmentStatus({
                uuid: appointmentUuid,
                status: 'CheckedIn'
            });

            if (updatedAppointment) {
                // Update the local state
                setAppointments(prev => 
                    prev?.map(app => 
                        app.uuid === appointmentUuid 
                            ? { ...app, status: 'CheckedIn' }
                            : app
                    ) || null
                );
                
                // Redirect to patient dashboard
                router.push(`/dashboard/patients/${patientUuid}`);
            }
        } catch (error) {
            console.error('Failed to check in appointment:', error);
        } finally {
            setUpdatingAppointment(null);
        }
    };

    // --- Check-out handler ---
    const handleCheckOut = async (appointmentUuid: string) => {
        setUpdatingAppointment(appointmentUuid);
        try {
            const updatedAppointment = await updateAppointmentStatus({
                uuid: appointmentUuid,
                status: 'Completed'
            });

            if (updatedAppointment) {
                // Update the local state
                setAppointments(prev => 
                    prev?.map(app => 
                        app.uuid === appointmentUuid 
                            ? { ...app, status: 'Completed' }
                            : app
                    ) || null
                );
            }
        } catch (error) {
            console.error('Failed to check out appointment:', error);
        } finally {
            setUpdatingAppointment(null);
        }
    };

    // --- Helper to set view mode and status ---
    const setViewModeAndStatus = (mode: AppointmentViewMode, status: AppointmentStatus) => {
        setViewMode(mode);
        setCurrentStatusFilter(status);
    }
    
    // --- Data Fetching Logic ---

    // 1. Fetch Summary Data (Metrics)
    const fetchSummary = useCallback(async () => {
        setIsLoadingSummary(true);
        try {
            const data = await getAppointmentSummary(); 
            setSummaryData(data);
        } catch (error) {
            console.error("Failed to fetch summary:", error);
            setSummaryData(null);
        } finally {
            setIsLoadingSummary(false);
        }
    }, []);

    useEffect(() => {
        if (viewMode === 'today') {
            fetchSummary();
        }
    }, [fetchSummary, viewMode]);

    // 2. Fetch Detailed Appointments (Main Table Data)
    const fetchAppointments = useCallback(async () => {
        setIsLoadingAppointments(true);
        setAppointments(null);
        setCurrentPage(1);
        
        try {
            let data: SingleAppointmentResponse[] = [];
            
            if (viewMode === 'today') {
                const todayPayload = getTodayPayload(currentStatusFilter);
                data = await searchAppointments(todayPayload);
            } else {
                const futurePayload = getAllFuturePayload(currentStatusFilter);
                data = await searchAppointments(futurePayload);
            }
            
            setAppointments(data);
        } catch (error) {
            console.error("Failed to fetch appointments:", error);
            setAppointments([]);
        } finally {
            setIsLoadingAppointments(false);
        }
    }, [viewMode, currentStatusFilter]);

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    const refetchAllData = () => {
        fetchAppointments(); 
        if (viewMode === 'today') {
            fetchSummary();
        }
    };
    
    // --- Metric Calculations (Only relevant for 'today' view) ---
    const totalAppointments = viewMode === 'today' ? (summaryData?.reduce((acc, summary) => {
        const counts = summary.appointmentCountMap[todayKey];
        return acc + (counts ? counts.allAppointmentsCount : 0);
    }, 0) ?? 0) : 0;
    
    const missedAppointments = viewMode === 'today' ? (summaryData?.reduce((acc, summary) => {
        const counts = summary.appointmentCountMap[todayKey];
        return acc + (counts ? counts.missedAppointmentsCount : 0); 
    }, 0) ?? 0) : 0;

    const checkedInCount = appointments?.filter(app => app.status === 'CheckedIn').length ?? 0;
    const highestVolumeService = viewMode === 'today' ? (summaryData?.reduce((max, current) => {
        const currentCount = current.appointmentCountMap[todayKey]?.allAppointmentsCount ?? 0;
        const maxCount = max.appointmentCountMap[todayKey]?.allAppointmentsCount ?? 0;
        if (currentCount > maxCount) return current;
        return max;
    }, summaryData[0]) || null) : null; 

    // --- Filtering and Pagination Logic (Client-Side) ---
    const filteredAppointments = useMemo(() => {
        if (!appointments) return [];
        
        if (!patientSearchQuery) {
            return appointments;
        }

        const lowerCaseQuery = patientSearchQuery.toLowerCase();
        
        return appointments.filter(app => 
            app.patient.name.toLowerCase().includes(lowerCaseQuery) || 
            app.patient.identifier?.toLowerCase().includes(lowerCaseQuery)
        );
    }, [appointments, patientSearchQuery]);

    const totalPages = Math.ceil(filteredAppointments.length / ITEMS_PER_PAGE);
    const paginatedAppointments = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredAppointments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredAppointments, currentPage]);

    return (
        <div className="p-4 text-black">
            {/* Combined Header with Filters and New Appointment Button */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 p-4 bg-white rounded-lg border border-gray-200">
                {/* Left side - Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* View Mode Buttons */}
                    <button
                        onClick={() => setViewModeAndStatus('today', 'Scheduled')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            viewMode === 'today' 
                                ? 'bg-indigo-600 text-white' 
                                : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setViewModeAndStatus('allFuture', 'Scheduled')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            viewMode === 'allFuture' 
                                ? 'bg-indigo-600 text-white' 
                                : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        All Future
                    </button>
                    
                    <div className="h-6 border-l border-gray-300 mx-1"></div>
                    
                    {/* Status Filters */}
                    {['Scheduled', 'CheckedIn', 'Completed', 'Cancelled'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setViewModeAndStatus(viewMode, status as AppointmentStatus)}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                currentStatusFilter === status 
                                    ? 'bg-indigo-600 text-white' 
                                    : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                {/* Right side - New Appointment Button */}
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap"
                >
                    + New Appointment
                </button>
            </div>

            {/* Conditional Metrics Display */}
            {viewMode === 'today' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <AppointmentMetricsCard 
                        title="Total for Today" 
                        value={isLoadingSummary ? '...' : totalAppointments} 
                        footerText="Total expected appointments" 
                    />
                    <AppointmentMetricsCard 
                        title="Checked in" 
                        value={isLoadingAppointments ? '...' : checkedInCount} 
                        footerText="Patients in the clinic" 
                    />
                    <AppointmentMetricsCard 
                        title="Missed" 
                        value={isLoadingSummary ? '...' : missedAppointments} 
                        footerText="Did not arrive" 
                    />
                    <AppointmentMetricsCard 
                        title="Highest Volume Service" 
                        value={isLoadingSummary ? '...' : (highestVolumeService?.appointmentCountMap[todayKey]?.allAppointmentsCount ?? 0)}
                        footerText={highestVolumeService?.appointmentService.name ?? 'N/A'} 
                    />
                </div>
            )}

            {/* Search and Stats - Standalone */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4 p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">
                        {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''}
                    </span>
                </div>
                
                <div className="relative w-full sm:w-64">
                    <input
                        type="text"
                        placeholder="Search patient name or identifier..."
                        value={patientSearchQuery}
                        onChange={(e) => {
                            setPatientSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Table - Standalone */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Identifier</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {viewMode === 'today' ? 'Time' : 'Date & Time'}
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>

                        <tbody className="bg-white divide-y divide-gray-200">
                            {isLoadingAppointments && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                        <div className="flex justify-center">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                                        </div>
                                        <p className="mt-2 text-sm">Loading appointments...</p>
                                    </td>
                                </tr>
                            )}

                            {paginatedAppointments.map((app) => (
                                <tr key={app.uuid} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {app.patient.name}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                        {app.patient.identifier}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                        {app.service.name}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                        {/* {app.location.name} */}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                        {viewMode === 'allFuture' 
                                            ? new Date(app.startDateTime).toLocaleString()
                                            : new Date(app.startDateTime).toLocaleTimeString([], { 
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            })}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <StatusBadge status={app.status} />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                        {app.status === 'Scheduled' ? (
                                            <button
                                                onClick={() => handleCheckIn(app.uuid, app.patient.uuid)}
                                                disabled={updatingAppointment === app.uuid}
                                                className="text-indigo-600 hover:text-indigo-900 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {updatingAppointment === app.uuid ? 'Checking In...' : 'Check In'}
                                            </button>
                                        ) : app.status === 'CheckedIn' ? (
                                            <button
                                                onClick={() => handleCheckOut(app.uuid)}
                                                disabled={updatingAppointment === app.uuid}
                                                className="text-orange-600 hover:text-orange-900 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {updatingAppointment === app.uuid ? 'Checking Out...' : 'Check Out'}
                                            </button>
                                        ) : (
                                            <button className="text-gray-600 hover:text-gray-900 font-medium text-sm">
                                                View Details
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {!isLoadingAppointments && paginatedAppointments.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p className="mt-2 text-sm">No appointments found</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Try adjusting your filters or create a new appointment
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                        <span className="text-sm text-gray-700">
                            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredAppointments.length)} of {filteredAppointments.length}
                        </span>
                        <div className="flex gap-1">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => prev - 1)}
                                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Appointment Modal */}
            {isModalOpen && (
                <Modal onClose={() => setIsModalOpen(false)}>
                    <CreateAppointmentForm 
                        onSuccess={() => {
                            setIsModalOpen(false);
                            refetchAllData();
                        }}
                    />
                </Modal>
            )}
        </div>
    );
}