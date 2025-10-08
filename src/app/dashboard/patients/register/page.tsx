// app/dashboard/patients/register/page.tsx

import { RegisterPatientForm } from "@/components/patients/PatientRegistrationForm";


// This is a Server Component that just holds the Client Form
export default function RegisterPatientPage() {
  return (
    <div className="py-10">
      <RegisterPatientForm />
    </div>
  );
}