// Core prescription types
export type PrescriptionStatus = 'active' | 'completed' | 'paused' | 'cancelled' | 'expired';
export type PrescriptionTab = 'active' | 'all';
export type PrescriptionAction = 'dispense' | 'pause' | 'close' | 'reactivate' | 'print';

// FHIR-related types
export interface FHIRCoding {
  system?: string;
  code: string;
  display?: string;
}

export interface FHIRQuantity {
  value: number;
  unit: string;
  code?: string;
  system?: string;
}

export interface FHIRTiming {
  code?: {
    coding?: FHIRCoding[];
    text?: string;
  };
  repeat?: {
    duration?: number;
    durationUnit?: string;
    frequency?: number;
    period?: number;
    periodUnit?: string;
  };
}

export interface FHIRDosageInstruction {
  text?: string;
  timing?: FHIRTiming;
  asNeededBoolean?: boolean;
  route?: {
    coding?: FHIRCoding[];
    text?: string;
  };
  doseAndRate?: Array<{
    doseQuantity?: FHIRQuantity;
  }>;
  additionalInstruction?: Array<{
    text?: string;
  }>;
}

// Prescription data types
export interface Prescription {
  id: string;
  encounterId: string;
  created: string; // ISO date string
  patientName: string;
  patientId: string;
  patientUuid: string;
  prescriber: string;
  prescriberId?: string;
  drugs: string;
  drugUuid?: string;
  lastDispenser?: string;
  lastDispenseDate?: string;
  status: PrescriptionStatus;
  
  // Detailed prescription info
  dosage?: FHIRDosageInstruction;
  quantity?: FHIRQuantity;
  refills: number;
  instructions: string;
  
  // UI state
  isExpanded?: boolean;
}

// Prescription details for expanded view
export interface PrescriptionDetails {
  prescription: any; // FHIR MedicationRequest resource
  conditions: Condition[];
  history: PrescriptionHistory[];
}

export interface Condition {
  id: string;
  name: string;
  status: string;
  recordedDate: string;
  clinicalStatus?: string;
  verificationStatus?: string;
}

export interface PrescriptionHistory {
  id: string;
  type: 'prescribed' | 'dispensed' | 'paused' | 'resumed' | 'cancelled' | 'updated';
  date: string;
  performer: string;
  performerId?: string;
  details: string;
  status: 'completed' | 'failed' | 'in-progress';
}

// Dispense form types
export interface DispenseFormData {
  prescriptionId: string;
  medicationId: string;
  patientId: string;
  encounterId: string;
  medicationDisplay: string; // ADD THIS LINE

  
  // Quantities
  quantityPrescribed: number;
  quantityDispensed: number;
  unit: string;
  unitCode: string;
  
  // Dosage
  dose: number;
  doseUnit: string;
  doseUnitCode: string;
  
  // Administration details
  route: string;
  routeCode: string;
  frequency: string;
  frequencyCode: string;
  instructions: string;
  
  // Metadata
  dispensedBy: string;
  dispensedByPractitionerId: string;
  locationId: string;
  dispenseDate: string;
  
  // Duration (optional)
  duration?: number;
  durationUnit?: string;
}

export interface DispenseOption {
  value: string;
  label: string;
  code?: string;
  system?: string;
  disabled?: boolean;
}

export interface DispenseOptions {
  units: DispenseOption[];
  doseUnits: DispenseOption[];
  routes: DispenseOption[];
  frequencies: DispenseOption[];
  practitioners: DispenseOption[];
  durationUnits?: DispenseOption[];
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Search and filter types
export interface PrescriptionFilters {
  search?: string;
  status?: PrescriptionStatus | 'all';
  startDate?: string;
  endDate?: string;
  locationId?: string;
  prescriberId?: string;
  patientId?: string;
}

// UI component props
export interface PrescriptionTableProps {
  prescriptions: Prescription[];
  isLoading?: boolean;
  onRowClick?: (prescription: Prescription) => void;
  onAction?: (action: PrescriptionAction, prescription: Prescription) => void;
  expandedRowId?: string;
}

export interface PrescriptionRowProps {
  prescription: Prescription;
  isExpanded: boolean;
  onExpand: () => void;
  onAction: (action: PrescriptionAction) => void;
}

export interface DispenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescription: Prescription;
  patientInfo?: PatientInfo;
  onSubmit: (data: DispenseFormData) => Promise<ApiResponse>;
}

export interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescription: Prescription;
  action: 'pause' | 'close' | 'reactivate';
  onSubmit: (reason?: string) => Promise<ApiResponse>;
}

// Patient information
export interface PatientInfo {
  id: string;
  name: string;
  identifier: string;
  age: number;
  gender: string;
  birthDate: string;
  location: string;
  locationId: string;
  allergies?: Allergy[];
  conditions?: Condition[];
}

export interface Allergy {
  id: string;
  substance: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe';
  recordedDate: string;
}

// Location and context types
export interface PharmacyLocation {
  id: string;
  name: string;
  type: 'inpatient' | 'outpatient' | 'pharmacy';
  isActive: boolean;
}

export interface PharmacyContextType {
  currentLocation: PharmacyLocation;
  setCurrentLocation: (location: PharmacyLocation) => void;
  user: PharmacyUser;
  isLoading: boolean;
}

export interface PharmacyUser {
  id: string;
  name: string;
  role: 'pharmacist' | 'technician' | 'admin';
  permissions: string[];
}

// Print and export types
export interface PrintOptions {
  format: 'pdf' | 'html';
  includeHeader: boolean;
  includeFooter: boolean;
  includeInstructions: boolean;
  includeHistory: boolean;
}

// Error types
export interface PharmacyError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Constants
export const PRESCRIPTION_STATUS_COLORS: Record<PrescriptionStatus, string> = {
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  paused: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800'
};

export const PRESCRIPTION_STATUS_LABELS: Record<PrescriptionStatus, string> = {
  active: 'Active',
  completed: 'Completed',
  paused: 'Paused',
  cancelled: 'Cancelled',
  expired: 'Expired'
};

export const ACTION_BUTTONS: Record<PrescriptionAction, {
  label: string;
  variant: 'primary' | 'secondary' | 'danger' | 'warning' | 'success';
  icon?: string;
}> = {
  dispense: { label: 'Dispense', variant: 'success', icon: 'package' },
  pause: { label: 'Pause', variant: 'warning', icon: 'pause' },
  close: { label: 'Close', variant: 'danger', icon: 'x-circle' },
  reactivate: { label: 'Reactivate', variant: 'secondary', icon: 'play' },
  print: { label: 'Print', variant: 'secondary', icon: 'printer' }
};

// Duration units for prescriptions
export const DURATION_UNITS: DispenseOption[] = [
  { value: 'd', label: 'Days', code: 'day' },
  { value: 'wk', label: 'Weeks', code: 'week' },
  { value: 'mo', label: 'Months', code: 'month' },
  { value: 'a', label: 'Years', code: 'year' }
];

// Helper functions
export function formatDate(dateString: string, format: 'short' | 'long' | 'relative' = 'short'): string {
  const date = new Date(dateString);
  
  if (format === 'relative') {
    return getRelativeTime(date);
  }
  
  if (format === 'long') {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // short format
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function getStatusBadgeClass(status: PrescriptionStatus): string {
  return PRESCRIPTION_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
}

export function getStatusLabel(status: PrescriptionStatus): string {
  return PRESCRIPTION_STATUS_LABELS[status] || status;
}

// Validation functions
export function validateDispenseForm(data: Partial<DispenseFormData>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.quantityDispensed || data.quantityDispensed <= 0) {
    errors.quantityDispensed = 'Please enter a valid quantity to dispense';
  }

  if (data.quantityPrescribed && (data.quantityDispensed ?? 0) > data.quantityPrescribed) {
    errors.quantityDispensed = 'Cannot dispense more than prescribed quantity';
  }

  if (!data.unit || !data.unitCode) {
    errors.unit = 'Please select a dispensing unit';
  }

  if (!data.dose || data.dose <= 0) {
    errors.dose = 'Please enter a valid dose';
  }

  if (!data.doseUnit || !data.doseUnitCode) {
    errors.doseUnit = 'Please select a dose unit';
  }

  if (!data.route || !data.routeCode) {
    errors.route = 'Please select a route';
  }

  if (!data.frequency || !data.frequencyCode) {
    errors.frequency = 'Please select a frequency';
  }

  if (!data.dispensedByPractitionerId) {
    errors.dispensedBy = 'Please select who is dispensing';
  }

  if (!data.dispenseDate) {
    errors.dispenseDate = 'Please select a dispense date';
  } else if (new Date(data.dispenseDate) > new Date()) {
    errors.dispenseDate = 'Dispense date cannot be in the future';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Transform functions between FHIR and local types
export function transformFHIRToPrescription(fhirMedRequest: any, fhirEncounter?: any): Prescription {
  // Implementation based on action file logic
  const patientDisplay = fhirEncounter?.subject?.display || '';
  const patientMatch = patientDisplay.match(/(.+?)\s*\(OpenMRS ID:\s*([^,]+)/);
  
  let status: PrescriptionStatus = 'active';
  if (fhirMedRequest.status === 'completed' || fhirMedRequest.status === 'cancelled') {
    status = 'completed';
  } else if (fhirMedRequest.status === 'on-hold') {
    status = 'paused';
  }

  return {
    id: fhirMedRequest.id,
    encounterId: fhirEncounter?.id || '',
    created: fhirEncounter?.period?.start || fhirMedRequest.authoredOn,
    patientName: patientMatch ? patientMatch[1].trim() : 'Unknown',
    patientId: patientMatch ? patientMatch[2].trim() : 'Unknown',
    patientUuid: fhirEncounter?.subject?.reference?.split('/')[1],
    prescriber: fhirEncounter?.participant?.[0]?.individual?.display || 'Unknown',
    drugs: fhirMedRequest.medicationReference?.display || 
           fhirMedRequest.medicationCodeableConcept?.text || 
           'Unknown Drug',
    drugUuid: fhirMedRequest.medicationReference?.reference?.split('/')[1],
    status,
    dosage: fhirMedRequest.dosageInstruction?.[0],
    quantity: fhirMedRequest.dispenseRequest?.quantity,
    refills: fhirMedRequest.dispenseRequest?.numberOfRepeatsAllowed || 0,
    instructions: fhirMedRequest.dosageInstruction?.[0]?.additionalInstruction?.[0]?.text || 
                 'No special instructions'
  };
}

export function transformPrescriptionToDispenseForm(
  prescription: Prescription,
  currentUserId: string,
  currentUserName: string,
  locationId: string
): Partial<DispenseFormData> {
  return {
    prescriptionId: prescription.id,
    medicationId: prescription.drugUuid || '',
    patientId: prescription.patientUuid,
    encounterId: prescription.encounterId,
    quantityPrescribed: prescription.quantity?.value || 0,
    quantityDispensed: prescription.quantity?.value || 0,
    unit: prescription.quantity?.unit || '',
    unitCode: prescription.quantity?.code || '',
    dose: prescription.dosage?.doseAndRate?.[0]?.doseQuantity?.value || 0,
    doseUnit: prescription.dosage?.doseAndRate?.[0]?.doseQuantity?.unit || '',
    doseUnitCode: prescription.dosage?.doseAndRate?.[0]?.doseQuantity?.code || '',
    route: prescription.dosage?.route?.text || '',
    routeCode: prescription.dosage?.route?.coding?.[0]?.code || '',
    frequency: prescription.dosage?.timing?.code?.text || '',
    frequencyCode: prescription.dosage?.timing?.code?.coding?.[0]?.code || '',
    instructions: prescription.instructions,
    dispensedBy: currentUserName,
    dispensedByPractitionerId: currentUserId,
    locationId,
    dispenseDate: new Date().toISOString().split('T')[0],
    duration: prescription.dosage?.timing?.repeat?.duration,
    durationUnit: prescription.dosage?.timing?.repeat?.durationUnit
  };
}