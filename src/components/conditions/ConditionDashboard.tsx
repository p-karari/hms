'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ListChecks, TrendingUp, Loader2 } from 'lucide-react';

import ConditionListTable from '@/components/conditions/ConditionListTable';
import { getDiagnosisConceptOptions, DiagnosisConceptOption } from '@/lib/conditions/getDiagnosisConceptOptions';
import { createPatientCondition, NewConditionSubmissionData } from '@/lib/conditions/submitPatientCondition';
import { getActiveEncounterUuid } from '@/lib/encounters/getActiveEncounterUuid';

interface ConditionsDashboardProps {
  patientUuid: string;
}

export default function ConditionsDashboard({ patientUuid }: ConditionsDashboardProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingConcepts, setIsLoadingConcepts] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [diagnosisResults, setDiagnosisResults] = useState<DiagnosisConceptOption[]>([]);
  const [activeEncounterUuid, setActiveEncounterUuid] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    conditionConceptUuid: '',
    conditionDisplay: '',
    onsetDate: new Date().toISOString().split('T')[0],
    comment: ''
  });

  // --- Fetch active encounter on mount ---
  const fetchActiveEncounter = useCallback(async () => {
    try {
      const encounterId = await getActiveEncounterUuid(patientUuid);
      setActiveEncounterUuid(encounterId);
    } catch (e) {
      console.error('Failed to fetch active encounter:', e);
    }
  }, [patientUuid]);

  useEffect(() => { fetchActiveEncounter(); }, [fetchActiveEncounter]);

  // --- Search diagnosis concepts ---
  const searchConcepts = useCallback(async (term: string) => {
    if (!term) {
      setDiagnosisResults([]);
      return;
    }
    setIsLoadingConcepts(true);
    try {
      const results = await getDiagnosisConceptOptions(term);
      setDiagnosisResults(results);
    } catch (e) {
      console.error('Diagnosis search failed:', e);
    } finally {
      setIsLoadingConcepts(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    const delay = setTimeout(() => { searchConcepts(searchTerm); }, 300);
    return () => clearTimeout(delay);
  }, [searchTerm, searchConcepts]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.conditionConceptUuid || !formData.onsetDate) {
      alert('Select a diagnosis and onset date.');
      return;
    }

    setIsSubmitting(true);
    const payload: NewConditionSubmissionData = {
      patientUuid,
      conditionConceptUuid: formData.conditionConceptUuid,
      conditionDisplay: formData.conditionDisplay,
      clinicalStatus: 'active',
      onsetDate: formData.onsetDate,
      recorderUuid: activeEncounterUuid || '' // must be a Practitioner UUID in production
    };

    try {
      await createPatientCondition(payload);
      alert('Condition documented successfully.');
      setRefreshKey(prev => prev + 1);
      setIsFormVisible(false);
      setFormData({ conditionConceptUuid: '', conditionDisplay: '', onsetDate: new Date().toISOString().split('T')[0], comment: '' });
      setSearchTerm('');
      setDiagnosisResults([]);
    } catch (e: any) {
      console.error(e);
      alert(`Failed: ${e.message}`);
    } finally { setIsSubmitting(false); }
  };

  const handleSelectConcept = (concept: DiagnosisConceptOption) => {
    setFormData({ 
      ...formData, 
      conditionConceptUuid: concept.uuid, 
      conditionDisplay: concept.display 
    });
    setSearchTerm(concept.display);
    setDiagnosisResults([]);
  };

  return (
    <div className="space-y-6">
      {/* <h1 className="text-3xl font-extrabold text-gray-900 border-b pb-2">Conditions (Problem List)</h1> */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-700 flex items-center"><ListChecks className="w-6 h-6 mr-2" /> Patient Problem List</h2>
        <button onClick={() => setIsFormVisible(prev => !prev)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5 mr-2" /> {isFormVisible ? 'Hide Form' : 'Add New Condition'}
        </button>
      </div>

      {isFormVisible && (
        <div className="bg-white border border-blue-200 rounded-lg p-6 shadow-md mb-8">
          <h3 className="text-xl font-semibold text-blue-700 mb-4 flex items-center"><TrendingUp className="w-5 h-5 mr-2" /> Document New Condition</h3>
          <form onSubmit={handleFormSubmit} className="space-y-4">
          

            {/* --- Searchable Diagnosis Input --- */}
            <div className="relative">
              <label>Diagnosis</label>
              <input 
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setFormData({ ...formData, conditionConceptUuid: '', conditionDisplay: '' });
                }}
                className="w-full border rounded p-2"
                placeholder="Search diagnosis..."
                required
                disabled={isSubmitting}
              />
              {isLoadingConcepts && <Loader2 className="absolute right-2 top-2 w-5 h-5 animate-spin text-gray-400" />}
              {diagnosisResults.length > 0 && (
                <ul className="absolute z-10 w-full max-h-40 overflow-y-auto bg-white border rounded mt-1 shadow-md">
                  {diagnosisResults.map(concept => (
                    <li 
                      key={concept.uuid} 
                      className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
                      onClick={() => handleSelectConcept(concept)}
                    >
                      {concept.display}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label>Onset Date</label>
              <input type="date" value={formData.onsetDate} onChange={e => setFormData({ ...formData, onsetDate: e.target.value })} className="w-full border rounded p-2" required disabled={isSubmitting} />
            </div>

            <div>
              <label>Comment</label>
              <input type="text" value={formData.comment} onChange={e => setFormData({ ...formData, comment: e.target.value })} className="w-full border rounded p-2" disabled={isSubmitting} />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button type="button" onClick={() => setIsFormVisible(false)} className="px-4 py-2 bg-gray-200 rounded" disabled={isSubmitting}>Cancel</button>
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded flex items-center" disabled={isSubmitting || !formData.conditionConceptUuid}>
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Save Condition'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConditionListTable patientUuid={patientUuid} refreshKey={refreshKey} onStatusChange={() => setRefreshKey(prev => prev + 1)} />
    </div>
  );
}
