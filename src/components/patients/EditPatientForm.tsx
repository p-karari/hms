'use client';

import { updatePatient } from '@/lib/patients/updatePatient';
import { CreditCard, MapPin, Phone, Save, User, X } from 'lucide-react';
import { useState } from 'react';

interface EditPatientFormProps {
  patient: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditPatientForm({ patient, onClose, onSuccess }: EditPatientFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getIdentifier = (typeUuid: string) => 
    patient.identifiers?.find((id: any) => 
      (id.identifierType?.uuid === typeUuid) || (id.identifierType === typeUuid)
    )?.identifier || '';

  const getAttribute = (typeUuid: string) => 
    patient.person?.attributes?.find((attr: any) => 
      (attr.attributeType?.uuid === typeUuid) || (attr.attributeType === typeUuid)
    )?.value || '';

  const [form, setForm] = useState({
    givenName: patient.person.preferredName?.givenName || '',
    familyName: patient.person.preferredName?.familyName || '',
    gender: patient.person.gender || '',
    birthdate: patient.person.birthdate ? patient.person.birthdate.split('T')[0] : '',
    address1: patient.person.preferredAddress?.address1 || '',
    cityVillage: patient.person.preferredAddress?.cityVillage || '',
    country: patient.person.preferredAddress?.country || '',
    telephone: getAttribute(process.env.NEXT_PUBLIC_OPENMRS_ATTRIBUTE_TELEPHONE_UUID || ''),
    idNumber: getIdentifier("05a29f94-c0ed-11e2-94be-8c13b969e334"),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        givenName: form.givenName,
        familyName: form.familyName,
        gender: form.gender,
        birthdate: form.birthdate,
        address: {
          address1: form.address1,
          cityVillage: form.cityVillage,
          country: form.country,
        },
        identifiers: [
          {
            identifier: form.idNumber,
            identifierType: { uuid: "05a29f94-c0ed-11e2-94be-8c13b969e334" },
          },
        ],
        attributes: [
          {
            attributeType: { uuid: process.env.NEXT_PUBLIC_OPENMRS_ATTRIBUTE_TELEPHONE_UUID || '' },
            value: form.telephone,
          },
        ],
      };

      await updatePatient(patient.uuid, payload);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to update patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Modal Header */}
      <div className="sticky top-0 bg-white px-8 py-4 border-b flex items-center justify-between z-10">
        <h2 className="text-xl font-bold text-gray-900">Edit Patient Details</h2>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Demographics */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Demographics</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 ml-1">First Name</label>
              <input
                type="text"
                value={form.givenName}
                onChange={(e) => setForm({ ...form, givenName: e.target.value })}
                className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 ml-1">Family Name</label>
              <input
                type="text"
                value={form.familyName}
                onChange={(e) => setForm({ ...form, familyName: e.target.value })}
                className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                required
              />
            </div>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
              required
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
              <option value="U">Unknown</option>
            </select>
            <input
              type="date"
              value={form.birthdate}
              onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
              required
            />
          </div>
        </section>

        {/* Identification & Contact */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Phone className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Identification & Contact</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative">
              <CreditCard className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="National ID Number"
                value={form.idNumber}
                onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                placeholder="Telephone Number"
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
              />
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Address</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <input
              type="text"
              placeholder="Street Address"
              className="md:col-span-3 w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
              value={form.address1}
              onChange={(e) => setForm({ ...form, address1: e.target.value })}
            />
            <input
              type="text"
              placeholder="City"
              className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
              value={form.cityVillage}
              onChange={(e) => setForm({ ...form, cityVillage: e.target.value })}
            />
            <input
              type="text"
              placeholder="Country"
              className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </div>
        </section>

        <div className="flex justify-end gap-4 pt-6 border-t">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading} 
            className="px-8 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50 font-medium shadow-sm"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}