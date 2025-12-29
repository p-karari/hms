
export interface PatientReportParams {
  startDate: string; 
  endDate: string;   
  
  visitTypeIds?: number[];
  locationIds?: number[];
  
  fullName?: string; 
  gender?: 'M' | 'F' | 'O'; 
  minAge?: number;
  maxAge?: number;

  diagnosisQuery?: string; 
  prescriptionQuery?: string; 
  
  paymentMethod?: string; 
  minBillAmount?: number;
  maxBillAmount?: number;
}

export interface PatientReportRow {
  visitDate: Date;
  fullName: string;
  age: number;
  address: string;
  contact: string;
  visitType: string;
  location: string;
  diagnosis: string; 
  prescriptions: string; 
  billNumber: string;
  billAmount: number;
  paymentMethod: string;
  gender: string; 
}