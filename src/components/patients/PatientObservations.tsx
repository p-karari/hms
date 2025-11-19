'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getPatientObservations, Observation, CodedValue } from '@/lib/patients/getPatientObservations';
import { Calendar, Thermometer, Heart, Scale, Activity } from 'lucide-react';

interface PatientObservationsProps {
  patientUuid: string;
}

const formatObservationValue = (obs: Observation): string => {
  if (obs.valueCoded) return obs.valueCoded.display;
  if (obs.valueNumeric !== undefined && obs.valueNumeric !== null) return String(obs.valueNumeric);
  if (obs.valueText) return obs.valueText;
  if (obs.valueDatetime) return new Date(obs.valueDatetime).toLocaleDateString();
  if (obs.valueBoolean !== undefined && obs.valueBoolean !== null) return obs.valueBoolean ? 'Yes' : 'No';
  if (obs.value !== undefined && obs.value !== null) {
    if (typeof obs.value === 'object' && 'display' in obs.value) {
      return (obs.value as CodedValue).display;
    }
    return String(obs.value);
  }
  return 'N/A';
};

const getObservationIcon = (conceptName: string) => {
  const name = conceptName.toLowerCase();
  if (name.includes('temperature') || name.includes('temp')) return <Thermometer className="w-3 h-3" />;
  if (name.includes('heart') || name.includes('pulse')) return <Heart className="w-3 h-3" />;
  if (name.includes('weight') || name.includes('bmi')) return <Scale className="w-3 h-3" />;
  if (name.includes('pressure') || name.includes('blood')) return <Activity className="w-3 h-3" />;
  return <Calendar className="w-3 h-3" />;
};

const PatientObservations: React.FC<PatientObservationsProps> = ({ patientUuid }) => {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchObservations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedObservations = await getPatientObservations(patientUuid);
      const sortedObservations = fetchedObservations.sort(
        (a, b) => new Date(b.obsDatetime).getTime() - new Date(a.obsDatetime).getTime()
      );
      setObservations(sortedObservations);
    } catch (err) {
      console.error(err)
      setError('Could not load observations.');
    } finally {
      setLoading(false);
    }
  }, [patientUuid]);

  useEffect(() => {
    fetchObservations();
  }, [fetchObservations]);

  const latestObservations = useMemo(() => {
    const latestByConcept = new Map();
    observations.forEach(obs => {
      const conceptName = obs.concept.display;
      const existing = latestByConcept.get(conceptName);
      if (!existing || new Date(obs.obsDatetime) > new Date(existing.obsDatetime)) {
        latestByConcept.set(conceptName, obs);
      }
    });
    return Array.from(latestByConcept.values());
  }, [observations]);

  if (loading) return <div className="text-sm text-gray-500 py-1">Loading observations...</div>;
  if (error) return (
    <div className="text-sm text-red-500 py-1">
      {error}
      <button onClick={fetchObservations} className="ml-2 underline">Retry</button>
    </div>
  );

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium">Vitals & Observations</span>
        {observations.length > 0 && (
          <span className="text-xs text-gray-500">
            {new Date(observations[0].obsDatetime).toLocaleDateString()}
          </span>
        )}
      </div>
      
      {latestObservations.length === 0 ? (
        <div className="text-gray-500 text-sm">No observations found.</div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {latestObservations.map((obs) => (
            <div 
              key={obs.uuid} 
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg"
            >
              {getObservationIcon(obs.concept.display)}
              <div className="text-xs">
                <div className="font-medium text-gray-700">{formatObservationValue(obs)}</div>
                <div className="text-gray-500">{obs.concept.display}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientObservations;
