'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { getConceptUuid } from '@/lib/config/concept';
import { getPatientObservations, Observation } from '@/lib/patients/getPatientObservations';
import { Activity, RefreshCw } from 'lucide-react';

interface VitalSign {
  date: string;
  encounterUuid: string;
  temp?: number;
  systolicBP?: number;
  diastolicBP?: number;
  pulse?: number;
  respRate?: number;
  weight?: number;
  height?: number;
  bmi?: number;
}

const getDaysOld = (isoString: string): string => {
  const diffDays = Math.ceil(Math.abs(Date.now() - new Date(isoString).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
};

async function processVitals(
  rawObservations: Observation[],
  conceptMap: Record<string, string>
): Promise<VitalSign[]> {
  const obsByTime = new Map<string, Partial<VitalSign>>();

  rawObservations.forEach((obs) => {
    const conceptUuid = obs.concept.uuid;
    const dateKey = obs.obsDatetime.substring(0, 16);
    const vitalEntry = obsByTime.get(dateKey) || { date: obs.obsDatetime, encounterUuid: 'N/A' };
    
    // Use valueNumeric directly since we're fetching optimized data
    const value = obs.valueNumeric;

    if (typeof value !== 'number') return;

    if (conceptUuid === conceptMap.TEMP) vitalEntry.temp = value;
    else if (conceptUuid === conceptMap.PULSE) vitalEntry.pulse = value;
    else if (conceptUuid === conceptMap.RESP_RATE) vitalEntry.respRate = value;
    else if (conceptUuid === conceptMap.SYSTOLIC_BP) vitalEntry.systolicBP = value;
    else if (conceptUuid === conceptMap.DIASTOLIC_BP) vitalEntry.diastolicBP = value;
    else if (conceptUuid === conceptMap.WEIGHT) vitalEntry.weight = value;
    else if (conceptUuid === conceptMap.HEIGHT) vitalEntry.height = value;

    obsByTime.set(dateKey, vitalEntry);
  });

  const finalVitals: VitalSign[] = Array.from(obsByTime.values())
    .map((v) => {
      const entry = v as VitalSign;
      if (entry.weight && entry.height) {
        const heightInMeters = entry.height / 100;
        entry.bmi = entry.weight / (heightInMeters * heightInMeters);
      }
      return entry;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return finalVitals;
}

interface LatestVitalsReadingsProps {
  patientUuid: string;
  refreshKey?: number;
  compact?: boolean;
  showRefreshButton?: boolean;
}

// Cache for concept UUIDs to avoid repeated API calls
const conceptUuidCache = new Map<string, string>();

export default function LatestVitalsReadings({ 
  patientUuid, 
  refreshKey = 0,
  compact = false,
  showRefreshButton = false 
}: LatestVitalsReadingsProps) {
  const [vitalsHistory, setVitalsHistory] = useState<VitalSign[]>([]);
  const [conceptMap, setConceptMap] = useState<Record<string, string> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isFetchingRef = useRef(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    // Prevent duplicate simultaneous requests
    if (isFetchingRef.current && !isRefresh) return;
    
    isFetchingRef.current = true;
    
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      // Get concept UUIDs from cache or API
      let conceptUuids: string[] = [];
      
      if (!conceptMap) {
        conceptUuids = await Promise.all([
          getCachedConceptUuid('Weight (kg)'),
          getCachedConceptUuid('Height (cm)'),
          getCachedConceptUuid('Temperature (c)'),
          getCachedConceptUuid('Systolic blood pressure'),
          getCachedConceptUuid('Diastolic blood pressure'),
          getCachedConceptUuid('Pulse'),
          getCachedConceptUuid('Respiratory rate'),
        ]);

        const map = {
          WEIGHT: conceptUuids[0],
          HEIGHT: conceptUuids[1],
          TEMP: conceptUuids[2],
          SYSTOLIC_BP: conceptUuids[3],
          DIASTOLIC_BP: conceptUuids[4],
          PULSE: conceptUuids[5],
          RESP_RATE: conceptUuids[6],
        };
        setConceptMap(map);
      } else {
        // Use existing concept map
        conceptUuids = Object.values(conceptMap);
      }

      const rawObservations = await getPatientObservations(patientUuid);
      const vitals = await processVitals(rawObservations, conceptMap || {
        WEIGHT: conceptUuids[0],
        HEIGHT: conceptUuids[1],
        TEMP: conceptUuids[2],
        SYSTOLIC_BP: conceptUuids[3],
        DIASTOLIC_BP: conceptUuids[4],
        PULSE: conceptUuids[5],
        RESP_RATE: conceptUuids[6],
      });
      
      setVitalsHistory(vitals);
      
    } catch (err) {
      console.error('Vitals loading error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [patientUuid, conceptMap]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const latestVitals = useMemo(() => vitalsHistory[0] || {}, [vitalsHistory]);
  const hasVitals = latestVitals && Object.keys(latestVitals).length > 2;

  const handleRefresh = () => {
    fetchData(true);
  };

  // Loading state
  if (isLoading && !isRefreshing) {
    return (
      <div className="text-center p-4 text-blue-600">
        <Activity className="w-6 h-6 mx-auto animate-spin mb-2" />
        <p className="text-sm">Loading vitals...</p>
      </div>
    );
  }

  // No vitals state
  if (!hasVitals) {
    return (
      <div className="text-center p-4 text-gray-500 border border-dashed rounded-lg">
        <Activity className="w-6 h-6 mx-auto mb-2 text-gray-400" />
        <p className="text-sm">No vitals recorded</p>
      </div>
    );
  }

  // Render vitals
  return (
    <div className={`bg-white ${compact ? 'p-3' : 'p-4'} rounded-lg border border-gray-200 shadow-sm`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>
              Latest Vitals
            </h3>
            {!compact && latestVitals.date && (
              <p className="text-xs text-gray-600">
                Recorded {getDaysOld(latestVitals.date)}
              </p>
            )}
          </div>
        </div>
        
        {showRefreshButton && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh vitals"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Vitals Grid */}
      <div className={`grid gap-2 ${compact ? 'grid-cols-2 gap-1 text-xs' : 'grid-cols-2 md:grid-cols-3 gap-3 text-sm'}`}>
        {latestVitals.temp && (
          <div className={`${compact ? 'p-1' : 'p-2 bg-blue-50 rounded'} flex flex-col`}>
            <span className={`${compact ? 'text-gray-500' : 'text-gray-600'}`}>Temp</span>
            <span className={`font-semibold ${compact ? 'text-blue-700' : 'text-blue-800'}`}>
              {latestVitals.temp}°C
            </span>
          </div>
        )}
        
        {latestVitals.pulse && (
          <div className={`${compact ? 'p-1' : 'p-2 bg-blue-50 rounded'} flex flex-col`}>
            <span className={`${compact ? 'text-gray-500' : 'text-gray-600'}`}>Pulse</span>
            <span className={`font-semibold ${compact ? 'text-blue-700' : 'text-blue-800'}`}>
              {latestVitals.pulse}
            </span>
          </div>
        )}
        
        {latestVitals.systolicBP && latestVitals.diastolicBP && (
          <div className={`${compact ? 'p-1' : 'p-2 bg-blue-50 rounded'} flex flex-col`}>
            <span className={`${compact ? 'text-gray-500' : 'text-gray-600'}`}>BP</span>
            <span className={`font-semibold ${compact ? 'text-blue-700' : 'text-blue-800'}`}>
              {latestVitals.systolicBP}/{latestVitals.diastolicBP}
            </span>
          </div>
        )}
        
        {latestVitals.respRate && (
          <div className={`${compact ? 'p-1' : 'p-2 bg-blue-50 rounded'} flex flex-col`}>
            <span className={`${compact ? 'text-gray-500' : 'text-gray-600'}`}>Resp</span>
            <span className={`font-semibold ${compact ? 'text-blue-700' : 'text-blue-800'}`}>
              {latestVitals.respRate}
            </span>
          </div>
        )}
        
        {latestVitals.weight && (
          <div className={`${compact ? 'p-1' : 'p-2 bg-blue-50 rounded'} flex flex-col`}>
            <span className={`${compact ? 'text-gray-500' : 'text-gray-600'}`}>Weight</span>
            <span className={`font-semibold ${compact ? 'text-blue-700' : 'text-blue-800'}`}>
              {latestVitals.weight}kg
            </span>
          </div>
        )}
        
        {latestVitals.height && (
          <div className={`${compact ? 'p-1' : 'p-2 bg-blue-50 rounded'} flex flex-col`}>
            <span className={`${compact ? 'text-gray-500' : 'text-gray-600'}`}>Height</span>
            <span className={`font-semibold ${compact ? 'text-blue-700' : 'text-blue-800'}`}>
              {latestVitals.height}cm
            </span>
          </div>
        )}
        
        {latestVitals.bmi && (
          <div className={`${compact ? 'p-1' : 'p-2 bg-blue-50 rounded'} flex flex-col`}>
            <span className={`${compact ? 'text-gray-500' : 'text-gray-600'}`}>BMI</span>
            <span className={`font-semibold ${compact ? 'text-blue-700' : 'text-blue-800'}`}>
              {latestVitals.bmi.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Compact timestamp */}
      {compact && latestVitals.date && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          {getDaysOld(latestVitals.date)}
        </p>
      )}
    </div>
  );
}

// Helper function to cache concept UUIDs
async function getCachedConceptUuid(conceptName: string): Promise<string> {
  const cached = conceptUuidCache.get(conceptName);
  if (cached) return cached;
  
  const uuid = await getConceptUuid(conceptName);
  conceptUuidCache.set(conceptName, uuid);
  return uuid;
}