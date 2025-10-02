'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {  Loader2, BedDouble, Calendar, Users } from 'lucide-react';

// Switched from aliased (@/lib/...) to relative paths (../../lib/...) for robust compilation
import { searchPatients, ListPatient } from '../../lib/patients/searchPatients'; 
import { getAppointmentsTodayCount } from '../../lib/appointments/manageAppointments'; 
import { getDashboardVisitData, VisitDetail } from '../../lib/visits/getDashboardVisitData';

// Define interface for combined dashboard data
interface DashboardData {
    activeVisits: number;
    totalVisitsToday: number;
    appointmentsToday: number;
    detailedVisits: VisitDetail[];
}

interface PatientListProps {
  searchTerm: string; 
}

// Dashboard Card Component
const StatCard: React.FC<{ title: string; count: number; icon: React.ReactElement<{ size: number; className: string}>; color: string }> = ({ title, count, icon, color }) => (
    <div className={`flex flex-col items-center p-6 rounded-xl shadow-lg ${color} text-white transition transform hover:scale-[1.02] cursor-default`}>
        {React.cloneElement(icon, { size: 28, className: "flex-shrink-0" })}
        <p className="text-4xl font-extrabold mt-2">{count}</p>
        <p className="text-sm font-medium opacity-80 mt-1">{title}</p>
    </div>
);


const ActiveVisitDashboard: React.FC<PatientListProps> = ({ searchTerm }) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [searchResults, setSearchResults] = useState<ListPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentQuery = searchTerm.trim();

  // The fetch logic is correctly memoized here to prevent infinite loop
  const fetchDashboardAndPatients = useCallback(async (query: string) => {
    // Only set the initial loading state if we haven't loaded data yet
    if (!dashboardData) setLoading(true); 
    setError(null);
    
    try {
      // 1. Fetch Dashboard Metrics
      const [visitStats, appointmentsCount] = await Promise.all([
          getDashboardVisitData(),
          getAppointmentsTodayCount()
      ]);
      
      const stats: DashboardData = {
          activeVisits: visitStats.activeVisits,
          totalVisitsToday: visitStats.totalVisitsToday,
          appointmentsToday: appointmentsCount,
          detailedVisits: visitStats.detailedVisits,
      };
      setDashboardData(stats); 

      // 2. Perform Patient Search if query is long enough (2 chars minimum)
      if (query.length >= 2) {
          const fetchedPatients = await searchPatients(query, 50);
          setSearchResults(fetchedPatients);
      } else {
          setSearchResults([]); // Clear search if query is too short or cleared
      }
      
    } catch (err) {
      setError('Failed to load dashboard data or perform search.');
      console.error(err);
    } finally {
      // Ensure loading is set to false only after all fetches are complete
      setLoading(false);
    }
  }, [dashboardData]); // Stable dependency array

  useEffect(() => {
    // Debounced effect to fetch data
    const handler = setTimeout(() => {
      // We only fetch on mount, and when the user changes the search term.
      fetchDashboardAndPatients(currentQuery);
    }, 300); 

    return () => {
      clearTimeout(handler);
    };
  }, [currentQuery, fetchDashboardAndPatients]); // Stable dependencies

  // Determine which list to display: Search results OR Active Visits (default)
  const displayList = useMemo(() => {
      if (currentQuery.length >= 2 && searchResults.length > 0) {
          return { type: 'search', data: searchResults, count: searchResults.length };
      }
      if (dashboardData?.detailedVisits) {
          return { type: 'visits', data: dashboardData.detailedVisits, count: dashboardData.detailedVisits.length };
      }
      return { type: 'none', data: [], count: 0 };
  }, [currentQuery, searchResults, dashboardData]);

  // --- Helper Functions ---
  const getLinkUuid = (item: ListPatient | VisitDetail): string => {
      if ('patientUuid' in item) return item.patientUuid;
      return (item as ListPatient).uuid;
  };
  
  const getDisplayIdentifier = (item: ListPatient | VisitDetail): string => {
      if ('idNumber' in item) return item.idNumber;
      return (item as ListPatient).identifiers?.[0]?.identifier || 'N/A';
  };
  
  const getDisplayName = (item: ListPatient | VisitDetail): string => {
      if ('name' in item) return item.name;
      return (item as ListPatient).display;
  };
  
  const getDisplayAge = (item: ListPatient | VisitDetail): string | number => {
      // item.age;
      return (item as ListPatient).age || 'N/A';
  };


  // --- RENDER FUNCTIONS ---

  if (loading && !dashboardData) {
    return (
        <div className="p-10 text-center text-indigo-600">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
            <p className="font-semibold">Loading Active Visit Dashboard...</p>
        </div>
    );
  }

  if (error) {
    return (
        <div className="p-6 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-lg shadow-inner">
            <p className="font-bold">System Error</p>
            <p>{error}</p>
            <button onClick={() => fetchDashboardAndPatients(currentQuery)} className="mt-2 text-sm font-semibold underline hover:text-red-900">
                Click to Retry
            </button>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* 1. Dashboard Statistics Cards */}
      <div className="grid grid-cols-3 gap-6">
        <StatCard 
            title="Active Visits" 
            count={dashboardData?.activeVisits ?? 0} 
            icon={<BedDouble />} 
            color="bg-red-600"
        />
        <StatCard 
            title="Total Visits Today" 
            count={dashboardData?.totalVisitsToday ?? 0} 
            icon={<Users />} 
            color="bg-yellow-600"
        />
        <StatCard 
            title="Scheduled For Today" 
            count={dashboardData?.appointmentsToday ?? 0} 
            icon={<Calendar />} 
            color="bg-green-600"
        />
      </div>

      {/* 2. List Header */}
      <div className="flex justify-between items-center pb-2 border-b-2 border-indigo-200">
        <h2 className="text-xl font-bold text-gray-800">
            {displayList.type === 'search' 
                ? `Search Results for "${currentQuery}" (${displayList.count})` 
                : `Active Visits (${displayList.count})`}
        </h2>
        {displayList.type === 'visits' && (
            <span className="text-sm font-medium text-indigo-600 cursor-pointer hover:underline">
                Filter active visits
            </span>
        )}
      </div>

      {/* 3. Detailed List Table */}
      <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-indigo-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider w-[120px]">
                  {displayList.type === 'visits' ? 'Visit Time' : 'Name'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">ID Number</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider w-[100px]">Gender/Age</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Visit Type</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-indigo-700 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            
            {displayList.count === 0 ? (
                <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500 italic text-lg">
                        {currentQuery.length >= 2 
                            ? `No patients matched your search: "${currentQuery}".`
                            : 'There are no active visits to display.'}
                    </td>
                </tr>
            ) : (
                displayList.data.map((item) => {
                    const isVisit = displayList.type === 'visits';
                    const name = getDisplayName(item);

                    const formattedTime = isVisit 
                        ? new Date((item as VisitDetail).visitStartTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                        : '';
                        
                    const formattedDate = isVisit 
                        ? new Date((item as VisitDetail).visitStartTime).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '';
                    
                    const linkUuid = getLinkUuid(item);

                    return (
                        <tr key={getLinkUuid(item)} className="hover:bg-indigo-50 transition duration-100">
                            <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {isVisit ? (
                                    <div className="flex flex-col">
                                        <span className="font-semibold">{formattedTime}</span>
                                        <span className="text-xs text-gray-500">{formattedDate}</span>
                                    </div>
                                ) : (
                                    name
                                )}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">{getDisplayIdentifier(item)}</td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{name}</td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                {isVisit ? (item as VisitDetail).gender : (item as ListPatient).gender} / {getDisplayAge(item)}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                {isVisit ? (item as VisitDetail).visitType : 'N/A'}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                                {/* FIXED: Replaced Link with a standard anchor tag for compilation robustness */}
                                <a 
                                    href={`/dashboard/patients/${linkUuid}`}
                                    className="text-indigo-600 hover:text-indigo-900 font-semibold transition duration-150"
                                >
                                    {isVisit ? 'Continue Visit' : 'View Details'} &rarr;
                                </a>
                            </td>
                        </tr>
                    );
                })
            )}
          </tbody>
        </table>
      </div>
      
    </div>
  );
};

export default ActiveVisitDashboard;
