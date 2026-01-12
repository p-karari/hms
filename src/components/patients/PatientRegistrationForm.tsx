'use client';

import { createPatient } from '@/lib/patients/createPatient';
import { createRelationship, getRelationshipTypes } from '@/lib/relationships/createRelationship';
import { Calendar, ChevronRight, PlusCircle, Search, User, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type RelationshipType = { uuid: string; display: string };

export default function RegisterPatientForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipType[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nameKnown: true,
    givenName: '',
    familyName: '',
    gender: '',
    dobKnown: true,
    birthdate: '',
    estimatedYears: '',
    estimatedMonths: '',
    unidentified: false,
    address1: '',
    cityVillage: '',
    country: '',
    telephone: '',
    idNumber: '',
  });

  // Relationship specific state
  const [relOption, setRelOption] = useState<'search' | 'create' | null>(null);
  const [relationship, setRelationship] = useState({
    typeUuid: '',
    relativeUuid: '', // For search
    givenName: '',    // For create
    familyName: '',   // For create
    gender: 'U'       // For create
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await getRelationshipTypes();
        setRelationshipTypes(res?.results || []);
      } catch {
        setError('Failed to load relationship types');
      }
    })();
  }, []);

  const calculateEstimatedBirthdate = (years: number, months: number): string => {
    const today = new Date();
    today.setFullYear(today.getFullYear() - years);
    today.setMonth(today.getMonth() - months);
    return today.toISOString().split('T')[0];
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 3));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();

      // Name Logic
      const isUnknown = !form.nameKnown || form.unidentified;
      formData.append('givenName', isUnknown ? 'UNKNOWN' : form.givenName.trim());
      formData.append('familyName', isUnknown ? 'UNKNOWN' : form.familyName.trim());
      formData.append('gender', form.gender || 'U');
      formData.append('unidentified', String(form.unidentified));

      // DOB Logic
      let birthdate = form.birthdate;
      if (!form.dobKnown && (form.estimatedYears || form.estimatedMonths)) {
        birthdate = calculateEstimatedBirthdate(
          parseInt(form.estimatedYears || '0', 10),
          parseInt(form.estimatedMonths || '0', 10)
        );
      }
      formData.append('birthdate', birthdate || '');

      formData.append('address1', form.address1);
      formData.append('cityVillage', form.cityVillage);
      formData.append('country', form.country);
      formData.append('telephone', form.telephone);
      formData.append('idNumber', form.idNumber);

      // 1. Create Patient
      const patient = await createPatient(formData);

      // 2. Handle Relationship if selected
      if (relOption && relationship.typeUuid) {
        const relData = new FormData();
        relData.append('relationshipType', relationship.typeUuid);
        
        if (relOption === 'search') {
          relData.append('relatedPersonUuid', relationship.relativeUuid);
        } else {
          relData.append('relatedGivenName', relationship.givenName);
          relData.append('relatedFamilyName', relationship.familyName);
          relData.append('relatedGender', relationship.gender);
        }
        
        await createRelationship(relData, patient.uuid);
      }

      router.push(`/dashboard/patients/${patient.uuid}`);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, label: 'Basic Info', icon: <User className="w-4 h-4" /> },
    { number: 2, label: 'Contact & Birth', icon: <Calendar className="w-4 h-4" /> },
    { number: 3, label: 'Relationships', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8">
        <header className="text-center space-y-3">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Patient Registration</h1>
        </header>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-8">
          {steps.map((stepItem, index) => (
            <div key={stepItem.number} className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-xl border-2 ${
                step >= stepItem.number ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-gray-300 text-gray-400'
              }`}>
                {stepItem.icon}
              </div>
              <span className={`text-sm font-medium ${step >= stepItem.number ? 'text-blue-600' : 'text-gray-500'}`}>{stepItem.label}</span>
              {index < steps.length - 1 && <div className={`w-12 h-0.5 ${step > stepItem.number ? 'bg-blue-600' : 'bg-gray-300'}`} />}
            </div>
          ))}
        </div>

        {error && <div className="p-4 bg-red-50 text-red-800 rounded-xl text-center border border-red-200">{error}</div>}

        {/* Step 1 – Basic Info */}
        {step === 1 && (
          <section className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-4">
                <input 
                  type="checkbox" 
                  id="unidentified"
                  checked={form.unidentified}
                  onChange={(e) => setForm({...form, unidentified: e.target.checked, nameKnown: !e.target.checked})}
                  className="w-5 h-5 accent-blue-600"
                />
                <label htmlFor="unidentified" className="text-blue-900 font-semibold">Patient is Unidentified (Unknown Name)</label>
              </div>

              {!form.unidentified && (
                <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-900">Do you know the patient&apos;s name?</label>
                    <div className="flex gap-4">
                        <button type="button" onClick={() => setForm({...form, nameKnown: true})} className={`px-4 py-2 rounded-lg border ${form.nameKnown ? 'bg-blue-600 text-white' : 'bg-white'}`}>Yes</button>
                        <button type="button" onClick={() => setForm({...form, nameKnown: false})} className={`px-4 py-2 rounded-lg border ${!form.nameKnown ? 'bg-blue-600 text-white' : 'bg-white'}`}>No</button>
                    </div>
                </div>
              )}

              {form.nameKnown && !form.unidentified && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="First Name *" value={form.givenName} onChange={(e) => setForm({ ...form, givenName: e.target.value })} className="px-4 py-3 border rounded-xl text-gray-900" required />
                  <input type="text" placeholder="Family Name *" value={form.familyName} onChange={(e) => setForm({ ...form, familyName: e.target.value })} className="px-4 py-3 border rounded-xl text-gray-900" required />
                </div>
              )}

              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full px-4 py-3 border rounded-xl text-gray-900" required>
                <option value="">Select Gender *</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
                <option value="U">Unknown</option>
              </select>
            </div>
            <div className="flex justify-end"><button type="button" onClick={nextStep} className="px-6 py-3 bg-blue-600 text-white rounded-xl flex items-center gap-2">Continue <ChevronRight className="w-4 h-4"/></button></div>
          </section>
        )}

        {/* Step 2 – Birth & Contact */}
        {step === 2 && (
          <section className="space-y-6">
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-900">Date of Birth Known?</label>
              <div className="flex gap-4">
                <button type="button" onClick={() => setForm({...form, dobKnown: true})} className={`px-4 py-2 rounded-lg border ${form.dobKnown ? 'bg-blue-600 text-white' : 'bg-white'}`}>Yes</button>
                <button type="button" onClick={() => setForm({...form, dobKnown: false})} className={`px-4 py-2 rounded-lg border ${!form.dobKnown ? 'bg-blue-600 text-white' : 'bg-white'}`}>No (Estimate Age)</button>
              </div>

              {form.dobKnown ? (
                <input type="date" value={form.birthdate} onChange={(e) => setForm({ ...form, birthdate: e.target.value })} className="w-full px-4 py-3 border rounded-xl text-gray-900" required />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="Years *" value={form.estimatedYears} onChange={(e) => setForm({ ...form, estimatedYears: e.target.value })} className="px-4 py-3 border rounded-xl text-gray-900" required />
                  <input type="number" placeholder="Months" value={form.estimatedMonths} onChange={(e) => setForm({ ...form, estimatedMonths: e.target.value })} className="px-4 py-3 border rounded-xl text-gray-900" />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <input type="text" placeholder="Address" value={form.address1} onChange={(e) => setForm({ ...form, address1: e.target.value })} className="px-4 py-3 border rounded-xl text-gray-900" />
                <input type="tel" placeholder="Telephone" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="px-4 py-3 border rounded-xl text-gray-900" />
                <input type="text" placeholder="National ID" value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} className="px-4 py-3 border rounded-xl text-gray-900" />
              </div>
            </div>
            <div className="flex justify-between">
              <button type="button" onClick={prevStep} className="px-6 py-3 bg-gray-100 rounded-xl">Back</button>
              <button type="button" onClick={nextStep} className="px-6 py-3 bg-blue-600 text-white rounded-xl flex items-center gap-2">Continue <ChevronRight className="w-4 h-4"/></button>
            </div>
          </section>
        )}

        {/* Step 3 – Relationships */}
        {step === 3 && (
          <section className="space-y-6">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => setRelOption('search')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 ${relOption === 'search' ? 'border-blue-600 bg-blue-50' : ''}`}><Search /> Search Existing</button>
                <button type="button" onClick={() => setRelOption('create')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 ${relOption === 'create' ? 'border-blue-600 bg-blue-50' : ''}`}><PlusCircle /> Add New Person</button>
              </div>

              {relOption && (
                <div className="p-6 bg-gray-50 rounded-2xl space-y-4 border border-gray-200">
                  <select 
                    value={relationship.typeUuid} 
                    onChange={(e) => setRelationship({...relationship, typeUuid: e.target.value})}
                    className="w-full px-4 py-3 border rounded-xl text-gray-900"
                  >
                    <option value="">Select Relationship Type *</option>
                    {relationshipTypes.map(t => <option key={t.uuid} value={t.uuid}>{t.display}</option>)}
                  </select>

                  {relOption === 'search' ? (
                    <input type="text" placeholder="Relative Person UUID *" value={relationship.relativeUuid} onChange={(e) => setRelationship({...relationship, relativeUuid: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-gray-900" />
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="First Name *" value={relationship.givenName} onChange={(e) => setRelationship({...relationship, givenName: e.target.value})} className="px-4 py-3 border rounded-xl text-gray-900" />
                      <input type="text" placeholder="Family Name *" value={relationship.familyName} onChange={(e) => setRelationship({...relationship, familyName: e.target.value})} className="px-4 py-3 border rounded-xl text-gray-900" />
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex justify-between">
              <button type="button" onClick={prevStep} className="px-6 py-3 bg-gray-100 rounded-xl">Back</button>
              <button type="submit" disabled={loading} className="px-8 py-3 bg-green-600 text-white rounded-xl disabled:opacity-50">
                {loading ? 'Processing...' : 'Register Patient'}
              </button>
            </div>
          </section>
        )}
      </form>
    </div>
  );
}