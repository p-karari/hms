'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getVisits, Visit } from '@/lib/patients/manageVisits';
import { Calendar, MapPin, Eye } from 'lucide-react';

interface PatientVisitsProps {
  patientUuid: string;
  onActiveVisitChange?: (activeVisit: Visit | null) => void;
}

const PatientVisits: React.FC<PatientVisitsProps> = ({ patientUuid, onActiveVisitChange }) => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedVisits = await getVisits(patientUuid);
      const sortedVisits = fetchedVisits.sort((a, b) => {
        if (!a.stopDatetime && b.stopDatetime) return -1;
        if (a.stopDatetime && !b.stopDatetime) return 1;
        return new Date(b.startDatetime).getTime() - new Date(a.startDatetime).getTime();
      });
      setVisits(sortedVisits);
      
      const activeVisit = sortedVisits.find(v => !v.stopDatetime) || null;
      if (onActiveVisitChange) {
        onActiveVisitChange(activeVisit);
      }
    } catch (err) {
      console.error(err)
      setError('Could not load visits');
    } finally {
      setLoading(false);
    }
  }, [patientUuid, onActiveVisitChange]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  if (loading) return <div className="text-sm text-gray-500 py-1">Loading visits...</div>;
  if (error) return (
    <div className="text-sm text-red-500 py-1">
      {error}
      <button onClick={fetchVisits} className="ml-2 underline">Retry</button>
    </div>
  );

  return (
    <div className="text-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-600" />
          <span className="font-medium">Visits ({visits.length})</span>
        </div>
      </div>

      {visits.length === 0 ? (
        <div className="text-gray-500 text-sm">No visits found</div>
      ) : (
        <div className="space-y-2">
          {visits.map((visit) => {
            const isActive = !visit.stopDatetime;
            return (
              <div key={visit.uuid} className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">
                      {visit.visitType.display}
                    </span>
                    {isActive && (
                      <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                    <span>{new Date(visit.startDatetime).toLocaleDateString()}</span>
                    {visit.location && (
                      <>
                        <span>•</span>
                        <MapPin className="w-3 h-3" />
                        <span>{visit.location.display}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => console.log('View:', visit.uuid)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 ml-2"
                >
                  <Eye className="w-3 h-3" />
                  View
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PatientVisits;