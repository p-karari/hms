// src/components/vitals/VitalsHistoryCard.tsx

'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getConceptUuid } from '@/lib/config/concept';
import { getPatientObservations, Observation } from '@/lib/patients/getPatientObservations';
import { Activity, TrendingUp } from 'lucide-react';

// --- Local Utility Functions (Extracted from the original page) ---

export interface VitalSign {
  date: string;
  encounterUuid: string;
  temp?: number;
  systolicBP?: number;
  diastolicBP?: number;
  pulse?: number;
  respRate?: number;
  spo2?: number; // Not used in the original logic, but kept for completeness
  weight?: number;
  height?: number;
  bmi?: number;
}

// interface ConceptUuids {
//   WEIGHT: string;
//   HEIGHT: string;
//   TEMP: string;
//   SYSTOLIC_BP: string;
//   DIASTOLIC_BP: string;
//   PULSE: string;
//   RESP_RATE: string;
// }

const getDaysOld = (isoString: string): string => {
  const diffDays = Math.ceil(Math.abs(Date.now() - new Date(isoString).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
};

const formatVitalDate = (isoString: string) => {
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
    // Handle both valueNumeric and raw value, ensure it's a number for processing
    const value = typeof obs.valueNumeric === 'number' ? obs.valueNumeric : 
                  typeof obs.value === 'number' ? obs.value : 
                  (typeof obs.value === 'string' && !isNaN(parseFloat(obs.value)) ? parseFloat(obs.value) : undefined);

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

// --- History Display Components (Moved inside the same file for simplicity) ---

const VitalsHistoryDisplay: React.FC<{ data: VitalSign[] }> = ({ data }) => (
  <div className="border border-gray-200 rounded">
    <div className="bg-gray-50 border-b border-gray-200 px-3 py-2">
      <h3 className="text-sm font-medium text-gray-900">Vitals History ({data.length})</h3>
    </div>
    <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
      {data.map((v, i) => (
        <div key={i} className="px-3 py-2 text-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-900 font-medium">{formatVitalDate(v.date)}</span>
            <span className="text-xs text-gray-500">{getDaysOld(v.date)}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600">
            {v.temp && <div>Temp: {v.temp}°C</div>}
            {v.pulse && <div>Pulse: {v.pulse}</div>}
            {v.systolicBP && v.diastolicBP && <div>BP: {v.systolicBP}/{v.diastolicBP}</div>}
            {v.respRate && <div>Resp: {v.respRate}</div>}
          </div>
        </div>
      ))}
      {data.length === 0 && <p className="p-3 text-sm text-gray-500">No recorded vital signs.</p>}
    </div>
  </div>
);

const BiometricsHistoryDisplay: React.FC<{ data: VitalSign[] }> = ({ data }) => {
    // Filter history to only show entries with biometrics
    const biometricEntries = data.filter(v => v.weight || v.height);

    return (
        <div className="border border-gray-200 rounded">
            <div className="bg-gray-50 border-b border-gray-200 px-3 py-2">
                <h3 className="text-sm font-medium text-gray-900">Biometrics History ({biometricEntries.length})</h3>
            </div>
            <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                {biometricEntries.map((v, i) => (
                    <div key={i} className="px-3 py-2 text-sm">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-900 font-medium">{formatVitalDate(v.date)}</span>
                            <span className="text-xs text-gray-500">{getDaysOld(v.date)}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-600">
                            {v.weight && <div>Weight: {v.weight}kg</div>}
                            {v.height && <div>Height: {v.height}cm</div>}
                            {v.bmi && <div>BMI: {v.bmi.toFixed(1)}</div>}
                        </div>
                    </div>
                ))}
                {biometricEntries.length === 0 && <p className="p-3 text-sm text-gray-500">No recorded biometrics.</p>}
            </div>
        </div>
    );
};


// --- MAIN Component (The Card) ---

interface VitalsHistoryCardProps {
    patientUuid: string;
    refreshKey: number; // Use refreshKey to force data fetch when parent actions complete
    onRecordVitals: () => void; // Callback to open the form (handled by PatientCardSummaryView)
}

export default function VitalsHistoryCard({ patientUuid, refreshKey, onRecordVitals }: VitalsHistoryCardProps) {
  const [vitalsHistory, setVitalsHistory] = useState<VitalSign[]>([]);
  const [conceptMap, setConceptMap] = useState<Record<string, string> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
console.log(conceptMap)
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Concept UUIDs
      const conceptUuids = await Promise.all([
        getConceptUuid('Weight (kg)'),
        getConceptUuid('Height (cm)'),
        getConceptUuid('Temparature (c)'),
        getConceptUuid('Systolic blood pressure'),
        getConceptUuid('Diastolic blood pressure'),
        getConceptUuid('Pulse'),
        getConceptUuid('Respiratory rate'),
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

      // 2. Fetch Raw Observations and Process
      const rawObservations = await getPatientObservations(patientUuid);
      const vitals = await processVitals(rawObservations, map);
      setVitalsHistory(vitals);
      
    } catch (err) {
      console.error('Vitals loading error:', err);
      // In a summary view, we just show empty/loading state on error
    } finally {
        setIsLoading(false);
    }
  }, [patientUuid]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]); // Refresh when the key changes

  const latestVitals = useMemo(() => vitalsHistory[0] || {}, [vitalsHistory]);

  // --- Render Logic (Simplified for Summary Card) ---
  
  if (isLoading && vitalsHistory.length === 0) {
      return (
        <div className="text-center p-8 text-blue-600">
            <Activity className="w-8 h-8 mx-auto animate-spin mb-3" />
            Loading vitals history...
        </div>
      );
  }

  return (
    <div className="bg-white shadow-xl rounded-xl p-4 space-y-4 border border-gray-200">
        
        {/* Header and Record Button */}
        <div className="flex justify-between items-center border-b pb-2">
            <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    Vitals & Biometrics
                </h2>
                {latestVitals.date && (
                    <p className="text-sm text-gray-600">Last recorded {getDaysOld(latestVitals.date)}</p>
                )}
            </div>
            <button
                onClick={onRecordVitals}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={!patientUuid}
            >
                <Activity className="w-4 h-4" />
                Record Vitals
            </button>
        </div>

        {/* Latest Vitals (Top Summary) */}
        {latestVitals.date && (
            <div className="bg-blue-50 rounded border border-blue-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-medium text-gray-900">Latest Readings</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-semibold">
                    {latestVitals.temp && (
                        <div>
                            Temp: <span className="text-blue-700">{latestVitals.temp}°C</span>
                        </div>
                    )}
                    {latestVitals.pulse && (
                        <div>
                            Pulse: <span className="text-blue-700">{latestVitals.pulse}</span>
                        </div>
                    )}
                    {latestVitals.systolicBP && latestVitals.diastolicBP && (
                        <div>
                            BP: <span className="text-blue-700">{latestVitals.systolicBP}/{latestVitals.diastolicBP}</span>
                        </div>
                    )}
                    {latestVitals.respRate && (
                        <div>
                            Resp: <span className="text-blue-700">{latestVitals.respRate}</span>
                        </div>
                    )}
                     {latestVitals.weight && (
                        <div>
                            Weight: <span className="text-blue-700">{latestVitals.weight}kg</span>
                        </div>
                    )}
                    {latestVitals.height && (
                        <div>
                            Height: <span className="text-blue-700">{latestVitals.height}cm</span>
                        </div>
                    )}
                    {latestVitals.bmi && (
                        <div>
                            BMI: <span className="text-blue-700">{latestVitals.bmi.toFixed(1)}</span>
                        </div>
                    )}
                </div>
            </div>
        )}
        
        {/* History Tables */}
        <div className="space-y-4">
            <VitalsHistoryDisplay data={vitalsHistory} />
            <BiometricsHistoryDisplay data={vitalsHistory} />
        </div>
        
    </div>
  );
}