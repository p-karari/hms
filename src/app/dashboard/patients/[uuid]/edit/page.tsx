'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner'; // Or your toast library
import { getPatientByIds } from '@/lib/patients/getPatientById';
import { updatePatient } from '@/lib/patients/updatePatient';
import { zodResolver } from '@hookform/resolvers/zod';


const patientSchema = z.object({
  givenName: z.string().min(1, 'First name is required'),
  familyName: z.string().min(1, 'Last name is required'),
  gender: z.enum(['M', 'F']),
  birthdate: z.string().min(1, 'Birthdate is required'),
});

type PatientForm = z.infer<typeof patientSchema>;

export default function EditPatientPage() {
  const { uuid } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<PatientForm | null>(null);
  console.log(patient)
  const { register, handleSubmit, reset, formState } = useForm<PatientForm>({
    resolver: zodResolver(patientSchema),
  });

  useEffect(() => {
    if (!uuid) return;

    async function fetchPatient() {
      try {
        if (!uuid || Array.isArray(uuid)) {
        throw new Error("Invalid patient UUID");
        }
        const data = await getPatientByIds([uuid]);
        if (!data || data.length === 0) throw new Error('Patient not found');

        const p = data[0];
        const formData: PatientForm = {
        givenName: p.display.split(' ')[0] || '',
        familyName: p.display.split(' ').slice(1).join(' ') || '',
        gender: p.gender === 'M' || p.gender === 'F' ? p.gender : 'M', // fallback
        birthdate: p.birthdate || '',
        };
        reset(formData);
        setPatient(formData);

        setPatient(formData);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load patient');
      } finally {
        setLoading(false);
      }
    }

    fetchPatient();
  }, [uuid, reset]);

  const onSubmit = async (values: PatientForm) => {
    if (!uuid || Array.isArray(uuid)) {
        throw new Error("Invalid patient UUID")
    } 
    try {
      await updatePatient(uuid, values);
      toast.success('Patient updated successfully');
      router.push(`/patients/${uuid}`); // Redirect to patient details
    } catch (err) {
      console.error(err);
      toast.error('Failed to update patient');
    }
  };

  if (loading) return <p>Loading patient data...</p>;

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Edit Patient</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <input
          {...register('givenName')}
          placeholder="First Name"
          className="border px-2 py-1 rounded"
        />
        {formState.errors.givenName && (
          <span className="text-red-600">{formState.errors.givenName.message}</span>
        )}

        <input
          {...register('familyName')}
          placeholder="Last Name"
          className="border px-2 py-1 rounded"
        />
        {formState.errors.familyName && (
          <span className="text-red-600">{formState.errors.familyName.message}</span>
        )}

        <select {...register('gender')} className="border px-2 py-1 rounded">
          <option value="M">Male</option>
          <option value="F">Female</option>
        </select>

        <input
          type="date"
          {...register('birthdate')}
          className="border px-2 py-1 rounded"
        />
        {formState.errors.birthdate && (
          <span className="text-red-600">{formState.errors.birthdate.message}</span>
        )}

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Update Patient
        </button>
      </form>
    </div>
  );
}
