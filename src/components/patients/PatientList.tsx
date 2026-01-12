'use client';

import { SessionContext } from '@/lib/context/session-context';
import { getDailyVisitStats, VisitSummary } from '@/lib/visits/getADaysVisits';
import { BedDouble, Calendar, Loader2, Search, Users } from 'lucide-react';
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
    uuid: string;
    identifiers: Array<{
      identifier: string;
      uuid: string;
    }>;
    person: {
      age: number;
      display: string;
      gender: string;
      uuid: string;
    };
  };
  visitType: {
    uuid: string;
    name: string;
    display: string;
  };
  location: {
    uuid: string;
    name: string;
    display: string;
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

type TabType = 'active' | 'today' | 'appointments' | 'all';
type DisplayItem = ListPatient | VisitDetail | VisitResult;

const isVisitResult = (item: DisplayItem): item is VisitResult => {
  return 'patient' in item && 'person' in (item as any).patient;
};

const isVisitDetail = (item: DisplayItem): item is VisitDetail => {
  return 'patientUuid' in item && 'openmrsId' in item;
};

const isListPatient = (item: DisplayItem): item is ListPatient => {
  return 'uuid' in item && !('patient' in item) && !('patientUuid' in item);
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
  const [, setError] = useState<string | null>(null);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchTerm);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [dailyVisitStats, setDailyVisitStats] = useState<VisitSummary | null>(null);
  
  const sessionContext = useContext(SessionContext);
  const sessionLocationUuid = sessionContext?.sessionLocation?.uuid;
  const currentQuery = localSearchQuery.trim();

  const fetchDashboardAndPatients = useCallback(async (query: string) => {
    const isSearchingQuery = query.length >= 2;
    if (isSearchingQuery) setIsSearching(true);
    setError(null);

    try {
      const dailyStats = await getDailyVisitStats();
      setDailyVisitStats(dailyStats);

      if (!dashboardData) {
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
  }, [dashboardData]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchDashboardAndPatients(currentQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [currentQuery, fetchDashboardAndPatients]);

  const filteredVisits = useMemo(() => {
    if (!dashboardData?.detailedVisits) return [];
    if (!sessionLocationUuid || activeTab === 'all') return dashboardData.detailedVisits;
    return dashboardData.detailedVisits.filter(visit => visit.locationUuid === sessionLocationUuid);
  }, [dashboardData?.detailedVisits, sessionLocationUuid, activeTab]);

  const getTabData = useMemo(() => {
    const isSearchActive = currentQuery.length >= 2;
    if (isSearchActive) return { type: 'search' as const, data: searchResults as DisplayItem[], count: searchResults.length };
    
    switch (activeTab) {
      case 'active':
        return { type: 'visits' as const, data: filteredVisits as DisplayItem[], count: filteredVisits?.length || 0 };
      case 'today':
        return { type: 'today' as const, data: (dailyVisitStats?.visits || []) as DisplayItem[], count: dailyVisitStats?.totalCount || 0 };
      case 'appointments':
        return { type: 'appointments' as const, data: [] as DisplayItem[], count: 0 };
      default:
        return { type: 'none' as const, data: [] as DisplayItem[], count: 0 };
    }
  }, [currentQuery, searchResults, filteredVisits, activeTab, dailyVisitStats]);

  const [openmrsIdMap, setOpenmrsIdMap] = useState<Record<string, string>>({});
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [phoneMap, setPhoneMap] = useState<Record<string, string>>({});
  
  const getLinkUuid = (item: DisplayItem): string => {
    if (isVisitResult(item)) return item.patient.uuid;
    if (isVisitDetail(item)) return item.patientUuid;
    if (isListPatient(item)) return item.uuid;
    return '';
  };

  useEffect(() => {
    const items = getTabData.data || [];
    const fetchData = async () => {
      const toFetch = items.filter(item => {
        const uuid = getLinkUuid(item);
        return isListPatient(item) && (!openmrsIdMap[uuid] || !nameMap[uuid] || !phoneMap[uuid]);
      }) as ListPatient[];

      if (toFetch.length === 0) return;

      const newIds: Record<string, string> = {};
      const newNames: Record<string, string> = {};
      const newPhones: Record<string, string> = {};

      await Promise.all(
        toFetch.map(async (patient) => {
          const [id, name, phone] = await Promise.all([
            getOpenMRSId(patient),
            getPatientName(patient),
            getPhoneNumber(patient)
          ]);
          if (id) newIds[patient.uuid] = id;
          if (name) newNames[patient.uuid] = name;
          if (phone) newPhones[patient.uuid] = phone;
        })
      );

      setOpenmrsIdMap(prev => ({ ...prev, ...newIds }));
      setNameMap(prev => ({ ...prev, ...newNames }));
      setPhoneMap(prev => ({ ...prev, ...newPhones }));
    };
    fetchData();
  }, [getTabData.data, openmrsIdMap, nameMap, phoneMap]);

  const handleViewPatient = (patientUuid: string) => {
    router.push(`/dashboard/patients/${patientUuid}`);
  };

  if (loading && !dashboardData) {
    return (
        <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-blue-600" />
            <p className="text-gray-600">Loading dashboard...</p>
        </div>
    );
  }

  const isVisitMode = getTabData.type === 'visits' || getTabData.type === 'today';

  return (
    <div className="space-y-5 text-black">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search patients by name or identifier..."
          value={localSearchQuery}
          onChange={(e) => setLocalSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
          disabled={loading}
        />
        {isSearching && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard title="Active Visits" count={filteredVisits?.length ?? 0} icon={<BedDouble />} active={activeTab === 'active'} onClick={() => setActiveTab('active')} />
        <StatCard title="Today's Visits" count={dailyVisitStats?.totalCount ?? 0} icon={<Users />} active={activeTab === 'today'} onClick={() => setActiveTab('today')} />
        <StatCard title="Appointments" count={dashboardData?.appointmentsToday ?? 0} icon={<Calendar />} active={activeTab === 'appointments'} onClick={() => setActiveTab('appointments')} />
      </div>

      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-900">
            {getTabData.type === 'search' ? `Search Results: "${currentQuery}"` : activeTab === 'active' ? 'Active Visits' : activeTab === 'today' ? "Today's Visits" : "Appointments"}
          </h2>
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">{getTabData.count}</span>
        </div>
      </div>

      <div className="border border-gray-100 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-3 py-2">
          <div className={`grid ${isVisitMode ? 'grid-cols-10' : 'grid-cols-9'} text-xs font-semibold text-gray-700`} style={{gap: '8px'}}>
            {isVisitMode ? (
              <><div className="col-span-1">Date</div><div className="col-span-1">Time</div></>
            ) : (
              <div className="col-span-2">Patient</div>
            )}
            <div>System ID</div>
            <div>Name</div>
            <div>Age</div>
            <div>Gender</div>
            <div>Phone</div>
            {isVisitMode && <div>Visit Type</div>}
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {getTabData.count === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">No records found.</div>
          ) : (
            getTabData.data.map((item, index) => {
              if (isVisitResult(item)) {
                const { patient, startDatetime, stopDatetime, visitType } = item;
                const d = new Date(startDatetime);
                return (
                  <div key={`${item.uuid}-${index}`} className="px-3 py-2 hover:bg-blue-50/50 transition-colors">
                    <div className="grid grid-cols-10 items-center text-xs" style={{gap: '8px'}}>
                      <div className="text-gray-900">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                      <div className="text-gray-600">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="font-mono bg-gray-50 px-1 rounded border">{patient.identifiers?.[0]?.identifier || 'N/A'}</div>
                      <div className="font-medium text-gray-900 truncate">{patient.person.display}</div>
                      <div>{patient.person.age}</div>
                      <div>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${patient.person.gender === 'F' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'}`}>
                          {patient.person.gender}
                        </span>
                      </div>
                      <div className="text-gray-400">N/A</div>
                      <div>
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-[10px]">{visitType.display}</span>
                      </div>
                      <div>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${stopDatetime ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'}`}>
                          {stopDatetime ? 'Completed' : 'Active'}
                        </span>
                      </div>
                      <div className="text-right">
                        <button onClick={() => handleViewPatient(patient.uuid)} className="px-2 py-1 text-blue-700 bg-blue-100 rounded hover:bg-blue-200">View</button>
                      </div>
                    </div>
                  </div>
                );
              }

              const name = isVisitDetail(item) ? item.name : nameMap[item.uuid] || 'Unknown';
              const linkUuid = getLinkUuid(item);
              const openmrsId = isVisitDetail(item) ? item.openmrsId : openmrsIdMap[item.uuid] || 'N/A';
              const gender = isVisitDetail(item) || isListPatient(item) ? item.gender : 'Unknown';

              return (
                <div key={`${linkUuid}-${index}`} className="px-3 py-2 hover:bg-blue-50/50 transition-colors">
                  <div className={`grid ${isVisitMode ? 'grid-cols-10' : 'grid-cols-9'} items-center text-xs`} style={{gap: '8px'}}>
                    {isVisitMode ? (
                      <>
                        <div className="text-gray-900">{new Date((item as VisitDetail).visitStartTime).toLocaleDateString()}</div>
                        <div className="text-gray-600">{new Date((item as VisitDetail).visitStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </>
                    ) : (
                      <div className="col-span-2 truncate font-medium">{name}</div>
                    )}
                    <div className="font-mono bg-gray-50 px-1 rounded border">{openmrsId}</div>
                    <div className="truncate">{name}</div>
                    <div>{(item as any).age || 'N/A'}</div>
                    <div>
                      <span className="px-1.5 py-0.5 bg-gray-100 rounded-full text-[10px]">{gender}</span>
                    </div>
                    <div className="truncate text-gray-600">{isListPatient(item) ? phoneMap[item.uuid] : (item as any).phoneNumber || 'N/A'}</div>
                    {isVisitMode && (
                        <div className="truncate">{(item as VisitDetail).visitType || 'N/A'}</div>
                    )}
                    <div><span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded-full text-[10px]">Active</span></div>
                    <div className="text-right">
                      <button onClick={() => handleViewPatient(linkUuid)} className="px-2 py-1 text-blue-700 bg-blue-100 rounded hover:bg-blue-200">View</button>
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