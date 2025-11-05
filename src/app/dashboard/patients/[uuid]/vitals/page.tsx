// src/app/dashboard/patients/[uuid]/vitals/page.tsx

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getConceptUuid } from '@/lib/config/concept';
import { getPatientObservations, Observation } from '@/lib/patients/getPatientObservations';
import { getPatientActiveVisit } from '@/lib/visits/getActiveVisit';
import { Visit } from '@/lib/patients/manageVisits';
import PatientDetails from '@/components/patients/PatientDetails';
import { Activity, Scale, TrendingUp } from 'lucide-react';

export interface VitalSign {
  date: string;
  encounterUuid: string;
  temp?: number;
  systolicBP?: number;
  diastolicBP?: number;
  pulse?: number;
  respRate?: number;
  spo2?: number;
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
    const value = obs.valueNumeric ?? obs.value;
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

export default function VitalsPage({ params }: { params: { uuid: string } }) {
  const patientUuid = params.uuid;
  const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
  const [vitalsHistory, setVitalsHistory] = useState<VitalSign[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const visit = await getPatientActiveVisit(patientUuid);
      setActiveVisit(visit);
    } catch (err) {
      console.error('Failed to fetch active visit:', err);
    }

    try {
      const conceptUuids = await Promise.all([
        getConceptUuid('Weight (kg)'),
        getConceptUuid('Height (cm)'),
        getConceptUuid('Temparature (c)'),
        getConceptUuid('Systolic blood pressure'),
        getConceptUuid('Diastolic blood pressure'),
        getConceptUuid('Pulse'),
        getConceptUuid('Respiratory rate'),
      ]);

      const conceptMap = {
        WEIGHT: conceptUuids[0],
        HEIGHT: conceptUuids[1],
        TEMP: conceptUuids[2],
        SYSTOLIC_BP: conceptUuids[3],
        DIASTOLIC_BP: conceptUuids[4],
        PULSE: conceptUuids[5],
        RESP_RATE: conceptUuids[6],
      };

      const rawObservations = await getPatientObservations(patientUuid);
      const vitals = await processVitals(rawObservations, conceptMap);
      setVitalsHistory(vitals);
    } catch (err) {
      console.error('Vitals loading error:', err);
    }
  }, [patientUuid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleActionComplete = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const latestVitals = vitalsHistory[0] || {};

  return (
    <div className="min-h-screen bg-white">
      <div className="p-4 space-y-4">
        {/* Patient Details - Preserved exactly as requested */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <PatientDetails
            patientUuid={patientUuid}
            activeVisit={activeVisit}
            onActionComplete={handleActionComplete}
          />
        </div>

        {/* Active Visit Status */}
        {activeVisit && (
          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-700">
              Active Visit • {new Date(activeVisit.startDatetime).toLocaleTimeString([], { 
                hour: '2-digit', minute: '2-digit' 
              })}
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Vitals & Biometrics</h1>
            {latestVitals.date && (
              <p className="text-sm text-gray-600">
                Last recorded {getDaysOld(latestVitals.date)}
              </p>
            )}
          </div>
          <Link
            href={`/dashboard/patients/${patientUuid}/vitals/new`}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            <Activity className="w-4 h-4" />
            Record Vitals
          </Link>
        </div>

        {/* Latest Vitals Summary */}
        {latestVitals.date && (
          <div className="bg-gray-50 rounded border border-gray-200 p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-medium text-gray-900">Latest Vitals</h3>
              <span className="text-xs text-gray-500">
                {formatVitalDate(latestVitals.date)}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {latestVitals.temp && <div>Temp: <span className="font-medium">{latestVitals.temp}°C</span></div>}
              {latestVitals.pulse && <div>Pulse: <span className="font-medium">{latestVitals.pulse}</span></div>}
              {latestVitals.systolicBP && latestVitals.diastolicBP && (
                <div>BP: <span className="font-medium">{latestVitals.systolicBP}/{latestVitals.diastolicBP}</span></div>
              )}
              {latestVitals.respRate && <div>Resp: <span className="font-medium">{latestVitals.respRate}</span></div>}
            </div>
          </div>
        )}

        {/* Biometrics Summary */}
        {(latestVitals.weight || latestVitals.height) && (
          <div className="bg-gray-50 rounded border border-gray-200 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-medium text-gray-900">Biometrics</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {latestVitals.weight && <div>Weight: <span className="font-medium">{latestVitals.weight}kg</span></div>}
              {latestVitals.height && <div>Height: <span className="font-medium">{latestVitals.height}cm</span></div>}
              {latestVitals.bmi && <div>BMI: <span className="font-medium">{latestVitals.bmi.toFixed(1)}</span></div>}
            </div>
          </div>
        )}

        {/* History Tables */}
        <div className="space-y-4">
          <VitalsHistory data={vitalsHistory} />
          <BiometricsHistory data={vitalsHistory} />
        </div>
      </div>
    </div>
  );
}

const VitalsHistory: React.FC<{ data: VitalSign[] }> = ({ data }) => (
  <div className="border border-gray-200 rounded">
    <div className="bg-gray-50 border-b border-gray-200 px-3 py-2">
      <h3 className="text-sm font-medium text-gray-900">Vitals History ({data.length})</h3>
    </div>
    <div className="divide-y divide-gray-100">
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
    </div>
  </div>
);

const BiometricsHistory: React.FC<{ data: VitalSign[] }> = ({ data }) => (
  <div className="border border-gray-200 rounded">
    <div className="bg-gray-50 border-b border-gray-200 px-3 py-2">
      <h3 className="text-sm font-medium text-gray-900">Biometrics History ({data.length})</h3>
    </div>
    <div className="divide-y divide-gray-100">
      {data.map((v, i) => (
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
    </div>
  </div>
);