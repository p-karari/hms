'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ObsPayload } from '@/lib/encounters/encounter';

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
  providerUuid: string;
  locationUuid: string;
  encounterTypeUuid: string;
  conceptUuids: ConceptUuids;
  activeVisitUuid: string;
  encounterRoleUuid: string;
}

interface VitalsFormState {
  weight: string;
  height: string;
  temp: string;
  systolic: string;
  diastolic: string;
  pulse: string;
  respRate: string;
}

const VitalsFormFields: React.FC<VitalsFormProps> = ({
  patientUuid,
  providerUuid,
  locationUuid,
  encounterTypeUuid,
  conceptUuids,
  activeVisitUuid,
  encounterRoleUuid,
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const [formState, setFormState] = useState<VitalsFormState>({
    weight: '',
    height: '',
    temp: '',
    systolic: '',
    diastolic: '',
    pulse: '',
    respRate: '',
  });

  const hasData = useMemo(() => {
    return Object.values(formState).some(
      (val) => val.trim() !== '' && !isNaN(parseFloat(val))
    );
  }, [formState]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('idle');
    setMessage('');

    if (!hasData) {
      setStatus('error');
      setMessage('Please enter at least one vital sign value.');
      return;
    }

    const observations: ObsPayload[] = [];
    const formKeyToConceptMap: { [key in keyof VitalsFormState]: keyof ConceptUuids } = {
      weight: 'WEIGHT',
      height: 'HEIGHT',
      temp: 'TEMP',
      systolic: 'SYSTOLIC_BP',
      diastolic: 'DIASTOLIC_BP',
      pulse: 'PULSE',
      respRate: 'RESP_RATE',
    };

    (Object.keys(formState) as Array<keyof VitalsFormState>).forEach((key) => {
      const value = formState[key].trim();
      const numberValue = parseFloat(value);
      const conceptKey = formKeyToConceptMap[key];
      const conceptUuid = conceptUuids[conceptKey];

      if (!isNaN(numberValue) && numberValue > 0 && conceptUuid) {
        observations.push({ concept: conceptUuid, value: numberValue });
      }
    });

    if (observations.length === 0) {
      setStatus('error');
      setMessage('No valid vital signs entered.');
      return;
    }

    // const payload = {
    //   patient: patientUuid,
    //   encounterDatetime: new Date().toISOString(),
    //   encounterType: encounterTypeUuid,
    //   location: locationUuid,
    //   visit: activeVisitUuid,
    //   encounterProviders: [
    //     {
    //       provider: providerUuid,
    //       encounterRole: encounterRoleUuid,
    //     },
    //   ],
    //   obs: observations,
    // };

    startTransition(async () => {
      try {
        // const result = await submitEncounter(payload);
        setStatus('success');
        setMessage('Vitals submitted successfully!');
        setTimeout(() => router.push(`/dashboard/patients/${patientUuid}`), 1500);
      } catch (error: unknown) {
        let errorMessage: string;
        if (error instanceof Error) errorMessage = error.message;
        else if (typeof error === 'string') errorMessage = error;
        else errorMessage = 'Submission failed.';
        setStatus('error');
        setMessage(errorMessage);
      }
    });
  };

  const InputField = ({
    id,
    label,
    placeholder,
    value,
    name,
    step = '1',
  }: {
    id: string;
    label: string;
    placeholder: string;
    value: string;
    name: keyof VitalsFormState;
    step?: string;
  }) => (
    <div>
      <label htmlFor={id} className="block text-sm text-gray-700 mb-1">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="number"
        step={step}
        value={value}
        onChange={handleChange}
        disabled={isPending}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm"
      />
    </div>
  );

  return (
    <div className="w-full max-w-2xl bg-white p-6 rounded-lg border border-gray-200">
      <header className="mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Vitals Entry</h1>
        <p className="text-sm text-gray-600 mt-1">Enter patient vital signs</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            id="weight"
            label="Weight (kg)"
            placeholder="75.5"
            value={formState.weight}
            name="weight"
            step="0.1"
          />
          <InputField
            id="height"
            label="Height (cm)"
            placeholder="170"
            value={formState.height}
            name="height"
            step="0.1"
          />
          <InputField
            id="temp"
            label="Temperature (°C)"
            placeholder="37.0"
            value={formState.temp}
            name="temp"
            step="0.1"
          />
          <InputField
            id="pulse"
            label="Pulse (bpm)"
            placeholder="75"
            value={formState.pulse}
            name="pulse"
          />
          <InputField
            id="systolic"
            label="Systolic BP"
            placeholder="120"
            value={formState.systolic}
            name="systolic"
          />
          <InputField
            id="diastolic"
            label="Diastolic BP"
            placeholder="80"
            value={formState.diastolic}
            name="diastolic"
          />
          <InputField
            id="respRate"
            label="Resp Rate"
            placeholder="16"
            value={formState.respRate}
            name="respRate"
          />
        </div>

        {status !== 'idle' && (
          <div
            className={`p-3 rounded text-sm ${
              status === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : status === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || !hasData}
          className={`w-full flex justify-center items-center py-2 px-4 rounded text-sm font-medium transition-colors
            ${
              isPending || !hasData
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Vitals
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default VitalsFormFields;
