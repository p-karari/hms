// src/app/dashboard/patients/[uuid]/vitals/page.tsx

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getConceptUuid } from '@/lib/config/concept';
import { getPatientObservations, Observation } from '@/lib/patients/getPatientObservations';
import { getPatientActiveVisit } from '@/lib/visits/getActiveVisit';
import { Visit } from '@/lib/patients/manageVisits';
import PatientDetails from '@/components/patients/PatientDetails';
import { PatientDashboardProvider } from '@/components/context/patient-dashboard-context';

// --- TYPE DEFINITIONS ---
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

// --- UTILS ---
const getDaysOld = (isoString: string): string => {
  const observationDate = new Date(isoString).getTime();
  const today = new Date().getTime();
  const diffTime = Math.abs(today - observationDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'less than 1 day old';
  if (diffDays === 1) return '1 day old';
  return `${diffDays} days old`;
};

const formatVitalDate = (isoString: string) => {
  const date = new Date(isoString);
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  return date
    .toLocaleDateString('en-GB', options)
    .replace(/,/g, '')
    .replace(/\s/g, '—')
    .replace('—', ', ');
};

// --- PROCESSING LOGIC ---
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

// --- MAIN PAGE COMPONENT ---
export default function VitalsPage({ params }: { params: { uuid: string } }) {
  const patientUuid = params.uuid;
  const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
  const [isLoadingVisit, setIsLoadingVisit] = useState(true);
  const [vitalsHistory, setVitalsHistory] = useState<VitalSign[]>([]);
  const [error, setError] = useState<string | null>(null);
 console.log(error);
  const fetchData = useCallback(async () => {
    try {
      setIsLoadingVisit(true);
      const visit = await getPatientActiveVisit(patientUuid);
      setActiveVisit(visit);
    } catch (err) {
      console.error('Failed to fetch active visit:', err);
    } finally {
      setIsLoadingVisit(false);
    }

    try {
      const [
        conceptWeightUuid,
        conceptHeightUuid,
        conceptTempUuid,
        conceptSystolicUuid,
        conceptDiastolicUuid,
        conceptPulseUuid,
        conceptRespRateUuid,
      ] = await Promise.all([
        getConceptUuid('Weight (kg)'),
        getConceptUuid('Height (cm)'),
        getConceptUuid('Temparature (c)'),
        getConceptUuid('Systolic blood pressure'),
        getConceptUuid('Diastolic blood pressure'),
        getConceptUuid('Pulse'),
        getConceptUuid('Respiratory rate'),
      ]);

      const conceptUuids = {
        WEIGHT: conceptWeightUuid,
        HEIGHT: conceptHeightUuid,
        TEMP: conceptTempUuid,
        SYSTOLIC_BP: conceptSystolicUuid,
        DIASTOLIC_BP: conceptDiastolicUuid,
        PULSE: conceptPulseUuid,
        RESP_RATE: conceptRespRateUuid,
      };

      const rawObservations = await getPatientObservations(patientUuid);
      const vitals = await processVitals(rawObservations, conceptUuids);
      setVitalsHistory(vitals);
    } catch (err: any) {
      console.error('Vitals loading error:', err);
      setError('Failed to load vitals data.');
    }
  }, [patientUuid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleActionComplete = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const latestVitals = vitalsHistory[0] || {};
  const latestDateString = latestVitals.date ? formatVitalDate(latestVitals.date) : 'N/A';


  return (
    <PatientDashboardProvider activeVisit={activeVisit} onActionComplete={handleActionComplete}>
      <div className="bg-gray-50 min-h-screen">
        <div className="p-8 space-y-6">
          {/* --- PATIENT DETAILS CARD --- */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <PatientDetails
              patientUuid={patientUuid}
              activeVisit={activeVisit}
              onActionComplete={handleActionComplete}
            />
          </div>

          {/* --- ACTIVE VISIT STATUS --- */}
          {isLoadingVisit ? (
            <div className="p-3 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 animate-pulse">
              Checking active visit status...
            </div>
          ) : activeVisit ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <div className="text-sm">
                <span className="font-medium text-green-900">Active Visit: </span>
                <span className="text-green-700">
                  {activeVisit.visitType.display} •{' '}
                  {new Date(activeVisit.startDatetime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              No active visit. Start a new one to begin clinical actions.
            </div>
          )}

          {/* --- HEADER --- */}
          <div className="flex justify-between items-start border-b pb-4">
            <div>
              <h1 className="text-3xl font-light text-gray-900">Vitals and Biometrics</h1>
              <p className="text-base text-gray-500 mt-1">
                {latestDateString}
                {latestVitals.date && (
                  <span className="ml-3 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                    These vitals are {getDaysOld(latestVitals.date)}
                  </span>
                )}
              </p>
            </div>
            <Link
              href={`/dashboard/patients/${patientUuid}/vitals/new`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200 font-semibold text-sm flex items-center"
            >
              Record Vitals
            </Link>
          </div>

          {/* --- MAIN CONTENT --- */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">
                Latest Readings
              </h2>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <VitalsSummaryCard latestVitals={latestVitals} />
              </div>
            </div>

            <div className="lg:col-span-3 space-y-8">
              <VitalsHistoryTable title="Vitals History" data={vitalsHistory} />
              <BiometricsHistoryTable title="Biometrics History" data={vitalsHistory} />
            </div>
          </div>
        </div>
      </div>
    </PatientDashboardProvider>
  );
}

// --- PRESENTATION COMPONENTS ---
const VitalsSummaryCard: React.FC<{ latestVitals: VitalSign }> = ({ latestVitals }) => {
  const VitalsItem = ({
    label,
    value,
    unit,
  }: {
    label: string;
    value: string | number | undefined;
    unit: string;
  }) => (
    <div className="flex justify-between items-center pt-3 first:pt-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900">
        {value ? `${value} ${unit}` : '--'}
      </span>
    </div>
  );

  return (
    <div className="space-y-3 divide-y divide-gray-100">
      <VitalsItem
        label="BP"
        value={
          latestVitals.systolicBP && latestVitals.diastolicBP
            ? `${latestVitals.systolicBP} / ${latestVitals.diastolicBP}`
            : undefined
        }
        unit="mmHg"
      />
      <VitalsItem label="Heart rate" value={latestVitals.pulse} unit="beats/min" />
      <VitalsItem label="R. rate" value={latestVitals.respRate} unit="breaths/min" />
      <VitalsItem label="SpO2" value={latestVitals.spo2 || '--'} unit="%" />
      <VitalsItem label="Temp" value={latestVitals.temp} unit="DEG C" />
      <VitalsItem label="Weight" value={latestVitals.weight} unit="kg" />
      <VitalsItem label="Height" value={latestVitals.height} unit="cm" />
      <VitalsItem label="BMI" value={latestVitals.bmi?.toFixed(1)} unit="kg / m²" />
    </div>
  );
};

const VitalsHistoryTable: React.FC<{ title: string; data: VitalSign[] }> = ({ title, data }) => (
  <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
    <h3 className="text-xl font-semibold text-gray-800 mb-4">{title}</h3>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Date and time
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Temp (DEG C)
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              BP (mmHg)
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Pulse (beats/min)
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              R. Rate (breaths/min)
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              SpO2 (%)
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((v, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-800">{formatVitalDate(v.date)}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{v.temp || '--'}</td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {v.systolicBP && v.diastolicBP ? `${v.systolicBP} / ${v.diastolicBP}` : '--'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">{v.pulse || '--'}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{v.respRate || '--'}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{v.spo2 || '--'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p className="text-xs text-gray-500 mt-4">{data.length} item(s) listed.</p>
  </div>
);

const BiometricsHistoryTable: React.FC<{ title: string; data: VitalSign[] }> = ({ title, data }) => (
  <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
    <h3 className="text-xl font-semibold text-gray-800 mb-4">{title}</h3>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Date and time
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Weight (kg)
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Height (cm)
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              BMI (kg / m²)
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              MUAC (cm)
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((v, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-800">{formatVitalDate(v.date)}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{v.weight || '--'}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{v.height || '--'}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{v.bmi?.toFixed(1) || '--'}</td>
              <td className="px-4 py-3 text-sm text-gray-500">--</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p className="text-xs text-gray-500 mt-4">{data.length} item(s) listed.</p>
  </div>
);
