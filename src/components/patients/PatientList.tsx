'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, BedDouble, Calendar, Users } from 'lucide-react';
import { searchPatients, ListPatient } from '../../lib/patients/searchPatients'; 
import { getAppointmentsTodayCount } from '../../lib/appointments/manageAppointments'; 
import { getDashboardVisitData, VisitDetail } from '../../lib/visits/getDashboardVisitData'; 

interface DashboardData {
    activeVisits: number;
    totalVisitsToday: number;
    appointmentsToday: number;
    detailedVisits: VisitDetail[];
}

interface PatientListProps {
  searchTerm: string; 
}

const StatCard: React.FC<{ title: string; count: number; icon: React.ReactElement<{ size: number; className: string}> }> = ({ title, count, icon }) => (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-200">
        {React.cloneElement(icon, { size: 16, className: "text-gray-600" })}
        <div>
            <div className="text-sm font-medium text-gray-900">{count}</div>
            <div className="text-xs text-gray-600">{title}</div>
        </div>
    </div>
);

const ActiveVisitDashboard: React.FC<PatientListProps> = ({ searchTerm }) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [searchResults, setSearchResults] = useState<ListPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentQuery = searchTerm.trim();

  // ✅ No dependency on dashboardData
  const fetchDashboardAndPatients = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);

    const isSearching = query.length >= 2;

    try {
      const [visitStats, appointmentsCount] = await Promise.all([
        getDashboardVisitData(),
        getAppointmentsTodayCount(),
      ]);

      setDashboardData({
        activeVisits: visitStats.activeVisits,
        totalVisitsToday: visitStats.totalVisitsToday,
        appointmentsToday: appointmentsCount,
        detailedVisits: visitStats.detailedVisits,
      });

      if (isSearching) {
        const fetchedPatients = await searchPatients(query, 50);
        setSearchResults(fetchedPatients);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard data or search results.');
    } finally {
      setLoading(false);
    }
  }, []); // ✅ Empty dependency array keeps it stable

  // ✅ useEffect now runs only when the query changes
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchDashboardAndPatients(currentQuery);
    }, 300);

    return () => clearTimeout(handler);
  }, [currentQuery, fetchDashboardAndPatients]);


  const displayList = useMemo(() => {
      const isSearchActive = currentQuery.length >= 2;
      
      // If a search is active AND we have results, show search results.
      if (isSearchActive) {
          return { type: 'search', data: searchResults, count: searchResults.length };
      }
      // If no search is active, show the active visits list from the dashboard data.
      if (dashboardData?.detailedVisits) {
          return { type: 'visits', data: dashboardData.detailedVisits, count: dashboardData.detailedVisits.length };
      }
      return { type: 'none', data: [], count: 0 };
  }, [currentQuery, searchResults, dashboardData]);

  // --- UTILITY FUNCTIONS ---
  // These correctly handle the union type (ListPatient | VisitDetail) based on 'type' property
  const getLinkUuid = (item: ListPatient | VisitDetail): string => {
      if ('patientUuid' in item) return item.patientUuid; // For VisitDetail
      return (item as ListPatient).uuid; // For ListPatient
  };
  
  const getDisplayIdentifier = (item: ListPatient | VisitDetail): string => {
      if ('idNumber' in item) return item.idNumber; // For VisitDetail
      return (item as ListPatient).identifiers?.[0]?.identifier || 'N/A';
  };
  
  const getDisplayName = (item: ListPatient | VisitDetail): string => {
      if ('name' in item) return item.name; // For VisitDetail
      return (item as ListPatient).display; // For ListPatient
  };

  // --- RENDER ---
  if (loading && !dashboardData) {
    return (
        <div className="text-center py-4 text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
            <p className="text-sm">Loading...</p>
        </div>
    );
  }

  if (error) {
    return (
        <div className="p-3 text-red-600 bg-red-50 rounded border border-red-200">
            <p className="text-sm">{error}</p>
            <button onClick={() => fetchDashboardAndPatients(currentQuery)} className="mt-1 text-xs underline">
                Retry
            </button>
        </div>
    );
  }

  return (
    <div className="space-y-4 text-black">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard 
            title="Active Visits" 
            count={dashboardData?.activeVisits ?? 0} 
            icon={<BedDouble />} 
        />
        <StatCard 
            title="Today's Visits" 
            count={dashboardData?.totalVisitsToday ?? 0} 
            icon={<Users />} 
        />
        <StatCard 
            title="Appointments" 
            count={dashboardData?.appointmentsToday ?? 0} 
            icon={<Calendar />} 
        />
      </div>

      {/* List Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-gray-900">
            {displayList.type === 'search' 
                ? `Search: "${currentQuery}" (${displayList.count})` 
                : `Active Visits (${displayList.count})`}
        </h2>
      </div>

      {/* Patient List */}
      <div className="border border-gray-200 rounded">
        <div className="bg-gray-50 border-b border-gray-200 px-3 py-2">
          <div className="grid grid-cols-4 text-xs font-medium text-gray-700">
            <div>{displayList.type === 'visits' ? 'Time' : 'Name'}</div>
            <div>ID</div>
            <div>{displayList.type === 'visits' ? 'Name' : 'Age/Gender'}</div>
            <div className="text-right">Action</div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {displayList.count === 0 ? (
            <div className="px-3 py-4 text-center text-gray-500 text-sm">
              {currentQuery.length >= 2 
                ? `No results for "${currentQuery}"`
                : 'No active visits'}
            </div>
          ) : (
            displayList.data.map((item) => {
              const isVisit = displayList.type === 'visits';
              const name = getDisplayName(item);
              const linkUuid = getLinkUuid(item);

              return (
                <div key={getLinkUuid(item)} className="px-3 py-2 hover:bg-gray-50">
                  <div className="grid grid-cols-4 items-center text-sm">
                    <div className="text-gray-900">
                      {isVisit ? (
                        <div className="text-xs">
                          {new Date((item as VisitDetail).visitStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      ) : (
                        name
                      )}
                    </div>
                    <div className="text-gray-600 text-xs">{getDisplayIdentifier(item)}</div>
                    <div className="text-gray-900 text-sm">
                      {isVisit 
                          ? name 
                          // Accessing age/gender is safe here because it's filtered for search results (ListPatient)
                          : `${(item as ListPatient).age || 'N/A'}/${(item as ListPatient).gender}`}
                    </div>
                    <div className="text-right">
                      <a 
                        href={`/dashboard/patients/${linkUuid}`}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        {isVisit ? 'Continue' : 'View'}
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveVisitDashboard;