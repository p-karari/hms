'use client';

import { SessionContext } from '@/lib/context/session-context';
import { getDailyVisitStats, VisitSummary } from '@/lib/visits/getADaysVisits';
import { BedDouble, Calendar, ChevronRight, Clock, Loader2, Phone, Search, User, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getAppointmentsTodayCount } from '../../lib/appointments/manageAppointments';
import {
  getOpenMRSId,
  getPatientName,
  getPhoneNumber,
  ListPatient,
  searchPatients
} from '../../lib/patients/searchPatients';
import { getDashboardVisitData, VisitDetail } from '../../lib/visits/getDashboardVisitData';

interface VisitResult {
  uuid: string;
  startDatetime: string;
  stopDatetime: string | null;
  patient: {
    display: string;
    uuid: string;
  };
  visitType: {
    display: string;
  };
  location: {
    display: string;
    uuid: string;
  };
}

interface DashboardData {
    activeVisits: number;
    totalVisitsToday: number;
    appointmentsToday: number;
    detailedVisits: VisitDetail[];
}

interface PatientListProps {
  searchTerm: string; 
}

// Define tab types
type TabType = 'active' | 'today' | 'appointments' | 'all';

type DisplayItem = ListPatient | VisitDetail | VisitResult;
const isVisitResult = (item: DisplayItem): item is VisitResult => {
  return 'startDatetime' in item && 'patient' in item;
};

const isVisitDetail = (item: DisplayItem): item is VisitDetail => {
  return 'patientUuid' in item && 'openmrsId' in item;
};

const isListPatient = (item: DisplayItem): item is ListPatient => {
  return 'uuid' in item && !isVisitResult(item) && !isVisitDetail(item);
};

const StatCard: React.FC<{ 
  title: string; 
  count: number; 
  icon: React.ReactElement<{ size: number; className: string}>;
  active: boolean;
  onClick: () => void;
}> = ({ title, count, icon, active, onClick }) => (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
        active 
          ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm' 
          : 'bg-gradient-to-br from-gray-50 to-white border-gray-100 hover:bg-gray-50'
      }`}
    >
        {React.cloneElement(icon, { 
          size: 18, 
          className: active ? "text-blue-600" : "text-gray-500"
        })}
        <div className="text-left">
            <div className={`text-lg font-bold ${active ? 'text-blue-900' : 'text-gray-900'}`}>
              {count}
            </div>
            <div className={`text-xs font-medium ${active ? 'text-blue-700' : 'text-gray-600'}`}>
              {title}
            </div>
        </div>
    </button>
);

const ActiveVisitDashboard: React.FC<PatientListProps> = ({ searchTerm }) => {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [searchResults, setSearchResults] = useState<ListPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchTerm);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [dailyVisitStats, setDailyVisitStats] = useState<VisitSummary | null>(null);
  
  // Get session context for location filtering
  const sessionContext = useContext(SessionContext);
  const sessionLocationUuid = sessionContext?.sessionLocation?.uuid;

  const currentQuery = localSearchQuery.trim();

  const fetchDashboardAndPatients = useCallback(async (query: string) => {
    const isSearchingQuery = query.length >= 2;
    
    if (isSearchingQuery) {
      setIsSearching(true);
    }
    
    setError(null);

    try {
      // Fetch daily visit stats for "Today's Visits" tab
      const dailyStats = await getDailyVisitStats();
      setDailyVisitStats(dailyStats);

      if (!dashboardData) {
        const [visitStats, appointmentsCount] = await Promise.all([
          getDashboardVisitData(),
          getAppointmentsTodayCount(),
        ]);

        console.log('Visit Stats:', visitStats);
        console.log('Visit Details:', visitStats.detailedVisits);
        
        // Log session location for debugging
        console.log('Session Location UUID:', sessionLocationUuid);
        console.log('Session Location Context:', sessionContext?.sessionLocation);

        setDashboardData({
          activeVisits: visitStats.activeVisits,
          totalVisitsToday: visitStats.totalVisitsToday,
          appointmentsToday: appointmentsCount,
          detailedVisits: visitStats.detailedVisits,
        });
      }
      
      if (isSearchingQuery) {
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
      setIsSearching(false);
    }
  }, [dashboardData, sessionLocationUuid, sessionContext]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchDashboardAndPatients(currentQuery);
    }, 300);

    return () => clearTimeout(handler);
  }, [currentQuery, fetchDashboardAndPatients]);

  // Filter visits based on session location
  const filteredVisits = useMemo(() => {
    if (!dashboardData?.detailedVisits) {
      return [];
    }
    
    if (!sessionLocationUuid || activeTab === 'all') {
      return dashboardData.detailedVisits;
    }
    
    // Filter visits that match the session location UUID (only for 'active' tab)
    const filtered = dashboardData.detailedVisits.filter(visit => 
      visit.locationUuid === sessionLocationUuid
    );
    
    console.log('Filtered visits count:', filtered.length);
    console.log('Session location UUID:', sessionLocationUuid);
    
    return filtered;
  }, [dashboardData?.detailedVisits, sessionLocationUuid, activeTab]);

  // Get data for different tabs
const getTabData = useMemo(() => {
  const isSearchActive = currentQuery.length >= 2;
  
  if (isSearchActive) {
    return { 
      type: 'search' as const, 
      data: searchResults as DisplayItem[], 
      count: searchResults.length 
    };
  }
  
  switch (activeTab) {
    case 'active':
      return { 
        type: 'visits' as const, 
        data: filteredVisits as DisplayItem[], 
        count: filteredVisits?.length || 0 
      };
    
    case 'today':
      return {
        type: 'today' as const,
        data: (dailyVisitStats?.visits || []) as unknown as VisitResult[],
        count: dailyVisitStats?.totalCount || 0
      };
    
    case 'appointments':
      return { type: 'appointments' as const, data: [] as DisplayItem[], count: 0 };
    
    case 'all':
      return {
        type: 'visits' as const,
        data: (dashboardData?.detailedVisits || []) as VisitDetail[],
        count: dashboardData?.activeVisits || 0
      };
    
    default:
      return { type: 'none' as const, data: [] as DisplayItem[], count: 0 };
  }
}, [currentQuery, searchResults, filteredVisits, activeTab, dailyVisitStats, dashboardData]);

  // Cache for patient data
  const [openmrsIdMap, setOpenmrsIdMap] = useState<Record<string, string>>({});
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [phoneMap, setPhoneMap] = useState<Record<string, string>>({});
  
const getLinkUuid = (item: DisplayItem): string => {
  if (isVisitResult(item)) return item.patient.uuid;
  if (isVisitDetail(item)) return item.patientUuid;
  if (isListPatient(item)) return item.uuid;
  return '';
};
  
  const getDisplayIdentifier = (item: any): string => {
      if ('openmrsId' in item && item.openmrsId) return item.openmrsId;
      const uuid = getLinkUuid(item);
      return openmrsIdMap[uuid] ?? 'N/A';
  };
  
  const getDisplayName = (item: any): string => {
      if ('name' in item && item.name) return item.name;
      if ('patient' in item && item.patient.display) return item.patient.display;
      const uuid = getLinkUuid(item);
      return nameMap[uuid] ?? 'Unknown';
  };
  
  const getDisplayPhone = (item: any): string => {
    if ('phoneNumber' in item) return item.phoneNumber || 'N/A';
    const uuid = getLinkUuid(item);
    return phoneMap[uuid] ?? 'N/A';
  };

  // Fetch patient data async
  useEffect(() => {
    const items = getTabData.data || [];
    
    const fetchData = async () => {
      const newOpenmrsIds: Record<string, string> = {};
      const newNames: Record<string, string> = {};
      const newPhones: Record<string, string> = {};
      
      // Filter only ListPatient items that need data fetching
      const toFetch = items.filter(item => {
        const uuid = getLinkUuid(item);
        const isListPatient = 'uuid' in item && !('patientUuid' in item);
        return isListPatient && (
          !openmrsIdMap[uuid] ||
          !nameMap[uuid] ||
          !phoneMap[uuid]
        );
      }) as ListPatient[];

      if (toFetch.length === 0) return;

      await Promise.all(
        toFetch.map(async (patient) => {
          const uuid = patient.uuid;
          try {
            const [id, name, phone] = await Promise.all([
              getOpenMRSId(patient),
              getPatientName(patient),
              getPhoneNumber(patient)
            ]);
            
            if (id) newOpenmrsIds[uuid] = id;
            if (name) newNames[uuid] = name;
            if (phone) newPhones[uuid] = phone;
          } catch (e) {
            console.error(`Failed to fetch data for patient ${uuid}:`, e);
          }
        })
      );

      setOpenmrsIdMap(prev => ({ ...prev, ...newOpenmrsIds }));
      setNameMap(prev => ({ ...prev, ...newNames }));
      setPhoneMap(prev => ({ ...prev, ...newPhones }));
    };

    fetchData();
  }, [getTabData.data, openmrsIdMap, nameMap, phoneMap]);

  // Date/time helper for visits
const getDateTimeDisplay = (item: DisplayItem): { date: string, time: string } => {
  let dateTime: string | undefined;
  
  if (isVisitResult(item)) {
    dateTime = item.startDatetime;
  } else if (isVisitDetail(item)) {
    dateTime = item.visitStartTime;
  }
  
  if (!dateTime) return { date: 'N/A', time: 'N/A' };
  
  const dateObj = new Date(dateTime);
  return {
    date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  };
};

  // Get gender from item
const getGender = (item: DisplayItem): string => {
  if (isVisitDetail(item) || isListPatient(item)) {
    return item.gender || 'Unknown';
  }
  // For VisitResult, you need to fetch gender separately or add it to the interface
  return 'Unknown';
};

  // Get age from item
const getAge = (item: DisplayItem): string => {
  if (isVisitDetail(item)) return `${item.age}` ;
  if (isListPatient(item)) return `${item.age}` ;
  // For VisitResult, calculate from patient data if available
  return 'N/A';
};

  // Handle navigation to patient page
  const handleViewPatient = (patientUuid: string) => {
    router.push(`/dashboard/patients/${patientUuid}`);
  };

  // Handle view action - checks tab type and navigates appropriately
  const handleViewAction = (item: any) => {
    const uuid = getLinkUuid(item);
    if (uuid) {
      handleViewPatient(uuid);
    }
  };

  if (loading && !dashboardData) {
    return (
        <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-blue-600" />
            <p className="text-gray-600">Loading dashboard...</p>
        </div>
    );
  }

  if (error) {
    return (
        <div className="p-4 text-red-700 bg-gradient-to-br from-red-50 to-white rounded-lg border border-red-200 shadow-sm">
            <p className="font-medium mb-2">{error}</p>
            <button 
                onClick={() => fetchDashboardAndPatients(currentQuery)} 
                className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
            >
                Retry Loading
            </button>
        </div>
    );
  }

  const isSearchMode = getTabData.type === 'search';
  const isVisitMode = getTabData.type === 'visits' || getTabData.type === 'today';

  return (
    <div className="space-y-5 text-black">
      {/* Session Location Info (for debugging) */}
      {/* {sessionLocationUuid && activeTab === 'active' && (
        <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded-md">
          Showing visits for location: <span className="font-semibold">{sessionContext?.sessionLocation?.display || 'Unknown Location'}</span>
        </div>
      )} */}
      
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search patients by name or identifier..."
          value={localSearchQuery}
          onChange={(e) => setLocalSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          disabled={loading}
        />
        {isSearching && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          </div>
        )}
      </div>

      {/* Stats Cards as Tabs */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard 
            title="Active Visits" 
            count={filteredVisits?.length ?? 0} 
            icon={<BedDouble />}
            active={activeTab === 'active'}
            onClick={() => setActiveTab('active')}
        />
        <StatCard 
            title="Today's Visits" 
            count={dailyVisitStats?.totalCount ?? 0} 
            icon={<Users />}
            active={activeTab === 'today'}
            onClick={() => setActiveTab('today')}
        />
        <StatCard 
            title="Appointments" 
            count={dashboardData?.appointmentsToday ?? 0} 
            icon={<Calendar />}
            active={activeTab === 'appointments'}
            onClick={() => setActiveTab('appointments')}
        />
      </div>

      {/* List Header */}
      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-900">
            {isSearchMode 
                ? `Search Results: "${currentQuery}"` 
                : activeTab === 'active' ? 'Active Visits'
                : activeTab === 'today' ? "Today's Visits"
                : activeTab === 'appointments' ? "Today's Appointments"
                : 'All Active Visits'}
          </h2>
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
            {getTabData.count}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          {isSearchMode ? 'Patients found' : 
           activeTab === 'today' ? 'Total visits today' :
           activeTab === 'appointments' ? 'Total appointments' :
           'Currently active'}
        </div>
      </div>

      {/* Patient/Visit List */}
      <div className="border border-gray-100 rounded-xl bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-3 py-2">
          <div className={`grid ${isVisitMode ? 'grid-cols-10' : 'grid-cols-9'} text-xs font-semibold text-gray-700 tracking-wide`} style={{gap: '8px'}}>
            {isVisitMode ? (
              <>
                <div className="flex items-center">
                  <Clock size={10} className="mr-1" />
                  <span className="truncate">Date</span>
                </div>
                <div className="flex items-center">
                  <Clock size={10} className="mr-1" />
                  <span className="truncate">Time</span>
                </div>
              </>
            ) : (
              <div className="flex items-center col-span-2">
                <User size={10} className="mr-1" />
                <span className="truncate">Patient</span>
              </div>
            )}
            <div className="flex items-center">
              <span className="truncate">System ID</span>
            </div>
            {/* NAME COLUMN */}
            <div className="flex items-center">
              <User size={10} className="mr-1" />
              <span className="truncate">Name</span>
            </div>
            <div className="flex items-center">
              <span className="truncate">Age</span>
            </div>
            <div className="flex items-center">
              <span className="truncate">Gender</span>
            </div>
            <div className="flex items-center">
              <Phone size={10} className="mr-1" />
              <span className="truncate">Phone</span>
            </div>
            {isVisitMode && (
              <div className="flex items-center">
                <span className="truncate">Visit Type</span>
              </div>
            )}
            <div className="flex items-center">
              <span className="truncate">Status</span>
            </div>
            <div className="text-right">
              <span className="truncate">Actions</span>
            </div>
          </div>
        </div>

        {/* List Items */}
        <div className="divide-y divide-gray-50">
          {getTabData.count === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                {currentQuery.length >= 2 ? (
                  <Search className="w-5 h-5 text-gray-400" />
                ) : (
                  <Users className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <p className="text-gray-600 mb-1">
                {currentQuery.length >= 2 
                  ? `No results found for "${currentQuery}"`
                  : activeTab === 'active' && sessionLocationUuid 
                    ? 'No active visits at this location' 
                    : `No ${activeTab === 'today' ? "today's visits" : activeTab === 'appointments' ? 'appointments' : 'active visits'} at the moment`}
              </p>
              <p className="text-xs text-gray-500">
                {currentQuery.length >= 2 
                  ? 'Try a different search term'
                  : activeTab === 'active' && sessionLocationUuid 
                    ? 'Patients with active visits at this location will appear here'
                    : `Patients with ${activeTab === 'today' ? "today's visits" : activeTab === 'appointments' ? 'appointments' : 'active visits'} will appear here`}
              </p>
            </div>
          ) : (
            getTabData.data.map((item, index) => {
              const name = getDisplayName(item);
              const linkUuid = getLinkUuid(item);
              const openmrsId = getDisplayIdentifier(item);
              const phoneNumber = getDisplayPhone(item);
              const initials = name.charAt(0).toUpperCase();
              const gender = getGender(item);
              const age = getAge(item);

              return (
                <div 
                  key={`${linkUuid}-${index}`} 
                  className="px-3 py-2 hover:bg-blue-50/50 transition-colors duration-150 group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`grid ${isVisitMode ? 'grid-cols-10' : 'grid-cols-9'} items-center`} style={{gap: '8px'}}>
                    
                    {/* Date & Time or Patient Name */}
                    {isVisitMode ? (
                      <>
                        <div className="text-xs text-gray-900 truncate">
                          {getDateTimeDisplay(item).date}
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {getDateTimeDisplay(item).time}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 col-span-2 min-w-0">
                        <div className="w-6 h-6 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-50 text-blue-700 text-xs font-semibold flex-shrink-0">
                          {initials}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-medium text-gray-900 truncate">{name}</span>
                          {activeTab === 'appointments' && (
                            <span className="text-[10px] text-gray-500 truncate">
                              ID: {openmrsId}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ID Field */}
                    <div className="flex items-center min-w-0">
                      <div className="font-mono text-xs font-medium text-gray-900 bg-gray-50 px-1.5 py-1 rounded border border-gray-200 hover:border-blue-300 transition-colors truncate w-full">
                        {openmrsId}
                      </div>
                    </div>

                    {/* NAME COLUMN */}
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-gray-900 truncate">
                        {name}
                      </div>
                    </div>

                    {/* Age */}
                    <div className="text-xs text-gray-900 truncate">
                      {age}
                    </div>

                    {/* Gender */}
                    <div className="text-xs min-w-0">
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize truncate inline-block ${
                        gender?.toLowerCase() === 'female' 
                          ? 'bg-pink-100 text-pink-800' 
                          : gender?.toLowerCase() === 'male'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {gender || 'Unknown'}
                      </span>
                    </div>

                    {/* Phone */}
                    <div className="flex items-center gap-1 text-xs text-gray-700 min-w-0">
                      <Phone size={10} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{phoneNumber}</span>
                    </div>

                    {/* Visit Type (only for visit mode) */}
{isVisitMode && (
  <div className="text-xs min-w-0">
    <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-[10px] font-medium truncate inline-block">
      {isVisitResult(item) 
        ? item.visitType?.display 
        : isVisitDetail(item) 
          ? item.visitType
          : 'N/A'}
    </span>
  </div>
)}

                    {/* Status */}
<div className="text-xs min-w-0">
  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium truncate inline-block ${
    (isVisitResult(item) && item.stopDatetime) || (isVisitDetail(item) && false) // Adjust based on your logic
      ? 'bg-gray-100 text-gray-800' 
      : 'bg-green-100 text-green-800'
  }`}>
    {isVisitResult(item) 
      ? item.stopDatetime ? 'Completed' : 'Active'
      : 'Active'}
  </span>
</div>

                    {/* Actions */}
                    <div className="text-right">
                      <div className="flex gap-1 justify-end">
                        <button 
                          onClick={() => handleViewAction(item)}
                          className="inline-flex items-center justify-center gap-0.5 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 hover:text-blue-800 transition-all duration-200 group-hover:shadow-sm"
                        >
                          View
                          <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center pt-2">
        <p className="text-xs text-gray-500">
          {isSearchMode 
            ? 'Showing patient search results'
            : activeTab === 'active' && sessionLocationUuid 
              ? `Showing active clinic visits for ${sessionContext?.sessionLocation?.display || 'this location'}`
              : activeTab === 'today'
              ? "Showing all visits from today"
              : activeTab === 'appointments'
              ? "Showing today's appointments"
              : 'Showing all active visits'}
        </p>
      </div>
    </div>
  );
};

export default ActiveVisitDashboard;