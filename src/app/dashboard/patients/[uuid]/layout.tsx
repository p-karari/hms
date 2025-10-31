import React from "react";
import PatientSubNav from "@/components/patients/PatientSubNav";

export default async function PatientLayout({
  children,
  // `params` can sometimes be provided as a Promise by Next's internals —
  // accept either the object or a Promise of the object and await it.
  params,
}: {
  children: React.ReactNode;
  params: { uuid: string } | Promise<{ uuid: string }>;
}) {
  const resolvedParams = await params;
  const patientUuid = resolvedParams.uuid;

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <div className="bg-white border-b border-gray-200">
        <PatientSubNav patientUuid={patientUuid} />
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}
