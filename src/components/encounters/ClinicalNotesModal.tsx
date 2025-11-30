'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Search, Loader2 } from 'lucide-react';
import { Visit } from '@/lib/patients/manageVisits';
import { searchDiagnosisConcepts, submitDiagnosis } from '@/lib/encounters/submitDiagnosis';
import { submitClinicalNote } from '@/lib/encounters/submitClinicalNotes';


interface ClinicalNotesModalProps {
  patientUuid: string;
  activeVisit: Visit | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface DiagnosisConcept {
  uuid: string;
  display: string;
}

const ClinicalNotesModal: React.FC<ClinicalNotesModalProps> = ({
  patientUuid,
  activeVisit,
  onClose,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [visitDate, setVisitDate] = useState('');
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState('');
  const [primaryDiagnosisSearch, setPrimaryDiagnosisSearch] = useState('');
  const [secondaryDiagnosis, setSecondaryDiagnosis] = useState('');
  const [secondaryDiagnosisSearch, setSecondaryDiagnosisSearch] = useState('');
  const [clinicalNote, setClinicalNote] = useState('');
  
  // Search results
  const [primaryDiagnosisResults, setPrimaryDiagnosisResults] = useState<DiagnosisConcept[]>([]);
  const [secondaryDiagnosisResults, setSecondaryDiagnosisResults] = useState<DiagnosisConcept[]>([]);
  const [isSearchingPrimary, setIsSearchingPrimary] = useState(false);
  const [isSearchingSecondary, setIsSearchingSecondary] = useState(false);

  // Set default date to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setVisitDate(today);
  }, []);

  // Search for primary diagnosis concepts
  useEffect(() => {
    const searchConcepts = async () => {
      if (primaryDiagnosisSearch.length < 2) {
        setPrimaryDiagnosisResults([]);
        return;
      }

      setIsSearchingPrimary(true);
      try {
        const results = await searchDiagnosisConcepts(primaryDiagnosisSearch);
        setPrimaryDiagnosisResults(results);
      } catch (err) {
        console.error('Search error:', err);
        setPrimaryDiagnosisResults([]);
      } finally {
        setIsSearchingPrimary(false);
      }
    };

    const timeoutId = setTimeout(searchConcepts, 300);
    return () => clearTimeout(timeoutId);
  }, [primaryDiagnosisSearch]);

  // Search for secondary diagnosis concepts
  useEffect(() => {
    const searchConcepts = async () => {
      if (secondaryDiagnosisSearch.length < 2) {
        setSecondaryDiagnosisResults([]);
        return;
      }

      setIsSearchingSecondary(true);
      try {
        const results = await searchDiagnosisConcepts(secondaryDiagnosisSearch);
        setSecondaryDiagnosisResults(results);
      } catch (err) {
        console.error('Search error:', err);
        setSecondaryDiagnosisResults([]);
      } finally {
        setIsSearchingSecondary(false);
      }
    };

    const timeoutId = setTimeout(searchConcepts, 300);
    return () => clearTimeout(timeoutId);
  }, [secondaryDiagnosisSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!activeVisit) {
      setError('No active visit found. Please start a visit first.');
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Create  encounter
      const encounterDatetime = new Date().toISOString();
      
      const clinicalNoteResponse = await submitClinicalNote({
        patient: patientUuid,
        encounterDatetime,
        location: activeVisit.location?.uuid || '',
        visit: activeVisit.uuid,
        clinicalNote,
        encounterProviders: [{
          provider: process.env.NEXT_PUBLIC_DEFAULT_PROVIDER_UUID || '',
          encounterRole: "240b26f9-dd88-4172-823d-4a8bfeb7841f"
        }]
      });

      // 2. Add primary diagnosis if selected
      if (primaryDiagnosis) {
        await submitDiagnosis({
          encounter: clinicalNoteResponse.uuid,
          patient: patientUuid,
          diagnosis: { coded: primaryDiagnosis },
          condition: null,
          certainty: "PROVISIONAL",
          rank: 1
        });
      }

      // 3. Add secondary diagnosis if selected
      if (secondaryDiagnosis) {
        await submitDiagnosis({
          encounter: clinicalNoteResponse.uuid,
          patient: patientUuid,
          diagnosis: { coded: secondaryDiagnosis },
          condition: null,
          certainty: "PROVISIONAL",
          rank: 2
        });
      }

      onSuccess();
      onClose();
      
    } catch (err) {
      console.error('Submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save clinical note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectPrimaryDiagnosis = (concept: DiagnosisConcept) => {
    setPrimaryDiagnosis(concept.uuid);
    setPrimaryDiagnosisSearch(concept.display);
    setPrimaryDiagnosisResults([]);
  };

  const selectSecondaryDiagnosis = (concept: DiagnosisConcept) => {
    setSecondaryDiagnosis(concept.uuid);
    setSecondaryDiagnosisSearch(concept.display);
    setSecondaryDiagnosisResults([]);
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold"></h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Visit Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visit Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Primary Diagnosis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Diagnosis
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={primaryDiagnosisSearch}
                onChange={(e) => setPrimaryDiagnosisSearch(e.target.value)}
                placeholder="Search for a primary diagnosis"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {isSearchingPrimary && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
              )}
            </div>
            
            {/* Search Results */}
            {primaryDiagnosisResults.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-md max-h-32 overflow-y-auto">
                {primaryDiagnosisResults.map((concept) => (
                  <button
                    key={concept.uuid}
                    type="button"
                    onClick={() => selectPrimaryDiagnosis(concept)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    {concept.display}
                  </button>
                ))}
              </div>
            )}
            
            {!primaryDiagnosis && primaryDiagnosisSearch && primaryDiagnosisResults.length === 0 && !isSearchingPrimary && (
              <p className="text-sm text-gray-500 mt-1">No diagnosis found</p>
            )}
          </div>

          {/* Secondary Diagnosis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secondary Diagnosis
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={secondaryDiagnosisSearch}
                onChange={(e) => setSecondaryDiagnosisSearch(e.target.value)}
                placeholder="Search for a secondary diagnosis"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {isSearchingSecondary && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
              )}
            </div>
            
            {/* Search Results */}
            {secondaryDiagnosisResults.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-md max-h-32 overflow-y-auto">
                {secondaryDiagnosisResults.map((concept) => (
                  <button
                    key={concept.uuid}
                    type="button"
                    onClick={() => selectSecondaryDiagnosis(concept)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    {concept.display}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Clinical Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note
            </label>
            <textarea
              value={clinicalNote}
              onChange={(e) => setClinicalNote(e.target.value)}
              placeholder="Write your notes"
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !clinicalNote.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Clinical Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClinicalNotesModal;