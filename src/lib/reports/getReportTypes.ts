// /app/reports/actions.ts
'use server';

import { PatientReportParams, PatientReportRow } from '@/lib/reports/types';
import { getPatientReport } from './patentReports';

export async function fetchPatientReport(params: PatientReportParams): Promise<PatientReportRow[]> {
  return await getPatientReport(params);
}
