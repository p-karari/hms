'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPatient } from '@/lib/patients/createPatient';
import { getRelationshipTypes } from '@/lib/relationships/createRelationship';
import { User, Calendar, MapPin, Users, ChevronRight, ChevronLeft } from 'lucide-react';

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
  middleName: '',
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


  const [relationships, setRelationships] = useState([{ relativeUuid: '', relationshipType: '' }]);

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

      const givenName = !form.nameKnown || form.unidentified ? 'UNKNOWN' : form.givenName.trim();
      const familyName = !form.nameKnown || form.unidentified ? 'UNKNOWN' : form.familyName.trim();

      formData.append('givenName', givenName);
      formData.append('familyName', familyName);
      formData.append('gender', form.gender || 'U');
      formData.append('unidentified', String(form.unidentified));

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

      const patient = await createPatient(formData);
      router.push(`/dashboard/patients/${patient.uuid}`);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Step progress indicator
  const steps = [
    { number: 1, label: 'Basic Info', icon: <User className="w-4 h-4" /> },
    { number: 2, label: 'Contact & Birth', icon: <Calendar className="w-4 h-4" /> },
    { number: 3, label: 'Relationships', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8">
        {/* Header */}
        <header className="text-center space-y-3">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Patient Registration</h1>
          <p className="text-gray-600">Complete all required fields to register a new patient</p>
        </header>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-8">
          {steps.map((stepItem, index) => (
            <div key={stepItem.number} className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all duration-200 ${
                step >= stepItem.number 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                  : 'bg-white border-gray-300 text-gray-400'
              }`}>
                {step > stepItem.number ? (
                  <div className="w-4 h-4 bg-white rounded-full" />
                ) : (
                  stepItem.icon
                )}
              </div>
              <span className={`text-sm font-medium ${
                step >= stepItem.number ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {stepItem.label}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 rounded ${
                  step > stepItem.number ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl animate-pulse">
            <p className="text-red-800 text-sm font-medium flex items-center justify-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          </div>
        )}

        {/* Step 1 – Basic Info */}
        {step === 1 && (
          <section className="space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
              <User className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-900">Patient&apos;s Name is Known?</label>
                <div className="flex gap-6">
                  {['Yes', 'No'].map((opt) => (
                    <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        form.nameKnown === (opt === 'Yes') 
                          ? 'bg-blue-600 border-blue-600' 
                          : 'border-gray-300 group-hover:border-blue-400'
                      }`}>
                        {form.nameKnown === (opt === 'Yes') && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <span className="text-gray-700 font-medium">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {form.nameKnown && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <input
                      type="text"
                      placeholder="First Name *"
                      value={form.givenName}
                      onChange={(e) => setForm({ ...form, givenName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white placeholder:text-gray-400 text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Middle Name"
                      value={form.middleName}
                      onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white placeholder:text-gray-400 text-gray-900"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Family Name *"
                      value={form.familyName}
                      onChange={(e) => setForm({ ...form, familyName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white placeholder:text-gray-400 text-gray-900"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white text-gray-900"
                  required
                >
                  <option value="">Select Gender *</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                  <option value="U">Unknown</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <button 
                type="button" 
                onClick={nextStep}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* Step 2 – Contact + Birth */}
        {step === 2 && (
          <section className="space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
              <Calendar className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Contact Details & Birth Information</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-900">Date of Birth Known?</label>
                <div className="flex gap-6">
                  {['Yes', 'No'].map((opt) => (
                    <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        form.dobKnown === (opt === 'Yes') 
                          ? 'bg-blue-600 border-blue-600' 
                          : 'border-gray-300 group-hover:border-blue-400'
                      }`}>
                        {form.dobKnown === (opt === 'Yes') && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <span className="text-gray-700 font-medium">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {form.dobKnown ? (
                <div>
                  <input
                    type="date"
                    value={form.birthdate}
                    onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white text-gray-900"
                    required
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="number"
                      placeholder="Age (years) *"
                      value={form.estimatedYears}
                      onChange={(e) => setForm({ ...form, estimatedYears: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white placeholder:text-gray-400 text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Months (optional)"
                      value={form.estimatedMonths}
                      onChange={(e) => setForm({ ...form, estimatedMonths: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white placeholder:text-gray-400 text-gray-900"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-4">
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900">Contact Information (Optional)</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <input
                    type="text"
                    placeholder="Address"
                    value={form.address1}
                    onChange={(e) => setForm({ ...form, address1: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white placeholder:text-gray-400 text-gray-900"
                  />
                  <input
                    type="text"
                    placeholder="City / Village"
                    value={form.cityVillage}
                    onChange={(e) => setForm({ ...form, cityVillage: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white placeholder:text-gray-400 text-gray-900"
                  />
                  <input
                    type="text"
                    placeholder="Country"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white placeholder:text-gray-400 text-gray-900"
                  />
                  <input
                    type="tel"
                    placeholder="Telephone"
                    value={form.telephone}
                    onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white placeholder:text-gray-400 text-gray-900"
                  />
                  <input
                    type="text"
                    placeholder="National ID Number"
                    value={form.idNumber}
                    onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white placeholder:text-gray-400 text-gray-900"
                  />

                </div>
              </div>
            </div>

            <div className="flex justify-between pt-6">
              <button 
                type="button" 
                onClick={prevStep}
                className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button 
                type="button" 
                onClick={nextStep}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* Step 3 – Relationships */}
        {step === 3 && (
          <section className="space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
              <Users className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Relationships (Optional)</h2>
            </div>

            <div className="space-y-4">
              {relationships.map((rel, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <input
                      type="text"
                      placeholder="Relative UUID"
                      value={rel.relativeUuid}
                      onChange={(e) => {
                        const updated = [...relationships];
                        updated[i].relativeUuid = e.target.value;
                        setRelationships(updated);
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white hover:bg-gray-50 placeholder:text-gray-400 text-gray-900"
                    />
                  </div>
                  <div>
                    <select
                      value={rel.relationshipType}
                      onChange={(e) => {
                        const updated = [...relationships];
                        updated[i].relationshipType = e.target.value;
                        setRelationships(updated);
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white hover:bg-gray-50 text-gray-900"
                    >
                      <option value="">Select Relationship</option>
                      {relationshipTypes.map((r) => (
                        <option key={r.uuid} value={r.uuid}>
                          {r.display}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-6">
              <button 
                type="button" 
                onClick={prevStep}
                className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <span>Register Patient</span>
                )}
              </button>
            </div>
          </section>
        )}
      </form>
    </div>
  );
}