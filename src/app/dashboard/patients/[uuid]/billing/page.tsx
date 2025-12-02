// app/dashboard/patients/[uuid]/billing/page.tsx
// This is a Server Component, so it automatically receives 'params'

import PatientBillingPage from '@/components/billing/patientBilling/PatientBillingPage'; 
import { getPatientDataByUuid } from '@/lib/billing/patientBilling/billActions';
// import { getPatientDataByUuid } from '@/lib/data/patientData'; // Assuming you use this resolver

interface PatientBillingPageWrapperProps {
  params: {
    uuid: string; // The patient UUID from the route
  };
}

export default async function PatientBillingPageWrapper({ params }: PatientBillingPageWrapperProps) {
  const patientUuid = params.uuid;

  // 1. Resolve the UUID (string) to the internal numeric ID and name
  const patientData = await getPatientDataByUuid(patientUuid);

  // 2. Handle the failure case (this is where the numeric ID would be null)
  if (!patientData) {
    return (
      <div className="text-center p-10 text-red-600">
        Error: Patient UUID `{patientUuid}` is invalid or not found.
      </div>
    );
  }

  // 3. Pass the extracted string UUID, the valid numeric ID, and the name to the Client Component
  return (
    <PatientBillingPage
      patientUuid={patientUuid} // <-- This is the string needed by BillsHistoryTab
      patientId={patientData.id} // <-- This is the number needed by other tabs
      patientName={patientData.name}
    />
  );
}