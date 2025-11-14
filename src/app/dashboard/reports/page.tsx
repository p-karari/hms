// ... (imports remain the same) ...

import ReportFilterForm from "@/components/reports/ReportFilterForm";
import ReportTable from "@/components/reports/ReportTable";
import { OpenMrsLocation, getLocations } from "@/lib/location/location";
import { CodedValue } from "@/lib/patients/getPatientObservations";
import { getVisitTypes } from "@/lib/patients/getVisitTypes";
import { getPatientReport } from "@/lib/reports/patentReports";
import { PaymentModeOption, getPaymentModes } from "@/lib/reports/paymentModeReport";
import { PatientReportParams, PatientReportRow } from "@/lib/reports/types";

// Define default report parameters for the initial load (e.g., last 30 days)
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const today = new Date().toISOString().split('T')[0];

const defaultParams: PatientReportParams = {
  startDate: thirtyDaysAgo,
  endDate: today,
};

// --- Interfaces for props passing ---
interface ReportOptions {
    visitTypes: CodedValue[];
    locations: OpenMrsLocation[];
    paymentModes: PaymentModeOption[];
}

// --- Main Page Component ---
export default async function ReportingPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // 1. Fetch static filter options concurrently
  const [visitTypes, locations, paymentModes] = await Promise.all([
    getVisitTypes(),
    getLocations(),
    getPaymentModes(),
  ]);

  const options: ReportOptions = { visitTypes, locations, paymentModes };

  // 2. Derive current report parameters from search params
  
  // 🔑 THE FIX: Extract dynamic searchParams properties first to avoid the static analysis error.
  const { 
      startDate: urlStartDate, 
      endDate: urlEndDate, 
      gender: urlGender, 
      fullName: urlFullName, 
      diagnosisQuery: urlDiagnosisQuery, 
      prescriptionQuery: urlPrescriptionQuery, 
      paymentMethod: urlPaymentMethod, 
      minAge: urlMinAge, 
      maxAge: urlMaxAge, 
      minBillAmount: urlMinBillAmount, 
      maxBillAmount: urlMaxBillAmount, 
      visitTypeIds: urlVisitTypeIds, 
      locationIds: urlLocationIds 
  } = await searchParams;

  const currentParams: PatientReportParams = {
    ...defaultParams,
    
    // Date ranges
    startDate: (urlStartDate as string) || defaultParams.startDate,
    endDate: (urlEndDate as string) || defaultParams.endDate,
    
    // Simple String/Single-Select Filters
    gender: (urlGender as 'M' | 'F' | 'O') || undefined,
    fullName: (urlFullName as string) || undefined,
    diagnosisQuery: (urlDiagnosisQuery as string) || undefined,
    prescriptionQuery: (urlPrescriptionQuery as string) || undefined,
    paymentMethod: (urlPaymentMethod as string) || undefined,

    // Numeric Filters
    minAge: urlMinAge ? parseInt(urlMinAge as string) : undefined,
    maxAge: urlMaxAge ? parseInt(urlMaxAge as string) : undefined,
    minBillAmount: urlMinBillAmount ? parseInt(urlMinBillAmount as string) : undefined,
    maxBillAmount: urlMaxBillAmount ? parseInt(urlMaxBillAmount as string) : undefined,

    // Multi-Select Filters (Parsing an array of strings to numbers)
    visitTypeIds: urlVisitTypeIds 
      ? (Array.isArray(urlVisitTypeIds) 
          ? urlVisitTypeIds.map(id => parseInt(id)).filter(id => !isNaN(id))
          : [parseInt(urlVisitTypeIds as string)].filter(id => !isNaN(id)))
      : undefined,
    locationIds: urlLocationIds 
      ? (Array.isArray(urlLocationIds) 
          ? urlLocationIds.map(id => parseInt(id)).filter(id => !isNaN(id))
          : [parseInt(urlLocationIds as string)].filter(id => !isNaN(id)))
      : undefined,
  };

  // 3. Fetch the report data
  let reportData: PatientReportRow[] = [];
  try {
    reportData = await getPatientReport(currentParams);
  } catch (error) {
    console.error("Failed to fetch patient report:", error);
    // You might want to display a user-friendly error message here
  }

  // Add debugging in your page component
// console.log("Visit Types from API:", options.visitTypes);
// console.log("Locations from API:", options.locations);
// console.log("Current params:", params);

  // 4. Render the page
  return (
    <div className="p-6 space-y-8">
      
      {/* Filters Section (Client Component) */}
      <section className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Report Filters</h2>
        <ReportFilterForm 
          initialParams={currentParams} 
          options={options} 
        />
      </section>

      {/* Results Section (Client Component) */}
      <section className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="xl font-semibold mb-4 text-gray-700">Report Results ({reportData.length} visits)</h2>
        <ReportTable data={reportData} />
      </section>
    </div>
  );
}