'use client';

import React, { useContext, useState, FormEvent } from 'react';
import { SessionContext } from '@/lib/context/session-context';
import { getEncounterTypeUuid } from '@/lib/encounters/encounterType';
import { getEncounterRoleUuid } from '@/lib/encounters/encounterRole';
import { getProviderUuid } from '@/lib/config/provider';
import { submitEncounter } from '@/lib/encounters/encounter';
import { getPatientActiveVisit } from '@/lib/visits/getActiveVisit';

interface ConceptUuids {
  WEIGHT: string;
  HEIGHT: string;
  TEMP: string;
  SYSTOLIC_BP: string;
  DIASTOLIC_BP: string;
  PULSE: string;
  RESP_RATE: string;
}

interface VitalsFormProps {
  patientUuid: string;
  conceptUuids: ConceptUuids;
  onSuccess?: () => void;
}

export default function VitalsForm({ patientUuid, conceptUuids, onSuccess }: VitalsFormProps) {
  const { sessionLocation } = useContext(SessionContext);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [formValues, setFormValues] = useState({
    weight: '',
    height: '',
    temperature: '',
    systolic: '',
    diastolic: '',
    pulse: '',
    respRate: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!sessionLocation?.uuid) throw new Error('No session location found.');
      if (!patientUuid) throw new Error('Missing patient UUID.');

      const [encounterTypeUuid, encounterRoleUuid, activeVisit] = await Promise.all([
        getEncounterTypeUuid('Vitals'),
        // getProviderUuid(),
        getEncounterRoleUuid('Clinician'),
        getPatientActiveVisit(patientUuid)
      ]);

      if (!activeVisit) throw new Error('No active visit found for this patient.');

      const obs = [
        { concept: conceptUuids.WEIGHT, value: Number(formValues.weight) },
        { concept: conceptUuids.HEIGHT, value: Number(formValues.height) },
        { concept: conceptUuids.TEMP, value: Number(formValues.temperature) },
        { concept: conceptUuids.SYSTOLIC_BP, value: Number(formValues.systolic) },
        { concept: conceptUuids.DIASTOLIC_BP, value: Number(formValues.diastolic) },
        { concept: conceptUuids.PULSE, value: Number(formValues.pulse) },
        { concept: conceptUuids.RESP_RATE, value: Number(formValues.respRate) }
      ].filter(o => !isNaN(o.value));

      const encounterPayload = {
        patient: patientUuid,
        encounterDatetime: new Date().toISOString(),
        encounterType: encounterTypeUuid,
        location: sessionLocation.uuid,
        visit: activeVisit.uuid,
        encounterProviders: [
          {
            provider: process.env.NEXT_PUBLIC_DEFAULT_PROVIDER_UUID!,
            encounterRole: encounterRoleUuid
          }
        ],
        obs
      };

      const response = await submitEncounter(encounterPayload);
      setMessage(`Vitals submitted successfully. Encounter UUID: ${response.uuid}`);

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Vitals submission failed:', err);
      setMessage(`Error: ${err.message || 'Failed to submit vitals'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl mx-auto border border-gray-200 rounded-xl p-4 shadow-sm bg-white"
    >
      <h2 className="text-lg font-semibold mb-3 text-gray-800">Enter Vital Signs</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        {[
          { name: 'weight', label: 'Weight (kg)' },
          { name: 'height', label: 'Height (cm)' },
          { name: 'temperature', label: 'Temperature (°C)' },
          { name: 'systolic', label: 'Systolic BP' },
          { name: 'diastolic', label: 'Diastolic BP' },
          { name: 'pulse', label: 'Pulse (bpm)' },
          { name: 'respRate', label: 'Respiratory Rate' }
        ].map(({ name, label }) => (
          <label key={name} className="flex flex-col">
            <span className="text-gray-600">{label}</span>
            <input
              name={name}
              type="number"
              value={(formValues as any)[name]}
              onChange={handleChange}
              className="border rounded-md p-2 focus:outline-none focus:ring"
              required
            />
          </label>
        ))}
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Submitting...' : 'Save Vitals'}
        </button>
      </div>

      {message && (
        <div className={`mt-4 text-sm ${message.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
          {message}
        </div>
      )}
    </form>
  );
}


